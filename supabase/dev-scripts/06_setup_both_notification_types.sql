-- ============================================================
-- DEV SCRIPT: Setup both renewal + trial expiry for same-day test
-- Subscription IDs from current database state (2026-03-18)
-- ============================================================

-- TARGET STATE:
--   Netflix       → renewal reminder  (renewal_date = today + 3)
--   YouTube Premium → trial expiry    (trial_expiry_date = today, 0 days)

-- ============================================================
-- STEP 1: Diagnose why YouTube Premium trial isn't triggering
-- ============================================================

-- Check existing notification_log entries
SELECT
  nl.id,
  nl.notification_type,
  nl.renewal_date,
  nl.status,
  nl.sent_at,
  nl.error_message
FROM notification_log nl
WHERE nl.subscription_id = '4770a9a7-33f6-4bd5-b677-924dbfd72da3';

-- Check reminder_settings for YouTube Premium
SELECT subscription_id, remind_days_before, is_enabled
FROM reminder_settings
WHERE subscription_id = '4770a9a7-33f6-4bd5-b677-924dbfd72da3';

-- Verify trial candidates right now
SELECT * FROM get_trial_expiry_candidates(CURRENT_DATE);

-- ============================================================
-- STEP 2: Clear blocking notification_log entry if exists
-- (removes deduplication barrier so it fires again)
-- ============================================================
DELETE FROM notification_log
WHERE subscription_id = '4770a9a7-33f6-4bd5-b677-924dbfd72da3'
  AND notification_type = 'trial_expiry';

-- Also clear Netflix's log entry to re-test it too
DELETE FROM notification_log
WHERE subscription_id = '44390ffd-465f-496a-b058-39dd9692eed4'
  AND notification_type = 'renewal';

-- ============================================================
-- STEP 3: Ensure reminder_settings are enabled for both
-- ============================================================
UPDATE reminder_settings
SET is_enabled = true
WHERE subscription_id IN (
  '44390ffd-465f-496a-b058-39dd9692eed4',  -- Netflix
  '4770a9a7-33f6-4bd5-b677-924dbfd72da3'   -- YouTube Premium
);

-- ============================================================
-- STEP 4: Verify both appear in candidates
-- ============================================================

-- Netflix should appear here (renewal_date = today + 3)
SELECT 'renewal' AS type, * FROM get_reminder_candidates(CURRENT_DATE);

-- YouTube Premium should appear here (trial_expiry - today = 0)
SELECT 'trial_expiry' AS type, * FROM get_trial_expiry_candidates(CURRENT_DATE);

-- ============================================================
-- STEP 5: Now trigger the Edge Function
--   Option A: Dashboard > Edge Functions > calculate-reminders > Invoke
--   Option B: Run 03_trigger_edge_function.sql
-- ============================================================

-- After triggering, check results:
SELECT
  nl.id,
  s.name             AS subscription_name,
  nl.notification_type,
  nl.status,
  nl.sent_at,
  nl.error_message
FROM notification_log nl
LEFT JOIN subscriptions s ON nl.subscription_id = s.id
ORDER BY nl.sent_at DESC
LIMIT 10;
