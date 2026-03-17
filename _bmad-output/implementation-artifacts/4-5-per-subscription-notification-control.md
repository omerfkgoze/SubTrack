# Story 4.5: Per-Subscription Notification Control

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to enable or disable notifications for individual subscriptions,
so that I only receive reminders for subscriptions I care about.

## Acceptance Criteria

1. **AC1: Notification Toggle on Subscription Detail Screen**
   - **Given** the user is viewing an active subscription's detail screen
   - **When** the screen loads
   - **Then** a Switch toggle labeled "Notifications" is displayed in the REMINDERS section
   - **And** the toggle reflects the current `is_enabled` value from `reminder_settings`
   - **And** if no `reminder_settings` record exists, the toggle defaults to ON (enabled)

2. **AC2: Disabling Notifications for a Subscription**
   - **Given** the user toggles notifications OFF for a subscription
   - **When** the toggle is switched off
   - **Then** `reminder_settings.is_enabled` is updated to `false` via `updateReminder()`
   - **And** a snackbar confirms: "Notifications disabled for [subscription name]"
   - **And** the SegmentedButtons timing selector becomes visually dimmed/disabled
   - **And** the toggle uses optimistic UI (updates immediately, reverts on failure)

3. **AC3: Re-Enabling Notifications for a Subscription**
   - **Given** the user toggles notifications back ON for a subscription
   - **When** the toggle is switched on
   - **Then** `reminder_settings.is_enabled` is updated to `true` via `updateReminder()`
   - **And** a snackbar confirms: "Notifications enabled for [subscription name]"
   - **And** the SegmentedButtons timing selector becomes interactive again

4. **AC4: No Renewal Notification When Disabled**
   - **Given** notifications are disabled for a specific subscription (`is_enabled = false`)
   - **When** that subscription's renewal date approaches
   - **Then** no push notification is sent (existing `get_reminder_candidates` RPC already filters `is_enabled = true`)
   - **And** other subscriptions with notifications enabled continue to receive reminders

5. **AC5: No Trial Expiry Notification When Disabled**
   - **Given** notifications are disabled for a trial subscription
   - **When** the trial expiry date approaches
   - **Then** no trial expiry notification is sent (existing `get_trial_expiry_candidates` RPC already filters `is_enabled = true`)

6. **AC6: Inactive Subscriptions Don't Show Reminders**
   - **Given** a subscription is cancelled (`is_active = false`)
   - **When** the user views the detail screen
   - **Then** the entire REMINDERS section (toggle + timing) is hidden (existing behavior, must be preserved)

7. **AC7: Toggle State Persists After Navigation**
   - **Given** the user disables notifications for a subscription
   - **When** they navigate away and return to the detail screen
   - **Then** the toggle correctly shows OFF state from the persisted `reminder_settings`

## Tasks / Subtasks

- [x] Task 1: Add notification toggle Switch to SubscriptionDetailScreen (AC: #1, #2, #3, #6)
  - [x] 1.1: Add `Switch` import from `react-native-paper` in SubscriptionDetailScreen.tsx
  - [x] 1.2: Add `reminderEnabled` state (boolean, default `true`) — initialized from `reminderSetting.is_enabled` in the existing `useEffect`
  - [x] 1.3: Add Switch toggle row above the SegmentedButtons timing selector in the REMINDERS section
  - [x] 1.4: Implement `handleToggleNotification` callback with optimistic update pattern (matching `handleTimingChange`)
  - [x] 1.5: When toggling OFF, dim/disable the SegmentedButtons (set `disabled` prop or reduce opacity)
  - [x] 1.6: Show snackbar feedback on toggle success/failure

- [x] Task 2: Handle edge case — no existing reminder_settings record (AC: #1, #2)
  - [x] 2.1: When toggling OFF and no `reminderSetting` exists yet, call `createDefaultReminder()` first, then immediately `updateReminder()` with `is_enabled: false`
  - [x] 2.2: Alternatively, update `createDefaultReminder` to accept an optional `is_enabled` parameter — but prefer the simpler approach of create-then-update to avoid modifying shared service code

- [x] Task 3: Write tests for the notification toggle (AC: all)
  - [x] 3.1: Test: toggle renders ON when `is_enabled = true` in reminder_settings
  - [x] 3.2: Test: toggle renders ON by default when no reminder_settings exist
  - [x] 3.3: Test: toggling OFF calls `updateReminder` with `{ is_enabled: false }`
  - [x] 3.4: Test: toggling ON calls `updateReminder` with `{ is_enabled: true }`
  - [x] 3.5: Test: SegmentedButtons are disabled when toggle is OFF
  - [x] 3.6: Test: snackbar shows correct message on toggle
  - [x] 3.7: Test: toggle reverts on API failure (optimistic rollback)
  - [x] 3.8: Test: REMINDERS section hidden for inactive subscriptions
  - [x] 3.9: Test: toggle OFF then navigate back — state persists from server

- [x] Task 4: Verify and validate (AC: all)
  - [x] 4.1: `npx tsc --noEmit` — zero errors
  - [x] 4.2: `npx eslint src/features/subscriptions/ src/features/notifications/` — zero errors (1 pre-existing warning in Story 4.4 file, unrelated)
  - [x] 4.3: Full test suite green (362 tests passing, up from 349 baseline)

## Dev Notes

### Architecture Overview

This is a **client-side UI story only**. The backend infrastructure is already complete:
- `reminder_settings.is_enabled` column exists (BOOLEAN DEFAULT true)
- `updateReminder()` service function already accepts `{ is_enabled?: boolean }`
- `get_reminder_candidates` RPC already filters `WHERE is_enabled = true`
- `get_trial_expiry_candidates` RPC already filters `WHERE rs.is_enabled IS NULL OR rs.is_enabled = true`

The only change is adding a Switch toggle to `SubscriptionDetailScreen.tsx` and writing tests.

### Current REMINDERS Section Structure (SubscriptionDetailScreen.tsx:261-295)

```
REMINDERS section (visible only when !isInactive):
├── Section title "REMINDERS"
├── Divider
├── Loading indicator (when reminderLoading = true)
└── Reminder content (when loaded):
    ├── Text: "Remind me before renewal"
    └── SegmentedButtons: [1 day] [3 days] [7 days]
```

**Target structure after this story:**

```
REMINDERS section (visible only when !isInactive):
├── Section title "REMINDERS"
├── Divider
├── Loading indicator (when reminderLoading = true)
└── Reminder content (when loaded):
    ├── Row: Text "Notifications" + Switch toggle     ← NEW
    ├── Text: "Remind me before renewal"               ← dim when disabled
    └── SegmentedButtons: [1 day] [3 days] [7 days]   ← disabled when toggled off
```

### State Management Approach

Add one new state variable:
```typescript
const [reminderEnabled, setReminderEnabled] = useState(true);
```

Initialize from existing `reminderSetting` in the `useEffect` (line 65-94):
```typescript
if (setting) {
  setReminderTiming(String(setting.remind_days_before));
  setReminderEnabled(setting.is_enabled);  // ← ADD THIS
}
```

### Toggle Handler Pattern

Follow the exact same optimistic update pattern as `handleTimingChange` (line 96-116):

```typescript
const handleToggleNotification = useCallback(async (newValue: boolean) => {
  if (!subscription) return;
  const previousValue = reminderEnabled;
  setReminderEnabled(newValue);

  try {
    if (reminderSetting) {
      const updated = await updateReminder(reminderSetting.id, { is_enabled: newValue });
      setReminderSetting(updated);
    } else {
      // No reminder exists yet — create one first
      const created = await createDefaultReminder(subscription.user_id, subscriptionId);
      const updated = await updateReminder(created.id, { is_enabled: newValue });
      setReminderSetting(updated);
    }
    setSnackbar({
      message: newValue
        ? `Notifications enabled for ${subscription.name}`
        : `Notifications disabled for ${subscription.name}`,
    });
  } catch {
    setReminderEnabled(previousValue);
    setSnackbar({ message: 'Failed to update notification setting. Please try again.' });
  }
}, [subscription, subscriptionId, reminderSetting, reminderEnabled]);
```

### Switch Component Pattern

Follow the exact same Switch pattern used in EditSubscriptionScreen.tsx:

```tsx
<View style={styles.toggleRow}>
  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
    Notifications
  </Text>
  <Switch
    value={reminderEnabled}
    onValueChange={handleToggleNotification}
    accessibilityLabel={`Notifications ${reminderEnabled ? 'enabled' : 'disabled'} for this subscription`}
    accessibilityRole="switch"
  />
</View>
```

Add to StyleSheet:
```typescript
toggleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
},
```

### Dimming the Timing Selector When Disabled

When `reminderEnabled` is `false`, the SegmentedButtons and label should appear dimmed:

```tsx
<View style={[styles.reminderSection, !reminderEnabled && { opacity: 0.4 }]}>
  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
    Remind me before renewal
  </Text>
  <View accessibilityLabel="Reminder timing options" accessibilityRole="radiogroup">
    <SegmentedButtons
      value={reminderTiming}
      onValueChange={handleTimingChange}
      buttons={REMINDER_TIMING_OPTIONS}
      density="small"
      style={styles.segmentedButtons}
      disabled={!reminderEnabled}  // ← Note: check if SegmentedButtons supports 'disabled' prop
    />
  </View>
</View>
```

**IMPORTANT:** Verify that `react-native-paper`'s `SegmentedButtons` component accepts a `disabled` prop. If not, use `pointerEvents="none"` on the wrapper View combined with opacity reduction. Check the installed version's API.

### Database Awareness — No Changes Needed

| Table | Column | Status |
|-------|--------|--------|
| `reminder_settings` | `is_enabled` (BOOLEAN DEFAULT true) | Already exists (Story 4.2) |
| Backend RPCs | `get_reminder_candidates`, `get_trial_expiry_candidates` | Already filter on `is_enabled` |
| `notification_log` | No changes | N/A |

### Testing Strategy

**Test patterns (MUST follow — Epic 3 retro action items):**
- No hard-coded future dates — use relative dates or mock `Date.now()`
- No non-null assertions (`!`) — use `??` for defaults
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Mock Supabase client consistently
- PaperProvider wrapper required for all component tests

**Test file:** `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` (extend existing if it exists, or create new)

**Mock setup:**
```typescript
jest.mock('@features/notifications', () => ({
  getReminderSettings: jest.fn(),
  createDefaultReminder: jest.fn(),
  updateReminder: jest.fn(),
}));
```

**Key test scenarios:**
```
// Toggle renders ON when is_enabled = true
// Toggle renders ON (default) when no reminder_settings record exists
// Toggle OFF → calls updateReminder({ is_enabled: false })
// Toggle ON → calls updateReminder({ is_enabled: true })
// SegmentedButtons disabled/dimmed when toggle OFF
// Snackbar: "Notifications disabled for Netflix"
// Snackbar: "Notifications enabled for Netflix"
// API failure → toggle reverts to previous state
// REMINDERS section hidden for cancelled subscriptions (existing behavior)
```

### Previous Story Intelligence (Story 4.4)

**Learnings:**
- All 349 tests passing after Story 4.4 — this is the baseline
- Edge Function `calculate-reminders` now handles both renewal and trial notifications
- `notification_log` has `notification_type` column ('renewal' | 'trial_expiry')
- Trial notifications use fixed timing (0, 1, 3 days) — not configurable via `remind_days_before`
- The `is_enabled` toggle already affects BOTH renewal and trial notifications at the query level
- Code review found tautological tests — ensure this story's tests verify actual behavior, not implementation details

**Files modified in Story 4.4:**
- `supabase/migrations/20260317000000_add_trial_expiry_notifications.sql` (new)
- `supabase/functions/calculate-reminders/index.ts` (modified)
- `src/features/notifications/services/trialExpiryNotifications.test.ts` (new)

### Git Intelligence

Recent commits follow pattern: `ready-for-dev story X.Y` → `story X.Y in review` → `done story X.Y`. Latest commit: `9124b9b done story 4.4`.

### Cross-Story Dependencies

- **Story 4.1 (DONE):** Push notification permission, `useNotificationStore`, device token registration
- **Story 4.2 (DONE):** `reminder_settings` table with `is_enabled` column, `get_reminder_candidates` RPC, `calculate-reminders` Edge Function
- **Story 4.3 (DONE):** Customizable reminder timing UI in SubscriptionDetailScreen, `reminderService.ts` CRUD, SegmentedButtons for timing
- **Story 4.4 (DONE):** Trial expiry notifications, `get_trial_expiry_candidates` RPC respects `is_enabled` filter
- **Story 4.6 (FUTURE):** Notification history & health indicator — independent, no dependency

### Files to Modify

- `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` — add Switch toggle, `reminderEnabled` state, `handleToggleNotification` callback, dim timing when disabled

### Files to Create

- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` — tests for notification toggle (if test file doesn't already exist; if it does, extend it)

### Files NOT to Modify

- `src/features/notifications/services/reminderService.ts` — already supports `is_enabled` updates
- `supabase/` — no database or Edge Function changes needed
- No new migrations, no new RPC functions, no new services, no new stores

### Project Structure Notes

- Alignment with unified project structure: all changes in `src/features/subscriptions/screens/`
- Test file co-located with component (per architecture.md co-location pattern)
- No new feature directories or shared components needed

### References

- [Source: epics.md#Story-4.5] — User story, acceptance criteria: toggle `is_enabled` in `reminder_settings`, no notifications when disabled
- [Source: prd.md#FR24] — "User can enable/disable notifications per subscription"
- [Source: architecture.md#Zustand-Store-Pattern] — State management pattern (not directly needed — local state sufficient)
- [Source: architecture.md#Component-Boundaries] — Feature-specific components in `features/*/screens/`
- [Source: architecture.md#Test-File-Location] — Co-located with source files
- [Source: ux-design-specification.md#Switch-Component] — Switch for toggle settings with theme colors
- [Source: ux-design-specification.md#NotificationStatusBadge] — "Partial" state: amber, "Some notifications blocked" — relevant for future Story 4.6 integration
- [Source: EditSubscriptionScreen.tsx:263,342] — Existing Switch pattern with accessibilityLabel and accessibilityRole
- [Source: SubscriptionDetailScreen.tsx:261-295] — Current REMINDERS section to extend
- [Source: reminderService.ts:47-59] — `updateReminder()` already accepts `{ is_enabled?: boolean }`
- [Source: 4-4-trial-expiry-notifications.md] — Previous story: 349 tests baseline, `is_enabled` filter confirmed working in both RPCs

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `SegmentedButtons` has no top-level `disabled` prop; per-button `disabled` is on `buttons[]` items. Used `pointerEvents="none"` + opacity wrapper instead.

### Completion Notes List

- Added `Switch` import and `reminderEnabled` state (default `true`) to `SubscriptionDetailScreen.tsx`
- `reminderEnabled` initialized from `reminderSetting.is_enabled` in existing `useEffect`
- `handleToggleNotification` implements optimistic update with rollback on failure, matching `handleTimingChange` pattern
- Edge case: when no `reminderSetting` exists, toggle OFF creates a new default reminder then immediately updates `is_enabled: false`
- Timing selector section dimmed with `opacity: 0.4` and `pointerEvents="none"` when toggle is OFF
- `toggleRow` style added to `StyleSheet` for Switch row layout
- 9 new tests added to `SubscriptionDetailScreen.test.tsx`; all 32 tests in file pass
- Full suite: 362 tests passing (baseline was 349; +13 new tests total including pre-existing from this file)
- `npx tsc --noEmit`: zero errors
- `npx eslint`: zero errors (1 pre-existing warning in Story 4.4 file, unrelated)

### File List

- `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx` (modified)
- `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx` (modified)

## Change Log

- 2026-03-17: Story implemented — added notification toggle Switch to SubscriptionDetailScreen, optimistic update with rollback, dimmed timing selector when disabled, 9 new tests added (362 total passing)
