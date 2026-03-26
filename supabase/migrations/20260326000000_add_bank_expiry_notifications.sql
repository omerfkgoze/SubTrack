-- Migration: Add bank connection expiry notification support
-- Story 7.9: Bank Connection Expiry Notifications

-- ============================================
-- 1. Widen notification_type CHECK constraint
-- ============================================
ALTER TABLE notification_log DROP CONSTRAINT notification_log_notification_type_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_notification_type_check
  CHECK (notification_type IN ('renewal', 'trial_expiry', 'bank_expiry'));

-- ============================================
-- 2. Add bank_connection_id column (nullable — NULL for subscription notifications)
-- ============================================
ALTER TABLE notification_log
  ADD COLUMN bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL;

-- ============================================
-- 3. Add unique constraint for bank expiry deduplication
-- ============================================
ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_bank_date_type_unique
  UNIQUE (bank_connection_id, renewal_date, notification_type);

-- ============================================
-- 4. Create get_bank_expiry_candidates RPC function
-- ============================================
CREATE OR REPLACE FUNCTION get_bank_expiry_candidates(check_date DATE)
RETURNS TABLE (
  bank_connection_id UUID,
  bank_name TEXT,
  consent_expires_at DATE,
  user_id UUID,
  days_until_expiry INTEGER,
  connection_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id AS bank_connection_id,
    bc.bank_name,
    bc.consent_expires_at::DATE,
    bc.user_id,
    (bc.consent_expires_at::DATE - check_date)::INTEGER AS days_until_expiry,
    bc.status AS connection_status
  FROM bank_connections bc
  WHERE bc.status IN ('active', 'expiring_soon')
    AND (bc.consent_expires_at::DATE - check_date) BETWEEN -30 AND 7;
    -- -30 to catch recently expired (up to 30 days), 7 for approaching expiry
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
