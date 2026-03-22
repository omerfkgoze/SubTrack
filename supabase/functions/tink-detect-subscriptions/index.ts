import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  refreshUserToken,
  fetchRecurringGroups,
  mapTinkGroupToDetected,
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

    if (!connection.tink_refresh_token) {
      console.error('No refresh token stored for connection:', connectionId)
      return jsonResponse({ error: 'Bank connection expired. Please reconnect.' }, 401)
    }

    // Refresh user token using stored refresh token (AC1, AC9)
    let accessToken: string
    let newRefreshToken: string | undefined

    try {
      const tokenResult = await refreshUserToken(
        connection.tink_refresh_token,
        tinkClientId,
        tinkClientSecret,
      )
      accessToken = tokenResult.accessToken
      newRefreshToken = tokenResult.newRefreshToken
      console.log('Token refresh OK')
    } catch (tokenError) {
      const message = tokenError instanceof Error ? tokenError.message : 'Unknown'
      console.error('Token refresh failed:', message)

      // Update connection status to expired (AC9)
      await supabaseAdmin
        .from('bank_connections')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', connectionId)

      return jsonResponse({
        error: 'TOKEN_REFRESH_FAILED',
        detail: 'Bank connection expired. Please reconnect.',
      }, 401)
    }

    // If Tink issued a new refresh token, update it (token rotation)
    if (newRefreshToken) {
      await supabaseAdmin
        .from('bank_connections')
        .update({ tink_refresh_token: newRefreshToken, updated_at: new Date().toISOString() })
        .eq('id', connectionId)
      console.log('Refresh token rotated')
    }

    // Fetch recurring transaction groups from Tink Data Enrichment API (AC1)
    let recurringGroups
    try {
      recurringGroups = await fetchRecurringGroups(accessToken)
      console.log('Fetched recurring groups:', recurringGroups.length)
    } catch (enrichmentError) {
      const message = enrichmentError instanceof Error ? enrichmentError.message : 'Unknown'
      console.error('Enrichment API failed:', message)

      if (message.includes('ENRICHMENT_API_FAILED:403')) {
        return jsonResponse({
          error: 'ENRICHMENT_SCOPE_MISSING',
          detail: 'Your bank connection needs updated permissions. Please reconnect to enable subscription detection.',
        }, 403)
      }

      return jsonResponse({
        error: 'ENRICHMENT_API_ERROR',
        detail: "Couldn't scan transactions. Please try again later.",
      }, 503)
    }

    // AC7: Zero results case — still update last_synced_at
    if (recurringGroups.length === 0) {
      await supabaseAdmin
        .from('bank_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connectionId)

      return jsonResponse({ success: true, detectedCount: 0, newCount: 0 })
    }

    // Map Tink groups to detected_subscriptions rows (AC2, AC3, AC4)
    const mappedRows = recurringGroups.map((group) =>
      mapTinkGroupToDetected(group, user.id, connectionId)
    )

    // Filter out rows for subscriptions already actioned by user (status != 'detected')
    // to avoid overwriting approved/dismissed/matched decisions
    const { data: existingActioned } = await supabaseAdmin
      .from('detected_subscriptions')
      .select('tink_group_id')
      .eq('user_id', user.id)
      .neq('status', 'detected')

    const actionedGroupIds = new Set(
      (existingActioned ?? []).map((r: { tink_group_id: string }) => r.tink_group_id)
    )
    const rowsToUpsert = mappedRows.filter((row) => !actionedGroupIds.has(row.tink_group_id))

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

    console.log('Detection complete. Total:', recurringGroups.length, 'New:', newCount)

    return jsonResponse({
      success: true,
      detectedCount: recurringGroups.length,
      newCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('tink-detect-subscriptions error:', message)
    return jsonResponse({ error: 'Subscription detection failed. Please try again.' }, 500)
  }
})
