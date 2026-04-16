/**
 * Typed runtime environment configuration.
 * Uses EXPO_PUBLIC_ prefix for client-accessible env vars.
 *
 * IMPORTANT: babel-preset-expo only inlines STATIC process.env.EXPO_PUBLIC_* accesses.
 * Dynamic access (process.env[key]) is never inlined — always use direct member access here.
 */

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  SUPABASE_URL: requireEnv(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  TINK_CLIENT_ID: requireEnv(process.env.EXPO_PUBLIC_TINK_CLIENT_ID, 'EXPO_PUBLIC_TINK_CLIENT_ID'),
  DEMO_BANK_MODE: process.env.EXPO_PUBLIC_DEMO_BANK_MODE === 'true',
  // Set true when production build still uses Tink sandbox credentials (internal testing).
  // Remove / set false before public store release once Tink production is approved.
  TINK_TEST_MODE: process.env.EXPO_PUBLIC_TINK_TEST_MODE === 'true',
  // Only honoured in Metro dev builds (__DEV__ guard in usePremiumStore prevents production use)
  DEV_FORCE_PREMIUM: process.env.EXPO_PUBLIC_DEV_FORCE_PREMIUM === 'true',
} as const;
