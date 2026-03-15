-- Migration: Create reminder_settings and notification_log tables
-- Story 4.2: Renewal Reminder Scheduling

-- ============================================
-- 1. reminder_settings table
-- ============================================
CREATE TABLE reminder_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  remind_days_before INTEGER DEFAULT 3 NOT NULL CHECK (remind_days_before IN (1, 3, 7)),
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One reminder setting per subscription per user
ALTER TABLE reminder_settings
  ADD CONSTRAINT reminder_settings_user_subscription_unique
  UNIQUE (user_id, subscription_id);

-- RLS
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder settings"
  ON reminder_settings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own reminder settings"
  ON reminder_settings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own reminder settings"
  ON reminder_settings FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own reminder settings"
  ON reminder_settings FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Reuse existing trigger function for updated_at
CREATE TRIGGER set_reminder_settings_updated_at
  BEFORE UPDATE ON reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_reminder_settings_user_id ON reminder_settings(user_id);
CREATE INDEX idx_reminder_settings_subscription_id ON reminder_settings(subscription_id);

-- ============================================
-- 2. notification_log table
-- ============================================
CREATE TABLE notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  renewal_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'retrying')),
  expo_receipt_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate notifications for same subscription + renewal cycle
ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_subscription_renewal_unique
  UNIQUE (subscription_id, renewal_date);

-- RLS: user SELECT for future notification history (Story 4.6), writes via service_role only
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification log"
  ON notification_log FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Indexes
CREATE INDEX idx_notification_log_subscription_renewal ON notification_log(subscription_id, renewal_date);
CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);

-- ============================================
-- 3. get_reminder_candidates RPC function
-- ============================================
CREATE OR REPLACE FUNCTION get_reminder_candidates(check_date DATE)
RETURNS TABLE (
  subscription_id UUID,
  subscription_name TEXT,
  price DECIMAL,
  currency TEXT,
  renewal_date DATE,
  user_id UUID,
  remind_days_before INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.name AS subscription_name,
    s.price,
    s.currency,
    s.renewal_date,
    s.user_id,
    COALESCE(rs.remind_days_before, 3) AS remind_days_before
  FROM subscriptions s
  LEFT JOIN reminder_settings rs
    ON s.id = rs.subscription_id AND s.user_id = rs.user_id
  WHERE s.is_active = true
    AND s.is_trial = false
    AND s.renewal_date = check_date + COALESCE(rs.remind_days_before, 3)
    AND (rs.is_enabled IS NULL OR rs.is_enabled = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
