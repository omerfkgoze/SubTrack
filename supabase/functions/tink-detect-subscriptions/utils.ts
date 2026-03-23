// ── Types ──

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

interface TinkSearchTransaction {
  accountId: string
  amount: number
  originalAmount: number
  categoryId: string
  categoryType: string
  currencyDenominatedAmount?: {
    currencyCode: string
    scale: number
    unscaledValue: number
  }
  date: number // epoch ms
  description: string
  id: string
  type: string
}

interface TinkSearchResult {
  transaction: TinkSearchTransaction
  type: string
}

interface TinkSearchResponse {
  count: number
  results: TinkSearchResult[]
}

// ── Tink Auth ──

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
    throw new Error(`CLIENT_TOKEN_FAILED:${response.status}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Generates a fresh user access token via server-side authorization grant.
 * Uses the permanent Tink user (created by tink-link-session).
 */
export async function generateUserAccessToken(
  externalUserId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const clientAccessToken = await getClientAccessToken(clientId, clientSecret)

  const grantResponse = await fetch('https://api.tink.com/api/v1/oauth/authorization-grant', {
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

  if (!grantResponse.ok) {
    const errorText = await grantResponse.text()
    console.error(`Tink authorization-grant failed: ${grantResponse.status}`, errorText)
    throw new Error(`AUTHORIZATION_GRANT_FAILED:${grantResponse.status}`)
  }

  const grantData = await grantResponse.json()

  const tokenResponse = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: grantData.code,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error(`Tink user token exchange failed: ${tokenResponse.status}`, errorText)
    throw new Error(`TOKEN_EXCHANGE_FAILED:${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  console.log('User access token scopes:', tokenData.scope)
  return tokenData.access_token
}

// ── Fetch Transactions ──

/**
 * Fetches user transactions from Tink Search API (last 6 months).
 * Uses transactions:read scope — no enrichment scope needed.
 */
export async function fetchTransactions(
  accessToken: string,
): Promise<TinkSearchTransaction[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6)

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const response = await fetch('https://api.tink.com/api/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      includeUpcoming: false,
      order: 'ASC',
      sort: 'DATE',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tink search failed: ${response.status}`, errorText)
    throw new Error(`SEARCH_API_FAILED:${response.status}`)
  }

  const data: TinkSearchResponse = await response.json()
  console.log('Fetched transactions:', data.count)

  return data.results
    .filter((r) => r.type === 'TRANSACTION')
    .map((r) => r.transaction)
}

// ── Custom Recurring Detection ──

interface TransactionGroup {
  description: string
  transactions: TinkSearchTransaction[]
  amounts: number[]
  dates: number[]
  currency: string
}

/**
 * Normalizes a transaction description for grouping.
 * Removes trailing numbers/whitespace, lowercases.
 */
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\d{2,}$/, '') // trailing numbers (e.g. reference IDs)
    .replace(/\s*#\d+$/, '')
    .trim()
}

/**
 * Calculates the median interval in days between sorted dates.
 */
function medianIntervalDays(dates: number[]): number {
  if (dates.length < 2) return 0
  const sorted = [...dates].sort((a, b) => a - b)
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24))
  }
  intervals.sort((a, b) => a - b)
  const mid = Math.floor(intervals.length / 2)
  return intervals.length % 2 === 0
    ? (intervals[mid - 1] + intervals[mid]) / 2
    : intervals[mid]
}

/**
 * Maps median interval in days to a billing frequency.
 */
function intervalToFrequency(days: number): 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null {
  if (days >= 5 && days <= 10) return 'weekly'
  if (days >= 25 && days <= 35) return 'monthly'
  if (days >= 80 && days <= 100) return 'quarterly'
  if (days >= 340 && days <= 400) return 'yearly'
  return null
}

/**
 * Calculates coefficient of variation for amounts.
 */
function amountCV(amounts: number[]): number {
  if (amounts.length < 2) return 0
  const absAmounts = amounts.map(Math.abs)
  const mean = absAmounts.reduce((s, v) => s + v, 0) / absAmounts.length
  if (mean === 0) return 0
  const variance = absAmounts.reduce((s, v) => s + (v - mean) ** 2, 0) / absAmounts.length
  return Math.sqrt(variance) / mean
}

/**
 * Calculates a confidence score (0.0 - 1.0) for a transaction group.
 */
function calculateGroupConfidence(group: TransactionGroup, frequency: string): number {
  let score = 0.5

  // Occurrence count
  const count = group.transactions.length
  if (count >= 6) score += 0.3
  else if (count >= 3) score += 0.2
  else if (count === 2) score += 0.05

  // Amount consistency
  const cv = amountCV(group.amounts)
  if (cv < 0.05) score += 0.2
  else if (cv < 0.15) score += 0.1
  else score -= 0.1

  // Frequency recognition bonus
  if (['weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
    score += 0.0 // recognized, no penalty
  } else {
    score -= 0.1
  }

  return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100))
}

/**
 * Generates a stable group ID from description + currency (replaces tink_group_id).
 */
function generateGroupId(description: string, currency: string): string {
  const input = `${normalizeDescription(description)}:${currency}`
  // Simple hash — deterministic, no crypto needed
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return `custom_${Math.abs(hash).toString(16)}`
}

/**
 * Detects recurring subscriptions from raw transactions.
 * Groups by normalized description, checks for regular intervals
 * and consistent amounts.
 */
export function detectRecurringSubscriptions(
  transactions: TinkSearchTransaction[],
  userId: string,
  connectionId: string,
): DetectedSubscriptionRow[] {
  // Only consider outgoing transactions (negative amounts)
  const outgoing = transactions.filter((t) => t.amount < 0)

  // Group by normalized description
  const groups = new Map<string, TransactionGroup>()

  for (const tx of outgoing) {
    const key = normalizeDescription(tx.description)
    if (!key) continue

    const existing = groups.get(key)
    const currency = tx.currencyDenominatedAmount?.currencyCode ?? 'EUR'

    if (existing) {
      existing.transactions.push(tx)
      existing.amounts.push(tx.amount)
      existing.dates.push(tx.date)
    } else {
      groups.set(key, {
        description: tx.description, // keep original for display
        transactions: [tx],
        amounts: [tx.amount],
        dates: [tx.date],
        currency,
      })
    }
  }

  const detected: DetectedSubscriptionRow[] = []

  for (const [, group] of groups) {
    // Need at least 2 transactions to detect a pattern
    if (group.transactions.length < 2) continue

    // Check interval regularity
    const medianDays = medianIntervalDays(group.dates)
    const frequency = intervalToFrequency(medianDays)

    // Skip if no recognizable frequency
    if (!frequency) continue

    // Check amount consistency (CV < 0.3 = relatively consistent)
    const cv = amountCV(group.amounts)
    if (cv > 0.3) continue

    const sortedDates = [...group.dates].sort((a, b) => a - b)
    const firstDate = new Date(sortedDates[0])
    const lastDate = new Date(sortedDates[sortedDates.length - 1])

    const meanAmount = Math.abs(
      group.amounts.reduce((s, v) => s + v, 0) / group.amounts.length,
    )

    const confidence = calculateGroupConfidence(group, frequency)
    const groupId = generateGroupId(group.description, group.currency)

    detected.push({
      user_id: userId,
      bank_connection_id: connectionId,
      tink_group_id: groupId,
      merchant_name: group.description,
      amount: Math.round(meanAmount * 100) / 100,
      currency: group.currency,
      frequency,
      confidence_score: confidence,
      status: 'detected',
      first_seen: firstDate.toISOString().split('T')[0],
      last_seen: lastDate.toISOString().split('T')[0],
    })
  }

  // Sort by confidence descending
  detected.sort((a, b) => b.confidence_score - a.confidence_score)

  return detected
}
