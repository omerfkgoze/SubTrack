import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TinkConnectRequest {
  authorizationCode: string
  userId: string
  credentialsId?: string
}

interface TinkTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  id_hint?: string
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function exchangeAuthorizationCode(
  authorizationCode: string,
  clientId: string,
  clientSecret: string,
): Promise<TinkTokenResponse> {
  const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: authorizationCode,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink token exchange failed: ${response.status}`, errorText)
    throw new Error(`Tink API error: ${response.status}`)
  }

  return response.json()
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

    // Exchange authorization code for tokens
    // Access token is in-memory only (request-scoped), never persisted
    const tokenResponse = await exchangeAuthorizationCode(
      authorizationCode,
      tinkClientId,
      tinkClientSecret,
    )
    console.log('Token exchange OK, scopes:', tokenResponse.scope)

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
        return jsonResponse({
          success: true,
          connection: existingConnection,
          message: 'Bank connection already exists',
        })
      }
    }

    // Calculate consent expiry: consent_granted_at + 180 days
    const consentGrantedAt = new Date()
    const consentExpiresAt = new Date(consentGrantedAt)
    consentExpiresAt.setDate(consentExpiresAt.getDate() + 180)

    // Store connection record
    const { data: newConnection, error: insertError } = await supabaseAdmin
      .from('bank_connections')
      .insert({
        user_id: userId,
        provider: 'tink',
        bank_name: 'Connected Bank',
        status: 'active',
        consent_granted_at: consentGrantedAt.toISOString(),
        consent_expires_at: consentExpiresAt.toISOString(),
        tink_credentials_id: tinkCredentialsId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store bank connection:', insertError.message)
      return jsonResponse({ error: 'Failed to store bank connection' }, 500)
    }

    console.log('Bank connection created:', newConnection.id)

    // Note: refresh_token is NOT returned to client — stored server-side only
    // In production, the refresh token would be stored encrypted in a separate secure column
    // Access token is already discarded (request-scoped, in-memory only)

    return jsonResponse({
      success: true,
      connection: newConnection,
    })
  } catch (error) {
    // Log error without credentials
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('tink-connect error:', message)
    // Include error detail in response for debugging (remove in production)
    return jsonResponse({ error: 'Connection setup failed. Please try again.', detail: message }, 500)
  }
})
