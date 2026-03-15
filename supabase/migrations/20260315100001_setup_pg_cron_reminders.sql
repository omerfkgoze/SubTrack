-- Migration: Configure pg_cron daily job for renewal reminders
-- Story 4.2: Renewal Reminder Scheduling
--
-- PREREQUISITES:
--   1. Enable pg_cron and pg_net extensions in Supabase Dashboard (Database > Extensions)
--   2. Store vault secrets via Supabase Dashboard or SQL:
--      SELECT vault.create_secret('project_url', 'https://YOUR-PROJECT-REF.supabase.co');
--      SELECT vault.create_secret('service_role_key', 'YOUR_SERVICE_ROLE_KEY');
--
-- VERIFICATION:
--   SELECT * FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily reminder calculation at 9:00 AM UTC
SELECT cron.schedule(
  'calculate-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/calculate-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now()),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
