export interface TinkTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  id_hint?: string
}

/**
 * Exchanges a Tink authorization code for access and refresh tokens.
 * Client secret is passed in server-side only — never stored client-side.
 */
export async function exchangeAuthorizationCode(
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

  return response.json() as Promise<TinkTokenResponse>
}

/**
 * Calculates PSD2 consent dates.
 * Consent duration: 180 days per updated EBA rules (July 2023).
 */
export function buildConsentDates(): { consentGrantedAt: Date; consentExpiresAt: Date } {
  const consentGrantedAt = new Date()
  const consentExpiresAt = new Date(consentGrantedAt)
  consentExpiresAt.setDate(consentExpiresAt.getDate() + 180)
  return { consentGrantedAt, consentExpiresAt }
}

/**
 * Gets a client access token using client_credentials grant.
 */
export async function getClientAccessToken(
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
      scope: 'authorization:grant',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink client token failed: ${response.status}`, errorText)
    throw new Error(`Client token failed: ${response.status}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Generates a server-side authorization code for a permanent Tink user.
 * This code, when exchanged, returns a refresh_token for continuous access.
 */
export async function generateUserAuthorizationCode(
  clientAccessToken: string,
  externalUserId: string,
): Promise<string> {
  const response = await fetch('https://api.tink.com/api/v1/oauth/authorization-grant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${clientAccessToken}`,
    },
    body: new URLSearchParams({
      external_user_id: externalUserId,
      scope: 'accounts:read,balances:read,transactions:read',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink authorization-grant failed: ${response.status}`, errorText)
    throw new Error(`Authorization grant failed: ${response.status}`)
  }

  const data = await response.json()
  return data.code
}
