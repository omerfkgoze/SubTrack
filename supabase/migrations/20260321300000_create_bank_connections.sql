-- Create bank_connections table for Open Banking integration (Story 7.1)
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'tink',
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expiring_soon', 'expired', 'error', 'disconnected')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_granted_at TIMESTAMPTZ,
  consent_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  tink_credentials_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank connections"
  ON bank_connections FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank connections"
  ON bank_connections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank connections"
  ON bank_connections FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bank_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_connections_updated_at
  BEFORE UPDATE ON bank_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_connections_updated_at();
