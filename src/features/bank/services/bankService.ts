import * as Linking from 'expo-linking';

const TINK_LINK_BASE_URL = 'https://link.tink.com/1.0/transactions/connect-accounts';

export interface TinkLinkParams {
  clientId: string;
  redirectUri: string;
  market?: string;
  locale?: string;
  authorizationCode?: string;
}

/**
 * Builds the Tink Link URL for the WebView.
 * The user authenticates with their bank inside Tink Link.
 * On completion, Tink redirects to the redirect URI with an authorization code.
 */
export function buildTinkLinkUrl(params: TinkLinkParams): string {
  const url = new URL(TINK_LINK_BASE_URL);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  if (params.market) {
    url.searchParams.set('market', params.market);
  }
  if (params.locale) {
    url.searchParams.set('locale', params.locale);
  }
  if (params.authorizationCode) {
    // Permanent user flow: scope is determined by the delegated authorization, not the URL
    url.searchParams.set('authorization_code', params.authorizationCode);
  } else {
    // One-time access flow: scope must be in the URL
    url.searchParams.set('scope', 'accounts:read,transactions:read');
  }
  // Enable test/demo providers in sandbox
  if (__DEV__) {
    url.searchParams.set('test', 'true');
  }
  return url.toString();
}

/**
 * The redirect URI for Tink Link callback.
 * Must match what's configured in Tink Console.
 */
export const TINK_REDIRECT_URI = 'subtrack://tink/callback';

/**
 * Parsed result from a Tink callback URL.
 */
export interface TinkCallbackResult {
  authorizationCode: string;
  credentialsId: string | null;
}

/**
 * Parses the authorization code and credentialsId from a Tink callback URL.
 * Returns the parsed result if code is found, null otherwise.
 */
export function parseCallbackFromUrl(url: string): TinkCallbackResult | null {
  try {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;
    if (typeof code === 'string' && code.length > 0) {
      const credentialsId = parsed.queryParams?.credentialsId;
      return {
        authorizationCode: code,
        credentialsId: typeof credentialsId === 'string' ? credentialsId : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if a URL is a Tink callback URL.
 */
export function isTinkCallbackUrl(url: string): boolean {
  return url.startsWith('subtrack://tink/callback');
}

/**
 * Checks if the callback URL indicates an error.
 */
export function parseTinkError(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const error = parsed.queryParams?.error;
    if (typeof error === 'string' && error.length > 0) {
      return error;
    }
    return null;
  } catch {
    return null;
  }
}
