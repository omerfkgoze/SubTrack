export interface TinkAmountValue {
  unscaledValue: string
  scale: string
}

export interface TinkRecurringGroup {
  id: string
  categoryId: string
  name: string
  period: {
    label: string
    duration: {
      mean: number
      standardDeviation: number
      minimum: number
      maximum: number
    }
  }
  amount: {
    mean: TinkAmountValue
    standardDeviation: TinkAmountValue
    median: TinkAmountValue
    minimum: TinkAmountValue
    maximum: TinkAmountValue
    latest: TinkAmountValue
    currencyCode: string
  }
  occurrences: {
    count: number
    firstDate: string
    latestDate: string
    dayOfMonth: {
      mean: number
      median: number
      minimum: number
      maximum: number
    }
  }
}

export interface TinkRecurringGroupsResponse {
  recurringTransactionsGroups: TinkRecurringGroup[]
  nextPageToken?: string
}

export interface DetectedSubscriptionRow {
  user_id: string
  bank_connection_id: string
  tink_group_id: string
  merchant_name: string
  amount: number
  currency: string
  frequency: string
  confidence_score: number
  status: string
  first_seen: string
  last_seen: string
}

/**
 * Converts Tink {unscaledValue, scale} amount format to a decimal number.
 * Example: { unscaledValue: "1300", scale: "2" } → 13.00
 */
export function parseTinkAmount(amount: TinkAmountValue): number {
  const unscaled = parseInt(amount.unscaledValue, 10)
  const scale = parseInt(amount.scale, 10)
  return unscaled / Math.pow(10, scale)
}

/**
 * Calculates a confidence score (0.0 - 1.0) based on occurrence count and amount variability.
 */
export function calculateConfidence(group: TinkRecurringGroup): number {
  let score = 0.5 // Base score

  // Occurrence count factor
  if (group.occurrences.count >= 6) score += 0.3
  else if (group.occurrences.count >= 3) score += 0.2
  else if (group.occurrences.count === 2) score += 0.05

  // Amount consistency factor (low std dev = higher confidence)
  const mean = parseTinkAmount(group.amount.mean)
  const stdDev = parseTinkAmount(group.amount.standardDeviation)
  if (mean > 0) {
    const cv = stdDev / mean // Coefficient of variation
    if (cv < 0.05) score += 0.2 // Very consistent
    else if (cv < 0.15) score += 0.1 // Somewhat consistent
    else score -= 0.1 // High variability
  }

  return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100))
}

/**
 * Maps Tink period.label values to SubTrack billing cycles.
 * Unrecognized periods default to 'monthly'.
 */
export function mapPeriodToFrequency(label: string): 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  switch (label.toUpperCase()) {
    case 'WEEKLY': return 'weekly'
    case 'MONTHLY': return 'monthly'
    case 'QUARTERLY': return 'quarterly'
    case 'YEARLY': return 'yearly'
    default: return 'monthly'
  }
}

/**
 * Maps a Tink recurring transaction group to a detected_subscriptions DB row.
 */
export function mapTinkGroupToDetected(
  group: TinkRecurringGroup,
  userId: string,
  connectionId: string,
): DetectedSubscriptionRow {
  const isRecognizedPeriod = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].includes(
    group.period.label.toUpperCase(),
  )
  let confidence = calculateConfidence(group)
  // Apply penalty for unrecognized period labels
  if (!isRecognizedPeriod) {
    confidence = Math.max(0.0, Math.round((confidence - 0.1) * 100) / 100)
  }

  return {
    user_id: userId,
    bank_connection_id: connectionId,
    tink_group_id: group.id,
    merchant_name: group.name,
    amount: parseTinkAmount(group.amount.mean),
    currency: group.amount.currencyCode,
    frequency: mapPeriodToFrequency(group.period.label),
    confidence_score: confidence,
    status: 'detected',
    first_seen: group.occurrences.firstDate,
    last_seen: group.occurrences.latestDate,
  }
}

/**
 * Refreshes the user's Tink access token using a stored refresh token.
 * Uses grant_type=refresh_token with enrichment.transactions:readonly scope.
 * Returns the new access token and optionally a new refresh token (token rotation).
 */
export async function refreshUserToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; newRefreshToken?: string }> {
  const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'enrichment.transactions:readonly',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink token refresh failed: ${response.status}`, errorText)
    throw new Error(`TOKEN_REFRESH_FAILED:${response.status}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    newRefreshToken: data.refresh_token ?? undefined,
  }
}

/**
 * Fetches all recurring transaction groups from Tink Data Enrichment API,
 * paginating through all pages.
 */
export async function fetchRecurringGroups(accessToken: string): Promise<TinkRecurringGroup[]> {
  const allGroups: TinkRecurringGroup[] = []
  let pageToken: string | undefined = undefined

  do {
    const url = new URL('https://api.tink.com/enrichment/v1/recurring-transactions-groups')
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Tink enrichment API failed: ${response.status}`, errorText)
      throw new Error(`ENRICHMENT_API_FAILED:${response.status}`)
    }

    const data: TinkRecurringGroupsResponse = await response.json()
    const groups = data.recurringTransactionsGroups ?? []
    allGroups.push(...groups)
    pageToken = data.nextPageToken || undefined
  } while (pageToken)

  return allGroups
}
