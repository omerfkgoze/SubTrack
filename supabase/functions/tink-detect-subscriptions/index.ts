import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  generateUserAccessToken,
  fetchTransactions,
  detectRecurringSubscriptions,
} from './utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetectSubscriptionsRequest {
  connectionId: string
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

    const body: DetectSubscriptionsRequest = await req.json()
    const { connectionId } = body

    if (!connectionId) {
      return jsonResponse({ error: 'Missing required field: connectionId' }, 400)
    }

    // Admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Load and verify bank connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('bank_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (connectionError || !connection) {
      console.error('Bank connection not found:', connectionError?.message)
      return jsonResponse({ error: 'Bank connection not found' }, 404)
    }

    // Validate connection is active (AC8)
    if (connection.status !== 'active') {
      console.log('Connection not active:', connection.status)
      return jsonResponse({
        error: 'CONNECTION_NOT_ACTIVE',
        detail: 'Bank connection is not active. Please reconnect your bank.',
      }, 400)
    }

    // Get user access token via server-side authorization grant (AC1)
    let accessToken: string

    try {
      accessToken = await generateUserAccessToken(
        user.id,
        tinkClientId,
        tinkClientSecret,
      )
      console.log('User access token obtained via authorization grant')
    } catch (tokenError) {
      const message = tokenError instanceof Error ? tokenError.message : 'Unknown'
      console.error('Authorization grant failed:', message)

      // AUTHORIZATION_GRANT_FAILED means Continuous Access is not yet approved by Tink.
      // The bank connection itself is valid — the user just needs to reconnect (one-time
      // flow) to get a fresh access token. Do NOT mark the connection as expired.
      if (message.startsWith('AUTHORIZATION_GRANT_FAILED')) {
        return jsonResponse({
          error: 'RECONNECT_REQUIRED',
          detail: 'Reconnect your bank to scan for new subscriptions.',
        }, 401)
      }

      // For genuine token/credential expiry, mark the connection as expired (AC9)
      await supabaseAdmin
        .from('bank_connections')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', connectionId)

      return jsonResponse({
        error: 'TOKEN_REFRESH_FAILED',
        detail: 'Bank connection expired. Please reconnect.',
      }, 401)
    }

    // Fetch transactions using Search API (transactions:read scope)
    let transactions
    try {
      transactions = await fetchTransactions(accessToken)
      console.log('Transactions fetched:', transactions.length)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown'
      console.error('Transaction fetch failed:', message)

      return jsonResponse({
        error: 'TRANSACTION_FETCH_ERROR',
        detail: "Couldn't fetch transactions. Please try again later.",
      }, 503)
    }

    // Detect recurring subscriptions from transactions
    const detectedRows = detectRecurringSubscriptions(transactions, user.id, connectionId)
    console.log('Detected recurring subscriptions:', detectedRows.length)

    // AC7: Zero results case — still update last_synced_at (handled at end of function)
    if (detectedRows.length === 0) {
      await supabaseAdmin
        .from('bank_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connectionId)

      return jsonResponse({ success: true, detectedCount: 0, newCount: 0 })
    }

    // Filter out rows for subscriptions already actioned by user (status != 'detected')
    const { data: existingActioned } = await supabaseAdmin
      .from('detected_subscriptions')
      .select('tink_group_id')
      .eq('user_id', user.id)
      .neq('status', 'detected')

    const actionedGroupIds = new Set(
      (existingActioned ?? []).map((r: { tink_group_id: string }) => r.tink_group_id)
    )
    const rowsToUpsert = detectedRows.filter((row) => !actionedGroupIds.has(row.tink_group_id))

    // Track new vs existing for response count
    const { data: existingDetected } = await supabaseAdmin
      .from('detected_subscriptions')
      .select('tink_group_id')
      .eq('user_id', user.id)
      .eq('status', 'detected')

    const existingGroupIds = new Set(
      (existingDetected ?? []).map((r: { tink_group_id: string }) => r.tink_group_id)
    )
    const newCount = rowsToUpsert.filter((row) => !existingGroupIds.has(row.tink_group_id)).length

    // Upsert detected subscriptions (AC2)
    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('detected_subscriptions')
        .upsert(rowsToUpsert, {
          onConflict: 'user_id,tink_group_id',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error('Failed to upsert detected subscriptions:', upsertError.message)
        return jsonResponse({ error: 'Failed to store detected subscriptions' }, 500)
      }
    }

    // Update last_synced_at on bank connection (AC5)
    await supabaseAdmin
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connectionId)

    console.log('Detection complete. Total:', detectedRows.length, 'New:', newCount)

    return jsonResponse({
      success: true,
      detectedCount: detectedRows.length,
      newCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('tink-detect-subscriptions error:', message)
    return jsonResponse({ error: 'Subscription detection failed. Please try again.' }, 500)
  }
})
