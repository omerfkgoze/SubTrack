-- ============================================================
-- DEV SCRIPT: Notification System State Check
-- Usage: Supabase Dashboard > SQL Editor
-- Purpose: Inspect current state of all notification-related tables
-- ============================================================

-- 1. Push tokens registered for users (required for notifications to send)
SELECT
  user_id,
  token,
  platform,
  created_at
FROM push_tokens
ORDER BY created_at DESC;

-- 2. Renewal reminder candidates for TODAY
--    Triggers when: subscription.renewal_date = TODAY + remind_days_before
SELECT * FROM get_reminder_candidates(CURRENT_DATE);

-- 3. Trial expiry candidates for TODAY
--    Triggers when: trial_expiry_date - today IN (0, 1, 3)
SELECT * FROM get_trial_expiry_candidates(CURRENT_DATE);

-- 4. Reminder settings per subscription
SELECT
  rs.id,
  s.name             AS subscription_name,
  rs.remind_days_before,
  rs.is_enabled,
  rs.updated_at
FROM reminder_settings rs
JOIN subscriptions s ON rs.subscription_id = s.id
ORDER BY s.name;

-- 5. Recent notification log (last 20 entries)
SELECT
  nl.id,
  s.name             AS subscription_name,
  nl.notification_type,
  nl.renewal_date,
  nl.sent_at,
  nl.status,
  nl.expo_receipt_id,
  nl.error_message
FROM notification_log nl
LEFT JOIN subscriptions s ON nl.subscription_id = s.id
ORDER BY nl.sent_at DESC
LIMIT 20;

-- 6. Summary counts
SELECT
  notification_type,
  status,
  COUNT(*) AS count
FROM notification_log
GROUP BY notification_type, status
ORDER BY notification_type, status;
