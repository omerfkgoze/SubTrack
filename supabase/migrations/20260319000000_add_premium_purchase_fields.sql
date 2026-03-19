-- Story 6.3: Add premium purchase tracking fields to user_settings
ALTER TABLE user_settings
ADD COLUMN premium_plan_type TEXT CHECK (premium_plan_type IN ('monthly', 'yearly')),
ADD COLUMN premium_expires_at TIMESTAMPTZ,
ADD COLUMN premium_purchase_token TEXT;
