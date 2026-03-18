-- ============================================================
-- DEV SCRIPT: Cleanup Test Data
-- Usage: Supabase Dashboard > SQL Editor (run after testing)
-- Purpose: Reset subscription dates and clear test notification logs
-- ============================================================

-- STEP 1: View what you're about to clean up
SELECT
  nl.id,
  s.name       AS subscription_name,
  nl.notification_type,
  nl.status,
  nl.sent_at
FROM notification_log nl
LEFT JOIN subscriptions s ON nl.subscription_id = s.id
ORDER BY nl.sent_at DESC
LIMIT 20;

-- ============================================================
-- STEP 2: Delete test notification_log entries for a subscription
-- Replace 'YOUR_SUBSCRIPTION_ID' with the actual ID
-- ============================================================
/*
DELETE FROM notification_log
WHERE subscription_id = 'YOUR_SUBSCRIPTION_ID';
*/

-- Or delete ALL notification_log entries (nuclear option for clean slate):
/*
DELETE FROM notification_log;
*/

-- ============================================================
-- STEP 3: Reset subscription renewal_date to a real future date
-- ============================================================
/*
UPDATE subscriptions
SET renewal_date = '2026-05-01'   -- replace with real date
WHERE id = 'YOUR_SUBSCRIPTION_ID';
*/

-- ============================================================
-- STEP 4: Reset trial flags if you changed them
-- ============================================================
/*
UPDATE subscriptions
SET
  is_trial          = false,
  trial_expiry_date = NULL
WHERE id = 'YOUR_SUBSCRIPTION_ID';
*/

-- STEP 5: Verify cleanup
SELECT
  id,
  name,
  renewal_date,
  is_trial,
  trial_expiry_date
FROM subscriptions
ORDER BY name;

SELECT COUNT(*) AS notification_log_count FROM notification_log;
