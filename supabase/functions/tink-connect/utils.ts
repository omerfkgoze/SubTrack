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

/**
 * Creates a permanent Tink user (or confirms existing) so that future
 * server-side authorization-grant calls can reference the user.
 * Best-effort: failure here does not block the one-time flow.
 */
export async function createTinkUserBestEffort(
  clientAccessToken: string,
  externalUserId: string,
  market: string,
): Promise<void> {
  try {
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
    if (response.status === 201) {
      console.log('Tink user created for future use:', externalUserId)
    } else if (response.status === 409) {
      console.log('Tink user already exists:', externalUserId)
    } else {
      const text = await response.text()
      console.warn('Tink user create non-fatal:', response.status, text)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    console.warn('Tink user create best-effort failed:', msg)
  }
}

// ── Transaction Fetching (one-time flow) ──

const SEARCH_PAGE_SIZE = 100

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
  date: number
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

/**
 * Fetches user transactions from Tink Search API (last 6 months).
 * Paginates through all results using pageIndex.
 */
export async function fetchTransactions(
  accessToken: string,
): Promise<TinkSearchTransaction[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6)

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const allTransactions: TinkSearchTransaction[] = []
  let pageIndex = 0

  while (true) {
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
        pageSize: SEARCH_PAGE_SIZE,
        pageIndex,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Tink search failed: ${response.status}`, errorText)
      throw new Error(`SEARCH_API_FAILED:${response.status}`)
    }

    const data: TinkSearchResponse = await response.json()
    const page = data.results
      .filter((r) => r.type === 'TRANSACTION')
      .map((r) => r.transaction)

    allTransactions.push(...page)

    if (allTransactions.length >= data.count || page.length < SEARCH_PAGE_SIZE) break
    pageIndex++
  }

  console.log('Fetched transactions total:', allTransactions.length)
  return allTransactions
}

// ── Custom Recurring Detection ──

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

interface TransactionGroup {
  description: string
  transactions: TinkSearchTransaction[]
  amounts: number[]
  dates: number[]
  currency: string
}

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\d{2,}$/, '')
    .replace(/\s*#\d+$/, '')
    .trim()
}

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

function intervalToFrequency(days: number): 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null {
  if (days >= 5 && days <= 10) return 'weekly'
  if (days >= 25 && days <= 35) return 'monthly'
  if (days >= 80 && days <= 100) return 'quarterly'
  if (days >= 340 && days <= 400) return 'yearly'
  return null
}

function amountCV(amounts: number[]): number {
  if (amounts.length < 2) return 0
  const absAmounts = amounts.map(Math.abs)
  const mean = absAmounts.reduce((s, v) => s + v, 0) / absAmounts.length
  if (mean === 0) return 0
  const variance = absAmounts.reduce((s, v) => s + (v - mean) ** 2, 0) / absAmounts.length
  return Math.sqrt(variance) / mean
}

function calculateGroupConfidence(group: TransactionGroup, frequency: string): number {
  let score = 0.5
  const count = group.transactions.length
  if (count >= 6) score += 0.3
  else if (count >= 3) score += 0.2
  else if (count === 2) score += 0.05

  const cv = amountCV(group.amounts)
  if (cv < 0.05) score += 0.2
  else if (cv < 0.15) score += 0.1

  if (!['weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
    score -= 0.1
  }

  return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100))
}

function generateGroupId(description: string, currency: string): string {
  const input = `${normalizeDescription(description)}:${currency}`
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
 */
export function detectRecurringSubscriptions(
  transactions: TinkSearchTransaction[],
  userId: string,
  connectionId: string,
): DetectedSubscriptionRow[] {
  const outgoing = transactions.filter((t) => t.amount < 0)
  const groups = new Map<string, TransactionGroup>()

  for (const tx of outgoing) {
    const key = normalizeDescription(tx.description)
    if (!key) continue
    const currency = tx.currencyDenominatedAmount?.currencyCode ?? 'EUR'
    const existing = groups.get(key)
    if (existing) {
      existing.transactions.push(tx)
      existing.amounts.push(tx.amount)
      existing.dates.push(tx.date)
    } else {
      groups.set(key, {
        description: tx.description,
        transactions: [tx],
        amounts: [tx.amount],
        dates: [tx.date],
        currency,
      })
    }
  }

  const detected: DetectedSubscriptionRow[] = []

  for (const [, group] of groups) {
    if (group.transactions.length < 2) continue
    const medianDays = medianIntervalDays(group.dates)
    const frequency = intervalToFrequency(medianDays)
    if (!frequency) continue
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

  detected.sort((a, b) => b.confidence_score - a.confidence_score)
  return detected
}
