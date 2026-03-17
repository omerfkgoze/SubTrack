# Story 4.4: Trial Expiry Notifications

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to receive notifications before my trial subscriptions expire,
so that I can cancel before being charged for a service I don't want.

## Acceptance Criteria

1. **AC1: Trial Expiry Reminder Notifications (1 Day & 3 Days Before)**
   - **Given** the user has a subscription marked as trial with an expiry date (`is_trial = true`, `trial_expiry_date` set)
   - **When** the trial expiry date approaches
   - **Then** a push notification is sent 3 days before expiry: "⚠️ [Name] trial expires in 3 days ([price]/month)"
   - **And** a push notification is sent 1 day before expiry: "⚠️ Tomorrow: [Name] trial expires ([price]/month)"
   - **And** trial notifications use heightened urgency compared to regular renewal reminders
   - **And** trial notifications are sent regardless of `reminder_settings.remind_days_before` (trial timing is fixed: 1 and 3 days)

2. **AC2: Same-Day Trial Expiry Notification**
   - **Given** the trial expires today (trial_expiry_date = today)
   - **When** the daily notification job runs
   - **Then** a notification is sent: "🚨 Today is the last day to cancel [Name] - [price]/month starts tomorrow"
   - **And** the notification has the highest urgency

3. **AC3: No Notifications for Expired Trials**
   - **Given** a trial has already expired (trial_expiry_date < today)
   - **When** the daily notification job runs
   - **Then** no trial expiry notification is sent for this subscription
   - **And** the subscription detail already shows "Trial expired" status (implemented in Story 2.5)

4. **AC4: No Notifications for Cancelled/Inactive Trials**
   - **Given** a trial subscription is cancelled (`is_active = false`)
   - **When** the trial expiry date approaches
   - **Then** no trial expiry notification is sent (user already cancelled)

5. **AC5: Trial Notification Deduplication**
   - **Given** a trial expiry notification has already been sent for a specific subscription + expiry date + day offset
   - **When** the daily job runs again
   - **Then** the same notification is not sent twice
   - **And** deduplication uses the existing `notification_log` table

6. **AC6: Trial Notifications Respect Per-Subscription Toggle**
   - **Given** the user has disabled notifications for a specific subscription (`reminder_settings.is_enabled = false`)
   - **When** that subscription's trial expiry approaches
   - **Then** no trial expiry notification is sent for that subscription

## Tasks / Subtasks

- [ ] Task 1: Create database migration for trial notification support (AC: #1, #2, #3, #5)
  - [ ] 1.1: Create new RPC function `get_trial_expiry_candidates(check_date DATE)` that returns trial subscriptions needing notifications
  - [ ] 1.2: Add `notification_type` column to `notification_log` table (TEXT, default 'renewal', CHECK IN ('renewal', 'trial_expiry'))
  - [ ] 1.3: Drop and recreate the unique constraint on `notification_log` to include `notification_type` (allows both a renewal and trial notification for same subscription)
  - [ ] 1.4: Write the RPC query to find trials where `trial_expiry_date - check_date` is IN (0, 1, 3) and `is_active = true` and `is_trial = true`

- [ ] Task 2: Update Edge Function `calculate-reminders` to handle trial expiry (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 2.1: Add `TrialExpiryCandidate` interface with `trial_expiry_date` and `days_until_expiry` fields
  - [ ] 2.2: After processing renewal candidates, call `get_trial_expiry_candidates(today)` RPC
  - [ ] 2.3: Format trial-specific notification messages based on days until expiry (3 days, 1 day, today)
  - [ ] 2.4: Log trial notifications to `notification_log` with `notification_type = 'trial_expiry'`
  - [ ] 2.5: Deduplication check must include `notification_type` in the lookup
  - [ ] 2.6: Update summary to include trial notification counts

- [ ] Task 3: Write tests for the Edge Function trial expiry logic (AC: all)
  - [ ] 3.1: Test: trial subscription 3 days before expiry sends correct notification
  - [ ] 3.2: Test: trial subscription 1 day before expiry sends "Tomorrow" notification
  - [ ] 3.3: Test: trial subscription expiring today sends "last day" notification
  - [ ] 3.4: Test: expired trial (past date) sends no notification
  - [ ] 3.5: Test: cancelled trial sends no notification
  - [ ] 3.6: Test: trial with `is_enabled = false` sends no notification
  - [ ] 3.7: Test: deduplication prevents double-sending trial notifications

- [ ] Task 4: Verify and validate (AC: all)
  - [ ] 4.1: `npx tsc --noEmit` — zero errors
  - [ ] 4.2: `npx eslint src/features/notifications/` — zero errors
  - [ ] 4.3: Full test suite green (baseline: 330+ tests from Story 4.3)

## Dev Notes

### Architecture Overview

This story extends the existing notification pipeline to handle trial expiry notifications alongside renewal reminders. The core change is **server-side** — a new RPC function and Edge Function update. There is **minimal client-side work** since the subscription detail already shows trial status (Story 2.5) and the notification permission/token infrastructure is complete (Story 4.1).

### Current Notification Pipeline (from Story 4.2)

```
pg_cron (daily 9:00 UTC)
    ↓
calculate-reminders Edge Function
    ↓
get_reminder_candidates(today) RPC  ← Currently EXCLUDES trials (WHERE is_trial = false)
    ↓
Expo Push API → APNs/FCM
    ↓
notification_log (deduplication + audit)
```

### What Changes

```
pg_cron (daily 9:00 UTC)
    ↓
calculate-reminders Edge Function
    ↓
┌─ get_reminder_candidates(today)           ← Existing: renewal reminders (is_trial = false)
└─ get_trial_expiry_candidates(today)  ← NEW: trial expiry reminders (is_trial = true)
    ↓
Expo Push API → APNs/FCM
    ↓
notification_log (with notification_type column)
```

### New RPC Function: `get_trial_expiry_candidates`

```sql
CREATE OR REPLACE FUNCTION get_trial_expiry_candidates(check_date DATE)
RETURNS TABLE (
  subscription_id UUID,
  subscription_name TEXT,
  price DECIMAL,
  currency TEXT,
  trial_expiry_date DATE,
  user_id UUID,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.name AS subscription_name,
    s.price,
    s.currency,
    s.trial_expiry_date,
    s.user_id,
    (s.trial_expiry_date - check_date)::INTEGER AS days_until_expiry
  FROM subscriptions s
  LEFT JOIN reminder_settings rs
    ON s.id = rs.subscription_id AND s.user_id = rs.user_id
  WHERE s.is_active = true
    AND s.is_trial = true
    AND s.trial_expiry_date IS NOT NULL
    AND (s.trial_expiry_date - check_date) IN (0, 1, 3)
    AND (rs.is_enabled IS NULL OR rs.is_enabled = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key design decisions:**
- Trial notifications are fixed at 0, 1, 3 days before expiry — NOT configurable via `remind_days_before` (PRD specifies "trial notifications default to 1 day and 3 days before expiry", plus same-day urgency)
- Uses `LEFT JOIN` on `reminder_settings` solely to respect `is_enabled` toggle (Story 4.5 will add the toggle UI; this story handles the backend logic)
- `SECURITY DEFINER` matches existing `get_reminder_candidates` pattern
- Separate RPC function keeps concerns clean — no modification of existing renewal logic

### notification_log Schema Change

Add `notification_type` column to distinguish trial vs renewal notifications:

```sql
-- Add notification_type column
ALTER TABLE notification_log
  ADD COLUMN notification_type TEXT DEFAULT 'renewal' NOT NULL
  CHECK (notification_type IN ('renewal', 'trial_expiry'));

-- Drop old unique constraint
ALTER TABLE notification_log
  DROP CONSTRAINT notification_log_subscription_renewal_unique;

-- Create new unique constraint including notification_type
-- Rename renewal_date to target_date conceptually, but keep column name for backward compatibility
ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_subscription_date_type_unique
  UNIQUE (subscription_id, renewal_date, notification_type);
```

**Why `notification_type`?** A single trial subscription could have BOTH a renewal reminder AND a trial expiry notification. The old unique constraint `(subscription_id, renewal_date)` would conflict. The `renewal_date` column is reused to store `trial_expiry_date` for trial notifications — same semantic purpose (the date being warned about).

### Edge Function Update: Trial Notification Messages

```typescript
interface TrialExpiryCandidate {
  subscription_id: string
  subscription_name: string
  price: number
  currency: string
  trial_expiry_date: string
  user_id: string
  days_until_expiry: number
}

function formatTrialNotification(candidate: TrialExpiryCandidate) {
  const { subscription_name, price, currency, days_until_expiry } = candidate

  if (days_until_expiry === 0) {
    return {
      title: `🚨 Last day: ${subscription_name} trial expires today`,
      body: `Cancel now to avoid being charged ${price} ${currency}`,
    }
  }
  if (days_until_expiry === 1) {
    return {
      title: `⚠️ Tomorrow: ${subscription_name} trial expires`,
      body: `${price} ${currency} will be charged if not cancelled`,
    }
  }
  // days_until_expiry === 3
  return {
    title: `⚠️ ${subscription_name} trial expires in 3 days`,
    body: `Cancel before ${candidate.trial_expiry_date} to avoid ${price} ${currency} charge`,
  }
}
```

### Edge Function Deduplication Update

The existing deduplication check queries `notification_log` by `subscription_id` + `renewal_date`. For trial notifications, the query must also include `notification_type`:

```typescript
// For trial notifications:
const { data: existing } = await supabase
  .from('notification_log')
  .select('id, status')
  .eq('subscription_id', candidate.subscription_id)
  .eq('renewal_date', candidate.trial_expiry_date)  // reuse renewal_date column
  .eq('notification_type', 'trial_expiry')
  .maybeSingle()
```

**IMPORTANT:** Also update the existing renewal deduplication check to include `.eq('notification_type', 'renewal')` for correctness with the new constraint.

### Edge Function Logging Update

When logging trial notifications, include `notification_type`:

```typescript
await supabase.from('notification_log').upsert(
  {
    user_id: candidate.user_id,
    subscription_id: candidate.subscription_id,
    renewal_date: candidate.trial_expiry_date,  // reuse column for trial date
    notification_type: 'trial_expiry',
    status: success ? 'sent' : 'failed',
    expo_receipt_id: expoReceiptId,
    error_message: success ? null : lastError,
  },
  { onConflict: 'subscription_id,renewal_date,notification_type' }
)
```

### Database Constraint Awareness

- `subscriptions.is_trial`: BOOLEAN DEFAULT false
- `subscriptions.trial_expiry_date`: DATE, nullable (can be null even if `is_trial = true` in edge cases — the RPC filters `trial_expiry_date IS NOT NULL`)
- `reminder_settings.is_enabled`: BOOLEAN DEFAULT true — used to respect per-subscription toggle
- `notification_log.notification_type`: new column, `'renewal'` (default) or `'trial_expiry'`

### Testing Strategy

**Test patterns (MUST follow — Epic 3 retro action items):**
- No hard-coded future dates — use relative dates or mock `Date.now()`
- No non-null assertions (`!`) — use `??` for defaults
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Mock Supabase client consistently
- PaperProvider wrapper required for all component tests

**Edge Function tests** (if test file exists for `calculate-reminders`, extend it; otherwise create):

Since the Edge Function runs in Deno, tests should mock:
1. The Supabase RPC calls (`get_reminder_candidates` and `get_trial_expiry_candidates`)
2. The Expo Push API (`fetch` mock)
3. The `notification_log` upsert

Test scenarios:
```
// Trial 3 days before expiry → sends "expires in 3 days" notification
// Trial 1 day before expiry → sends "Tomorrow" notification
// Trial expiring today → sends "last day" notification
// Trial expired yesterday → RPC returns empty (no notification)
// Cancelled trial → RPC returns empty (is_active = false filtered)
// Trial with is_enabled = false → RPC returns empty
// Duplicate trial notification → skipped (deduplication check)
// Renewal + trial for same subscription → both sent (different notification_type)
```

### Existing Code Patterns to Follow

- **Edge Function pattern:** Follow exact structure of existing `calculate-reminders/index.ts` — same retry logic, same logging pattern, same error handling
- **RPC function pattern:** Follow `get_reminder_candidates` — same SECURITY DEFINER, same JOIN pattern with `reminder_settings`
- **Migration naming:** Next migration should be `20260317000000_add_trial_expiry_notifications.sql`
- **notification_log upsert pattern:** Use `onConflict` with the new 3-column unique constraint

### Epic 3 Retro Action Items (MUST apply)

**#1 Gesture Accessibility:** Not directly applicable (backend story), but any UI changes need `accessibilityLabel`.

**#2 Non-null assertion ban:** The Edge Function currently uses `!` for env vars (`Deno.env.get('SUPABASE_URL')!`). This is acceptable for required env vars in Edge Functions (they fail fast if missing). Do NOT add `!` elsewhere.

**#3 Test gotchas:** PaperProvider wrapper for component tests, pinned versions.

**#4 Date mocking:** Use relative dates in all test assertions. No hard-coded future dates.

### Project Structure Notes

- No new feature directories — extends existing `supabase/functions/calculate-reminders/`
- New migration file in `supabase/migrations/`
- No new client-side screens or components needed
- `notification_log` table schema change is backward-compatible (default value for new column)

### Cross-Story Dependencies

- **Story 2.5 (DONE):** Provides `is_trial` and `trial_expiry_date` fields on subscriptions, trial badge UI, "Trial expired" status display
- **Story 4.1 (DONE):** Provides `push_tokens` table, `notificationService`, `useNotificationStore`, device token registration
- **Story 4.2 (DONE):** Provides `reminder_settings` table, `notification_log` table, `get_reminder_candidates` RPC, `calculate-reminders` Edge Function, pg_cron scheduling
- **Story 4.3 (DONE):** Provides customizable reminder timing UI, `reminderService.ts` CRUD, auto-create reminder on new subscription
- **Story 4.5 (FUTURE):** Per-subscription notification toggle UI — will use `reminder_settings.is_enabled`. This story's RPC already respects `is_enabled` at the query level

### Files to Create

- `supabase/migrations/20260317000000_add_trial_expiry_notifications.sql` — new RPC function + notification_log schema change

### Files to Modify

- `supabase/functions/calculate-reminders/index.ts` — add trial expiry candidate processing after renewal processing

### Files NOT to Create

- No new Edge Function — reuse existing `calculate-reminders` (single entry point, same pg_cron trigger)
- No new client-side files — trial status display already exists (Story 2.5)
- No new service files — `reminderService.ts` already handles reminder settings CRUD
- No new store changes — notification store already complete

### References

- [Source: epics.md#Story-4.4] — User story, acceptance criteria: trial expiry notifications at 1 and 3 days before + same-day urgency
- [Source: prd.md#FR23] — "User can receive notifications for trial expiry dates"
- [Source: prd.md#Notification-Types] — Trial Expiry type: "X days before trial ends, 1/3 days, Critical priority"
- [Source: architecture.md#Push-Notification-Architecture] — pg_cron → Edge Function → Expo Push API pipeline
- [Source: architecture.md#Edge-Functions-Use-Cases] — "Notification scheduling and dispatch"
- [Source: ux-design-specification.md#Notification-Table] — Trial ending: "⚠️ Spotify trial ends tomorrow!" with "View, Cancel Now" actions
- [Source: ux-design-specification.md#Trial-Protection] — Mehmet's journey: trial protection as primary value driver
- [Source: ux-design-specification.md#Trial-Expiry-Notification] — "⚠️ Spotify trial ends tomorrow! Cancel before 11:59 PM to avoid €9.99"
- [Source: 4-3-customizable-reminder-timing.md] — Previous story: global default timing, per-subscription override, reminderService updates, 330 tests baseline
- [Source: supabase/migrations/20260315100000_create_reminder_settings.sql] — get_reminder_candidates RPC (currently excludes trials with `is_trial = false`)
- [Source: supabase/functions/calculate-reminders/index.ts] — Current Edge Function (renewal-only notifications)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
