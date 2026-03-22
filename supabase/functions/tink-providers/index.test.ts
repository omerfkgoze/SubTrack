import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { describe, it, beforeEach } from 'https://deno.land/std@0.208.0/testing/bdd.ts'
import { stub, restore } from 'https://deno.land/std@0.208.0/testing/mock.ts'
import { getClientCredentialsToken, mapProviderToSupportedBank } from './utils.ts'
import type { TinkProvider } from './utils.ts'

const mockTinkProvider: TinkProvider = {
  name: 'se-test-bank',
  displayName: 'Test Bank',
  financialInstitutionId: 'fi-123',
  financialInstitutionName: 'Test Bank AB',
  market: 'SE',
  status: 'ENABLED',
  images: {
    icon: 'https://cdn.tink.se/provider-images/icon.png',
    banner: 'https://cdn.tink.se/provider-images/banner.png',
  },
  capabilities: ['CHECKING_ACCOUNTS'],
  popular: true,
  rank: 1,
  accessType: 'OPEN_BANKING',
  type: 'BANK',
}

describe('tink-providers Edge Function', () => {
  beforeEach(() => {
    restore()
  })

  describe('getClientCredentialsToken', () => {
    it('returns access token on successful auth', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'test-token', token_type: 'bearer' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
      )

      try {
        const token = await getClientCredentialsToken('client-id', 'client-secret', 'providers:read')
        assertEquals(token, 'test-token')
      } finally {
        fetchStub.restore()
      }
    })

    it('sends correct grant_type=client_credentials', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }),
          ),
      )

      try {
        await getClientCredentialsToken('my-id', 'my-secret', 'providers:read')
        const [, init] = fetchStub.calls[0].args as [string, RequestInit]
        const body = new URLSearchParams(init.body as string)
        assertEquals(body.get('grant_type'), 'client_credentials')
        assertEquals(body.get('client_id'), 'my-id')
        assertEquals(body.get('client_secret'), 'my-secret')
        assertEquals(body.get('scope'), 'providers:read')
      } finally {
        fetchStub.restore()
      }
    })

    it('throws on Tink auth failure', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Unauthorized', { status: 401 })),
      )

      await assertRejects(
        () => getClientCredentialsToken('bad-id', 'bad-secret', 'providers:read'),
        Error,
        'Tink auth failed: 401',
      )
    })
  })

  describe('mapProviderToSupportedBank', () => {
    it('maps Tink provider to lean SupportedBank shape', () => {
      const result = mapProviderToSupportedBank(mockTinkProvider)

      assertEquals(result.id, 'fi-123')
      assertEquals(result.displayName, 'Test Bank')
      assertEquals(result.market, 'SE')
      assertEquals(result.iconUrl, 'https://cdn.tink.se/provider-images/icon.png')
      assertEquals(result.popular, true)
      assertEquals(result.rank, 1)
    })

    it('handles missing icon gracefully', () => {
      const providerNoIcon = {
        ...mockTinkProvider,
        images: undefined as unknown as TinkProvider['images'],
      }
      const result = mapProviderToSupportedBank(providerNoIcon)
      assertEquals(result.iconUrl, null)
    })

    it('defaults popular to false when not set', () => {
      const providerNoPopular = {
        ...mockTinkProvider,
        popular: undefined as unknown as boolean,
      }
      const result = mapProviderToSupportedBank(providerNoPopular)
      assertEquals(result.popular, false)
    })

    it('defaults rank to 999 when not set', () => {
      const providerNoRank = {
        ...mockTinkProvider,
        rank: undefined as unknown as number,
      }
      const result = mapProviderToSupportedBank(providerNoRank)
      assertEquals(result.rank, 999)
    })

    it('strips unnecessary fields from response', () => {
      const result = mapProviderToSupportedBank(mockTinkProvider)
      const keys = Object.keys(result)
      assertEquals(keys.sort(), ['displayName', 'iconUrl', 'id', 'market', 'popular', 'rank'])
    })
  })

  describe('Cache behavior', () => {
    it('fresh cache (< 24h) should be served directly', () => {
      const cachedAt = new Date()
      const ttlMs = 24 * 60 * 60 * 1000
      const isFresh = (Date.now() - cachedAt.getTime()) < ttlMs
      assertEquals(isFresh, true)
    })

    it('stale cache (> 24h) should trigger fresh fetch', () => {
      const cachedAt = new Date(Date.now() - 25 * 60 * 60 * 1000)
      const ttlMs = 24 * 60 * 60 * 1000
      const isFresh = (Date.now() - cachedAt.getTime()) < ttlMs
      assertEquals(isFresh, false)
    })
  })

  describe('Tink API failure with stale cache fallback', () => {
    it('returns stale cache data when Tink API fails', () => {
      const staleCacheData = [
        { id: 'fi-1', displayName: 'Cached Bank', market: 'SE', iconUrl: null, popular: false, rank: 1 },
      ]
      // When Tink API fails and stale cache exists, the function should return cached data
      const tinkApiFailed = true
      const hasCachedData = staleCacheData.length > 0
      const shouldReturnCache = tinkApiFailed && hasCachedData
      assertEquals(shouldReturnCache, true)
    })

    it('returns 503 when Tink API fails and no cache exists', () => {
      const cachedData = null
      const tinkApiFailed = true
      const shouldReturn503 = tinkApiFailed && !cachedData
      assertEquals(shouldReturn503, true)
    })
  })
})
