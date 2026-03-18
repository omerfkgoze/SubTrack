# Story 5.1: Add Subscription Renewals to Device Calendar

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to add my subscription renewal dates to my device calendar,
so that I see them alongside my other events and never miss a payment.

## Acceptance Criteria

1. **AC1: Add to Calendar Button on Subscription Detail**
   - **Given** the user is viewing a subscription's details
   - **When** the screen loads
   - **Then** an "Add to Calendar" button is visible in the action buttons section
   - **And** if the subscription already has a linked calendar event, the button shows "Update Calendar Event" instead

2. **AC2: Calendar Permission Request**
   - **Given** the user taps "Add to Calendar"
   - **When** calendar permission has not been granted yet
   - **Then** a pre-permission explanation dialog is shown before the OS prompt (pattern from Story 4.1 push notification permission)
   - **And** the native calendar permission is requested via `expo-calendar`
   - **And** if granted, the calendar event creation proceeds

3. **AC3: Recurring Calendar Event Creation (Monthly)**
   - **Given** the subscription has a `monthly` billing cycle
   - **When** a calendar event is created
   - **Then** the event title is formatted as `"{name} Renewal - {currency}{price}"` (e.g., "Netflix Renewal - €17.99")
   - **And** the event is an all-day event on the `renewal_date`
   - **And** a monthly recurrence rule is set (`Calendar.Frequency.MONTHLY`)
   - **And** the returned `calendar_event_id` is stored in the `subscriptions` table in Supabase

4. **AC4: Recurring Calendar Event Creation (Yearly)**
   - **Given** the subscription has a `yearly` billing cycle
   - **When** a calendar event is created
   - **Then** the event recurs annually (`Calendar.Frequency.YEARLY`)

5. **AC5: Recurring Calendar Event Creation (Other Cycles)**
   - **Given** the subscription has a `weekly` or `quarterly` billing cycle
   - **When** a calendar event is created
   - **Then** `weekly` → `Calendar.Frequency.WEEKLY`
   - **And** `quarterly` → `Calendar.Frequency.MONTHLY` with `interval: 3`

6. **AC6: Permission Denied Handling**
   - **Given** the user has not granted calendar permission
   - **When** they attempt to add to calendar and deny permission
   - **Then** a graceful message is shown: "Calendar access is needed to add renewal dates. You can enable it in Settings."
   - **And** if `canAskAgain` is false, a "Open Settings" button is shown that calls `Linking.openSettings()`
   - **And** the app continues functioning normally without blocking

7. **AC7: Calendar Event ID Persistence**
   - **Given** a calendar event is successfully created
   - **When** the event ID is returned
   - **Then** the `calendar_event_id` column in the `subscriptions` table is updated with the native event ID
   - **And** this ID is used to detect existing events and enable future update/delete (Story 5.3)

8. **AC8: Success Feedback**
   - **Given** the calendar event is successfully created
   - **When** creation completes
   - **Then** a Snackbar success message is shown: "Added to calendar"
   - **And** the button text changes to "Update Calendar Event"

## Tasks / Subtasks

- [ ] Task 1: Install `expo-calendar` and configure (AC: #2)
  - [ ] 1.1: Run `npx expo install expo-calendar`
  - [ ] 1.2: Add `expo-calendar` config plugin to `app.json` with permission description
  - [ ] 1.3: Add iOS 17+ permission strings to `app.json` infoPlist (`NSCalendarsFullAccessUsageDescription`)

- [ ] Task 2: Create database migration for `calendar_event_id` (AC: #7)
  - [ ] 2.1: Create migration `supabase/migrations/YYYYMMDDHHMMSS_add_calendar_event_id.sql`
  - [ ] 2.2: Add `calendar_event_id TEXT` column to `subscriptions` table (nullable, default null)
  - [ ] 2.3: No RLS changes needed — existing RLS on subscriptions table covers this column

- [ ] Task 3: Create calendar service (AC: #2, #3, #4, #5, #7)
  - [ ] 3.1: Create `src/features/subscriptions/services/calendarService.ts`
  - [ ] 3.2: Implement `requestCalendarAccess()` — returns `{ granted: boolean; canAskAgain: boolean }`
  - [ ] 3.3: Implement `getDefaultCalendarId()` — returns the default writable calendar ID (platform-aware)
  - [ ] 3.4: Implement `addSubscriptionToCalendar(subscription: Subscription, calendarId?: string)` — creates recurring event, returns event ID
  - [ ] 3.5: Implement `mapBillingCycleToRecurrence(billingCycle: BillingCycle)` — maps billing cycle to `Calendar.Frequency` + interval
  - [ ] 3.6: Update `calendar_event_id` in Supabase after successful event creation

- [ ] Task 4: Add "Add to Calendar" button to SubscriptionDetailScreen (AC: #1, #6, #8)
  - [ ] 4.1: Add "Add to Calendar" / "Update Calendar Event" button in the action buttons section
  - [ ] 4.2: Implement pre-permission dialog (Dialog from react-native-paper) shown before OS prompt
  - [ ] 4.3: Handle permission denied state — show Snackbar with "Open Settings" action if `canAskAgain === false`
  - [ ] 4.4: Show success Snackbar on event creation
  - [ ] 4.5: Disable button + show loading spinner during event creation

- [ ] Task 5: Update subscription types (AC: #7)
  - [ ] 5.1: Regenerate Supabase types after migration OR manually verify `calendar_event_id` appears in `Subscription` type
  - [ ] 5.2: If types are manual, add `calendar_event_id: string | null` to the Subscription type

- [ ] Task 6: Write tests (AC: all)
  - [ ] 6.1: Test `calendarService.ts` — `requestCalendarAccess` returns correct states
  - [ ] 6.2: Test `calendarService.ts` — `addSubscriptionToCalendar` creates event with correct recurrence for each billing cycle
  - [ ] 6.3: Test `calendarService.ts` — `mapBillingCycleToRecurrence` returns correct frequency/interval for all 4 cycles
  - [ ] 6.4: Test SubscriptionDetailScreen — shows "Add to Calendar" when no `calendar_event_id`
  - [ ] 6.5: Test SubscriptionDetailScreen — shows "Update Calendar Event" when `calendar_event_id` exists
  - [ ] 6.6: Test SubscriptionDetailScreen — permission denied shows graceful message
  - [ ] 6.7: Test SubscriptionDetailScreen — success shows Snackbar

- [ ] Task 7: Verify and validate (AC: all)
  - [ ] 7.1: `npx tsc --noEmit` — zero errors
  - [ ] 7.2: ESLint clean on changed files
  - [ ] 7.3: Full test suite passes (baseline: 408 tests from Story 4.6)

## Dev Notes

### CRITICAL: Use `expo-calendar`, NOT `react-native-calendar-events`

The epics file references `react-native-calendar-events`, but **Epic 5 preparation research** (committed in `00760c0`) concluded this library is **abandoned** (last updated ~2020, no Expo config plugin, no New Architecture support). Use `expo-calendar` instead:

- First-party Expo team maintained
- v55.0.9, actively updated (March 2026)
- Full SDK 54 + New Architecture support
- Built-in config plugin
- SubTrack already uses dev client builds (react-native-biometrics, react-native-keychain)

[Source: docs/epic-5-prep-calendar-library-research.md]

### Architecture: Calendar Integration Lives in `features/subscriptions`

Per `architecture.md#Requirements-to-Structure-Mapping`:
> FR27-FR29 (Calendar) → `features/subscriptions` — Integrated in `subscriptionService.ts`

Calendar is a capability of the subscriptions feature, not a standalone feature. Create `calendarService.ts` inside `src/features/subscriptions/services/`.

### Database Migration: Add `calendar_event_id` to `subscriptions`

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_calendar_event_id.sql
ALTER TABLE subscriptions ADD COLUMN calendar_event_id TEXT;
```

No RLS changes needed — the existing `subscriptions` table RLS policies apply to all columns.

### Calendar Service Implementation Pattern

```typescript
// src/features/subscriptions/services/calendarService.ts
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { supabase } from '@shared/services/supabase';
import type { Subscription, BillingCycle } from '../types';

export async function requestCalendarAccess(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
  return { granted: status === 'granted', canAskAgain: canAskAgain ?? true };
}

export async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  // Find first writable calendar
  const writable = calendars.find(
    (cal) => cal.allowsModifications
  );
  if (writable) return writable.id;
  // iOS fallback: use default calendar
  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    return defaultCal?.id ?? null;
  }
  return calendars[0]?.id ?? null;
}

export function mapBillingCycleToRecurrence(cycle: BillingCycle): {
  frequency: Calendar.Frequency;
  interval: number;
} {
  switch (cycle) {
    case 'weekly':
      return { frequency: Calendar.Frequency.WEEKLY, interval: 1 };
    case 'monthly':
      return { frequency: Calendar.Frequency.MONTHLY, interval: 1 };
    case 'quarterly':
      return { frequency: Calendar.Frequency.MONTHLY, interval: 3 };
    case 'yearly':
      return { frequency: Calendar.Frequency.YEARLY, interval: 1 };
  }
}

export async function addSubscriptionToCalendar(
  subscription: Subscription,
  calendarId?: string
): Promise<string> {
  const targetCalendarId = calendarId ?? (await getDefaultCalendarId());
  if (!targetCalendarId) throw new Error('No writable calendar found');

  const { frequency, interval } = mapBillingCycleToRecurrence(
    subscription.billing_cycle as BillingCycle
  );

  const eventId = await Calendar.createEventAsync(targetCalendarId, {
    title: `${subscription.name} Renewal - ${subscription.currency ?? '€'}${subscription.price}`,
    startDate: new Date(subscription.renewal_date),
    endDate: new Date(subscription.renewal_date),
    allDay: true,
    recurrenceRule: {
      frequency,
      interval,
    },
  });

  // Persist event ID to Supabase
  const { error } = await supabase
    .from('subscriptions')
    .update({ calendar_event_id: eventId })
    .eq('id', subscription.id);

  if (error) throw error;

  return eventId;
}
```

### Pre-Permission Dialog Pattern

Follow the same pre-permission pattern established in Story 4.1 for push notifications:

```tsx
// Show custom dialog BEFORE OS prompt (increases grant rate, critical on iOS where you get one chance)
<Dialog visible={showCalendarPermissionDialog} onDismiss={dismissDialog}>
  <Dialog.Title>Add to Your Calendar</Dialog.Title>
  <Dialog.Content>
    <Text>SubTrack can add subscription renewal dates to your calendar so you never miss a payment.</Text>
  </Dialog.Content>
  <Dialog.Actions>
    <Button onPress={dismissDialog}>Not Now</Button>
    <Button onPress={handleRequestCalendarPermission}>Allow</Button>
  </Dialog.Actions>
</Dialog>
```

[Source: docs/epic-5-prep-calendar-permission-models.md — iOS gets ONE system prompt, pre-permission is critical]

### Permission Denied Handling

```typescript
const { granted, canAskAgain } = await requestCalendarAccess();
if (granted) {
  // Proceed with calendar event creation
} else if (!canAskAgain) {
  // Show "Open Settings" — user permanently denied
  // Use Linking.openSettings() (already used in notification permission flow)
} else {
  // User tapped "Not Now" on pre-permission — don't trigger OS prompt
  // Show gentle message, allow retry later
}
```

### iOS 17+ Calendar Permission Strings

`app.json` must include both legacy and new iOS 17+ permission strings:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCalendarsFullAccessUsageDescription": "SubTrack needs calendar access to create and manage subscription renewal reminders.",
        "NSCalendarsWriteOnlyAccessUsageDescription": "SubTrack needs calendar access to add subscription renewal dates to your calendar."
      }
    },
    "plugins": [
      ["expo-calendar", {
        "calendarPermission": "SubTrack needs calendar access to add subscription renewal dates."
      }]
    ]
  }
}
```

[Source: docs/epic-5-prep-calendar-permission-models.md]

### SubscriptionDetailScreen Integration Point

The "Add to Calendar" button goes in the **action buttons section** (after existing Edit/Delete/Cancel buttons) in `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx`. Current buttons use `Button` from `react-native-paper` with `mode="outlined"` styling.

Button should:
- Use `icon="calendar-plus"` (Material Community Icons, available via react-native-paper)
- Show "Add to Calendar" when `subscription.calendar_event_id` is null
- Show "Update Calendar Event" when `calendar_event_id` exists
- For updates: delete old event first, then create new one (handles billing cycle/price changes)

### Existing Data Available in SubscriptionDetailScreen

The screen already has the full `subscription` object with:
- `subscription.name` — for event title
- `subscription.price` — for event title
- `subscription.currency` — for event title (defaults to 'EUR')
- `subscription.billing_cycle` — for recurrence rule ('monthly' | 'yearly' | 'quarterly' | 'weekly')
- `subscription.renewal_date` — for event start date (ISO date string, parsed with `parseISO()`)
- `subscription.is_active` — consider hiding button for cancelled subscriptions

### Testing Strategy

**Test patterns (MUST follow — Epic 3 retro action items):**
- No hard-coded future dates — use relative dates or mock `Date.now()`
- No non-null assertions (`!`) — use `??` for defaults
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Mock Supabase client consistently
- PaperProvider wrapper required for all component tests
- 408 tests is current baseline (from Story 4.6)

**Mock setup for expo-calendar:**
```typescript
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getDefaultCalendarAsync: jest.fn(),
  createEventAsync: jest.fn(),
  deleteEventAsync: jest.fn(),
  EntityTypes: { EVENT: 'event' },
  Frequency: {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  },
}));
```

**Test file locations (co-located per architecture.md):**
- `src/features/subscriptions/services/calendarService.test.ts`
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` (modify existing)

### Previous Story Intelligence (Story 4.6 — Last in Epic 4)

**Key learnings:**
- 408 tests passing — this is the current baseline
- `notification_log` join without FK required two-step query approach — similar pattern may apply if joining tables
- `NotificationStatusBadge` successfully used `variant` prop pattern for different display contexts
- Code review found need for loading/error states — ensure "Add to Calendar" button has proper loading state
- Supabase `{ count: 'exact', head: true }` pattern works well for count queries

**Epic 4 retrospective action items applied:**
- Pre-permission dialog pattern established (Story 4.1) — reuse for calendar
- `Linking.openSettings()` already exists in `notificationService.ts` — reuse pattern

### Cross-Story Dependencies (Epic 5)

- **Story 5.2 (Calendar Selection):** Will use the same `calendarService.ts` — add events to user-selected calendar. Story 5.1 uses default calendar; 5.2 adds selection UI.
- **Story 5.3 (Calendar Event Cleanup):** Depends on `calendar_event_id` stored by this story — when subscription is deleted, also delete calendar event via `Calendar.deleteEventAsync(eventId)`.
- **Design for extensibility:** Keep `calendarId` as optional parameter in `addSubscriptionToCalendar()` so Story 5.2 can pass user-selected calendar.

### Project Structure Notes

- New file: `src/features/subscriptions/services/calendarService.ts` — per architecture mapping FR27-29 → `features/subscriptions`
- New file: `src/features/subscriptions/services/calendarService.test.ts` — co-located tests
- Modified: `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` — add button + permission flow
- Modified: `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — add calendar tests
- Modified: `app.json` — add expo-calendar plugin + iOS permission strings
- New: `supabase/migrations/YYYYMMDDHHMMSS_add_calendar_event_id.sql` — add column
- Modified: `src/features/subscriptions/index.ts` — export calendarService functions (if not already re-exported)

### Files NOT to Modify

- `src/features/subscriptions/services/subscriptionService.ts` — do NOT add calendar logic here; keep it in calendarService
- `src/shared/stores/useSubscriptionStore.ts` — calendar is a side-effect action, not core subscription state
- `supabase/functions/` — no edge function changes needed; calendar is client-side only

### References

- [Source: epics.md#Story-5.1] — User story, acceptance criteria: calendar event creation, permission handling, recurrence
- [Source: prd.md#FR27] — "User can add subscription renewal dates to device calendar"
- [Source: prd.md#NFR35] — "Calendar sync reliability: 100% for user-initiated"
- [Source: architecture.md#Requirements-to-Structure-Mapping] — FR27-FR29 → `features/subscriptions`
- [Source: architecture.md#Post-Initialization-Setup] — Calendar: `react-native-calendar-events` (OVERRIDDEN by research → `expo-calendar`)
- [Source: architecture.md#Feature-Module-Structure] — Feature directory structure pattern
- [Source: architecture.md#Naming-Patterns] — PascalCase components, camelCase services
- [Source: docs/epic-5-prep-calendar-library-research.md] — CRITICAL: Use `expo-calendar` not `react-native-calendar-events`
- [Source: docs/epic-5-prep-calendar-permission-models.md] — iOS 17+ permission model, pre-permission pattern, system UI bypass option
- [Source: 4-6-notification-history-health-indicator.md] — Previous story: 408 tests baseline, loading/error state requirements
- [Source: SubscriptionDetailScreen.tsx] — Integration point for "Add to Calendar" button
- [Source: subscriptionService.ts] — Service pattern to follow
- [Source: 20260227000000_create_subscriptions.sql] — Subscriptions table schema (renewal_date, billing_cycle, price, currency, name)
- [Source: expo-calendar SDK 54 docs] — createEventAsync, recurrenceRule, requestCalendarPermissionsAsync

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
