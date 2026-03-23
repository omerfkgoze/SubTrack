import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { describe, it, beforeEach } from 'https://deno.land/std@0.208.0/testing/bdd.ts'
import { stub, restore } from 'https://deno.land/std@0.208.0/testing/mock.ts'
import {
  getClientAccessToken,
  generateUserAccessToken,
  fetchTransactions,
  detectRecurringSubscriptions,
} from './utils.ts'
import type { DetectedSubscriptionRow } from './utils.ts'

// ── Helper: build a mock transaction ──

function mockTransaction(overrides: Partial<{
  id: string
  description: string
  amount: number
  date: number
  currencyCode: string
}> = {}) {
  return {
    accountId: 'acc-1',
    amount: overrides.amount ?? -12.99,
    originalAmount: overrides.amount ?? -12.99,
    categoryId: 'cat-1',
    categoryType: 'EXPENSES',
    currencyDenominatedAmount: {
      currencyCode: overrides.currencyCode ?? 'EUR',
      scale: 2,
      unscaledValue: Math.round(Math.abs(overrides.amount ?? 12.99) * 100),
    },
    date: overrides.date ?? Date.now(),
    description: overrides.description ?? 'Netflix',
    id: overrides.id ?? `tx-${Math.random().toString(36).slice(2)}`,
    type: 'DEFAULT',
  }
}

// Monthly dates going back 6 months (roughly 30 days apart)
function monthlyDates(count: number, baseDate?: number): number[] {
  const base = baseDate ?? Date.now()
  const dates: number[] = []
  for (let i = 0; i < count; i++) {
    dates.push(base - i * 30 * 24 * 60 * 60 * 1000)
  }
  return dates.reverse()
}

describe('tink-detect-subscriptions utils', () => {
  beforeEach(() => {
    restore()
  })

  // ── getClientAccessToken ──

  describe('getClientAccessToken', () => {
    it('returns access token on success', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'client-token-123' }), { status: 200 }),
          ),
      )

      try {
        const token = await getClientAccessToken('client-id', 'client-secret')
        assertEquals(token, 'client-token-123')
      } finally {
        fetchStub.restore()
      }
    })

    it('throws CLIENT_TOKEN_FAILED on non-200', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Unauthorized', { status: 401 })),
      )

      let threw = false
      try {
        await getClientAccessToken('bad-id', 'bad-secret')
      } catch (e) {
        threw = true
        assertEquals((e as Error).message.startsWith('CLIENT_TOKEN_FAILED'), true)
      }
      assertEquals(threw, true)
    })

    it('sends client_credentials grant_type', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }),
          ),
      )

      try {
        await getClientAccessToken('my-client', 'my-secret')
        const [url, init] = fetchStub.calls[0].args as [string, RequestInit]
        assertEquals(url, 'https://api.tink.com/api/v1/oauth/token')
        const body = new URLSearchParams(init.body as string)
        assertEquals(body.get('grant_type'), 'client_credentials')
        assertEquals(body.get('scope'), 'authorization:grant')
        assertEquals(body.get('client_id'), 'my-client')
      } finally {
        fetchStub.restore()
      }
    })
  })

  // ── generateUserAccessToken ──

  describe('generateUserAccessToken', () => {
    it('performs 3-step auth flow: client token → auth grant → token exchange', async () => {
      let callCount = 0
      const fetchStub = stub(
        globalThis,
        'fetch',
        () => {
          callCount++
          if (callCount === 1) {
            // Step 1: client_credentials → client access token
            return Promise.resolve(
              new Response(JSON.stringify({ access_token: 'client-token' }), { status: 200 }),
            )
          }
          if (callCount === 2) {
            // Step 2: authorization-grant → code
            return Promise.resolve(
              new Response(JSON.stringify({ code: 'auth-code-123' }), { status: 200 }),
            )
          }
          // Step 3: authorization_code → user access token
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: 'user-token', scope: 'transactions:read' }), { status: 200 }),
          )
        },
      )

      try {
        const token = await generateUserAccessToken('ext-user-1', 'client-id', 'client-secret')
        assertEquals(token, 'user-token')
        assertEquals(callCount, 3)
      } finally {
        fetchStub.restore()
      }
    })

    it('throws AUTHORIZATION_GRANT_FAILED when grant step fails', async () => {
      let callCount = 0
      stub(
        globalThis,
        'fetch',
        () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve(
              new Response(JSON.stringify({ access_token: 'client-token' }), { status: 200 }),
            )
          }
          // Grant step fails
          return Promise.resolve(new Response('Forbidden', { status: 403 }))
        },
      )

      let threw = false
      try {
        await generateUserAccessToken('ext-user', 'client-id', 'secret')
      } catch (e) {
        threw = true
        assertEquals((e as Error).message.startsWith('AUTHORIZATION_GRANT_FAILED'), true)
      }
      assertEquals(threw, true)
    })

    it('throws TOKEN_EXCHANGE_FAILED when code exchange fails', async () => {
      let callCount = 0
      stub(
        globalThis,
        'fetch',
        () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve(
              new Response(JSON.stringify({ access_token: 'client-token' }), { status: 200 }),
            )
          }
          if (callCount === 2) {
            return Promise.resolve(
              new Response(JSON.stringify({ code: 'code-123' }), { status: 200 }),
            )
          }
          // Exchange step fails
          return Promise.resolve(new Response('Server Error', { status: 500 }))
        },
      )

      let threw = false
      try {
        await generateUserAccessToken('ext-user', 'client-id', 'secret')
      } catch (e) {
        threw = true
        assertEquals((e as Error).message.startsWith('TOKEN_EXCHANGE_FAILED'), true)
      }
      assertEquals(threw, true)
    })
  })

  // ── fetchTransactions ──

  describe('fetchTransactions', () => {
    it('returns filtered TRANSACTION results', async () => {
      const mockResponse = {
        count: 2,
        results: [
          { type: 'TRANSACTION', transaction: mockTransaction({ id: 'tx-1' }) },
          { type: 'TRANSACTION', transaction: mockTransaction({ id: 'tx-2' }) },
          { type: 'CATEGORIZATION', transaction: mockTransaction({ id: 'tx-skip' }) },
        ],
      }

      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockResponse), { status: 200 }),
          ),
      )

      try {
        const txns = await fetchTransactions('access-token')
        assertEquals(txns.length, 2)
        assertEquals(txns[0].id, 'tx-1')
        assertEquals(txns[1].id, 'tx-2')
      } finally {
        fetchStub.restore()
      }
    })

    it('returns empty array when no results', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }),
          ),
      )

      try {
        const txns = await fetchTransactions('access-token')
        assertEquals(txns.length, 0)
      } finally {
        fetchStub.restore()
      }
    })

    it('throws SEARCH_API_FAILED on error response', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Service Unavailable', { status: 503 })),
      )

      let threw = false
      try {
        await fetchTransactions('access-token')
      } catch (e) {
        threw = true
        assertEquals((e as Error).message, 'SEARCH_API_FAILED:503')
      }
      assertEquals(threw, true)
    })

    it('sends POST to /api/v1/search with Bearer token', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }),
          ),
      )

      try {
        await fetchTransactions('my-access-token')
        const [url, init] = fetchStub.calls[0].args as [string, RequestInit]
        assertEquals(url, 'https://api.tink.com/api/v1/search')
        assertEquals(init.method, 'POST')
        const headers = init.headers as Record<string, string>
        assertEquals(headers['Authorization'], 'Bearer my-access-token')
      } finally {
        fetchStub.restore()
      }
    })
  })

  // ── detectRecurringSubscriptions ──

  describe('detectRecurringSubscriptions', () => {
    it('detects monthly recurring subscription from 6 transactions', () => {
      const dates = monthlyDates(6)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Netflix', amount: -12.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 1)
      assertEquals(result[0].merchant_name, 'Netflix')
      assertEquals(result[0].frequency, 'monthly')
      assertEquals(result[0].user_id, 'user-1')
      assertEquals(result[0].bank_connection_id, 'conn-1')
      assertEquals(result[0].status, 'detected')
    })

    it('returns empty for incoming (positive) transactions', () => {
      const dates = monthlyDates(6)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Salary', amount: 3000, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 0)
    })

    it('returns empty for single transaction (needs >= 2)', () => {
      const txns = [mockTransaction({ description: 'Netflix', amount: -12.99 })]
      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 0)
    })

    it('excludes transactions with unrecognizable intervals (AC4)', () => {
      // 15-day interval doesn't match any frequency range
      const dates = [0, 1, 2, 3, 4].map((i) => Date.now() - i * 15 * 24 * 60 * 60 * 1000)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'SomeService', amount: -5.00, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 0)
    })

    it('excludes groups with high amount variability (CV > 0.3)', () => {
      const dates = monthlyDates(4)
      const amounts = [-5.00, -50.00, -5.00, -50.00] // very high CV
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Unstable', amount: amounts[i], date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 0)
    })

    it('detects multiple different subscriptions', () => {
      const dates = monthlyDates(4)
      const txns = [
        ...dates.map((d, i) => mockTransaction({ id: `n-${i}`, description: 'Netflix', amount: -12.99, date: d })),
        ...dates.map((d, i) => mockTransaction({ id: `s-${i}`, description: 'Spotify', amount: -9.99, date: d })),
      ]

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 2)
      const names = result.map((r) => r.merchant_name.toLowerCase())
      assertEquals(names.includes('netflix'), true)
      assertEquals(names.includes('spotify'), true)
    })

    it('groups transactions by normalized description (strips trailing numbers)', () => {
      const dates = monthlyDates(3)
      const txns = [
        mockTransaction({ id: 'tx-1', description: 'Netflix 12345', amount: -12.99, date: dates[0] }),
        mockTransaction({ id: 'tx-2', description: 'Netflix 67890', amount: -12.99, date: dates[1] }),
        mockTransaction({ id: 'tx-3', description: 'Netflix 11111', amount: -12.99, date: dates[2] }),
      ]

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 1)
    })

    it('generates stable tink_group_id for same description+currency', () => {
      const dates = monthlyDates(3)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Netflix', amount: -12.99, date: d }),
      )

      const result1 = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      const result2 = detectRecurringSubscriptions(txns, 'user-1', 'conn-2')
      assertEquals(result1[0].tink_group_id, result2[0].tink_group_id)
    })

    // ── AC3: Confidence Scoring ──

    it('AC3: gives high confidence (1.0) for 6+ occurrences with consistent amounts', () => {
      const dates = monthlyDates(6)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Netflix', amount: -12.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      // base 0.5 + 0.3 (6+ occurrences) + 0.2 (CV < 0.05) = 1.0
      assertEquals(result[0].confidence_score, 1.0)
    })

    it('AC3: gives 0.9 for 3-5 occurrences with consistent amounts', () => {
      const dates = monthlyDates(4)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Netflix', amount: -12.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      // base 0.5 + 0.2 (3-5 occurrences) + 0.2 (CV < 0.05) = 0.9
      assertEquals(result[0].confidence_score, 0.9)
    })

    it('AC3: gives 0.75 for 2 occurrences with consistent amounts', () => {
      const dates = monthlyDates(2)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Netflix', amount: -12.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      // base 0.5 + 0.05 (2 occurrences) + 0.2 (CV < 0.05) = 0.75
      assertEquals(result[0].confidence_score, 0.75)
    })

    it('AC3: no penalty for high CV (only bonuses per spec)', () => {
      const dates = monthlyDates(6)
      // Slightly variable amounts (CV around 0.15-0.3 range)
      const amounts = [-12.99, -13.50, -12.99, -14.00, -12.99, -13.00]
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'VariableService', amount: amounts[i], date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      if (result.length > 0) {
        // Score should be >= base (0.5) since AC3 only specifies bonuses
        assertEquals(result[0].confidence_score >= 0.5, true)
      }
    })

    // ── AC4: Frequency Mapping ──

    it('AC4: detects weekly frequency (5-10 day intervals)', () => {
      const base = Date.now()
      const dates = [0, 1, 2, 3, 4, 5].map((i) => base - i * 7 * 24 * 60 * 60 * 1000).reverse()
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'WeeklyService', amount: -4.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 1)
      assertEquals(result[0].frequency, 'weekly')
    })

    it('AC4: detects quarterly frequency (80-100 day intervals)', () => {
      const base = Date.now()
      const dates = [0, 1, 2].map((i) => base - i * 90 * 24 * 60 * 60 * 1000).reverse()
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'QuarterlyService', amount: -29.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 1)
      assertEquals(result[0].frequency, 'quarterly')
    })

    it('AC4: detects yearly frequency (340-400 day intervals)', () => {
      const base = Date.now()
      const dates = [0, 1].map((i) => base - i * 365 * 24 * 60 * 60 * 1000).reverse()
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'YearlyService', amount: -99.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 1)
      assertEquals(result[0].frequency, 'yearly')
    })

    it('sorts results by confidence descending', () => {
      const dates6 = monthlyDates(6)
      const dates2 = monthlyDates(2)
      const txns = [
        ...dates2.map((d, i) => mockTransaction({ id: `lo-${i}`, description: 'LowConf', amount: -5.00, date: d })),
        ...dates6.map((d, i) => mockTransaction({ id: `hi-${i}`, description: 'HighConf', amount: -10.00, date: d })),
      ]

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result.length, 2)
      assertEquals(result[0].confidence_score >= result[1].confidence_score, true)
    })

    it('sets first_seen and last_seen as ISO date strings', () => {
      const dates = monthlyDates(3)
      const txns = dates.map((d, i) =>
        mockTransaction({ id: `tx-${i}`, description: 'Netflix', amount: -12.99, date: d }),
      )

      const result = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(result[0].first_seen.match(/^\d{4}-\d{2}-\d{2}$/) !== null, true)
      assertEquals(result[0].last_seen.match(/^\d{4}-\d{2}-\d{2}$/) !== null, true)
    })
  })

  // ── Upsert strategy ──

  describe('Upsert strategy', () => {
    it('same description+currency produces same tink_group_id (for upsert conflict)', () => {
      const dates = monthlyDates(3)
      const txns1 = dates.map((d, i) =>
        mockTransaction({ id: `a-${i}`, description: 'Netflix', amount: -12.99, date: d }),
      )
      const txns2 = dates.map((d, i) =>
        mockTransaction({ id: `b-${i}`, description: 'Netflix', amount: -13.99, date: d }),
      )

      const result1 = detectRecurringSubscriptions(txns1, 'user-1', 'conn-1')
      const result2 = detectRecurringSubscriptions(txns2, 'user-1', 'conn-1')

      assertEquals(result1[0].tink_group_id, result2[0].tink_group_id)
      assertEquals(result1[0].amount !== result2[0].amount, true)
    })

    it('actioned rows can be filtered by tink_group_id Set', () => {
      const dates = monthlyDates(3)
      const txns = [
        ...dates.map((d, i) => mockTransaction({ id: `n-${i}`, description: 'Netflix', amount: -12.99, date: d })),
        ...dates.map((d, i) => mockTransaction({ id: `s-${i}`, description: 'Spotify', amount: -9.99, date: d })),
      ]

      const allDetected = detectRecurringSubscriptions(txns, 'user-1', 'conn-1')
      assertEquals(allDetected.length, 2)

      // Simulate filtering out actioned group
      const actionedIds = new Set([allDetected[0].tink_group_id])
      const toUpsert = allDetected.filter((r) => !actionedIds.has(r.tink_group_id))
      assertEquals(toUpsert.length, 1)
    })
  })
})
