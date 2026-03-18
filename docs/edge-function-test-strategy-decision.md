# Edge Function Test Strategy Decision

**Status:** Consciously deferred — not forgotten.
**Decision Date:** 2026-03-18

---

## Decision

Keep manual curl testing via `supabase/dev-scripts/` for MVP. No Deno test runner setup.

## Rationale

Deno-compatible test runner setup (e.g., `deno test`) requires non-trivial CI configuration and mock Supabase client setup. For 2 Edge Functions at MVP scale, manual dev-script testing provides sufficient coverage with zero setup cost. The risk/reward ratio does not justify the investment at this stage.

## Current Coverage

`supabase/dev-scripts/` contains 6 scripts covering:

1. Check state
2. Prepare test data
3. Trigger edge function
4. Inspect results
5. Cleanup
6. Setup notification types

Both Edge Functions (`send-renewal-reminders`, `delete-account`) are covered by this manual test harness.

## Revisit Trigger

Automate Edge Function testing when **any** of the following conditions are met:

- Edge Functions exceed 3 in total
- A production incident is traced to untested Edge Function logic
- Epic 7 planning begins (post-MVP)
- Payment-related Edge Functions are introduced (IAP/RevenueCat, Epic 6+)
