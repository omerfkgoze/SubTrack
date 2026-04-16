import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  exchangeAuthorizationCode,
  buildConsentDates,
  getClientAccessToken,
  generateUserAuthorizationCode,
  createTinkUserBestEffort,
  fetchTransactions,
  detectRecurringSubscriptions,
} from './utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TinkConnectRequest {
  authorizationCode: string
  userId: string
  credentialsId?: string
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const tinkClientId = Deno.env.get('TINK_CLIENT_ID')
    const tinkClientSecret = Deno.env.get('TINK_CLIENT_SECRET')

    if (!tinkClientId || !tinkClientSecret) {
      console.error('TINK_CLIENT_ID or TINK_CLIENT_SECRET not configured')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    // Verify the calling user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.error('Auth failed:', userError?.message ?? 'No user returned')
      return jsonResponse({ error: 'Unauthorized', detail: userError?.message ?? 'User verification failed' }, 401)
    }
    console.log('Auth OK, user:', user.id)

    const body: TinkConnectRequest = await req.json()
    const { authorizationCode, userId, credentialsId } = body

    if (!authorizationCode || !userId) {
      return jsonResponse({ error: 'Missing required fields: authorizationCode, userId' }, 400)
    }

    // Ensure the user can only create connections for themselves
    if (userId !== user.id) {
      return jsonResponse({ error: 'Unauthorized: userId mismatch' }, 403)
    }

    // Exchange Tink Link callback code for tokens (confirms connection)
    const callbackTokenResponse = await exchangeAuthorizationCode(
      authorizationCode,
      tinkClientId,
      tinkClientSecret,
    )
    console.log('Callback token exchange OK, scopes:', callbackTokenResponse.scope)

    // Create permanent Tink user (best-effort) before attempting server-side grant.
    // This ensures the user exists for authorization-grant to reference.
    let clientAccessToken: string | null = null
    try {
      clientAccessToken = await getClientAccessToken(tinkClientId, tinkClientSecret)
      await createTinkUserBestEffort(clientAccessToken, userId, 'DE')
    } catch (clientTokenError) {
      const msg = clientTokenError instanceof Error ? clientTokenError.message : 'Unknown'
      console.warn('Client token / user creation failed:', msg)
    }

    // The callback code exchange may not return a refresh_token (one-time flow).
    // Try server-side authorization-grant as a best-effort to get a refresh_token.
    let refreshToken = callbackTokenResponse.refresh_token ?? null

    if (!refreshToken && clientAccessToken) {
      console.log('No refresh_token from callback code. Trying server-side authorization grant...')
      try {
        const serverCode = await generateUserAuthorizationCode(clientAccessToken, userId)
        const serverTokenResponse = await exchangeAuthorizationCode(
          serverCode,
          tinkClientId,
          tinkClientSecret,
        )
        refreshToken = serverTokenResponse.refresh_token ?? null
        console.log('Server-side token exchange OK, refresh_token:', refreshToken ? 'present' : 'missing',
          'scopes:', serverTokenResponse.scope)
      } catch (grantError) {
        const msg = grantError instanceof Error ? grantError.message : 'Unknown'
        console.warn('Server-side authorization grant failed:', msg, '— proceeding without refresh_token')
      }
    }

    // Use credentialsId from client callback URL (Tink Link provides it in redirect)
    // If not provided, generate a unique fallback from the token
    const tinkCredentialsId = credentialsId ?? `tink_${userId}_${Date.now()}`

    // Admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Idempotency check: if tink_credentials_id already exists, return existing connection
    if (credentialsId) {
      const { data: existingConnection } = await supabaseAdmin
        .from('bank_connections')
        .select('*')
        .eq('tink_credentials_id', credentialsId)
        .eq('user_id', userId)
        .maybeSingle()

      if (existingConnection) {
        console.log('Existing connection found for credentialsId:', credentialsId)
        const { tink_refresh_token: _secret, ...safeExisting } = existingConnection
        return jsonResponse({
          success: true,
          connection: safeExisting,
          message: 'Bank connection already exists',
        })
      }
    }

    // Calculate consent expiry: consent_granted_at + 180 days (EBA rules)
    const { consentGrantedAt, consentExpiresAt } = buildConsentDates()

    // Store connection record
    // bank_name is null until Story 7.3 fetches account details via transactions:read scope
    // tink_refresh_token: stored server-side only, never returned to client (NFR17)
    const { data: newConnection, error: insertError } = await supabaseAdmin
      .from('bank_connections')
      .insert({
        user_id: userId,
        provider: 'tink',
        bank_name: null,
        status: 'active',
        consent_granted_at: consentGrantedAt.toISOString(),
        consent_expires_at: consentExpiresAt.toISOString(),
        tink_credentials_id: tinkCredentialsId,
        tink_refresh_token: refreshToken,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store bank connection:', insertError.message)
      return jsonResponse({ error: 'Failed to store bank connection' }, 500)
    }

    console.log('Bank connection created:', newConnection.id)

    // ── One-time flow: fetch transactions & detect subscriptions immediately ──
    // The access_token from callback code exchange is valid for ~30 min.
    // Use it now to fetch transactions before the token expires.
    let detectedCount = 0
    let newCount = 0

    if (callbackTokenResponse.access_token) {
      try {
        const transactions = await fetchTransactions(callbackTokenResponse.access_token)
        console.log('One-time flow: fetched', transactions.length, 'transactions')

        const detectedRows = detectRecurringSubscriptions(transactions, userId, newConnection.id)
        console.log('One-time flow: detected', detectedRows.length, 'recurring subscriptions')

        if (detectedRows.length > 0) {
          // Filter out already-actioned subscriptions
          const { data: existingActioned } = await supabaseAdmin
            .from('detected_subscriptions')
            .select('tink_group_id')
            .eq('user_id', userId)
            .neq('status', 'detected')

          const actionedGroupIds = new Set(
            (existingActioned ?? []).map((r: { tink_group_id: string }) => r.tink_group_id)
          )
          const rowsToUpsert = detectedRows.filter((row) => !actionedGroupIds.has(row.tink_group_id))

          // Track new vs existing
          const { data: existingDetected } = await supabaseAdmin
            .from('detected_subscriptions')
            .select('tink_group_id')
            .eq('user_id', userId)
            .eq('status', 'detected')

          const existingGroupIds = new Set(
            (existingDetected ?? []).map((r: { tink_group_id: string }) => r.tink_group_id)
          )
          newCount = rowsToUpsert.filter((row) => !existingGroupIds.has(row.tink_group_id)).length

          if (rowsToUpsert.length > 0) {
            const { error: upsertError } = await supabaseAdmin
              .from('detected_subscriptions')
              .upsert(rowsToUpsert, {
                onConflict: 'user_id,tink_group_id',
                ignoreDuplicates: false,
              })

            if (upsertError) {
              console.error('Failed to upsert detected subscriptions:', upsertError.message)
            }
          }

          detectedCount = detectedRows.length
        }

        // Update last_synced_at
        await supabaseAdmin
          .from('bank_connections')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', newConnection.id)
      } catch (detectError) {
        const msg = detectError instanceof Error ? detectError.message : 'Unknown'
        console.warn('One-time flow detection failed (non-fatal):', msg)
        // Non-fatal: connection was created successfully, detection can be retried
      }
    }

    // Strip sensitive fields before returning to client
    const { tink_refresh_token: _secret, ...safeConnection } = newConnection

    return jsonResponse({
      success: true,
      connection: safeConnection,
      detectedCount,
      newCount,
    })
  } catch (error) {
    // Log error without credentials
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('tink-connect error:', message)
    return jsonResponse({ error: 'Connection setup failed. Please try again.' }, 500)
  }
})
