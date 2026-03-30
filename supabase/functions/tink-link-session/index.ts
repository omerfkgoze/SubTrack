import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tink Link actor client ID — df05e4b379934cd09963197cc855bfe9 is Tink's standard Link actor
const TINK_LINK_ACTOR_CLIENT_ID =
  Deno.env.get('TINK_LINK_ACTOR_CLIENT_ID') ?? 'df05e4b379934cd09963197cc855bfe9'

interface LinkSessionRequest {
  market?: string
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Gets a client access token using client_credentials grant.
 */
async function getClientAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'user:create,authorization:grant',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink client token failed: ${response.status}`, errorText)
    throw new Error(`[step:client_token] Tink API ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Creates a permanent Tink user using the Supabase user ID as external_user_id.
 * If the user already exists, Tink returns the existing user.
 */
async function createOrGetTinkUser(
  clientAccessToken: string,
  externalUserId: string,
  market: string,
): Promise<void> {
  const response = await fetch('https://api.tink.com/api/v1/user/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientAccessToken}`,
    },
    body: JSON.stringify({
      external_user_id: externalUserId,
      market,
      locale: 'en_US',
    }),
  })

  // 409 = user already exists, which is fine
  if (!response.ok && response.status !== 409) {
    const errorText = await response.text()
    console.error(`Tink user create failed: ${response.status}`, errorText)
    throw new Error(`[step:user_create] Tink API ${response.status}: ${errorText}`)
  }

  if (response.status === 409) {
    console.log('Tink user already exists for:', externalUserId)
  } else {
    console.log('Tink user created for:', externalUserId)
  }
}

/**
 * Generates a delegated authorization code for Tink Link.
 * This code is passed to the Tink Link URL so the bank connection
 * is tied to a permanent user, enabling refresh token support.
 */
async function generateDelegatedCode(
  clientAccessToken: string,
  externalUserId: string,
  idHint: string,
): Promise<string> {
  const response = await fetch(
    'https://api.tink.com/api/v1/oauth/authorization-grant/delegate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${clientAccessToken}`,
      },
      body: new URLSearchParams({
        actor_client_id: TINK_LINK_ACTOR_CLIENT_ID,
        external_user_id: externalUserId,
        id_hint: idHint,
        scope:
          'authorization:read,credentials:read,credentials:refresh,credentials:write,providers:read,user:read,provider-consents:read,provider-consents:write',
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink delegate failed: ${response.status}`, errorText)
    throw new Error(`[step:delegate] Tink API ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.code
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
      return jsonResponse({ error: '[step:auth] No authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const tinkClientId = Deno.env.get('TINK_CLIENT_ID')
    const tinkClientSecret = Deno.env.get('TINK_CLIENT_SECRET')

    if (!tinkClientId || !tinkClientSecret) {
      console.error('TINK_CLIENT_ID or TINK_CLIENT_SECRET not configured')
      return jsonResponse({ error: '[step:env] TINK_CLIENT_ID or TINK_CLIENT_SECRET not configured' }, 500)
    }

    // Verify the calling user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.error('Auth failed:', userError?.message ?? 'No user returned')
      return jsonResponse({ error: `[step:auth] ${userError?.message ?? 'User verification failed'}` }, 401)
    }
    console.log('Auth OK, user:', user.id)

    const body: LinkSessionRequest = await req.json().catch(() => ({}))
    const market = body.market ?? 'DE'

    // Step 1: Get client access token
    const clientAccessToken = await getClientAccessToken(tinkClientId, tinkClientSecret)
    console.log('Client access token obtained')

    // Step 2: Create permanent Tink user (idempotent — 409 if exists)
    await createOrGetTinkUser(clientAccessToken, user.id, market)

    // Step 3: Generate delegated authorization code for Tink Link
    // id_hint: user-recognizable string shown in Tink Link (prevents URL spoofing)
    const idHint = user.email ?? user.id
    const delegatedCode = await generateDelegatedCode(clientAccessToken, user.id, idHint)
    console.log('Delegated authorization code generated')

    return jsonResponse({
      success: true,
      authorizationCode: delegatedCode,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('tink-link-session error:', message)
    return jsonResponse({ error: message }, 500)
  }
})
