/**
 * Gets a client credentials token from Tink API.
 * Used for app-level access (no user context needed).
 */
export async function getClientCredentialsToken(
  clientId: string,
  clientSecret: string,
  scope: string,
): Promise<string> {
  const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink client credentials failed: ${response.status}`, errorText)
    throw new Error(`Tink auth failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

export interface TinkProvider {
  name: string
  displayName: string
  financialInstitutionId: string
  financialInstitutionName: string
  market: string
  status: string
  images: {
    icon: string
    banner: string
  }
  capabilities: string[]
  popular: boolean
  rank: number
  accessType: string
  type: string
}

export interface SupportedBank {
  id: string
  displayName: string
  market: string
  iconUrl: string | null
  popular: boolean
  rank: number
}

export function mapProviderToSupportedBank(provider: TinkProvider): SupportedBank {
  return {
    id: provider.financialInstitutionId,
    displayName: provider.displayName,
    market: provider.market,
    iconUrl: provider.images?.icon ?? null,
    popular: provider.popular ?? false,
    rank: provider.rank ?? 999,
  }
}
