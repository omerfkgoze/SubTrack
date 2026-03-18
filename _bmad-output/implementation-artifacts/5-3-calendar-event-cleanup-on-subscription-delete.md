# Story 5.3: Calendar Event Cleanup on Subscription Delete

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want calendar events to be removed when I delete a subscription,
so that my calendar stays clean and accurate.

## Acceptance Criteria

1. **AC1: Auto-Delete Calendar Event on Subscription Delete**
   - **Given** the user deletes a subscription that has a linked calendar event (`calendar_event_id` is not null)
   - **When** the deletion is confirmed via the DeleteConfirmationDialog
   - **Then** the corresponding calendar event is removed from the device calendar via `deleteCalendarEvent(calendar_event_id)`
   - **And** the Supabase row is deleted (existing behavior — `calendar_event_id` removed with the row)
   - **And** deletion works from both SubscriptionDetailScreen and SubscriptionsScreen (swipe-to-delete)

2. **AC2: Graceful Handling When Calendar Event Already Gone**
   - **Given** the subscription has a `calendar_event_id` but the event no longer exists on the device (deleted externally)
   - **When** the user deletes the subscription
   - **Then** the calendar delete silently fails (catch and ignore)
   - **And** the subscription is still deleted normally from Supabase

3. **AC3: Cancel-with-Calendar-Prompt**
   - **Given** the user cancels (marks as cancelled via toggle) a subscription that has a linked calendar event
   - **When** the status is updated to inactive
   - **Then** a confirmation dialog asks: "Remove calendar events for this cancelled subscription?"
   - **And** if the user taps "Remove", the calendar event is deleted and `calendar_event_id` is cleared in Supabase
   - **And** if the user taps "Keep", the calendar event remains untouched

4. **AC4: Undo Restores Calendar Event**
   - **Given** a subscription with a calendar event was deleted and the calendar event was also deleted
   - **When** the user taps "Undo" on the UndoSnackbar within 5 seconds
   - **Then** the subscription is re-created in Supabase (existing undo behavior)
   - **And** the calendar event is re-created using `addSubscriptionToCalendar()` with the user's preferred calendar
   - **And** the new `calendar_event_id` is stored on the re-created subscription

5. **AC5: No Calendar Action for Subscriptions Without Events**
   - **Given** the subscription has no `calendar_event_id` (null)
   - **When** the user deletes or cancels the subscription
   - **Then** no calendar operations are attempted (no errors, no prompts)
   - **And** existing delete/cancel behavior is unchanged

6. **AC6: Swipe-to-Delete Also Cleans Up Calendar**
   - **Given** the user swipes to delete a subscription from the SubscriptionsScreen list
   - **When** delete is confirmed via DeleteConfirmationDialog
   - **Then** the calendar event cleanup happens identically to detail screen delete (AC1)

## Tasks / Subtasks

- [x] Task 1: Add calendar cleanup to `useSubscriptionStore.deleteSubscription` (AC: #1, #2, #5, #6)
  - [x] 1.1: Import `deleteCalendarEvent` from `@features/subscriptions/services/calendarService` in `useSubscriptionStore.ts`
  - [x] 1.2: Before the optimistic removal, capture `subscription.calendar_event_id` from the subscription being deleted
  - [x] 1.3: After the optimistic removal and before/parallel-to the Supabase delete, if `calendar_event_id` exists, call `deleteCalendarEvent(calendar_event_id)` wrapped in try/catch (fire-and-forget, do not block the delete)
  - [x] 1.4: If `deleteCalendarEvent` throws (event already gone), silently ignore the error (AC #2)
  - [x] 1.5: Store `calendar_event_id` in `pendingDelete` alongside `subscription` and `originalIndex` for undo support

- [x] Task 2: Update `undoDelete` to restore calendar events (AC: #4)
  - [x] 2.1: Import `addSubscriptionToCalendar` from `@features/subscriptions/services/calendarService` and `getUserSettings` from `@features/settings/services/userSettingsService`
  - [x] 2.2: After the subscription is re-created in Supabase (existing undo flow), check if `pendingDelete.calendarEventId` existed
  - [x] 2.3: If calendar event was previously present, call `addSubscriptionToCalendar(serverSubscription, preferredCalendarId)` — get `preferredCalendarId` from `getUserSettings` (or omit to use default)
  - [x] 2.4: The `addSubscriptionToCalendar` function already saves the new `calendar_event_id` to Supabase, so no additional update needed
  - [x] 2.5: Wrap in try/catch — calendar restore failure is non-blocking (subscription undo should still succeed)

- [x] Task 3: Add cancel-with-calendar-prompt to `toggleSubscriptionStatus` flow (AC: #3, #5)
  - [x] 3.1: This must be handled at the screen level, NOT in the store, because it requires showing a UI dialog
  - [x] 3.2: In `SubscriptionDetailScreen.tsx` `handleToggleStatus`:
    - If subscription is being cancelled (currently active) AND has `calendar_event_id`:
      - Show a dialog: "Remove calendar events?" with "Remove" and "Keep" buttons
      - If "Remove": call `deleteCalendarEvent(calendar_event_id)` and then `updateSubscription(id, { calendar_event_id: null })` via Supabase
      - If "Keep": proceed with status toggle only (existing behavior)
    - If no `calendar_event_id` or re-activating: proceed normally (no dialog)
  - [x] 3.3: In `SubscriptionsScreen.tsx` `handleToggleStatus`:
    - Same logic as above — if cancelling a subscription with `calendar_event_id`, show dialog before proceeding
  - [x] 3.4: Create a reusable `CalendarCleanupDialog` component at `src/features/subscriptions/components/CalendarCleanupDialog.tsx`
    - Props: `visible: boolean`, `subscriptionName: string`, `onRemove: () => void`, `onKeep: () => void`
    - Portal > Dialog pattern (same as DeleteConfirmationDialog)
    - Title: "Remove Calendar Events?"
    - Content: "Do you want to remove calendar events for {subscriptionName}?"
    - Actions: "Keep" button (text) + "Remove" button (contained, error color)
    - Accessibility: `accessibilityRole="alertdialog"`

- [x] Task 4: Update `pendingDelete` type to include calendar event ID (AC: #4)
  - [x] 4.1: In `useSubscriptionStore.ts`, update the `PendingDelete` type/interface to add `calendarEventId: string | null`
  - [x] 4.2: When setting `pendingDelete`, populate `calendarEventId` from `subscription.calendar_event_id`

- [x] Task 5: Write tests (AC: all)
  - [x] 5.1: Test `useSubscriptionStore.deleteSubscription` — subscription with `calendar_event_id`: calls `deleteCalendarEvent`
  - [x] 5.2: Test `useSubscriptionStore.deleteSubscription` — subscription without `calendar_event_id`: does NOT call `deleteCalendarEvent`
  - [x] 5.3: Test `useSubscriptionStore.deleteSubscription` — `deleteCalendarEvent` throws: subscription still deleted successfully
  - [x] 5.4: Test `useSubscriptionStore.undoDelete` — restores calendar event via `addSubscriptionToCalendar`
  - [x] 5.5: Test `useSubscriptionStore.undoDelete` — calendar restore fails: subscription still restored
  - [x] 5.6: Test `CalendarCleanupDialog` — renders dialog with subscription name
  - [x] 5.7: Test `CalendarCleanupDialog` — "Remove" calls onRemove
  - [x] 5.8: Test `CalendarCleanupDialog` — "Keep" calls onKeep
  - [x] 5.9: Test `SubscriptionDetailScreen` — cancel subscription with calendar event: shows CalendarCleanupDialog
  - [x] 5.10: Test `SubscriptionDetailScreen` — cancel subscription without calendar event: no dialog, proceeds normally
  - [x] 5.11: Test `SubscriptionDetailScreen` — CalendarCleanupDialog "Remove": deletes calendar event and clears `calendar_event_id`
  - [x] 5.12: Test `SubscriptionDetailScreen` — CalendarCleanupDialog "Keep": only toggles status
  - [x] 5.13: Test `SubscriptionsScreen` — swipe-delete with calendar event: calls `deleteCalendarEvent` (via store)
  - [x] 5.14: Test `SubscriptionsScreen` — cancel toggle with calendar event: shows CalendarCleanupDialog

- [x] Task 6: Verify and validate (AC: all)
  - [x] 6.1: `npx tsc --noEmit` — zero errors
  - [x] 6.2: ESLint clean on changed files
  - [x] 6.3: Full test suite passes (current baseline: 465 passing, 1 pre-existing failure in NotificationHistoryScreen)

## Dev Notes

### CRITICAL: Calendar Delete is Fire-and-Forget on Subscription Delete

When deleting a subscription, the calendar event cleanup MUST NOT block or fail the subscription deletion. The `deleteCalendarEvent` call should be wrapped in try/catch and failures silently ignored. Reasons:
- The calendar event may already be deleted by the user externally
- Calendar permission may have been revoked since the event was created
- The subscription delete is the primary action; calendar cleanup is secondary

```typescript
// In useSubscriptionStore.deleteSubscription, AFTER setting optimistic state:
if (subscription.calendar_event_id) {
  deleteCalendarEvent(subscription.calendar_event_id).catch(() => {});
}
```

### CRITICAL: Use `expo-calendar`, NOT `react-native-calendar-events`

The project uses `expo-calendar` (v55.0.9, already installed). Do NOT install any additional calendar library.

[Source: 5-1-add-subscription-renewals-to-device-calendar.md#Dev-Notes]

### Existing APIs Already Available

All calendar functions needed already exist in `src/features/subscriptions/services/calendarService.ts`:
- `deleteCalendarEvent(eventId: string): Promise<void>` — wraps `Calendar.deleteEventAsync(eventId)`
- `addSubscriptionToCalendar(subscription, calendarId?): Promise<string>` — creates event and saves `calendar_event_id` to Supabase

No new calendar service functions need to be created.

[Source: calendarService.ts]

### Store Architecture: `deleteSubscription` Flow

Current flow in `useSubscriptionStore.deleteSubscription` (lines 156-202):
1. Clear any existing `pendingDelete`
2. Find subscription by ID
3. Optimistic removal from state + set `pendingDelete = { subscription, originalIndex }`
4. Background Supabase `deleteSubscription(id)` call
5. On error: restore subscription to state

**Change needed:** Between step 2 and 3, capture `calendar_event_id`. After step 3 (optimistic removal), fire-and-forget `deleteCalendarEvent` if `calendar_event_id` exists. Store `calendarEventId` in `pendingDelete` for undo.

[Source: useSubscriptionStore.ts:156-202]

### Store Architecture: `undoDelete` Flow

Current flow in `useSubscriptionStore.undoDelete` (lines 204-247):
1. Restore subscription locally (instant)
2. Call `createSubscription()` to re-create in Supabase (creates NEW ID)
3. Replace local copy with server copy (has new ID)

**Change needed:** After step 3, if `pendingDelete.calendarEventId` existed, call `addSubscriptionToCalendar(serverSubscription)` to re-create the calendar event. This function already saves the new `calendar_event_id` to Supabase via an update call.

**IMPORTANT:** The undo re-creates the subscription with a NEW Supabase ID. The `addSubscriptionToCalendar` function uses `subscription.id` to update the `calendar_event_id` column, so pass the `serverSubscription` (which has the new ID), NOT the old `pendingDelete.subscription`.

[Source: useSubscriptionStore.ts:204-247, calendarService.ts:41-74]

### `CreateSubscriptionDTO` Does NOT Include `calendar_event_id`

The `CreateSubscriptionDTO` type intentionally excludes `calendar_event_id`. This field is managed by `addSubscriptionToCalendar`, not by the create flow. Undo correctly uses `createSubscription` to restore the data, then separately uses `addSubscriptionToCalendar` to restore the calendar event.

[Source: features/subscriptions/types/index.ts:7-18]

### Cancel-with-Calendar Dialog: Screen-Level Logic

The cancel prompt (AC3) cannot be in the store because it requires showing a UI dialog. Implement at the screen level:

**SubscriptionDetailScreen.tsx** — `handleToggleStatus` (line 270):
```typescript
// Current: directly calls toggleSubscriptionStatus
// New: check if cancelling (wasActive) AND has calendar_event_id
const handleToggleStatus = useCallback(async () => {
  if (!subscription) return;
  const wasActive = subscription.is_active !== false;

  if (wasActive && subscription.calendar_event_id) {
    // Show CalendarCleanupDialog instead of immediate toggle
    setCalendarCleanupVisible(true);
    return;
  }

  // No calendar event or re-activating — proceed normally
  const success = await toggleSubscriptionStatus(subscription.id);
  // ... existing snackbar logic
}, [subscription, toggleSubscriptionStatus]);
```

**SubscriptionsScreen.tsx** — `handleToggleStatus` (line 118):
Same pattern — show CalendarCleanupDialog if cancelling a subscription with `calendar_event_id`.

### Clearing `calendar_event_id` After Calendar-Cancel Cleanup

When user cancels a subscription and chooses "Remove" for calendar events, you need to:
1. Call `deleteCalendarEvent(subscription.calendar_event_id)` — remove from device
2. Call `supabase.from('subscriptions').update({ calendar_event_id: null }).eq('id', subscription.id)` — clear the reference

Use `updateSubscription` from `subscriptionService.ts` or direct Supabase call. The store's `toggleSubscriptionStatus` only toggles `is_active`; the `calendar_event_id` clear is a separate update.

### CalendarCleanupDialog — Follow DeleteConfirmationDialog Pattern

Model after existing `src/features/subscriptions/components/DeleteConfirmationDialog.tsx`. Use Portal > Dialog from react-native-paper. Keep it simple.

### Testing Strategy

**Test patterns (MUST follow — Epic 3 retro action items):**
- No hard-coded future dates — use relative dates or mock `Date.now()`
- No non-null assertions (`!`) — use `??` for defaults
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Mock Supabase client consistently
- PaperProvider wrapper required for all component tests
- 465 tests is current baseline (from Story 5.2)

**Mock setup for calendar in store tests:**
```typescript
jest.mock('@features/subscriptions/services/calendarService', () => ({
  deleteCalendarEvent: jest.fn().mockResolvedValue(undefined),
  addSubscriptionToCalendar: jest.fn().mockResolvedValue('new-event-id'),
}));

jest.mock('@features/settings/services/userSettingsService', () => ({
  getUserSettings: jest.fn().mockResolvedValue(null),
}));
```

**Test file locations (co-located per architecture.md):**
- `src/shared/stores/useSubscriptionStore.test.ts` — extend with calendar delete/undo tests
- `src/features/subscriptions/components/CalendarCleanupDialog.test.tsx` — new
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — extend with cancel+calendar tests
- `src/features/subscriptions/screens/SubscriptionsScreen.test.tsx` — extend with swipe-delete calendar and cancel calendar tests

### Previous Story Intelligence (Story 5.2)

**Key learnings:**
- `expo-calendar` v55.0.9 works well with SDK 54 + New Architecture
- CalendarSelectionDialog uses Portal > Dialog pattern — use same for CalendarCleanupDialog
- `user_settings` table exists with `preferred_calendar_id` — use for undo calendar restore
- 465 tests passing (25 new added over 440 baseline), 1 pre-existing failure unrelated
- Code review found need for proper loading/error states
- `getUserSettings` is available for retrieving preferred calendar during undo

**Files from Story 5.2 relevant here:**
- `calendarService.ts` — `deleteCalendarEvent`, `addSubscriptionToCalendar` already exist
- `userSettingsService.ts` — `getUserSettings` for preferred calendar on undo restore
- `CalendarSelectionDialog.tsx` — reference for Dialog pattern

[Source: 5-2-calendar-selection.md]

### Cross-Story Dependencies (Epic 5)

- **Story 5.1:** Created `calendarService.ts` with `deleteCalendarEvent()` and `addSubscriptionToCalendar()` — both used in this story
- **Story 5.2:** Created `userSettingsService.ts` with `getUserSettings()` — used for preferred calendar on undo
- **Story 5.4 (Export):** No impact on this story
- **Epic 6 (Story 6.1):** Will add columns to `user_settings` — no impact on this story

### Files to Modify

- `src/shared/stores/useSubscriptionStore.ts` — add calendar cleanup to `deleteSubscription` and `undoDelete`, update `pendingDelete` type
- `src/shared/stores/useSubscriptionStore.test.ts` — add calendar cleanup tests
- `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` — add cancel-with-calendar dialog logic
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — add cancel-with-calendar tests
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — add cancel-with-calendar dialog logic
- `src/features/subscriptions/screens/SubscriptionsScreen.test.tsx` — add cancel-with-calendar and delete-with-calendar tests

### New Files

- `src/features/subscriptions/components/CalendarCleanupDialog.tsx` — reusable dialog for cancel+calendar prompt
- `src/features/subscriptions/components/CalendarCleanupDialog.test.tsx` — tests for the dialog

### Files NOT to Modify

- `src/features/subscriptions/services/calendarService.ts` — all needed functions already exist
- `src/features/subscriptions/services/subscriptionService.ts` — existing CRUD is sufficient
- `src/shared/types/database.types.ts` — no schema changes needed
- `supabase/migrations/` — no new migrations needed
- `src/features/settings/` — only importing `getUserSettings`, no changes to settings feature

### Project Structure Notes

- All changes align with the feature-based architecture
- CalendarCleanupDialog belongs in `features/subscriptions/components/` since it's specific to subscription cancel/delete flows
- Store-level calendar cleanup in `useSubscriptionStore` is appropriate because delete is store-driven
- Screen-level cancel-with-calendar prompt is appropriate because it requires UI interaction before the store action

### References

- [Source: epics.md#Story-5.3] — Acceptance criteria: delete cleanup, cancel prompt, undo restore
- [Source: prd.md#FR29] — "User can remove calendar events when subscription is deleted"
- [Source: architecture.md#Zustand-Store-Pattern] — Store action pattern with try/catch
- [Source: architecture.md#Component-Boundaries] — Feature → Shared import rules
- [Source: calendarService.ts] — `deleteCalendarEvent`, `addSubscriptionToCalendar` APIs
- [Source: useSubscriptionStore.ts:156-247] — `deleteSubscription` and `undoDelete` implementations
- [Source: SubscriptionDetailScreen.tsx:259-268] — Current `handleConfirmDelete` and `handleToggleStatus`
- [Source: SubscriptionsScreen.tsx:114-157] — Current list delete and undo flow
- [Source: 5-1-add-subscription-renewals-to-device-calendar.md] — Calendar service creation, `calendar_event_id` column
- [Source: 5-2-calendar-selection.md] — CalendarSelectionDialog pattern, `userSettingsService`, preferred calendar

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed `accessibilityRole` prop on Dialog (not supported by react-native-paper Dialog component)
- Added calendarService and userSettingsService mocks to store test to avoid Supabase env var requirement
- Updated all existing test `pendingDelete` setState calls to include new `calendarEventId` field
- SubscriptionsScreen tests: used `renderRightActions` in Swipeable mock to render swipe action buttons

### Completion Notes List

- **Task 1 (Store deleteSubscription):** Added fire-and-forget `deleteCalendarEvent` call after optimistic removal. Uses `.catch(() => {})` pattern for silent failure. Calendar event ID captured before removal and stored in pendingDelete.
- **Task 2 (Store undoDelete):** After successful Supabase re-creation, restores calendar event via `addSubscriptionToCalendar(serverSubscription, preferredCalendarId)`. Uses `getUserSettings` for preferred calendar. Non-blocking try/catch.
- **Task 3 (Cancel-with-calendar prompt):** Created `CalendarCleanupDialog` component following `DeleteConfirmationDialog` pattern. Added screen-level logic to both `SubscriptionDetailScreen` and `SubscriptionsScreen` to intercept cancel toggle when subscription has `calendar_event_id`. "Remove" deletes calendar event + clears DB reference via direct Supabase call. "Keep" proceeds with toggle only.
- **Task 4 (PendingDelete type):** Extended inline type to include `calendarEventId: string | null`. Updated all existing test setState calls.
- **Task 5 (Tests):** Added 23 new tests across 4 test files. All 488 tests passing. Store tests cover calendar delete, undo restore, error handling. Component tests cover dialog rendering and callbacks. Screen tests cover cancel-with-calendar flow and swipe-delete integration.
- **Task 6 (Validation):** TypeScript zero errors, ESLint clean, 488/488 tests passing.

### File List

**New files:**
- src/features/subscriptions/components/CalendarCleanupDialog.tsx
- src/features/subscriptions/components/CalendarCleanupDialog.test.tsx
- src/features/subscriptions/screens/SubscriptionsScreen.test.tsx

**Modified files:**
- src/shared/stores/useSubscriptionStore.ts
- src/shared/stores/useSubscriptionStore.test.ts
- src/features/subscriptions/screens/SubscriptionDetailScreen.tsx
- src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx
- src/features/subscriptions/screens/SubscriptionsScreen.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/5-3-calendar-event-cleanup-on-subscription-delete.md

### Change Log

- **2026-03-18:** Implemented Story 5.3 — Calendar event cleanup on subscription delete. Added calendar event deletion on subscription delete (fire-and-forget), calendar event restore on undo, cancel-with-calendar prompt dialog, and comprehensive test coverage (23 new tests, 488 total passing).
