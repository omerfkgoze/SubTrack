-- Provider cache for Tink providers list (Story 7.2)
-- No RLS needed — accessed only by Edge Functions via service role key
CREATE TABLE provider_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
