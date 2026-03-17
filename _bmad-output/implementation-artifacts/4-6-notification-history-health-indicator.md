# Story 4.6: Notification History & Health Indicator

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to view my notification history and see if notifications are working properly,
so that I can trust the app is watching out for me.

## Acceptance Criteria

1. **AC1: Notification History Screen**
   - **Given** the user navigates to notification history (via Settings → Notification History)
   - **When** the history screen loads
   - **Then** a list of past notifications is displayed with: subscription name, notification type (renewal/trial), scheduled date, delivery status (delivered/missed/failed)
   - **And** the list is ordered by most recent first (`sent_at DESC`)
   - **And** each item shows the subscription name, notification type icon, date, and status badge

2. **AC2: Empty State for Notification History**
   - **Given** the user has no notification history records
   - **When** the history screen loads
   - **Then** a friendly empty state is shown: "No notifications yet. Reminders will appear here once your subscriptions approach renewal."

3. **AC3: Notification Health Banner — Disabled State**
   - **Given** notifications are disabled at the device/OS level
   - **When** the user opens the app (HomeScreen)
   - **Then** a prominent red banner is displayed: "Notifications are off! Reminders can't reach you. [Turn On Now]"
   - **And** tapping the banner opens device notification settings
   - **Note:** This is ALREADY IMPLEMENTED via `NotificationStatusBanner.tsx` on HomeScreen — verify it works, do NOT re-implement

4. **AC4: Notification Health Indicator — Enabled State (Settings)**
   - **Given** notifications are enabled and working
   - **When** the user views the Settings screen
   - **Then** the Notifications row shows a green status indicator with "Enabled" text
   - **And** optionally shows delivery count (e.g., "12 reminders delivered") if notification_log records exist

5. **AC5: Notification Health Indicator — Enabled State (HomeScreen)**
   - **Given** notifications are enabled and working
   - **When** the user views the HomeScreen
   - **Then** a subtle `NotificationStatusBadge` component is displayed in the app bar area or below the banner area
   - **And** the badge shows green indicator with "Notifications active" or delivery count
   - **And** this replaces/complements the existing `NotificationStatusBanner` (banner shows only when disabled; badge shows when enabled)

6. **AC6: Notification Health Indicator — Partial State**
   - **Given** notifications are enabled at device level BUT some subscriptions have `is_enabled = false`
   - **When** the user views the health indicator
   - **Then** an amber indicator shows "Some notifications blocked" (per UX spec)

7. **AC7: Settings Navigation to History**
   - **Given** the user is on the Settings screen
   - **When** they tap on a "Notification History" menu item (in the Notifications section)
   - **Then** they navigate to the NotificationHistoryScreen

8. **AC8: Pull-to-Refresh on History**
   - **Given** the user is viewing notification history
   - **When** they pull down to refresh
   - **Then** the list refreshes with the latest notification log data

## Tasks / Subtasks

- [x] Task 1: Create NotificationHistoryScreen (AC: #1, #2, #8)
  - [x] 1.1: Create `src/features/notifications/screens/NotificationHistoryScreen.tsx`
  - [x] 1.2: Create `getNotificationHistory(userId)` service function in `src/features/notifications/services/notificationHistoryService.ts`
  - [x] 1.3: Query `notification_log` joined with `subscriptions` to get subscription name, ordered by `sent_at DESC`
  - [x] 1.4: Implement FlatList with `List.Item` from react-native-paper for each notification entry
  - [x] 1.5: Show notification type icon (bell for renewal, clock for trial_expiry)
  - [x] 1.6: Show delivery status as colored Chip (green=sent, red=failed, amber=retrying)
  - [x] 1.7: Implement empty state with icon and message
  - [x] 1.8: Implement pull-to-refresh via FlatList `onRefresh`/`refreshing` props

- [x] Task 2: Create NotificationStatusBadge component (AC: #4, #5, #6)
  - [x] 2.1: Create `src/features/notifications/components/NotificationStatusBadge.tsx`
  - [x] 2.2: Implement `variant='header'` (compact, for HomeScreen app bar area) and `variant='banner'` (wider, for settings)
  - [x] 2.3: Implement three states: enabled (green #10B981), disabled (red #EF4444), partial (amber #F59E0B)
  - [x] 2.4: Create `getDeliveryCount(userId)` service function — `SELECT COUNT(*) FROM notification_log WHERE user_id = ? AND status = 'sent'`
  - [x] 2.5: Create `getPartialNotificationStatus(userId)` — check if any `reminder_settings` have `is_enabled = false`
  - [x] 2.6: Show delivery count text when available (e.g., "12 reminders delivered")

- [x] Task 3: Add NotificationHistoryScreen to Settings navigation (AC: #7)
  - [x] 3.1: Add `NotificationHistory` to `SettingsStackParamList` in `src/app/navigation/types.ts`
  - [x] 3.2: Add `Stack.Screen` for `NotificationHistory` in `src/app/navigation/SettingsStack.tsx`
  - [x] 3.3: Add "Notification History" `List.Item` in SettingsScreen Notifications section (below existing Notifications row)

- [x] Task 4: Integrate NotificationStatusBadge into HomeScreen and Settings (AC: #4, #5)
  - [x] 4.1: Add `NotificationStatusBadge` to HomeScreen — show when notifications are enabled (complement existing `NotificationStatusBanner` which shows when disabled)
  - [x] 4.2: Update SettingsScreen Notifications row to show green/amber/red status indicator using badge component
  - [x] 4.3: Ensure `NotificationStatusBanner` (disabled state) and `NotificationStatusBadge` (enabled/partial state) don't both show simultaneously

- [x] Task 5: Create RLS policy for notification_log SELECT (AC: #1)
  - [x] 5.1: Create migration to add RLS SELECT policy for authenticated users on `notification_log` — users can read their own logs
  - [x] 5.2: Verify the existing RLS policies — current policy allows SELECT for own records (confirmed in Story 4.2 migration `20260315100000_create_reminder_settings.sql`)

- [x] Task 6: Write tests (AC: all)
  - [x] 6.1: Test NotificationHistoryScreen — renders list of notifications with correct data
  - [x] 6.2: Test NotificationHistoryScreen — renders empty state when no records
  - [x] 6.3: Test NotificationHistoryScreen — pull-to-refresh triggers data reload
  - [x] 6.4: Test NotificationStatusBadge — shows green state when enabled, no partial
  - [x] 6.5: Test NotificationStatusBadge — shows amber state when partial (some subscriptions disabled)
  - [x] 6.6: Test NotificationStatusBadge — shows red state when disabled
  - [x] 6.7: Test NotificationStatusBadge — shows delivery count when available
  - [x] 6.8: Test navigation from Settings → Notification History
  - [x] 6.9: Test HomeScreen shows badge when notifications enabled, banner when disabled

- [x] Task 7: Verify and validate (AC: all)
  - [x] 7.1: `npx tsc --noEmit` — zero errors
  - [x] 7.2: `npx eslint src/features/notifications/ src/features/settings/ src/features/dashboard/` — zero errors (7 pre-existing `any` warnings in test files)
  - [x] 7.3: Full test suite green (402 tests, +40 from baseline 362)

## Dev Notes

### Architecture Overview

This story has **two distinct features**:
1. **Notification History Screen** — reads from existing `notification_log` table (already populated by `calculate-reminders` Edge Function)
2. **Notification Health Indicator** — a `NotificationStatusBadge` component showing notification system health (enabled/disabled/partial)

### CRITICAL: What Already Exists — DO NOT Re-implement

| Component | Status | Location |
|-----------|--------|----------|
| `notification_log` table | Already exists | `supabase/migrations/20260315100000_create_reminder_settings.sql` |
| `NotificationStatusBanner` (red disabled banner) | Already exists | `src/features/notifications/components/NotificationStatusBanner.tsx` |
| `useNotificationStore` (permissionStatus) | Already exists | `src/shared/stores/useNotificationStore.ts` |
| `openNotificationSettings()` | Already exists | `src/features/notifications/services/notificationService.ts` |
| Banner integration on HomeScreen | Already exists | `src/features/dashboard/screens/HomeScreen.tsx` |
| Notifications row in Settings | Already exists | `src/features/settings/screens/SettingsScreen.tsx` |

### Existing `notification_log` Table Schema

```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  renewal_date DATE NOT NULL,
  notification_type TEXT NOT NULL,        -- 'renewal' or 'trial_expiry'
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL,                    -- 'sent', 'failed', 'retrying'
  expo_receipt_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies (already exist):**
- Users can `SELECT` their own logs (`user_id = auth.uid()`)
- Writes restricted to `service_role` (Edge Function only)

**IMPORTANT:** The epics mention creating a `notification_history` table, but `notification_log` ALREADY serves this purpose. DO NOT create a new table — query `notification_log` directly.

### Notification History Service Pattern

```typescript
// src/features/notifications/services/notificationHistoryService.ts
import { supabase } from '@shared/services/supabase';

export interface NotificationHistoryItem {
  id: string;
  subscription_name: string;
  notification_type: 'renewal' | 'trial_expiry';
  renewal_date: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'retrying';
}

export async function getNotificationHistory(userId: string): Promise<NotificationHistoryItem[]> {
  const { data, error } = await supabase
    .from('notification_log')
    .select(`
      id,
      notification_type,
      renewal_date,
      sent_at,
      status,
      subscriptions!inner(name)
    `)
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map(item => ({
    id: item.id,
    subscription_name: (item.subscriptions as any).name,
    notification_type: item.notification_type,
    renewal_date: item.renewal_date,
    sent_at: item.sent_at,
    status: item.status,
  }));
}

export async function getDeliveryCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent');

  if (error) throw error;
  return count ?? 0;
}

export async function hasPartialNotifications(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_enabled', false);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
```

**IMPORTANT:** The join `subscriptions!inner(name)` requires that `notification_log.subscription_id` has a foreign key relationship to `subscriptions.id`. Check if this FK exists in the migration. If not, you'll need a migration to add it, OR use a separate query to fetch subscription names.

### NotificationStatusBadge Component Pattern

Follow the UX spec exactly (`ux-design-specification.md#NotificationStatusBadge`):

```tsx
// src/features/notifications/components/NotificationStatusBadge.tsx
interface NotificationStatusBadgeProps {
  enabled: boolean;
  deliveryCount?: number;
  onEnablePress?: () => void;
  variant: 'header' | 'banner';
  partial?: boolean;
}
```

**States (from UX spec):**

| State | Color | Message |
|-------|-------|---------|
| Enabled | Green (#10B981) | "Notifications active" |
| Disabled | Red (#EF4444) | "Notifications off" + CTA |
| Partial | Amber (#F59E0B) | "Some notifications blocked" |

**IMPORTANT:** The `disabled` state of this badge overlaps with `NotificationStatusBanner`. On HomeScreen:
- When disabled → show existing `NotificationStatusBanner` (red, prominent, with "Turn On Now" action)
- When enabled → show `NotificationStatusBadge` (green, subtle)
- When partial → show `NotificationStatusBadge` (amber, subtle)
- NEVER show both banner and badge simultaneously

### NotificationHistoryScreen Layout

```
┌─────────────────────────────────┐
│ ← Notification History          │  ← AppBar with back button
├─────────────────────────────────┤
│ NotificationStatusBadge         │  ← Health indicator at top
│ (variant='banner')              │
├─────────────────────────────────┤
│ FlatList:                       │
│ ┌─────────────────────────────┐ │
│ │ 📅 Netflix                  │ │  ← List.Item
│ │ Renewal reminder · Delivered│ │  ← description + status chip
│ │ Mar 15, 2026                │ │  ← date
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ⏰ Spotify                  │ │
│ │ Trial expiry · Delivered    │ │
│ │ Mar 12, 2026                │ │
│ └─────────────────────────────┘ │
│ ...                             │
└─────────────────────────────────┘
```

### Navigation Changes

Add to `SettingsStackParamList` in `src/app/navigation/types.ts`:
```typescript
NotificationHistory: undefined;
```

Add to `SettingsStack.tsx`:
```tsx
<Stack.Screen
  name="NotificationHistory"
  component={NotificationHistoryScreen}
  options={{ title: 'Notification History' }}
/>
```

Add to `SettingsScreen.tsx` — in the Notifications section, below the existing Notifications row:
```tsx
<List.Item
  title="Notification History"
  description="View past reminders"
  left={props => <List.Icon {...props} icon="history" />}
  right={props => <List.Icon {...props} icon="chevron-right" />}
  onPress={() => navigation.navigate('NotificationHistory')}
/>
```

### Date Formatting

Use `date-fns` for display formatting (already in project):
```typescript
import { format } from 'date-fns';
format(new Date(item.sent_at), 'MMM d, yyyy');
```

### Testing Strategy

**Test patterns (MUST follow — Epic 3 retro action items):**
- No hard-coded future dates — use relative dates or mock `Date.now()`
- No non-null assertions (`!`) — use `??` for defaults
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Mock Supabase client consistently
- PaperProvider wrapper required for all component tests

**Mock setup:**
```typescript
jest.mock('@features/notifications', () => ({
  ...jest.requireActual('@features/notifications'),
  getNotificationHistory: jest.fn(),
  getDeliveryCount: jest.fn(),
  hasPartialNotifications: jest.fn(),
}));

jest.mock('@shared/stores/useNotificationStore', () => ({
  useNotificationStore: jest.fn(),
}));
```

**Test file locations:**
- `src/features/notifications/screens/NotificationHistoryScreen.test.tsx`
- `src/features/notifications/components/NotificationStatusBadge.test.tsx`

### Previous Story Intelligence (Story 4.5)

**Key learnings:**
- 362 tests passing — this is the current baseline
- `SegmentedButtons` has no top-level `disabled` prop; per-button `disabled` is on `buttons[]` items
- Optimistic UI pattern works well — use for any toggle interactions
- The `is_enabled` toggle already affects BOTH renewal and trial notifications at the query level
- Code review found tautological tests — ensure tests verify actual behavior, not implementation details
- `Switch` import from `react-native-paper` is already in use in `SubscriptionDetailScreen.tsx`

**Files modified in Story 4.5:**
- `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` (modified)
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` (modified)

### Git Intelligence

Recent commit pattern: `ready-for-dev story X.Y` → `story X.Y in review` → `done story X.Y`
Latest commit: `b6a2b21 done story 4.5`

### Cross-Story Dependencies

- **Story 4.1 (DONE):** Push notification permission, `useNotificationStore`, device token registration, `openNotificationSettings()`
- **Story 4.2 (DONE):** `reminder_settings` table, `notification_log` table, `get_reminder_candidates` RPC, `calculate-reminders` Edge Function
- **Story 4.3 (DONE):** Customizable reminder timing UI, `reminderService.ts` CRUD
- **Story 4.4 (DONE):** Trial expiry notifications, `notification_type` column in `notification_log`, `get_trial_expiry_candidates` RPC
- **Story 4.5 (DONE):** Per-subscription notification toggle (`is_enabled` in `reminder_settings`)

### Files to Create

- `src/features/notifications/screens/NotificationHistoryScreen.tsx`
- `src/features/notifications/screens/NotificationHistoryScreen.test.tsx`
- `src/features/notifications/services/notificationHistoryService.ts`
- `src/features/notifications/services/notificationHistoryService.test.ts`
- `src/features/notifications/components/NotificationStatusBadge.tsx`
- `src/features/notifications/components/NotificationStatusBadge.test.tsx`

### Files to Modify

- `src/app/navigation/types.ts` — add `NotificationHistory` to `SettingsStackParamList`
- `src/app/navigation/SettingsStack.tsx` — add Stack.Screen for NotificationHistory
- `src/features/settings/screens/SettingsScreen.tsx` — add "Notification History" menu item, update Notifications row with health indicator
- `src/features/dashboard/screens/HomeScreen.tsx` — add `NotificationStatusBadge` (when enabled/partial, complementing existing banner)
- `src/features/notifications/index.ts` — export new components and services

### Files NOT to Modify

- `supabase/migrations/` — DO NOT create new tables; `notification_log` already exists
- `supabase/functions/calculate-reminders/` — no changes to the Edge Function
- `src/features/notifications/services/reminderService.ts` — no changes
- `src/features/notifications/services/notificationService.ts` — no changes
- `src/shared/stores/useNotificationStore.ts` — no changes to store shape (read permissionStatus from it)

### Potential Pitfall: Foreign Key on notification_log

The `notification_log` table may NOT have a foreign key constraint from `subscription_id` to `subscriptions.id`. If not, the Supabase `.select()` join syntax (`subscriptions!inner(name)`) will fail. In that case, either:
1. **Preferred:** Create a small migration adding the FK: `ALTER TABLE notification_log ADD CONSTRAINT fk_notification_log_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE;`
2. **Fallback:** Fetch notification logs and subscription names in separate queries, then merge client-side

Check the migration file `20260315100000_create_reminder_settings.sql` for existing FK constraints before deciding.

### Project Structure Notes

- All new screens in `src/features/notifications/screens/` (per architecture.md feature module pattern)
- All new components in `src/features/notifications/components/`
- All new services in `src/features/notifications/services/`
- Test files co-located with source (per architecture.md)
- Navigation updates in `src/app/navigation/`

### References

- [Source: epics.md#Story-4.6] — User story, acceptance criteria: notification history display, health indicator, disabled banner
- [Source: prd.md#FR25] — "User can view notification history"
- [Source: prd.md#FR26] — "System displays warning when notifications are disabled on device"
- [Source: ux-design-specification.md#NotificationStatusBadge] — Component spec with 3 states (enabled/disabled/partial), props, colors
- [Source: architecture.md#Feature-Module-Structure] — Feature directory structure pattern
- [Source: architecture.md#Component-Boundaries] — Feature-specific components in `features/*/components/`
- [Source: architecture.md#Test-File-Location] — Co-located with source files
- [Source: architecture.md#Naming-Patterns] — PascalCase components, camelCase services
- [Source: 4-5-per-subscription-notification-control.md] — Previous story: 362 tests baseline, `is_enabled` column confirmed working
- [Source: 20260315100000_create_reminder_settings.sql] — notification_log table schema
- [Source: 20260317000000_add_trial_expiry_notifications.sql] — notification_type column addition
- [Source: NotificationStatusBanner.tsx] — Existing red disabled banner component
- [Source: HomeScreen.tsx] — Existing banner integration
- [Source: SettingsScreen.tsx] — Existing Notifications row in settings

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `notification_log` has no FK to `subscriptions.id` → used separate query (two-step lookup) instead of join syntax
- RLS SELECT policy for `notification_log` was already in place from Story 4.2 (`20260315100000_create_reminder_settings.sql`) — Task 5 verified only
- `getDeliveryCount`/`hasPartialNotifications` use Supabase `{ count: 'exact', head: true }` option; chain ends at final `.eq()` resolving `{ count, error }` (no `.head()` method call)

### Completion Notes List

- Implemented `notificationHistoryService.ts` with `getNotificationHistory` (two-step query: logs + subscription names), `getDeliveryCount`, and `hasPartialNotifications`
- Created `NotificationHistoryScreen.tsx` with FlatList, status chips (green/red/amber), type icons, empty state, pull-to-refresh, and embedded `NotificationStatusBadge` (banner variant) at top
- Created `NotificationStatusBadge.tsx` with three states (enabled/partial/disabled), two variants (header/banner), delivery count display, and lazy stats loading
- Added `NotificationHistory` route to `SettingsStackParamList`, `SettingsStack.tsx`, and `SettingsScreen.tsx` (with History list item + badge on Notifications row)
- Updated `HomeScreen.tsx`: shows `NotificationStatusBadge` when permission is not denied; existing `NotificationStatusBanner` shows only when denied — no simultaneous display
- Exported all new components/services from `notifications/index.ts`
- 402 tests passing (+40 new; baseline was 362 from Story 4.5); TypeScript zero errors; ESLint zero errors

### File List

- `src/features/notifications/services/notificationHistoryService.ts` (created)
- `src/features/notifications/services/notificationHistoryService.test.ts` (created)
- `src/features/notifications/screens/NotificationHistoryScreen.tsx` (created)
- `src/features/notifications/screens/NotificationHistoryScreen.test.tsx` (created)
- `src/features/notifications/components/NotificationStatusBadge.tsx` (created)
- `src/features/notifications/components/NotificationStatusBadge.test.tsx` (created)
- `src/features/notifications/index.ts` (modified)
- `src/app/navigation/types.ts` (modified)
- `src/app/navigation/SettingsStack.tsx` (modified)
- `src/features/settings/screens/SettingsScreen.tsx` (modified)
- `src/features/settings/screens/SettingsScreen.test.tsx` (created)
- `src/features/dashboard/screens/HomeScreen.tsx` (modified)
- `src/features/dashboard/screens/HomeScreen.test.tsx` (modified)

### Change Log

- 2026-03-18: Implemented Story 4.6 — Notification History Screen, NotificationStatusBadge component, Settings navigation, HomeScreen badge integration; 40 new tests added (402 total)
