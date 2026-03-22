-- Add server-side refresh token storage for Tink bank connections (Story 7.1 code review fix)
--
-- Security notes:
--   - tink_refresh_token is never returned to client application code
--   - The Edge Function reads/writes this column using the service role key (bypasses client RLS)
--   - The RLS SELECT policy allows clients to query bank_connections, but application code
--     must always project specific columns (excluding tink_refresh_token) when using client SDK
--   - Production hardening: use pgcrypto pgp_sym_encrypt() or Supabase Vault for at-rest encryption

ALTER TABLE bank_connections
  ADD COLUMN IF NOT EXISTS tink_refresh_token TEXT;
