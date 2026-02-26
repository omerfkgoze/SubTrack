export interface DeepLinkResult {
  type: 'recovery' | 'unknown';
  accessToken?: string;
  refreshToken?: string;
}

const RESET_PASSWORD_REDIRECT_URL = 'subtrack://reset-password';

export function getResetPasswordRedirectUrl(): string {
  return RESET_PASSWORD_REDIRECT_URL;
}

function parseSupabaseFragment(url: string): Record<string, string> {
  const fragmentIndex = url.indexOf('#');
  if (fragmentIndex === -1) return {};

  const fragment = url.substring(fragmentIndex + 1);
  const params: Record<string, string> = {};

  fragment.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });

  return params;
}

export function parseSupabaseDeepLink(url: string): DeepLinkResult {
  const params = parseSupabaseFragment(url);

  if (params.type === 'recovery' && params.access_token && params.refresh_token) {
    return {
      type: 'recovery',
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
    };
  }

  return { type: 'unknown' };
}
