import {
  buildTinkLinkUrl,
  TINK_REDIRECT_URI,
  parseCallbackFromUrl,
  isTinkCallbackUrl,
  parseTinkError,
} from './bankService';

jest.mock('expo-linking', () => ({
  parse: jest.fn((url: string) => {
    try {
      const urlObj = new URL(url);
      const queryParams: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      return {
        hostname: urlObj.hostname,
        path: urlObj.pathname.slice(1),
        queryParams,
      };
    } catch {
      // Handle custom scheme URLs
      const queryStart = url.indexOf('?');
      if (queryStart === -1) return { hostname: null, path: null, queryParams: {} };
      const queryString = url.slice(queryStart + 1);
      const queryParams: Record<string, string> = {};
      queryString.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key) queryParams[key] = decodeURIComponent(value ?? '');
      });
      return { hostname: null, path: null, queryParams };
    }
  }),
}));

describe('bankService', () => {
  describe('buildTinkLinkUrl', () => {
    it('builds URL with required parameters', () => {
      const url = buildTinkLinkUrl({
        clientId: 'test-client-id',
        redirectUri: 'subtrack://tink/callback',
      });

      expect(url).toContain('https://link.tink.com');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('scope=accounts%3Aread%2Ctransactions%3Aread');
    });

    it('includes market parameter when provided', () => {
      const url = buildTinkLinkUrl({
        clientId: 'test-client-id',
        redirectUri: 'subtrack://tink/callback',
        market: 'DE',
      });

      expect(url).toContain('market=DE');
    });

    it('includes locale parameter when provided', () => {
      const url = buildTinkLinkUrl({
        clientId: 'test-client-id',
        redirectUri: 'subtrack://tink/callback',
        locale: 'en_US',
      });

      expect(url).toContain('locale=en_US');
    });
  });

  describe('TINK_REDIRECT_URI', () => {
    it('is subtrack://tink/callback', () => {
      expect(TINK_REDIRECT_URI).toBe('subtrack://tink/callback');
    });
  });

  describe('parseCallbackFromUrl', () => {
    it('extracts authorization code from callback URL', () => {
      const url = 'subtrack://tink/callback?code=test-auth-code-123';
      const result = parseCallbackFromUrl(url);
      expect(result?.authorizationCode).toBe('test-auth-code-123');
    });

    it('also extracts credentialsId when present', () => {
      const url = 'subtrack://tink/callback?code=test-code&credentialsId=cred-456';
      const result = parseCallbackFromUrl(url);
      expect(result?.authorizationCode).toBe('test-code');
      expect(result?.credentialsId).toBe('cred-456');
    });

    it('returns null credentialsId when not in URL', () => {
      const url = 'subtrack://tink/callback?code=test-code';
      const result = parseCallbackFromUrl(url);
      expect(result?.credentialsId).toBeNull();
    });

    it('returns null when no code parameter', () => {
      const url = 'subtrack://tink/callback?error=cancelled';
      const result = parseCallbackFromUrl(url);
      expect(result).toBeNull();
    });

    it('returns null for empty code', () => {
      const url = 'subtrack://tink/callback?code=';
      const result = parseCallbackFromUrl(url);
      expect(result).toBeNull();
    });
  });

  describe('isTinkCallbackUrl', () => {
    it('returns true for valid callback URL', () => {
      expect(isTinkCallbackUrl('subtrack://tink/callback?code=abc')).toBe(true);
    });

    it('returns true for callback URL without params', () => {
      expect(isTinkCallbackUrl('subtrack://tink/callback')).toBe(true);
    });

    it('returns false for non-callback URL', () => {
      expect(isTinkCallbackUrl('https://link.tink.com/something')).toBe(false);
    });
  });

  describe('parseTinkError', () => {
    it('extracts error from callback URL', () => {
      const url = 'subtrack://tink/callback?error=user_cancelled';
      const error = parseTinkError(url);
      expect(error).toBe('user_cancelled');
    });

    it('returns null when no error', () => {
      const url = 'subtrack://tink/callback?code=abc';
      const error = parseTinkError(url);
      expect(error).toBeNull();
    });
  });
});
