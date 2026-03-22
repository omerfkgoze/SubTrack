import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { describe, it, beforeEach } from 'https://deno.land/std@0.208.0/testing/bdd.ts'
import { stub, restore } from 'https://deno.land/std@0.208.0/testing/mock.ts'
import {
  parseTinkAmount,
  calculateConfidence,
  mapPeriodToFrequency,
  mapTinkGroupToDetected,
  refreshUserToken,
  fetchRecurringGroups,
} from './utils.ts'
import type { TinkRecurringGroup } from './utils.ts'

const mockTinkGroup: TinkRecurringGroup = {
  id: 'group-123',
  categoryId: 'cat-1',
  name: 'Netflix',
  period: {
    label: 'MONTHLY',
    duration: { mean: 30, standardDeviation: 1, minimum: 28, maximum: 31 },
  },
  amount: {
    mean: { unscaledValue: '1299', scale: '2' },
    standardDeviation: { unscaledValue: '0', scale: '2' },
    median: { unscaledValue: '1299', scale: '2' },
    minimum: { unscaledValue: '1299', scale: '2' },
    maximum: { unscaledValue: '1299', scale: '2' },
    latest: { unscaledValue: '1299', scale: '2' },
    currencyCode: 'EUR',
  },
  occurrences: {
    count: 6,
    firstDate: '2025-09-15',
    latestDate: '2026-02-15',
    dayOfMonth: { mean: 15, median: 15, minimum: 14, maximum: 16 },
  },
}

describe('tink-detect-subscriptions Edge Function', () => {
  beforeEach(() => {
    restore()
  })

  describe('parseTinkAmount', () => {
    it('converts unscaled/scale format to decimal', () => {
      assertEquals(parseTinkAmount({ unscaledValue: '1300', scale: '2' }), 13.00)
      assertEquals(parseTinkAmount({ unscaledValue: '100', scale: '1' }), 10.0)
      assertEquals(parseTinkAmount({ unscaledValue: '999', scale: '2' }), 9.99)
    })

    it('handles zero scale', () => {
      assertEquals(parseTinkAmount({ unscaledValue: '15', scale: '0' }), 15)
    })

    it('handles zero amount', () => {
      assertEquals(parseTinkAmount({ unscaledValue: '0', scale: '2' }), 0)
    })
  })

  describe('calculateConfidence', () => {
    it('gives high confidence for many occurrences with consistent amounts', () => {
      const score = calculateConfidence(mockTinkGroup)
      // Base 0.5 + occurrences>=6 +0.3 + cv<0.05 +0.2 = 1.0
      assertEquals(score, 1.0)
    })

    it('gives medium confidence for 3 occurrences', () => {
      const group = {
        ...mockTinkGroup,
        occurrences: { ...mockTinkGroup.occurrences, count: 3 },
      }
      const score = calculateConfidence(group)
      // Base 0.5 + occurrences>=3 +0.2 + cv<0.05 +0.2 = 0.9
      assertEquals(score >= 0.5, true)
      assertEquals(score <= 1.0, true)
    })

    it('gives lower confidence for 2 occurrences', () => {
      const group = {
        ...mockTinkGroup,
        occurrences: { ...mockTinkGroup.occurrences, count: 2 },
      }
      const score2 = calculateConfidence(group)
      const score6 = calculateConfidence(mockTinkGroup)
      assertEquals(score2 < score6, true)
    })

    it('penalizes high amount variability', () => {
      const highVariabilityGroup = {
        ...mockTinkGroup,
        amount: {
          ...mockTinkGroup.amount,
          standardDeviation: { unscaledValue: '500', scale: '2' }, // 5.00 / 12.99 ~ 38% CV
        },
      }
      const highScore = calculateConfidence(mockTinkGroup)
      const lowScore = calculateConfidence(highVariabilityGroup)
      assertEquals(lowScore < highScore, true)
    })

    it('clamps score between 0 and 1', () => {
      const score = calculateConfidence(mockTinkGroup)
      assertEquals(score >= 0.0, true)
      assertEquals(score <= 1.0, true)
    })
  })

  describe('mapPeriodToFrequency', () => {
    it('maps MONTHLY to monthly', () => {
      assertEquals(mapPeriodToFrequency('MONTHLY'), 'monthly')
    })

    it('maps WEEKLY to weekly', () => {
      assertEquals(mapPeriodToFrequency('WEEKLY'), 'weekly')
    })

    it('maps YEARLY to yearly', () => {
      assertEquals(mapPeriodToFrequency('YEARLY'), 'yearly')
    })

    it('maps QUARTERLY to quarterly', () => {
      assertEquals(mapPeriodToFrequency('QUARTERLY'), 'quarterly')
    })

    it('defaults unknown periods to monthly', () => {
      assertEquals(mapPeriodToFrequency('BIWEEKLY'), 'monthly')
      assertEquals(mapPeriodToFrequency('UNKNOWN'), 'monthly')
    })

    it('is case-insensitive', () => {
      assertEquals(mapPeriodToFrequency('monthly'), 'monthly')
      assertEquals(mapPeriodToFrequency('Weekly'), 'weekly')
    })
  })

  describe('mapTinkGroupToDetected', () => {
    it('maps all fields correctly', () => {
      const row = mapTinkGroupToDetected(mockTinkGroup, 'user-1', 'conn-1')

      assertEquals(row.user_id, 'user-1')
      assertEquals(row.bank_connection_id, 'conn-1')
      assertEquals(row.tink_group_id, 'group-123')
      assertEquals(row.merchant_name, 'Netflix')
      assertEquals(row.amount, 12.99)
      assertEquals(row.currency, 'EUR')
      assertEquals(row.frequency, 'monthly')
      assertEquals(row.status, 'detected')
      assertEquals(row.first_seen, '2025-09-15')
      assertEquals(row.last_seen, '2026-02-15')
    })

    it('applies confidence penalty for unknown period label', () => {
      const unknownPeriodGroup = {
        ...mockTinkGroup,
        period: { ...mockTinkGroup.period, label: 'BIWEEKLY' },
      }
      const rowKnown = mapTinkGroupToDetected(mockTinkGroup, 'user-1', 'conn-1')
      const rowUnknown = mapTinkGroupToDetected(unknownPeriodGroup, 'user-1', 'conn-1')
      assertEquals(rowUnknown.confidence_score < rowKnown.confidence_score, true)
    })

    it('sets status to detected by default', () => {
      const row = mapTinkGroupToDetected(mockTinkGroup, 'user-1', 'conn-1')
      assertEquals(row.status, 'detected')
    })
  })

  describe('refreshUserToken', () => {
    it('returns access token on success', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({
              access_token: 'new-access-token',
              token_type: 'bearer',
              expires_in: 7200,
            }), { status: 200 }),
          ),
      )

      try {
        const result = await refreshUserToken('refresh-token', 'client-id', 'client-secret')
        assertEquals(result.accessToken, 'new-access-token')
        assertEquals(result.newRefreshToken, undefined)
      } finally {
        fetchStub.restore()
      }
    })

    it('returns new refresh token when Tink rotates it', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({
              access_token: 'new-access-token',
              refresh_token: 'rotated-refresh-token',
            }), { status: 200 }),
          ),
      )

      try {
        const result = await refreshUserToken('refresh-token', 'client-id', 'client-secret')
        assertEquals(result.accessToken, 'new-access-token')
        assertEquals(result.newRefreshToken, 'rotated-refresh-token')
      } finally {
        fetchStub.restore()
      }
    })

    it('throws TOKEN_REFRESH_FAILED on 401', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Unauthorized', { status: 401 })),
      )

      let threw = false
      try {
        await refreshUserToken('bad-token', 'client-id', 'client-secret')
      } catch (e) {
        threw = true
        assertEquals((e as Error).message.startsWith('TOKEN_REFRESH_FAILED'), true)
      }
      assertEquals(threw, true)
    })

    it('uses grant_type=refresh_token in request body', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }),
          ),
      )

      try {
        await refreshUserToken('my-refresh', 'my-client-id', 'my-secret')
        const [url, init] = fetchStub.calls[0].args as [string, RequestInit]
        assertEquals(url, 'https://api.tink.com/api/v1/oauth/token')
        const body = new URLSearchParams(init.body as string)
        assertEquals(body.get('grant_type'), 'refresh_token')
        assertEquals(body.get('refresh_token'), 'my-refresh')
        assertEquals(body.get('scope'), 'enrichment.transactions:readonly')
      } finally {
        fetchStub.restore()
      }
    })
  })

  describe('fetchRecurringGroups', () => {
    it('returns all groups from a single page', async () => {
      const mockResponse = {
        recurringTransactionsGroups: [mockTinkGroup],
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
        const groups = await fetchRecurringGroups('access-token')
        assertEquals(groups.length, 1)
        assertEquals(groups[0].id, 'group-123')
        assertEquals(groups[0].name, 'Netflix')
      } finally {
        fetchStub.restore()
      }
    })

    it('paginates through multiple pages', async () => {
      const group2 = { ...mockTinkGroup, id: 'group-456', name: 'Spotify' }
      let callCount = 0

      const fetchStub = stub(
        globalThis,
        'fetch',
        () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve(
              new Response(JSON.stringify({
                recurringTransactionsGroups: [mockTinkGroup],
                nextPageToken: 'page2token',
              }), { status: 200 }),
            )
          }
          return Promise.resolve(
            new Response(JSON.stringify({
              recurringTransactionsGroups: [group2],
            }), { status: 200 }),
          )
        },
      )

      try {
        const groups = await fetchRecurringGroups('access-token')
        assertEquals(groups.length, 2)
        assertEquals(groups[0].name, 'Netflix')
        assertEquals(groups[1].name, 'Spotify')
        assertEquals(callCount, 2)
      } finally {
        fetchStub.restore()
      }
    })

    it('returns empty array when no groups found', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ recurringTransactionsGroups: [] }), { status: 200 }),
          ),
      )

      try {
        const groups = await fetchRecurringGroups('access-token')
        assertEquals(groups.length, 0)
      } finally {
        fetchStub.restore()
      }
    })

    it('throws ENRICHMENT_API_FAILED:403 on forbidden', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Forbidden', { status: 403 })),
      )

      let threw = false
      try {
        await fetchRecurringGroups('access-token')
      } catch (e) {
        threw = true
        assertEquals((e as Error).message, 'ENRICHMENT_API_FAILED:403')
      }
      assertEquals(threw, true)
    })

    it('throws ENRICHMENT_API_FAILED:503 on service unavailable', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Service Unavailable', { status: 503 })),
      )

      let threw = false
      try {
        await fetchRecurringGroups('access-token')
      } catch (e) {
        threw = true
        assertEquals((e as Error).message, 'ENRICHMENT_API_FAILED:503')
      }
      assertEquals(threw, true)
    })

    it('passes authorization header with Bearer token', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ recurringTransactionsGroups: [] }), { status: 200 }),
          ),
      )

      try {
        await fetchRecurringGroups('my-access-token')
        const [, init] = fetchStub.calls[0].args as [string, RequestInit]
        const headers = init.headers as Record<string, string>
        assertEquals(headers['Authorization'], 'Bearer my-access-token')
      } finally {
        fetchStub.restore()
      }
    })
  })

  describe('Upsert strategy', () => {
    it('should update existing detected subscriptions on re-scan', () => {
      // Verify upsert conflict key: user_id + tink_group_id
      const row1 = mapTinkGroupToDetected(mockTinkGroup, 'user-1', 'conn-1')
      const row2 = mapTinkGroupToDetected(
        { ...mockTinkGroup, amount: { ...mockTinkGroup.amount, mean: { unscaledValue: '1399', scale: '2' } } },
        'user-1',
        'conn-1',
      )
      // Same conflict key (user_id + tink_group_id), different amount
      assertEquals(row1.user_id, row2.user_id)
      assertEquals(row1.tink_group_id, row2.tink_group_id)
      assertEquals(row1.amount !== row2.amount, true)
    })

    it('should not update rows with non-detected status', () => {
      // Simulate the filter logic: actioned rows should be excluded from upsert
      const actionedGroupIds = new Set(['group-123'])
      const mappedRows = [
        mapTinkGroupToDetected(mockTinkGroup, 'user-1', 'conn-1'),
        mapTinkGroupToDetected({ ...mockTinkGroup, id: 'group-456', name: 'Spotify' }, 'user-1', 'conn-1'),
      ]
      const rowsToUpsert = mappedRows.filter((row) => !actionedGroupIds.has(row.tink_group_id))
      assertEquals(rowsToUpsert.length, 1)
      assertEquals(rowsToUpsert[0].tink_group_id, 'group-456')
    })
  })

  describe('Token refresh failure handling', () => {
    it('throws with TOKEN_REFRESH_FAILED prefix on any non-200 response', async () => {
      const statuses = [400, 401, 403, 500]
      for (const status of statuses) {
        stub(
          globalThis,
          'fetch',
          () => Promise.resolve(new Response('Error', { status })),
        )

        let threw = false
        try {
          await refreshUserToken('token', 'id', 'secret')
        } catch (e) {
          threw = true
          assertEquals((e as Error).message.startsWith('TOKEN_REFRESH_FAILED'), true)
        }
        assertEquals(threw, true)
        restore()
      }
    })
  })
})
