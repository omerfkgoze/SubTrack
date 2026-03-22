export interface TinkTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
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
