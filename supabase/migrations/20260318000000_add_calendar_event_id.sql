-- Add calendar_event_id to subscriptions table for device calendar integration (Story 5.1)
ALTER TABLE subscriptions ADD COLUMN calendar_event_id TEXT;
