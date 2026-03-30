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
 * Includes user:read scope so we can look up existing users by external_user_id.
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
      scope: 'user:create,user:read,authorization:grant',
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
 * Returns the Tink internal user_id (not the external_user_id).
 *
 * On 201: parses user_id from the create response.
 * On 409 (user already exists): looks up the Tink user_id by external_user_id.
 */
async function createOrGetTinkUser(
  clientAccessToken: string,
  externalUserId: string,
  market: string,
): Promise<string> {
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

  const responseText = await response.text()

  if (!response.ok && response.status !== 409) {
    console.error(`Tink user create failed: ${response.status}`, responseText)
    throw new Error(`[step:user_create] Tink API ${response.status}: ${responseText}`)
  }

  // Try to extract user_id from the response body (works for 201, may work for 409)
  try {
    const data = JSON.parse(responseText)
    if (data.user_id) {
      if (response.status === 409) {
        console.log('Tink user already exists, got user_id from 409 response:', externalUserId)
      } else {
        console.log('Tink user created for:', externalUserId)
      }
      return data.user_id
    }
  } catch {
    // JSON parse failed — fall through to lookup
  }

  if (response.status === 409) {
    // User exists but user_id was not in the 409 response body.
    // Look up the Tink user_id via the user search endpoint.
    console.log('Tink user already exists, looking up user_id for:', externalUserId)
    return await lookupTinkUserId(clientAccessToken, externalUserId)
  }

  throw new Error(`[step:user_create] Could not get user_id from Tink create response: ${responseText}`)
}

/**
 * Looks up the Tink internal user_id for an existing user by external_user_id.
 * Requires user:read scope on the client access token.
 */
async function lookupTinkUserId(
  clientAccessToken: string,
  externalUserId: string,
): Promise<string> {
  const url = new URL('https://api.tink.com/api/v1/user')
  url.searchParams.set('external_user_id', externalUserId)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${clientAccessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink user lookup failed: ${response.status}`, errorText)
    throw new Error(`[step:user_lookup] Tink API ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  // Response may be a single user object or a list — handle both
  const userObj = Array.isArray(data) ? data[0] : (data.users ? data.users[0] : data)

  if (!userObj?.user_id) {
    throw new Error(`[step:user_lookup] No user_id in lookup response: ${JSON.stringify(data)}`)
  }

  console.log('Tink user_id found via lookup for:', externalUserId)
  return userObj.user_id
}

/**
 * Generates a delegated authorization code for Tink Link.
 * Uses the Tink internal user_id (not external_user_id) as required by the delegate endpoint.
 * This code is passed to the Tink Link URL so the bank connection is tied to a permanent
 * user, enabling refresh token support.
 */
async function generateDelegatedCode(
  clientAccessToken: string,
  tinkUserId: string,
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
        response_type: 'code',
        actor_client_id: TINK_LINK_ACTOR_CLIENT_ID,
        user_id: tinkUserId,
        id_hint: idHint,
        // Scope must include the data scopes for the product (transactions/connect-accounts).
        // Without accounts:read + transactions:read, Tink cannot create the callback authorization
        // code after bank auth → REQUEST_FAILED_CREATE_AUTHORIZATION_CODE.
        scope:
          'authorization:read,credentials:read,credentials:refresh,credentials:write,providers:read,user:read,provider-consents:read,provider-consents:write,accounts:read,balances:read,transactions:read',
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

    // Step 1: Get client access token (includes user:read for existing user lookup)
    const clientAccessToken = await getClientAccessToken(tinkClientId, tinkClientSecret)
    console.log('Client access token obtained')

    // Step 2: Create permanent Tink user (idempotent — 409 if exists)
    // Returns Tink's internal user_id (not external_user_id) — required for the delegate call
    const tinkUserId = await createOrGetTinkUser(clientAccessToken, user.id, market)
    console.log('Tink user_id obtained')

    // Step 3: Generate delegated authorization code for Tink Link
    // Must use Tink's internal user_id (not external_user_id) in the delegate call
    const idHint = user.email ?? user.id
    const delegatedCode = await generateDelegatedCode(clientAccessToken, tinkUserId, idHint)
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
