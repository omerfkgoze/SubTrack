-- Story 7.4: Allow authenticated users to update status of their own detected subscriptions
-- This enables client-side approve/dismiss actions without an Edge Function round-trip.
-- Only the status field needs client-side update; INSERT/DELETE remains service-role only.
CREATE POLICY "Users can update status of own detected subscriptions"
  ON detected_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
