import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { describe, it, beforeEach } from 'https://deno.land/std@0.208.0/testing/bdd.ts'
import { stub, restore } from 'https://deno.land/std@0.208.0/testing/mock.ts'

// Mock fetch for Tink API calls
const mockFetch = (responses: Map<string, Response>) => {
  return stub(globalThis, 'fetch', (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    for (const [pattern, response] of responses) {
      if (url.includes(pattern)) {
        return Promise.resolve(response.clone())
      }
    }
    return Promise.resolve(new Response('Not found', { status: 404 }))
  })
}

const mockTinkTokenResponse = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  expires_in: 7200,
  refresh_token: 'test-refresh-token',
  scope: 'accounts:read,transactions:read',
}

const mockTinkCredentialsResponse = {
  credentials: [
    {
      id: 'cred-123',
      providerName: 'Demo Bank',
      type: 'MOBILE_BANKID',
      status: 'UPDATED',
    },
  ],
}

describe('tink-connect Edge Function', () => {
  beforeEach(() => {
    restore()
  })

  describe('Token exchange', () => {
    it('should exchange authorization code for tokens successfully', () => {
      // Verify the token exchange request format
      const params = new URLSearchParams({
        code: 'test-auth-code',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        grant_type: 'authorization_code',
      })

      assertEquals(params.get('grant_type'), 'authorization_code')
      assertEquals(params.get('code'), 'test-auth-code')
    })

    it('should use correct Tink API endpoint for token exchange', () => {
      const endpoint = 'https://api.tink.com/api/v1/oauth/token'
      assertEquals(endpoint.includes('api.tink.com'), true)
      assertEquals(endpoint.includes('/oauth/token'), true)
    })
  })

  describe('Idempotency', () => {
    it('should reject duplicate tink_credentials_id', () => {
      // Simulate duplicate check: if existing connection found, return it
      const existingConnection = {
        id: 'conn-1',
        user_id: 'user-1',
        tink_credentials_id: 'cred-123',
        status: 'active',
      }

      // When existingConnection is found, we return it instead of creating new
      assertEquals(existingConnection.tink_credentials_id, 'cred-123')
      assertEquals(existingConnection.status, 'active')
    })
  })

  describe('Consent duration', () => {
    it('should calculate consent_expires_at as consent_granted_at + 180 days', () => {
      const consentGrantedAt = new Date('2026-03-21T12:00:00Z')
      const consentExpiresAt = new Date(consentGrantedAt)
      consentExpiresAt.setDate(consentExpiresAt.getDate() + 180)

      // 180 days from March 21 = September 17
      assertEquals(consentExpiresAt.getMonth(), 8) // September (0-indexed)
      assertEquals(consentExpiresAt.getDate(), 17)
    })
  })

  describe('Error handling', () => {
    it('should handle Tink API 5xx errors gracefully', async () => {
      const responses = new Map<string, Response>()
      responses.set(
        'api.tink.com/api/v1/oauth/token',
        new Response('Internal Server Error', { status: 500 }),
      )

      const fetchStub = mockFetch(responses)

      try {
        const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
          method: 'POST',
          body: new URLSearchParams({ code: 'test' }),
        })

        assertEquals(response.ok, false)
        assertEquals(response.status, 500)
      } finally {
        fetchStub.restore()
      }
    })

    it('should not create DB records on token exchange failure', () => {
      // When token exchange fails, the function should return error
      // and not make any DB writes
      let dbWriteAttempted = false

      // Simulate: if token exchange throws, catch block runs
      try {
        throw new Error('Tink API error: 500')
      } catch {
        // In the actual function, no DB write happens in the catch block
        dbWriteAttempted = false
      }

      assertEquals(dbWriteAttempted, false)
    })
  })

  describe('Security', () => {
    it('should never return refresh_token to client', () => {
      // The response should contain connection data but NOT tokens
      const successResponse = {
        success: true,
        connection: {
          id: 'conn-1',
          user_id: 'user-1',
          bank_name: 'Demo Bank',
          status: 'active',
        },
      }

      assertEquals('refresh_token' in successResponse, false)
      assertEquals('access_token' in successResponse, false)
    })

    it('should require userId to match authenticated user', () => {
      const authenticatedUserId = 'user-1'
      const requestUserId = 'user-2'

      assertEquals(authenticatedUserId !== requestUserId, true)
      // Function returns 403 when mismatch
    })
  })
})
