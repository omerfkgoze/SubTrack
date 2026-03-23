-- Add indexes for common query patterns on detected_subscriptions (Story 7.3 review fix M2)
-- (user_id, status): used by tink-detect-subscriptions to filter actioned vs detected rows
-- bank_connection_id: used for connection-based lookups
CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_user_status
  ON detected_subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_detected_subscriptions_bank_connection
  ON detected_subscriptions (bank_connection_id);

-- Enable RLS on provider_cache (Supabase enables by default on remote;
-- aligning local migration to match remote state)
ALTER TABLE provider_cache ENABLE ROW LEVEL SECURITY;
