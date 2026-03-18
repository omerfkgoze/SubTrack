-- ============================================================
-- DEV SCRIPT: Inspect Notification Results
-- Usage: Supabase Dashboard > SQL Editor (run after triggering)
-- Purpose: See what happened after the Edge Function ran
-- ============================================================

-- 1. All notification log entries with subscription names
SELECT
  nl.id,
  s.name             AS subscription_name,
  nl.notification_type,
  nl.renewal_date,
  nl.sent_at,
  nl.status,
  nl.expo_receipt_id,
  CASE
    WHEN nl.error_message IS NULL THEN '✅ OK'
    ELSE '❌ ' || nl.error_message
  END                AS result,
  nl.created_at
FROM notification_log nl
LEFT JOIN subscriptions s ON nl.subscription_id = s.id
ORDER BY nl.sent_at DESC;

-- 2. Failed notifications (to debug errors)
SELECT
  nl.id,
  s.name             AS subscription_name,
  nl.notification_type,
  nl.error_message,
  nl.sent_at
FROM notification_log nl
LEFT JOIN subscriptions s ON nl.subscription_id = s.id
WHERE nl.status IN ('failed', 'retrying')
ORDER BY nl.sent_at DESC;

-- 3. Last Edge Function HTTP response (shows sent/skipped/failed counts)
SELECT
  id,
  status_code,
  content::text AS response_body,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;

-- 4. pg_cron job run history (last 10 scheduled runs)
SELECT
  jobid,
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
