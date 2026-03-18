# Story 5.2: Calendar Selection

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to choose which calendar my subscription events are added to,
so that I can keep them organized in a specific calendar.

## Acceptance Criteria

1. **AC1: Calendar Selection Prompt on Multi-Calendar Devices**
   - **Given** the user taps "Add to Calendar" on SubscriptionDetailScreen and has multiple calendars on their device
   - **When** calendar permission is granted
   - **Then** a bottom sheet or dialog lists all available writable device calendars (fetched via `Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)`)
   - **And** each calendar entry shows the calendar title and a color indicator
   - **And** the user can select their preferred calendar
   - **And** the event is created in the selected calendar

2. **AC2: Auto-Select on Single Calendar**
   - **Given** the user has only one writable calendar on their device
   - **When** they tap "Add to Calendar"
   - **Then** the event is added to that calendar without showing a selection prompt
   - **And** this is the same behavior as Story 5.1 (no regression)

3. **AC3: Preferred Calendar Persistence**
   - **Given** the user selects a calendar from the selection prompt
   - **When** the event is successfully created
   - **Then** the selected calendar ID is stored in the `user_settings` table in Supabase (column: `preferred_calendar_id`)
   - **And** subsequent "Add to Calendar" actions skip the selection prompt and use the stored preference directly

4. **AC4: Calendar Preference in Settings**
   - **Given** the user navigates to Settings
   - **When** the settings screen loads
   - **Then** a "Calendar" section is visible (below Notifications, above Account)
   - **And** a "Preferred Calendar" item shows the currently selected calendar name (or "Default" if none set)
   - **And** tapping it opens the calendar selection dialog/bottom sheet
   - **And** the user can change their preferred calendar

5. **AC5: Changed Preference Applies to New Events Only**
   - **Given** the user changes their preferred calendar in Settings
   - **When** new calendar events are created for subscriptions
   - **Then** they are added to the newly selected calendar
   - **And** existing events remain in their original calendar (no migration)

6. **AC6: Preferred Calendar Deleted from Device**
   - **Given** the user's preferred calendar no longer exists on the device (deleted externally)
   - **When** they tap "Add to Calendar"
   - **Then** the calendar selection prompt is shown again (as if no preference is set)
   - **And** the stale preference is cleared from `user_settings`

7. **AC7: Success Feedback**
   - **Given** the user selects a calendar and the event is created
   - **When** creation completes
   - **Then** a Snackbar shows "Added to {calendar_name}" (e.g., "Added to Personal")

## Tasks / Subtasks

- [x] Task 1: Create `user_settings` table and migration (AC: #3)
  - [x] 1.1: Create migration `supabase/migrations/20260318100000_create_user_settings.sql`
  - [x] 1.2: Table schema: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`, `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE`, `preferred_calendar_id TEXT`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
  - [x] 1.3: Enable RLS: `ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY`
  - [x] 1.4: Add RLS policies: SELECT/INSERT/UPDATE/DELETE where `auth.uid() = user_id`
  - [x] 1.5: Add `updated_at` trigger (same pattern as `subscriptions` table)

- [x] Task 2: Update TypeScript types for `user_settings` (AC: #3)
  - [x] 2.1: Add `user_settings` table definition to `src/shared/types/database.types.ts` with Row/Insert/Update types
  - [x] 2.2: Export `UserSettings` type from `src/features/settings/types/index.ts`

- [x] Task 3: Create `userSettingsService.ts` (AC: #3, #6)
  - [x] 3.1: Create `src/features/settings/services/userSettingsService.ts`
  - [x] 3.2: Implement `getUserSettings(userId: string): Promise<UserSettings | null>` — fetch from Supabase
  - [x] 3.3: Implement `upsertPreferredCalendar(userId: string, calendarId: string): Promise<void>` — upsert into `user_settings`
  - [x] 3.4: Implement `clearPreferredCalendar(userId: string): Promise<void>` — set `preferred_calendar_id` to null

- [x] Task 4: Extend `calendarService.ts` with calendar listing (AC: #1, #2, #6)
  - [x] 4.1: Add `getWritableCalendars(): Promise<Array<{ id: string; title: string; color: string; isPrimary: boolean }>>` — fetches all writable calendars via `Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)`, filters `allowsModifications === true`
  - [x] 4.2: Add `isCalendarAvailable(calendarId: string): Promise<boolean>` — checks if a specific calendar still exists on device (for AC #6)
  - [x] 4.3: Keep existing `getDefaultCalendarId()` and `addSubscriptionToCalendar(subscription, calendarId?)` unchanged — they already accept optional calendarId

- [x] Task 5: Create `CalendarSelectionDialog` component (AC: #1, #4)
  - [x] 5.1: Create `src/features/subscriptions/components/CalendarSelectionDialog.tsx`
  - [x] 5.2: Props: `visible: boolean`, `calendars: Array<{ id, title, color, isPrimary }>`, `selectedId?: string`, `onSelect: (calendarId: string, calendarTitle: string) => void`, `onDismiss: () => void`
  - [x] 5.3: Render as `Portal > Dialog` (react-native-paper pattern, consistent with app)
  - [x] 5.4: Each calendar row: color dot (View with backgroundColor), calendar title, radio/check indicator for selected
  - [x] 5.5: Minimum touch target 44x44 (NFR30)
  - [x] 5.6: Accessibility: `accessibilityRole="radiogroup"` on list, `accessibilityRole="radio"` on items

- [x] Task 6: Integrate calendar selection into SubscriptionDetailScreen (AC: #1, #2, #3, #5, #6, #7)
  - [x] 6.1: Modify `handleCalendarPermissionConfirm` in `SubscriptionDetailScreen.tsx`:
    - After permission granted, call `getWritableCalendars()`
    - If only 1 calendar → proceed directly (existing behavior)
    - If multiple calendars → check for stored `preferred_calendar_id` via `getUserSettings()`
    - If preference exists AND `isCalendarAvailable(preferredId)` → use it directly
    - If preference exists but calendar gone → clear preference, show selection dialog
    - If no preference → show `CalendarSelectionDialog`
  - [x] 6.2: On calendar selection: create event with selected calendarId, then call `upsertPreferredCalendar()`
  - [x] 6.3: Update Snackbar message to show calendar name: "Added to {calendarTitle}"

- [x] Task 7: Add calendar preference to SettingsScreen (AC: #4)
  - [x] 7.1: Add "Calendar" `List.Section` to `SettingsScreen.tsx` between Notifications and Account sections
  - [x] 7.2: Add `List.Item` with title "Preferred Calendar", description showing current calendar name or "Default"
  - [x] 7.3: On press → request calendar permission if needed, then `getWritableCalendars()`, show `CalendarSelectionDialog`
  - [x] 7.4: On selection → call `upsertPreferredCalendar()` and update displayed name
  - [x] 7.5: Load current preference on mount via `getUserSettings()` and resolve calendar name from device calendars

- [x] Task 8: Write tests (AC: all)
  - [x] 8.1: Test `calendarService.ts` — `getWritableCalendars` returns only writable calendars with correct shape
  - [x] 8.2: Test `calendarService.ts` — `isCalendarAvailable` returns true/false correctly
  - [x] 8.3: Test `userSettingsService.ts` — `getUserSettings` returns settings or null
  - [x] 8.4: Test `userSettingsService.ts` — `upsertPreferredCalendar` calls Supabase correctly
  - [x] 8.5: Test `CalendarSelectionDialog` — renders calendar list with colors and titles
  - [x] 8.6: Test `CalendarSelectionDialog` — highlights currently selected calendar
  - [x] 8.7: Test `CalendarSelectionDialog` — calls onSelect with correct id and title
  - [x] 8.8: Test `SubscriptionDetailScreen` — single calendar: no selection dialog shown
  - [x] 8.9: Test `SubscriptionDetailScreen` — multiple calendars + no preference: shows selection dialog
  - [x] 8.10: Test `SubscriptionDetailScreen` — multiple calendars + stored preference: uses preference directly
  - [x] 8.11: Test `SubscriptionDetailScreen` — stale preference: shows selection dialog, clears old preference
  - [x] 8.12: Test `SettingsScreen` — shows calendar section with current preference name
  - [x] 8.13: Test `SettingsScreen` — tapping opens calendar selection dialog

- [x] Task 9: Verify and validate (AC: all)
  - [x] 9.1: `npx tsc --noEmit` — zero errors
  - [x] 9.2: ESLint clean on changed files
  - [x] 9.3: Full test suite passes (465/466 pass, 1 pre-existing failure in NotificationHistoryScreen unrelated to this story)

## Dev Notes

### CRITICAL: Use `expo-calendar`, NOT `react-native-calendar-events`

The epics file references `react-native-calendar-events` but Story 5.1 research determined it is abandoned. The project uses `expo-calendar` (already installed, v55.0.9). Do NOT install any additional calendar library.

[Source: 5-1-add-subscription-renewals-to-device-calendar.md#Dev-Notes]

### `user_settings` Table — This Story Creates It

No `user_settings` table exists yet. The implementation-readiness report flagged this ambiguity — both Epic 5 (Story 5.2) and Epic 6 (Story 6.1) reference it. Since Story 5.2 runs first, **create the table here**. Keep the schema minimal but extensible for Epic 6 (which will add `is_premium`, `subscription_limit` columns later).

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_user_settings.sql
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_calendar_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at (reuse existing function if available, else create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

[Source: implementation-readiness-report-2026-02-11.md — `user_settings` table creation ambiguity resolution]

### Architecture: Calendar Integration Lives in `features/subscriptions`

Per architecture.md, FR27-FR29 → `features/subscriptions`. The `CalendarSelectionDialog` component and calendar listing functions belong in `src/features/subscriptions/`. The `userSettingsService` belongs in `src/features/settings/services/` since it's a general user settings service.

[Source: architecture.md#Requirements-to-Structure-Mapping]

### Existing `calendarService.ts` API — Designed for This Story

Story 5.1 designed `addSubscriptionToCalendar(subscription, calendarId?)` with an optional `calendarId` parameter specifically for this story. When `calendarId` is provided, it's used directly; when omitted, `getDefaultCalendarId()` is called as fallback. **Do NOT change this function signature** — just pass the user's preferred calendarId.

The existing `getDefaultCalendarId()` already fetches all calendars. Extend with `getWritableCalendars()` that returns the full list for UI display.

```typescript
// New function in calendarService.ts
export async function getWritableCalendars(): Promise<
  Array<{ id: string; title: string; color: string; isPrimary: boolean }>
> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars
    .filter((cal) => cal.allowsModifications)
    .map((cal) => ({
      id: cal.id,
      title: cal.title,
      color: cal.color ?? '#888888',
      isPrimary: cal.isPrimary ?? false,
    }));
}

export async function isCalendarAvailable(calendarId: string): Promise<boolean> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.some((cal) => cal.id === calendarId);
}
```

[Source: calendarService.ts — existing API, expo-calendar SDK 54 docs]

### SubscriptionDetailScreen Integration Flow

Current flow (Story 5.1):
1. User taps "Add to Calendar" → pre-permission dialog
2. User taps "Allow" → `requestCalendarAccess()`
3. If granted → `addSubscriptionToCalendar(subscription)` (uses default calendar)

New flow (Story 5.2):
1. User taps "Add to Calendar" → pre-permission dialog (unchanged)
2. User taps "Allow" → `requestCalendarAccess()` (unchanged)
3. If granted → `getWritableCalendars()`
4. If 1 calendar → proceed directly (same as 5.1)
5. If multiple calendars → check `getUserSettings()` for `preferred_calendar_id`
   - If preference exists AND calendar available → `addSubscriptionToCalendar(subscription, preferredId)`
   - If preference exists but calendar gone → `clearPreferredCalendar()`, show `CalendarSelectionDialog`
   - If no preference → show `CalendarSelectionDialog`
6. On selection → `addSubscriptionToCalendar(subscription, selectedId)` + `upsertPreferredCalendar(userId, selectedId)`
7. Snackbar: "Added to {calendarTitle}"

### `userSettingsService.ts` — Supabase Upsert Pattern

Use Supabase `upsert` with `onConflict: 'user_id'` since `user_id` has a UNIQUE constraint:

```typescript
// src/features/settings/services/userSettingsService.ts
import { supabase } from '@shared/services/supabase';

export interface UserSettings {
  id: string;
  user_id: string;
  preferred_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertPreferredCalendar(
  userId: string,
  calendarId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, preferred_calendar_id: calendarId },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

export async function clearPreferredCalendar(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .update({ preferred_calendar_id: null })
    .eq('user_id', userId);
  if (error) throw error;
}
```

### CalendarSelectionDialog — react-native-paper Dialog Pattern

Follow the existing Dialog pattern used throughout the app (DeleteConfirmationDialog, pre-permission dialog). Use `Portal > Dialog` from react-native-paper. Each calendar item uses a `TouchableRipple` or `List.Item` with:
- Left: `View` with `width: 16, height: 16, borderRadius: 8, backgroundColor: calendar.color`
- Title: calendar title
- Right: `RadioButton` or checkmark icon for selected state

```tsx
// Example structure
<Portal>
  <Dialog visible={visible} onDismiss={onDismiss}>
    <Dialog.Title>Select Calendar</Dialog.Title>
    <Dialog.Content>
      {calendars.map((cal) => (
        <List.Item
          key={cal.id}
          title={cal.title}
          left={() => <View style={[styles.colorDot, { backgroundColor: cal.color }]} />}
          right={() => cal.id === selectedId ? <List.Icon icon="check" /> : null}
          onPress={() => onSelect(cal.id, cal.title)}
          accessibilityRole="radio"
          accessibilityState={{ checked: cal.id === selectedId }}
        />
      ))}
    </Dialog.Content>
    <Dialog.Actions>
      <Button onPress={onDismiss}>Cancel</Button>
    </Dialog.Actions>
  </Dialog>
</Portal>
```

### SettingsScreen Calendar Section

Add between the Notifications section and Account section. Requires loading user settings on mount and resolving the calendar name from device calendars.

```tsx
// In SettingsScreen.tsx, between Notifications and Account sections:
<List.Section>
  <List.Subheader>Calendar</List.Subheader>
  <List.Item
    title="Preferred Calendar"
    description={preferredCalendarName ?? 'Default'}
    left={(props) => <List.Icon {...props} icon="calendar" />}
    right={(props) => <List.Icon {...props} icon="chevron-right" />}
    onPress={handleCalendarPreference}
    style={styles.listItem}
    accessibilityLabel="Preferred Calendar"
    accessibilityRole="button"
  />
</List.Section>
```

### User ID Access Pattern

The `useAuthStore` provides `user` with `user.id` for the `user_id` parameter. This is already used in SubscriptionDetailScreen (`subscription.user_id`) and throughout the app.

### Testing Strategy

**Test patterns (MUST follow — Epic 3 retro action items):**
- No hard-coded future dates — use relative dates or mock `Date.now()`
- No non-null assertions (`!`) — use `??` for defaults
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Mock Supabase client consistently
- PaperProvider wrapper required for all component tests
- 440 tests is current baseline (from Story 5.1)

**Mock setup for new services:**
```typescript
// Mock userSettingsService
jest.mock('@features/settings/services/userSettingsService', () => ({
  getUserSettings: jest.fn(),
  upsertPreferredCalendar: jest.fn(),
  clearPreferredCalendar: jest.fn(),
}));

// Extended expo-calendar mock (add to existing)
jest.mock('expo-calendar', () => ({
  ...jest.requireActual('expo-calendar'), // keep existing mocks
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
- `src/features/subscriptions/services/calendarService.test.ts` — extend existing
- `src/features/subscriptions/components/CalendarSelectionDialog.test.tsx` — new
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — extend existing
- `src/features/settings/services/userSettingsService.test.ts` — new
- `src/features/settings/screens/SettingsScreen.test.tsx` — extend existing

### Previous Story Intelligence (Story 5.1)

**Key learnings from Story 5.1:**
- `expo-calendar` v55.0.9 works well with SDK 54 + New Architecture
- `calendarService.ts` at `src/features/subscriptions/services/calendarService.ts` — add new functions here
- Pre-permission dialog pattern is established and working
- `deleteCalendarEvent(eventId)` exists for update flow (delete old, create new)
- Supabase update + rollback pattern used (delete orphaned calendar event on Supabase error)
- 440 tests passing (32 new added over 408 baseline)
- Code review found need for loading/error states — ensure calendar selection dialog has proper loading state
- `calendar_event_id` added to `subscriptions` table — available for all operations

**Files created/modified in Story 5.1:**
- `src/features/subscriptions/services/calendarService.ts` — extend with `getWritableCalendars()` and `isCalendarAvailable()`
- `src/features/subscriptions/services/calendarService.test.ts` — add tests for new functions
- `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` — modify calendar flow
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — add calendar selection tests
- `src/features/subscriptions/index.ts` — already exports calendarService functions

[Source: 5-1-add-subscription-renewals-to-device-calendar.md]

### Cross-Story Dependencies (Epic 5)

- **Story 5.3 (Calendar Event Cleanup):** Will use `calendar_event_id` + `deleteCalendarEvent()` from Story 5.1. No impact on this story.
- **Epic 6 (Story 6.1):** Will add `is_premium` and `subscription_limit` columns to `user_settings` table created by this story.

### Files NOT to Modify

- `src/shared/stores/useSubscriptionStore.ts` — calendar preference is user settings, not subscription state
- `src/shared/stores/useAuthStore.ts` — user settings is a separate concern
- `supabase/functions/` — no edge function changes; calendar + settings are client-side

### Project Structure Notes

- New file: `supabase/migrations/YYYYMMDDHHMMSS_create_user_settings.sql`
- New file: `src/features/settings/services/userSettingsService.ts`
- New file: `src/features/settings/services/userSettingsService.test.ts`
- New file: `src/features/subscriptions/components/CalendarSelectionDialog.tsx`
- New file: `src/features/subscriptions/components/CalendarSelectionDialog.test.tsx`
- Modified: `src/features/subscriptions/services/calendarService.ts` — add `getWritableCalendars()`, `isCalendarAvailable()`
- Modified: `src/features/subscriptions/services/calendarService.test.ts` — add tests
- Modified: `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` — calendar selection flow
- Modified: `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — add tests
- Modified: `src/features/settings/screens/SettingsScreen.tsx` — add Calendar section
- Modified: `src/features/settings/screens/SettingsScreen.test.tsx` — add tests
- Modified: `src/shared/types/database.types.ts` — add `user_settings` table types
- Modified: `src/features/settings/types/index.ts` — export `UserSettings` type
- Modified: `src/features/settings/index.ts` — export `userSettingsService`

### References

- [Source: epics.md#Story-5.2] — User story, acceptance criteria: calendar selection, preference persistence
- [Source: prd.md#FR28] — "User can select which calendar to add events to"
- [Source: architecture.md#Requirements-to-Structure-Mapping] — FR27-FR29 → `features/subscriptions`
- [Source: architecture.md#Feature-Module-Structure] — Feature directory structure pattern
- [Source: architecture.md#Naming-Patterns] — PascalCase components, camelCase services
- [Source: architecture.md#Zustand-Store-Pattern] — State management patterns
- [Source: implementation-readiness-report-2026-02-11.md] — `user_settings` table creation ambiguity resolved here
- [Source: 5-1-add-subscription-renewals-to-device-calendar.md] — Previous story: calendarService API, expo-calendar setup, 440 tests baseline
- [Source: SubscriptionDetailScreen.tsx] — Integration point for calendar selection flow
- [Source: SettingsScreen.tsx] — Integration point for calendar preference setting
- [Source: calendarService.ts] — Existing API to extend
- [Source: expo-calendar SDK 54 docs] — getCalendarsAsync, Calendar type with allowsModifications, title, color, isPrimary

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Created `user_settings` table with RLS policies and updated_at trigger via Supabase migration
- Added `user_settings` TypeScript types to `database.types.ts` and exported `UserSettings` type
- Created `userSettingsService.ts` with `getUserSettings`, `upsertPreferredCalendar`, `clearPreferredCalendar`
- Extended `calendarService.ts` with `getWritableCalendars()` and `isCalendarAvailable()`
- Created `CalendarSelectionDialog` component with Portal/Dialog pattern, color dots, check indicator, accessibility roles
- Integrated full calendar selection flow into `SubscriptionDetailScreen`: single calendar auto-select, stored preference lookup, stale preference handling, selection dialog
- Added Calendar section to `SettingsScreen` with preferred calendar display and selection
- Snackbar now shows calendar name: "Added to {calendarTitle}"
- 25 new tests added (465 total passing, 1 pre-existing failure unrelated to this story)
- TypeScript: zero errors, ESLint: clean on all changed files

### Change Log

- 2026-03-18: Story 5.2 implementation complete — calendar selection, preference persistence, settings integration

### File List

**New files:**
- `supabase/migrations/20260318100000_create_user_settings.sql`
- `src/features/settings/types/index.ts`
- `src/features/settings/services/userSettingsService.ts`
- `src/features/settings/services/userSettingsService.test.ts`
- `src/features/subscriptions/components/CalendarSelectionDialog.tsx`
- `src/features/subscriptions/components/CalendarSelectionDialog.test.tsx`

**Modified files:**
- `src/shared/types/database.types.ts` — added `user_settings` table types
- `src/features/subscriptions/services/calendarService.ts` — added `getWritableCalendars`, `isCalendarAvailable`
- `src/features/subscriptions/services/calendarService.test.ts` — added tests for new functions
- `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` — calendar selection flow integration
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — added calendar selection tests
- `src/features/settings/screens/SettingsScreen.tsx` — added Calendar section
- `src/features/settings/screens/SettingsScreen.test.tsx` — added calendar section tests
- `src/features/subscriptions/index.ts` — added new exports
- `src/features/settings/index.ts` — added new exports
