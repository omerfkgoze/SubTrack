-- Create push_tokens table
CREATE TABLE push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate tokens per user
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_token_unique UNIQUE (user_id, token);

-- Enable Row Level Security
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use (select auth.uid()) subquery for performance)
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Reuse existing trigger function for auto-update updated_at
CREATE TRIGGER set_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for queries by user
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
