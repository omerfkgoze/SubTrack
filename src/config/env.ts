/**
 * Typed runtime environment configuration.
 * Uses EXPO_PUBLIC_ prefix for client-accessible env vars.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  TINK_CLIENT_ID: string;
  DEMO_BANK_MODE: boolean;
  /**
   * DEV ONLY — forces isPremium=true without a real purchase.
   * Only active when __DEV__ is true (i.e. Metro dev builds).
   * Has zero effect in production/EAS builds because __DEV__ is always false there.
   */
  DEV_FORCE_PREMIUM: boolean;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env: Env = {
  SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  TINK_CLIENT_ID: getEnvVar('EXPO_PUBLIC_TINK_CLIENT_ID'),
  DEMO_BANK_MODE: process.env.EXPO_PUBLIC_DEMO_BANK_MODE === 'true',
  // Only honoured in Metro dev builds (__DEV__ guard in usePremiumStore prevents production use)
  DEV_FORCE_PREMIUM: process.env.EXPO_PUBLIC_DEV_FORCE_PREMIUM === 'true',
};
