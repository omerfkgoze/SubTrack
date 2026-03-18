-- ============================================================
-- DEV SCRIPT: Prepare Test Data for Notification Trigger
-- Usage: Supabase Dashboard > SQL Editor
-- Purpose: Adjust subscription dates so notifications fire TODAY
--
-- HOW IT WORKS:
--   get_reminder_candidates fires when:
--     subscription.renewal_date = CURRENT_DATE + remind_days_before
--   Default remind_days_before = 3, so set renewal_date = today + 3
--
--   get_trial_expiry_candidates fires when:
--     trial_expiry_date - CURRENT_DATE IN (0, 1, 3)
-- ============================================================

-- STEP 1: Find your subscription IDs
SELECT
  id,
  name,
  renewal_date,
  is_active,
  is_trial,
  trial_expiry_date
FROM subscriptions
ORDER BY name;

-- ============================================================
-- STEP 2a: Trigger a RENEWAL reminder
-- Sets renewal_date so it fires with default 3-day remind window
-- Replace 'YOUR_SUBSCRIPTION_ID' with the actual ID from step 1
-- ============================================================
/*
UPDATE subscriptions
SET renewal_date = CURRENT_DATE + INTERVAL '3 days'
WHERE id = 'YOUR_SUBSCRIPTION_ID';

-- Verify: should now appear in candidates
SELECT * FROM get_reminder_candidates(CURRENT_DATE);
*/

-- ============================================================
-- STEP 2b: Trigger a TRIAL EXPIRY notification
-- Sets trial_expiry_date 3 days from now (or 1 or 0)
-- Replace 'YOUR_SUBSCRIPTION_ID' with the actual ID
-- ============================================================
/*
UPDATE subscriptions
SET
  is_trial          = true,
  trial_expiry_date = CURRENT_DATE + INTERVAL '3 days'
WHERE id = 'YOUR_SUBSCRIPTION_ID';

-- Verify: should now appear in trial candidates
SELECT * FROM get_trial_expiry_candidates(CURRENT_DATE);
*/

-- ============================================================
-- STEP 2c: Override remind_days_before for a specific subscription
-- (If you want to use 1-day or 7-day window instead of default 3)
-- ============================================================
/*
INSERT INTO reminder_settings (user_id, subscription_id, remind_days_before, is_enabled)
VALUES (auth.uid(), 'YOUR_SUBSCRIPTION_ID', 1, true)
ON CONFLICT (user_id, subscription_id)
DO UPDATE SET remind_days_before = 1;

-- Then set renewal_date = today + 1
UPDATE subscriptions
SET renewal_date = CURRENT_DATE + INTERVAL '1 day'
WHERE id = 'YOUR_SUBSCRIPTION_ID';
*/
