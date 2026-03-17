-- Migration: Add trial expiry notification support
-- Story 4.4: Trial Expiry Notifications

-- ============================================
-- 1. Add notification_type column to notification_log
-- ============================================
ALTER TABLE notification_log
  ADD COLUMN notification_type TEXT DEFAULT 'renewal' NOT NULL
  CHECK (notification_type IN ('renewal', 'trial_expiry'));

-- ============================================
-- 2. Replace unique constraint to include notification_type
-- ============================================
ALTER TABLE notification_log
  DROP CONSTRAINT notification_log_subscription_renewal_unique;

ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_subscription_date_type_unique
  UNIQUE (subscription_id, renewal_date, notification_type);

-- ============================================
-- 3. Create get_trial_expiry_candidates RPC function
-- ============================================
CREATE OR REPLACE FUNCTION get_trial_expiry_candidates(check_date DATE)
RETURNS TABLE (
  subscription_id UUID,
  subscription_name TEXT,
  price DECIMAL,
  currency TEXT,
  trial_expiry_date DATE,
  user_id UUID,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.name AS subscription_name,
    s.price,
    s.currency,
    s.trial_expiry_date,
    s.user_id,
    (s.trial_expiry_date - check_date)::INTEGER AS days_until_expiry
  FROM subscriptions s
  LEFT JOIN reminder_settings rs
    ON s.id = rs.subscription_id AND s.user_id = rs.user_id
  WHERE s.is_active = true
    AND s.is_trial = true
    AND s.trial_expiry_date IS NOT NULL
    AND (s.trial_expiry_date - check_date) IN (0, 1, 3)
    AND (rs.is_enabled IS NULL OR rs.is_enabled = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
