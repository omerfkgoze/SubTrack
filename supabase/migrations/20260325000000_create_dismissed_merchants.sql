-- Create dismissed_merchants table for story 7.6
-- Stores merchants that users have flagged as "not a subscription"
-- to exclude them from future subscription detection results.

CREATE TABLE dismissed_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, merchant_name)
);

ALTER TABLE dismissed_merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dismissed merchants"
  ON dismissed_merchants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
