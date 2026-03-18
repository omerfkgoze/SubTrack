-- Story 6.1: Add is_premium field to user_settings for freemium gating
ALTER TABLE user_settings ADD COLUMN is_premium BOOLEAN DEFAULT false NOT NULL;
