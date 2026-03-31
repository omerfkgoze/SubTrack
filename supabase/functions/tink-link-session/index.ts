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
 * Result of createOrGetTinkUser.
 *
 * - type 'user_id': Tink's internal user_id (from 201 create response).
 *   Use as `user_id` in the delegate call.
 * - type 'external_user_id': Supabase user ID used as external_user_id.
 *   Used as fallback when the user already exists (409) and Tink's user_id
 *   is not returned in the response. Tink's delegate endpoint supports both
 *   user_id and external_user_id.
 */
type TinkUserRef =
  | { id: string; type: 'user_id' }
  | { id: string; type: 'external_user_id' }

/**
 * Creates a permanent Tink user using the Supabase user ID as external_user_id.
 *
 * On 201 (new user): parses Tink's internal user_id from the response.
 * On 409 (existing user): returns the external_user_id as fallback — Tink's delegate
 * endpoint supports external_user_id as an alternative to user_id.
 */
async function createOrGetTinkUser(
  clientAccessToken: string,
  externalUserId: string,
  market: string,
): Promise<TinkUserRef> {
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

  // Try to extract Tink's internal user_id from the response body.
  // The 201 response always includes it; the 409 response typically does not.
  try {
    const data = JSON.parse(responseText)
    if (data.user_id) {
      console.log(
        response.status === 409
          ? 'Tink user already exists, got user_id from 409 response'
          : 'Tink user created',
        externalUserId,
      )
      return { id: data.user_id, type: 'user_id' }
    }
  } catch {
    // JSON parse failed — fall through
  }

  if (response.status === 409) {
    // User exists but Tink's user_id was not in the 409 response.
    // Fall back to using external_user_id in the delegate call — the Tink
    // authorization-grant/delegate endpoint accepts this as an alternative to user_id.
    console.log('Tink user already exists, using external_user_id as delegate ref:', externalUserId)
    return { id: externalUserId, type: 'external_user_id' }
  }

  throw new Error(`[step:user_create] Could not get user_id from Tink create response: ${responseText}`)
}

/**
 * Generates a delegated authorization code for Tink Link.
 *
 * Accepts either a Tink internal user_id (from a fresh user creation) or an
 * external_user_id (fallback for existing users). The Tink delegate endpoint
 * supports both.
 *
 * Scope must include the data scopes required by the product (transactions/connect-accounts):
 * accounts:read + transactions:read are mandatory, otherwise Tink cannot create the
 * callback authorization code after bank auth → REQUEST_FAILED_CREATE_AUTHORIZATION_CODE.
 */
async function generateDelegatedCode(
  clientAccessToken: string,
  userRef: TinkUserRef,
  idHint: string,
): Promise<string> {
  const userParam = userRef.type === 'user_id'
    ? { user_id: userRef.id }
    : { external_user_id: userRef.id }

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
        ...userParam,
        id_hint: idHint,
        scope:
          'authorization:read,credentials:read,credentials:refresh,credentials:write,' +
          'providers:read,user:read,provider-consents:read,provider-consents:write,' +
          'accounts:read,balances:read,transactions:read',
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

    // Step 2: Create or locate the permanent Tink user
    const userRef = await createOrGetTinkUser(clientAccessToken, user.id, market)
    console.log(`Tink user ref obtained (type=${userRef.type})`)

    // Step 3: Generate delegated authorization code for Tink Link
    const idHint = user.email ?? user.id
    const delegatedCode = await generateDelegatedCode(clientAccessToken, userRef, idHint)
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
