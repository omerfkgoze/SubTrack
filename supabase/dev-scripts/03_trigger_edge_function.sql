-- ============================================================
-- DEV SCRIPT: Trigger calculate-reminders Edge Function via SQL
-- Usage: Supabase Dashboard > SQL Editor
-- Purpose: Manually invoke the Edge Function to process notifications
--
-- PREREQUISITES:
--   Vault secrets must be configured (done in migration 20260315100001):
--     SELECT vault.create_secret('project_url', 'https://YOUR-REF.supabase.co');
--     SELECT vault.create_secret('service_role_key', 'YOUR_SERVICE_ROLE_KEY');
--
-- ALTERNATIVE (no vault needed):
--   Dashboard > Edge Functions > calculate-reminders > Invoke
-- ============================================================

-- Option A: Using vault secrets (same as pg_cron job)
SELECT net.http_post(
  url     := (
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = 'project_url'
  ) || '/functions/v1/calculate-reminders',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer ' || (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key'
    )
  ),
  body    := '{}'::jsonb
) AS request_id;

-- Option B: Hard-coded (replace with your actual values)
-- Find them at: Dashboard > Settings > API
/*
SELECT net.http_post(
  url     := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/calculate-reminders',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
  ),
  body    := '{}'::jsonb
) AS request_id;
*/

-- ============================================================
-- Wait ~2-3 seconds, then check HTTP response and notification log
-- ============================================================

-- Check HTTP response (shows Edge Function output)
SELECT
  id,
  status_code,
  content::text AS response_body,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 3;

-- Check notification log for new entries
SELECT
  nl.id,
  s.name           AS subscription_name,
  nl.notification_type,
  nl.status,
  nl.sent_at,
  nl.error_message
FROM notification_log nl
LEFT JOIN subscriptions s ON nl.subscription_id = s.id
ORDER BY nl.sent_at DESC
LIMIT 10;
