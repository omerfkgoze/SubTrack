-- Create detected_subscriptions table for automatic subscription detection (Story 7.3)
CREATE TABLE detected_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  tink_group_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.00
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected', 'approved', 'dismissed', 'matched')),
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tink_group_id)
);

-- RLS: users can only SELECT their own detected subscriptions
-- INSERT/UPDATE/DELETE restricted to service role only (Edge Function writes)
ALTER TABLE detected_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own detected subscriptions"
  ON detected_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Auto-update updated_at trigger (same pattern as bank_connections)
CREATE OR REPLACE FUNCTION update_detected_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detected_subscriptions_updated_at
  BEFORE UPDATE ON detected_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_detected_subscriptions_updated_at();
