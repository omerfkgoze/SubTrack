-- Migration: Add FK constraint from notification_log.subscription_id to subscriptions.id
-- Rationale: notification_log entries are meaningless without their parent subscription.
-- ON DELETE CASCADE removes log entries when a subscription is deleted.

-- Pre-flight: remove any orphaned log rows (e.g. from manual dev/test inserts)
-- that would cause the FK constraint to fail.
DELETE FROM notification_log
  WHERE subscription_id NOT IN (SELECT id FROM subscriptions);

ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES subscriptions(id)
  ON DELETE CASCADE;
