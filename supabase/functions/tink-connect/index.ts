import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  exchangeAuthorizationCode,
  buildConsentDates,
  getClientAccessToken,
  generateUserAuthorizationCode,
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

    // The callback code exchange may not return a refresh_token.
    // For continuous access, generate a server-side authorization code and exchange it.
    let refreshToken = callbackTokenResponse.refresh_token ?? null

    if (!refreshToken) {
      console.log('No refresh_token from callback code. Generating server-side authorization code...')
      try {
        const clientAccessToken = await getClientAccessToken(tinkClientId, tinkClientSecret)
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
    // access_token is request-scoped (in-memory only, never persisted)
    // refresh_token is stored in tink_refresh_token column — server-side only (NFR17)

    // Strip sensitive fields before returning to client
    const { tink_refresh_token: _secret, ...safeConnection } = newConnection

    return jsonResponse({
      success: true,
      connection: safeConnection,
    })
  } catch (error) {
    // Log error without credentials
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('tink-connect error:', message)
    return jsonResponse({ error: 'Connection setup failed. Please try again.' }, 500)
  }
})
