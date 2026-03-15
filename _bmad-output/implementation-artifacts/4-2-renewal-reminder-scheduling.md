# Story 4.2: Renewal Reminder Scheduling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to receive push notifications before my subscriptions renew,
so that I can decide whether to keep or cancel before being charged.

## Acceptance Criteria

1. **AC1: Reminder Settings Table & Default Reminders**
   - **Given** a user has active subscriptions and notifications are enabled
   - **When** a subscription exists without a `reminder_settings` row
   - **Then** the system uses a default reminder of 3 days before renewal
   - **And** a `reminder_settings` table exists in Supabase with columns: `id` (UUID PK), `user_id` (FK → auth.users ON DELETE CASCADE), `subscription_id` (FK → subscriptions ON DELETE CASCADE), `remind_days_before` (INTEGER DEFAULT 3), `is_enabled` (BOOLEAN DEFAULT true), `created_at`, `updated_at`
   - **And** RLS policies restrict access to own rows only

2. **AC2: Edge Function — calculate-reminders**
   - **Given** the notification pipeline is configured
   - **When** the Edge Function `calculate-reminders` is invoked
   - **Then** it queries all active subscriptions with renewal dates within reminder windows (using `remind_days_before` from `reminder_settings`, defaulting to 3 days for subscriptions without explicit settings)
   - **And** for each qualifying subscription, it fetches the user's push token(s) from `push_tokens`
   - **And** it sends push notifications via Expo Push API (`https://exp.host/--/api/v2/push/send`)
   - **And** each notification contains: subscription name, renewal date, and price
   - **And** duplicate notifications are prevented (same subscription + same renewal date = max 1 notification)

3. **AC3: pg_cron Daily Job**
   - **Given** the Edge Function exists and is deployed
   - **When** a pg_cron job is configured
   - **Then** it runs daily (e.g., `0 9 * * *` — 9:00 AM UTC)
   - **And** it invokes the `calculate-reminders` Edge Function via `pg_net` HTTP POST
   - **And** authentication uses Supabase vault secrets (`project_url`, `anon_key` or `service_role_key`)

4. **AC4: Notification Content & Format**
   - **Given** a reminder notification is triggered
   - **When** the push notification is sent
   - **Then** the notification title is: "📅 {name} renews in {days} days"
   - **And** the notification body is: "{price} {currency} will be charged on {renewal_date}"
   - **And** the notification sound is `default`
   - **And** the notification data payload includes `subscription_id` for deep linking

5. **AC5: Delivery Tracking**
   - **Given** a notification is sent via Expo Push API
   - **When** the API responds
   - **Then** the Edge Function logs success/failure for each notification
   - **And** failed deliveries are logged with the Expo Push API error response
   - **And** up to 3 retry attempts are made with exponential backoff for transient failures (NFR24)

6. **AC6: Reminder Service (Client-Side)**
   - **Given** the app needs to manage reminder settings
   - **When** the reminder service is called
   - **Then** `reminderService.ts` provides: `getReminderSettings(subscriptionId)`, `createDefaultReminder(subscriptionId)`, `updateReminder(id, data)`, `deleteReminder(id)`
   - **And** all operations go through Supabase client with RLS enforcement

## Tasks / Subtasks

- [x] Task 1: Create `reminder_settings` Supabase migration (AC: #1)
  - [x] 1.1: Create migration file `supabase/migrations/YYYYMMDDHHMMSS_create_reminder_settings.sql`
  - [x] 1.2: Table schema: `id` UUID PK, `user_id` FK → auth.users ON DELETE CASCADE, `subscription_id` FK → subscriptions ON DELETE CASCADE, `remind_days_before` INTEGER DEFAULT 3 NOT NULL, `is_enabled` BOOLEAN DEFAULT true NOT NULL, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
  - [x] 1.3: Add UNIQUE constraint on (`user_id`, `subscription_id`)
  - [x] 1.4: Enable RLS + create policies (SELECT/INSERT/UPDATE/DELETE for own rows) using `(select auth.uid()) = user_id` pattern
  - [x] 1.5: Add `update_updated_at` trigger (reuse existing `update_updated_at_column()` function)
  - [x] 1.6: Add index on `user_id` and `subscription_id`
  - [x] 1.7: Run `npx supabase db push` to apply migration

- [x] Task 2: Create `notification_log` table for deduplication & tracking (AC: #2, #5)
  - [x] 2.1: Add to same or separate migration: `notification_log` table with `id` UUID PK, `user_id` UUID NOT NULL, `subscription_id` UUID NOT NULL, `renewal_date` DATE NOT NULL, `sent_at` TIMESTAMPTZ DEFAULT now(), `status` TEXT CHECK IN ('sent', 'failed', 'retrying'), `expo_receipt_id` TEXT, `error_message` TEXT
  - [x] 2.2: Add UNIQUE constraint on (`subscription_id`, `renewal_date`) to prevent duplicate sends
  - [x] 2.3: Enable RLS — service_role only (no client access needed for this table), or user SELECT for future Story 4.6
  - [x] 2.4: Add index on (`subscription_id`, `renewal_date`) and `user_id`

- [x] Task 3: Create `calculate-reminders` Edge Function (AC: #2, #4, #5)
  - [x] 3.1: Create `supabase/functions/calculate-reminders/index.ts`
  - [x] 3.2: Use `SUPABASE_SERVICE_ROLE_KEY` for database access (bypasses RLS — this is a server-side function)
  - [x] 3.3: Query logic: find active subscriptions where `renewal_date - remind_days_before = today` (default 3 days if no `reminder_settings` row exists)
  - [x] 3.4: For each match, fetch user's push tokens from `push_tokens`
  - [x] 3.5: Check `notification_log` for existing entry — skip if already sent for this subscription+renewal_date
  - [x] 3.6: Send to Expo Push API: `POST https://exp.host/--/api/v2/push/send` with `Authorization: Bearer ${EXPO_ACCESS_TOKEN}`
  - [x] 3.7: Notification payload: `{ to: token, title: "📅 {name} renews in {days} days", body: "{price} {currency} will be charged on {date}", sound: "default", data: { subscription_id } }`
  - [x] 3.8: Log result to `notification_log` (status: 'sent' or 'failed')
  - [x] 3.9: Implement retry logic: up to 3 attempts with exponential backoff (1s, 2s, 4s) for transient failures
  - [x] 3.10: Return summary: `{ processed: N, sent: N, skipped: N, failed: N }`

- [x] Task 4: Configure pg_cron job via migration (AC: #3)
  - [x] 4.1: Create migration file for pg_cron setup
  - [x] 4.2: Enable `pg_cron` and `pg_net` extensions if not already enabled
  - [x] 4.3: Store `project_url` and `service_role_key` in Supabase vault (`vault.secrets`)
  - [x] 4.4: Create cron job: `cron.schedule('calculate-reminders-daily', '0 9 * * *', ...)` — calls Edge Function via `net.http_post` with vault-sourced credentials
  - [x] 4.5: Document how to verify the cron job is active: `SELECT * FROM cron.job;`

- [x] Task 5: Create `reminderService.ts` (AC: #6)
  - [x] 5.1: Create `src/features/notifications/services/reminderService.ts`
  - [x] 5.2: `getReminderSettings(subscriptionId)` — fetch from `reminder_settings` table
  - [x] 5.3: `createDefaultReminder(userId, subscriptionId)` — insert with `remind_days_before: 3, is_enabled: true`
  - [x] 5.4: `updateReminder(id, data)` — update `remind_days_before` and/or `is_enabled`
  - [x] 5.5: `deleteReminder(id)` — delete row
  - [x] 5.6: Write unit tests for all service functions (mock Supabase client)

- [x] Task 6: Update `delete-account` Edge Function (AC: #1)
  - [x] 6.1: Add `reminder_settings` deletion to `supabase/functions/delete-account/index.ts` (uncomment/add the TODO line for `reminder_settings`)
  - [x] 6.2: Add `notification_log` cleanup as well

- [x] Task 7: Update notifications feature exports (AC: #6)
  - [x] 7.1: Add `reminderService` exports to `src/features/notifications/index.ts`

- [x] Task 8: Integration and testing (AC: all)
  - [x] 8.1: `npx tsc --noEmit` — zero errors
  - [x] 8.2: `npx eslint src/features/notifications/` — zero errors
  - [x] 8.3: Full test suite green (baseline: 305+ tests)

## Dev Notes

### Architecture: Push Notification Pipeline

This story builds the **server-side notification pipeline** — the core backend infrastructure that makes SubTrack's value proposition work.

```
Subscription renewal_date approaches
         ↓
pg_cron (daily at 9:00 AM UTC)
         ↓
net.http_post → calculate-reminders Edge Function
         ↓
Edge Function queries:
  1. Active subscriptions where renewal_date - remind_days_before = today
  2. User push tokens from push_tokens table
  3. notification_log for deduplication
         ↓
Expo Push API (https://exp.host/--/api/v2/push/send)
         ↓
APNs / FCM → User's device
```

[Source: architecture.md#Push-Notification-Architecture]

### Supabase `reminder_settings` Table Design

```sql
CREATE TABLE reminder_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  remind_days_before INTEGER DEFAULT 3 NOT NULL CHECK (remind_days_before IN (1, 3, 7)),
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One reminder setting per subscription per user
ALTER TABLE reminder_settings
  ADD CONSTRAINT reminder_settings_user_subscription_unique
  UNIQUE (user_id, subscription_id);

-- RLS
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder settings"
  ON reminder_settings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own reminder settings"
  ON reminder_settings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own reminder settings"
  ON reminder_settings FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own reminder settings"
  ON reminder_settings FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER set_reminder_settings_updated_at
  BEFORE UPDATE ON reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_reminder_settings_user_id ON reminder_settings(user_id);
CREATE INDEX idx_reminder_settings_subscription_id ON reminder_settings(subscription_id);
```

**Design decisions:**
- `ON DELETE CASCADE` on both FKs — deleting a user or subscription auto-cleans reminder settings
- `CHECK (remind_days_before IN (1, 3, 7))` — Story 4.3 will allow customization, but the valid values are 1, 3, 7 days per PRD (FR22)
- UNIQUE(user_id, subscription_id) — one reminder config per subscription per user
- Reuses `update_updated_at_column()` trigger function from subscriptions migration
- RLS pattern identical to `subscriptions` and `push_tokens` tables

[Source: epics.md#Story-4.2, architecture.md#Database-Naming-Conventions]

### Supabase `notification_log` Table Design

```sql
CREATE TABLE notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  renewal_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'retrying')),
  expo_receipt_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate notifications for same subscription + renewal cycle
ALTER TABLE notification_log
  ADD CONSTRAINT notification_log_subscription_renewal_unique
  UNIQUE (subscription_id, renewal_date);

-- RLS: service_role for Edge Function writes, user SELECT for future notification history (Story 4.6)
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification log"
  ON notification_log FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- INSERT/UPDATE/DELETE only via service_role (Edge Function) — no client-side policies

CREATE INDEX idx_notification_log_subscription_renewal ON notification_log(subscription_id, renewal_date);
CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
```

**Design decisions:**
- No FK constraints on `user_id` / `subscription_id` — notification_log is an audit trail that should survive even if the source data is deleted
- UNIQUE on (subscription_id, renewal_date) — prevents duplicate sends per billing cycle
- User can SELECT own logs (for Story 4.6: Notification History) but cannot INSERT/UPDATE/DELETE
- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for writes

### Edge Function: `calculate-reminders`

Location: `supabase/functions/calculate-reminders/index.ts`

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderCandidate {
  subscription_id: string
  subscription_name: string
  price: number
  currency: string
  renewal_date: string
  user_id: string
  remind_days_before: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const today = new Date().toISOString().split('T')[0]

    // 1. Find subscriptions needing reminders today
    // Uses LEFT JOIN to get remind_days_before (default 3 if no settings row)
    const { data: candidates, error: queryError } = await supabase.rpc(
      'get_reminder_candidates',
      { check_date: today }
    )
    if (queryError) throw queryError

    let sent = 0, skipped = 0, failed = 0

    for (const candidate of (candidates ?? [])) {
      // 2. Check deduplication — skip if already sent
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id')
        .eq('subscription_id', candidate.subscription_id)
        .eq('renewal_date', candidate.renewal_date)
        .maybeSingle()

      if (existing) { skipped++; continue }

      // 3. Get user push tokens
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', candidate.user_id)

      if (!tokens || tokens.length === 0) { skipped++; continue }

      // 4. Send via Expo Push API
      const notifications = tokens.map(t => ({
        to: t.token,
        title: `📅 ${candidate.subscription_name} renews in ${candidate.remind_days_before} days`,
        body: `${candidate.price} ${candidate.currency} will be charged on ${candidate.renewal_date}`,
        sound: 'default' as const,
        data: { subscription_id: candidate.subscription_id },
      }))

      let success = false
      let lastError = ''

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (expoAccessToken) {
            headers['Authorization'] = `Bearer ${expoAccessToken}`
          }

          const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers,
            body: JSON.stringify(notifications),
          })
          const result = await res.json()

          if (res.ok) {
            success = true
            break
          }
          lastError = JSON.stringify(result)
        } catch (err) {
          lastError = String(err)
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }

      // 5. Log result
      await supabase.from('notification_log').insert({
        user_id: candidate.user_id,
        subscription_id: candidate.subscription_id,
        renewal_date: candidate.renewal_date,
        status: success ? 'sent' : 'failed',
        error_message: success ? null : lastError,
      })

      if (success) sent++
      else failed++
    }

    const summary = { processed: (candidates ?? []).length, sent, skipped, failed }
    console.log('calculate-reminders result:', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('calculate-reminders error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

**Key patterns from existing Edge Function (`delete-account`):**
- Same CORS headers pattern
- Same `createClient` import from `jsr:@supabase/supabase-js@2`
- Uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations (bypasses RLS)
- `Deno.serve` handler pattern

**CRITICAL: Expo Push API details** (from context7 research):
- Endpoint: `https://exp.host/--/api/v2/push/send`
- Auth: `Authorization: Bearer ${EXPO_ACCESS_TOKEN}` (optional but recommended for production)
- Body: `{ to: "ExponentPushToken[xxx]", title, body, sound, data }`
- Supports batch: send array of notification objects
- Response includes ticket IDs for receipt checking

[Source: context7/supabase — Edge Function push notification example]
[Source: context7/expo-notifications — Expo Push API documentation]

### Database Function: `get_reminder_candidates`

The Edge Function calls an RPC function to find subscriptions needing reminders. Create this as part of the migration:

```sql
CREATE OR REPLACE FUNCTION get_reminder_candidates(check_date DATE)
RETURNS TABLE (
  subscription_id UUID,
  subscription_name TEXT,
  price DECIMAL,
  currency TEXT,
  renewal_date DATE,
  user_id UUID,
  remind_days_before INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.name AS subscription_name,
    s.price,
    s.currency,
    s.renewal_date,
    s.user_id,
    COALESCE(rs.remind_days_before, 3) AS remind_days_before
  FROM subscriptions s
  LEFT JOIN reminder_settings rs
    ON s.id = rs.subscription_id AND s.user_id = rs.user_id
  WHERE s.is_active = true
    AND s.is_trial = false
    AND s.renewal_date = check_date + COALESCE(rs.remind_days_before, 3)
    AND (rs.is_enabled IS NULL OR rs.is_enabled = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Logic explained:**
- Finds active, non-trial subscriptions where `renewal_date` equals `today + remind_days_before`
- LEFT JOIN to `reminder_settings` — if no row exists, defaults to 3 days
- `rs.is_enabled IS NULL` handles case where no settings row exists (default enabled)
- `SECURITY DEFINER` — runs with the function owner's permissions (bypasses RLS for service calls)
- Trial subscriptions are excluded — Story 4.4 handles trial expiry notifications separately

### pg_cron Job Setup

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store secrets in vault (do this manually via Supabase Dashboard or SQL)
-- SELECT vault.create_secret('project_url', 'https://YOUR-PROJECT-REF.supabase.co');
-- SELECT vault.create_secret('service_role_key', 'YOUR_SERVICE_ROLE_KEY');

-- Schedule daily reminder calculation at 9:00 AM UTC
SELECT cron.schedule(
  'calculate-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/calculate-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now()),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
```

**CRITICAL pg_cron notes** (from context7 research):
- `pg_cron` and `pg_net` must be enabled as extensions in Supabase Dashboard (Database > Extensions) before running the migration
- Vault secrets must be configured manually in Supabase Dashboard or via SQL — they contain sensitive keys
- The cron schedule `'0 9 * * *'` means daily at 9:00 AM UTC — verify with crontab.guru
- `timeout_milliseconds: 30000` (30s) gives the Edge Function enough time to process
- Use `service_role_key` (not `anon_key`) since the Edge Function needs to bypass RLS
- Verify job: `SELECT * FROM cron.job;`
- View job history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

[Source: context7/supabase — pg_cron scheduling with vault secrets]

### reminderService.ts

Location: `src/features/notifications/services/reminderService.ts`

```typescript
import { supabase } from '@shared/services/supabase';

export interface ReminderSetting {
  id: string;
  user_id: string;
  subscription_id: string;
  remind_days_before: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function getReminderSettings(
  subscriptionId: string,
): Promise<ReminderSetting | null> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDefaultReminder(
  userId: string,
  subscriptionId: string,
): Promise<ReminderSetting> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .upsert(
      {
        user_id: userId,
        subscription_id: subscriptionId,
        remind_days_before: 3,
        is_enabled: true,
      },
      { onConflict: 'user_id,subscription_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReminder(
  id: string,
  data: { remind_days_before?: number; is_enabled?: boolean },
): Promise<ReminderSetting> {
  const { data: updated, error } = await supabase
    .from('reminder_settings')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_settings')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
```

**Patterns (matching existing services):**
- Same Supabase client import as `notificationService.ts`
- `upsert` with `onConflict` for createDefaultReminder — idempotent, same pattern as `savePushToken`
- `.select().single()` chain for returning created/updated data
- `maybeSingle()` for queries that may return no results (no reminder settings yet)

### Update `delete-account` Edge Function

The existing `delete-account` Edge Function at `supabase/functions/delete-account/index.ts` has a TODO comment for `reminder_settings` cleanup (line 54). Update it:

```typescript
// Replace the TODO comment block with actual deletions:
await supabaseAdmin.from('push_tokens').delete().eq('user_id', user.id)
await supabaseAdmin.from('reminder_settings').delete().eq('user_id', user.id)
await supabaseAdmin.from('notification_log').delete().eq('user_id', user.id)
```

**Note:** `ON DELETE CASCADE` on `reminder_settings.user_id` already handles this at the DB level, but defense-in-depth is the established pattern (same as `subscriptions` deletion in the existing function).

### Testing Strategy

**Edge Function testing:**
- Edge Functions run in Deno, NOT in Jest — they cannot be unit tested with the app's test suite
- Test locally: `npx supabase functions serve calculate-reminders` then call via `curl`
- Verify with Supabase Dashboard logs after deployment
- The cron job can be tested manually: `SELECT cron.schedule('test-reminder', '* * * * *', ...)` then unschedule

**reminderService.ts tests:**

Location: `src/features/notifications/services/reminderService.test.ts`

```typescript
// Mock setup
jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    })),
  },
}));
```

**Required test coverage:**
- `getReminderSettings`: returns setting when exists, returns null when not exists, throws on error
- `createDefaultReminder`: creates with defaults, upserts on conflict
- `updateReminder`: updates remind_days_before, updates is_enabled, throws on error
- `deleteReminder`: deletes successfully, throws on error

**Test patterns (MUST follow — from Epic 3 retro):**
- No hard-coded future dates — use relative dates or mock `Date.now()`
- No non-null assertions (`!`) — use `??` for defaults
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Mock Supabase client consistently

### Epic 3 Retro Action Items (MUST apply)

**#1 Gesture Accessibility:** Not directly applicable to this story (no new UI components). If any UI is added, use `accessibilityLabel`.

**#2 Non-null assertion ban:** NEVER use `!` operator in client-side code. Use `??` for defaults. The Edge Function runs in Deno where `Deno.env.get()!` is the established pattern (matches `delete-account` Edge Function).

**#3 Test gotchas:** PaperProvider wrapper (if component tests added), pinned versions.

**#4 Date mocking:** Use relative dates in all test assertions. No hard-coded future dates.

### Notification Content Templates (from UX spec)

```
Renewal Reminder:
┌─────────────────────────────────────────────┐
│ SubTrack                              3d ▼  │
│ 📅 Netflix renews in 3 days                │
│ €17.99 will be charged on Feb 2            │
│ [View] [Dismiss]                           │
└─────────────────────────────────────────────┘
```

[Source: ux-design-specification.md#Push-Notification-Templates]

### Architecture Compliance

- Feature module: `src/features/notifications/`
- Service: `src/features/notifications/services/reminderService.ts`
- Edge Function: `supabase/functions/calculate-reminders/index.ts`
- Supabase migrations: `supabase/migrations/YYYYMMDDHHMMSS_create_reminder_settings.sql`
- Database: snake_case tables/columns, UUID primary keys, `(select auth.uid())` in RLS policies
- Edge Function pattern: matches existing `delete-account` function (CORS headers, Deno.serve, createClient)
- Import: `jsr:@supabase/supabase-js@2` for Edge Functions (Deno), `@supabase/supabase-js` for client

### Project Structure Notes

- `src/features/notifications/services/` already has `notificationService.ts` — add `reminderService.ts` alongside
- `supabase/functions/` already has `delete-account/` — add `calculate-reminders/` alongside
- `supabase/migrations/` currently has 2 migrations — third migration for `reminder_settings` + `notification_log`
- No structure conflicts detected

### Cross-Story Dependencies

- **Story 4.1 (DONE):** Provides `push_tokens` table, `notificationService.ts`, `useNotificationStore`, notification permission flow — ALL prerequisites met
- **Story 4.3 (FUTURE):** Will add UI for customizing `remind_days_before` — this story creates the `reminder_settings` table that 4.3 will use
- **Story 4.4 (FUTURE):** Will add trial expiry notifications — uses same Edge Function pipeline but with different query logic (trial subscriptions)
- **Story 4.5 (FUTURE):** Will add per-subscription notification toggle — uses `reminder_settings.is_enabled` column created in this story
- **Story 4.6 (FUTURE):** Will add notification history UI — reads from `notification_log` table created in this story

### Environment Variables Required

For the Edge Function to work:
- `SUPABASE_URL` — auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — auto-provided by Supabase
- `EXPO_ACCESS_TOKEN` — optional but recommended for production; set via `supabase secrets set EXPO_ACCESS_TOKEN=your_token`

For pg_cron vault:
- `project_url` — Supabase project URL stored in vault
- `service_role_key` — service role key stored in vault

### Previous Story Intelligence (Story 4.1)

- 305 tests passing as baseline (46 new in 4.1)
- TSC zero errors, ESLint zero errors maintained
- `notificationService.ts` already has: `registerForPushNotificationsAsync`, `savePushToken`, `getPermissionStatus`, `openNotificationSettings`, `removePushToken`
- `useNotificationStore` manages: permission status, push token, loading/error states
- Android notification channel `'renewal-reminders'` already created in `notificationService.ts`
- `app.json` configured with `expo-notifications` plugin
- `push_tokens` table created and operational with RLS
- Edge Function pattern established in `delete-account/index.ts` (CORS, auth, Supabase client setup)
- Expo Push Token format: `"ExponentPushToken[xxxxxx]"` — stored as full string in `push_tokens.token`

### Git Intelligence

Recent commits show pattern: story file created → implementation → review → done. Commits are focused and descriptive. No force pushes.

### Files to Create

- `supabase/migrations/YYYYMMDDHHMMSS_create_reminder_settings.sql` (includes reminder_settings table, notification_log table, get_reminder_candidates function, pg_cron job)
- `supabase/functions/calculate-reminders/index.ts`
- `src/features/notifications/services/reminderService.ts`
- `src/features/notifications/services/reminderService.test.ts`

### Files to Modify

- `supabase/functions/delete-account/index.ts` (add reminder_settings + notification_log cleanup)
- `src/features/notifications/index.ts` (add reminderService exports)

### References

- [Source: epics.md#Story-4.2] — Acceptance criteria, user story, pg_cron + Edge Function requirements
- [Source: architecture.md#Push-Notification-Architecture] — pg_cron → Edge Function → Expo Push API pipeline
- [Source: architecture.md#Database-Naming-Conventions] — snake_case, UUID PKs, RLS pattern
- [Source: architecture.md#Feature-Module-Structure] — notifications feature structure
- [Source: ux-design-specification.md#Push-Notification-Templates] — Renewal reminder notification format
- [Source: ux-design-specification.md#Notification-Trust] — Visible status indicators, delivery tracking
- [Source: prd.md#Push-Notification-Strategy] — Notification types: renewal reminder (High priority), timing options 1/3/7 days
- [Source: prd.md#FR21-FR22] — Push notifications for renewals, customizable timing
- [Source: prd.md#NFR20] — ≥99% push notification delivery rate
- [Source: prd.md#NFR24] — 3 retry attempts with exponential backoff
- [Source: epic-3-retro-2026-03-15.md#Action-Items] — Date mocking, non-null assertion ban
- [Source: epic-3-retro-2026-03-15.md#Epic-4-Preparation] — Edge Function research, pg_cron setup research
- [Source: 4-1-push-notification-permission-setup.md] — Previous story: push_tokens table, notification service, 305 tests baseline
- [Source: supabase/functions/delete-account/index.ts] — Existing Edge Function pattern (CORS, auth, Deno.serve)
- [Source: supabase/migrations/20260315000000_create_push_tokens.sql] — Existing migration pattern, RLS, trigger reuse
- [Source: context7/supabase] — pg_cron + pg_net scheduling, vault secrets, Edge Function push notification example
- [Source: context7/expo-notifications] — Expo Push API endpoint, token format, batch send support

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No debug issues encountered. All tasks completed cleanly.

### Completion Notes List

- Created `reminder_settings` table with UUID PK, FK cascades, CHECK constraint for remind_days_before IN (1,3,7), UNIQUE(user_id, subscription_id), RLS policies, updated_at trigger, indexes
- Created `notification_log` table with deduplication UNIQUE constraint on (subscription_id, renewal_date), user SELECT RLS policy, service_role writes only
- Created `get_reminder_candidates` SECURITY DEFINER function for efficient reminder candidate queries with LEFT JOIN default logic
- Created `calculate-reminders` Edge Function with Expo Push API integration, deduplication check, retry logic (3 attempts, exponential backoff 1s/2s/4s), notification logging
- Created pg_cron migration with daily schedule at 9:00 AM UTC, vault-sourced credentials, pg_net HTTP POST
- Created `reminderService.ts` with 4 CRUD functions (getReminderSettings, createDefaultReminder, updateReminder, deleteReminder)
- Created 10 unit tests for reminderService covering all functions, success/error/null paths
- Updated `delete-account` Edge Function with push_tokens, reminder_settings, notification_log cleanup (defense-in-depth)
- Updated notifications feature exports with reminderService functions and ReminderSetting type
- TSC: zero errors, ESLint: zero errors, Test suite: 318 tests passing (10 new, 0 regressions)

### Change Log

- 2026-03-15: Story 4.2 implementation complete — server-side notification pipeline with reminder settings, notification logging, Edge Function, pg_cron scheduling, and client-side reminder service
- 2026-03-15: Code review — fixed 3 issues: (H1) dedup check now only skips status='sent', upsert allows retry of failed notifications; (M1) Expo receipt ID now captured from API response; (M2) retry logic now distinguishes transient (5xx) vs permanent (4xx) failures; (M3) corrected test count from 13 to 10

### File List

**New files:**
- `supabase/migrations/20260315100000_create_reminder_settings.sql`
- `supabase/migrations/20260315100001_setup_pg_cron_reminders.sql`
- `supabase/functions/calculate-reminders/index.ts`
- `src/features/notifications/services/reminderService.ts`
- `src/features/notifications/services/reminderService.test.ts`

**Modified files:**
- `supabase/functions/delete-account/index.ts`
- `src/features/notifications/index.ts`
