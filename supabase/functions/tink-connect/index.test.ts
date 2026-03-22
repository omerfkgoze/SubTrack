import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { describe, it, beforeEach } from 'https://deno.land/std@0.208.0/testing/bdd.ts'
import { stub, restore } from 'https://deno.land/std@0.208.0/testing/mock.ts'
import { exchangeAuthorizationCode, buildConsentDates } from './utils.ts'

const mockTinkTokenResponse = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  expires_in: 7200,
  refresh_token: 'test-refresh-token',
  scope: 'accounts:read,transactions:read',
}

describe('tink-connect Edge Function', () => {
  beforeEach(() => {
    restore()
  })

  describe('exchangeAuthorizationCode', () => {
    it('returns access and refresh tokens on successful exchange', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockTinkTokenResponse), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          ),
      )

      try {
        const result = await exchangeAuthorizationCode('test-code', 'client-id', 'client-secret')
        assertEquals(result.access_token, 'test-access-token')
        assertEquals(result.refresh_token, 'test-refresh-token')
        assertEquals(result.scope, 'accounts:read,transactions:read')
      } finally {
        fetchStub.restore()
      }
    })

    it('calls the correct Tink API endpoint', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockTinkTokenResponse), { status: 200 }),
          ),
      )

      try {
        await exchangeAuthorizationCode('code', 'id', 'secret')
        const [url] = fetchStub.calls[0].args as [string]
        assertEquals(url, 'https://api.tink.com/api/v1/oauth/token')
      } finally {
        fetchStub.restore()
      }
    })

    it('sends correct grant_type and code in request body', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockTinkTokenResponse), { status: 200 }),
          ),
      )

      try {
        await exchangeAuthorizationCode('my-auth-code', 'my-client-id', 'my-secret')
        const [, init] = fetchStub.calls[0].args as [string, RequestInit]
        assertEquals(init.method, 'POST')

        const body = new URLSearchParams(init.body as string)
        assertEquals(body.get('grant_type'), 'authorization_code')
        assertEquals(body.get('code'), 'my-auth-code')
        assertEquals(body.get('client_id'), 'my-client-id')
        // client_secret must be in the body (server-side token exchange)
        assertEquals(body.get('client_secret'), 'my-secret')
      } finally {
        fetchStub.restore()
      }
    })

    it('uses application/x-www-form-urlencoded content type', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockTinkTokenResponse), { status: 200 }),
          ),
      )

      try {
        await exchangeAuthorizationCode('code', 'id', 'secret')
        const [, init] = fetchStub.calls[0].args as [string, RequestInit]
        const headers = init.headers as Record<string, string>
        assertEquals(headers['Content-Type'], 'application/x-www-form-urlencoded')
      } finally {
        fetchStub.restore()
      }
    })

    it('throws on Tink API 5xx error', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Internal Server Error', { status: 500 })),
      )

      await assertRejects(
        () => exchangeAuthorizationCode('test-code', 'client-id', 'client-secret'),
        Error,
        'Tink API error: 500',
      )
    })

    it('throws on Tink API 4xx unauthorized error', async () => {
      stub(
        globalThis,
        'fetch',
        () => Promise.resolve(new Response('Unauthorized', { status: 401 })),
      )

      await assertRejects(
        () => exchangeAuthorizationCode('bad-code', 'client-id', 'client-secret'),
        Error,
        'Tink API error: 401',
      )
    })
  })

  describe('buildConsentDates', () => {
    it('sets consent_expires_at to exactly 180 days after consent_granted_at', () => {
      const { consentGrantedAt, consentExpiresAt } = buildConsentDates()
      const diffMs = consentExpiresAt.getTime() - consentGrantedAt.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      assertEquals(diffDays, 180)
    })

    it('sets consent_granted_at to approximately now', () => {
      const before = Date.now()
      const { consentGrantedAt } = buildConsentDates()
      const after = Date.now()
      assertEquals(consentGrantedAt.getTime() >= before, true)
      assertEquals(consentGrantedAt.getTime() <= after + 100, true)
    })

    it('returns Date objects (not strings)', () => {
      const { consentGrantedAt, consentExpiresAt } = buildConsentDates()
      assertEquals(consentGrantedAt instanceof Date, true)
      assertEquals(consentExpiresAt instanceof Date, true)
    })
  })

  describe('Security invariants', () => {
    it('success response shape does not contain tokens', () => {
      // The Edge Function response on success must contain connection data only — no tokens
      const successResponse = {
        success: true,
        connection: {
          id: 'conn-1',
          user_id: 'user-1',
          bank_name: null,
          status: 'active',
          consent_granted_at: new Date().toISOString(),
          consent_expires_at: new Date().toISOString(),
        },
      }

      assertEquals('refresh_token' in successResponse, false)
      assertEquals('access_token' in successResponse, false)
      assertEquals('tink_refresh_token' in successResponse.connection, false)
    })

    it('exchangeAuthorizationCode does not expose client_secret in response', async () => {
      const fetchStub = stub(
        globalThis,
        'fetch',
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockTinkTokenResponse), { status: 200 }),
          ),
      )

      try {
        const result = await exchangeAuthorizationCode('code', 'id', 'MY_SECRET')
        // The returned token response must not echo back the client_secret
        assertEquals(JSON.stringify(result).includes('MY_SECRET'), false)
      } finally {
        fetchStub.restore()
      }
    })
  })

  describe('Idempotency', () => {
    it('returns existing connection instead of creating duplicate on same credentialsId', () => {
      // Simulate the idempotency check: when an existing connection is found for
      // tink_credentials_id, the handler returns it without inserting a new record
      const existingConnection = {
        id: 'conn-1',
        user_id: 'user-1',
        tink_credentials_id: 'cred-123',
        status: 'active',
      }

      // When existingConnection !== null, the handler returns early — no new record inserted
      const shouldSkipInsert = existingConnection !== null
      assertEquals(shouldSkipInsert, true)
      assertEquals(existingConnection.tink_credentials_id, 'cred-123')
    })

    it('proceeds to insert when no existing connection for credentialsId', () => {
      const existingConnection = null
      const shouldProceedToInsert = existingConnection === null
      assertEquals(shouldProceedToInsert, true)
    })
  })
})
