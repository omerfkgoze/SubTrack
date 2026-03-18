# Story 5.5: Cloud Data Sync

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my subscription data to be automatically synced to the cloud,
So that my data is safe and accessible if I change devices.

## Acceptance Criteria

1. **AC1: Real-time Cloud Sync on Mutations**
   - **Given** the user is logged in and has an internet connection
   - **When** they add, edit, or delete a subscription
   - **Then** changes are automatically synced to Supabase in real-time
   - **And** the sync success rate meets ≥99.9% (NFR22)

2. **AC2: Cross-Device Data Availability**
   - **Given** the user opens the app on a new device and logs in
   - **When** data is loaded
   - **Then** all their subscriptions, settings, and preferences are available

3. **AC3: No Internet Connection Handling**
   - **Given** the user loses internet connection
   - **When** they attempt to modify data
   - **Then** a "No internet connection" message is displayed with a retry option
   - **And** no local-only modifications are made (MVP is online-only per PRD)

4. **AC4: Conflict Resolution**
   - **Given** a sync conflict occurs
   - **When** the same data is modified simultaneously
   - **Then** the most recent update wins (last-write-wins strategy)

## Tasks / Subtasks

- [x] Task 1: Install `@react-native-community/netinfo` for connectivity detection (AC: #3)
  - [x] 1.1: Run `npx expo install @react-native-community/netinfo`
  - [x] 1.2: Verify TypeScript types are available (bundled with the package)

- [x] Task 2: Create `useNetworkStatus` hook in `src/shared/hooks/` (AC: #3)
  - [x] 2.1: Create `src/shared/hooks/useNetworkStatus.ts`
  - [x] 2.2: Implement hook using `NetInfo.useNetInfo()` — returns `{ isConnected: boolean | null, isInternetReachable: boolean | null }`
  - [x] 2.3: Export a simple `isOnline` boolean derived from `isConnected && isInternetReachable !== false` (treat `null` as connected to avoid false negatives during initial check)

- [x] Task 3: Create `NetworkBanner` component in `src/shared/components/feedback/` (AC: #3)
  - [x] 3.1: Create `src/shared/components/feedback/NetworkBanner.tsx`
  - [x] 3.2: Render a dismissible banner (react-native-paper `Banner`) at the top of the screen when `isOnline === false`
  - [x] 3.3: Banner text: "No internet connection" with action button "Retry" that calls `NetInfo.refresh()`
  - [x] 3.4: Use `theme.colors.error` for background accent / `theme.colors.errorContainer` for background
  - [x] 3.5: Banner auto-dismisses when connectivity is restored (`isOnline` becomes `true`)

- [x] Task 4: Integrate `NetworkBanner` into app layout (AC: #3)
  - [x] 4.1: Add `NetworkBanner` in `src/app/App.tsx` (or the root layout provider) so it appears globally above all screens
  - [x] 4.2: Place it inside `SafeAreaView` but above the navigation container so it overlays on all screens

- [x] Task 5: Add foreground refresh to subscription store (AC: #1, #2)
  - [x] 5.1: In `src/app/navigation/index.tsx`, the existing `AppState` listener already handles background→foreground transitions for auth — extend it to also call `useSubscriptionStore.getState().fetchSubscriptions()` when app comes to foreground AND session is valid
  - [x] 5.2: This ensures data is refreshed from Supabase each time user returns to the app (cross-device edits become visible)

- [x] Task 6: Ensure comprehensive data load on login (AC: #2)
  - [x] 6.1: Verify that after successful login, `fetchSubscriptions()` is called (already happens via screen `useEffect` hooks)
  - [x] 6.2: Verify that user settings (preferred calendar, notification preferences) are loaded on login — check `useNotificationStore` and `useSettingsStore` (if exists) or the screens that call `getUserSettings`
  - [x] 6.3: If any data is NOT fetched on login, add the missing fetch call to the appropriate screen or navigation listener — no new store needed, just ensure existing fetches are triggered

- [x] Task 7: Add pre-mutation connectivity check to `subscriptionService.ts` (AC: #3)
  - [x] 7.1: Create `src/shared/services/networkCheck.ts` with a single function: `checkConnectivity(): Promise<void>` that calls `NetInfo.fetch()` and throws a typed error if `!isConnected`
  - [x] 7.2: In `subscriptionService.ts`, call `checkConnectivity()` at the start of `createSubscription`, `updateSubscription`, `deleteSubscription` — before any Supabase call
  - [x] 7.3: If connectivity check fails, return `{ data: null, error: { code: 'NETWORK_ERROR', message: 'No internet connection. Please check your connection and try again.' } }` immediately without hitting Supabase
  - [x] 7.4: Keep the existing `TypeError` catch as a fallback for edge cases where connectivity check passes but request still fails

- [x] Task 8: Verify last-write-wins conflict resolution (AC: #4)
  - [x] 8.1: Supabase RLS + standard `UPDATE ... WHERE id = X AND user_id = Y` already implements last-write-wins (no versioning or optimistic locking in schema)
  - [x] 8.2: The `updated_at` column with `DEFAULT now()` on the server ensures the latest write's timestamp is recorded
  - [x] 8.3: No code changes needed — document in Dev Notes that last-write-wins is the default Supabase behavior and is sufficient for MVP

- [x] Task 9: Write tests (AC: all)
  - [x] 9.1: `src/shared/hooks/useNetworkStatus.test.ts` — mock `@react-native-community/netinfo`, test `isOnline` returns `true` when connected, `false` when disconnected, `true` when `isInternetReachable` is `null` (initial state)
  - [x] 9.2: `src/shared/components/feedback/NetworkBanner.test.tsx` — renders banner text when `isOnline` is `false`, hides when `true`, retry button calls `NetInfo.refresh()`
  - [x] 9.3: `src/shared/services/networkCheck.test.ts` — `checkConnectivity` resolves when connected, rejects/returns error when disconnected
  - [x] 9.4: `src/features/subscriptions/services/subscriptionService.test.ts` — update existing tests: verify `createSubscription` returns `NETWORK_ERROR` immediately when `checkConnectivity` fails (without calling Supabase)
  - [x] 9.5: Wrap `NetworkBanner` tests in `PaperProvider` (required for react-native-paper components)

- [x] Task 10: Validate (AC: all)
  - [x] 10.1: `npx tsc --noEmit` — zero errors
  - [x] 10.2: ESLint clean on changed files
  - [x] 10.3: Full test suite passes (current baseline: 506 passing)

## Dev Notes

### CRITICAL: What Already Exists vs What Needs to Be Built

**Already working (DO NOT rebuild):**
- Supabase CRUD sync — `subscriptionService.ts` already syncs every add/edit/delete to Supabase. AC1 is mostly satisfied.
- AsyncStorage persistence — `useSubscriptionStore` persists `subscriptions` to AsyncStorage for fast startup. On login, `fetchSubscriptions()` fetches fresh data from Supabase.
- Cross-device data — Supabase is the source of truth. Logging in on a new device fetches all data via `getSubscriptions()`.
- Last-write-wins — Supabase default behavior. `updated_at` is server-side `now()`.
- Network error detection — `subscriptionService.ts` already catches `TypeError` for network failures.

**What this story ADDS:**
1. **Proactive connectivity detection** via `@react-native-community/netinfo` — check BEFORE making API calls
2. **Global network status banner** — persistent UX feedback when offline
3. **Foreground refresh** — re-fetch subscriptions when app returns from background
4. **Pre-mutation connectivity guard** — fail fast with clear error instead of waiting for timeout

### Install `@react-native-community/netinfo`

```bash
npx expo install @react-native-community/netinfo
```

This installs the Expo-compatible version automatically. The package provides:
- `useNetInfo()` hook for reactive connectivity state
- `NetInfo.fetch()` for imperative one-time check
- `NetInfo.refresh()` to force a connectivity re-check
- `NetInfo.addEventListener()` for subscription-based monitoring

### `useNetworkStatus` Hook Pattern

```typescript
// src/shared/hooks/useNetworkStatus.ts
import { useNetInfo } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const netInfo = useNetInfo();
  // Treat null (initial/unknown) as connected to avoid false offline banners on app start
  const isOnline = netInfo.isConnected !== false && netInfo.isInternetReachable !== false;
  return { isOnline, netInfo };
}
```

### `NetworkBanner` Pattern

```typescript
// src/shared/components/feedback/NetworkBanner.tsx
import React from 'react';
import { Banner, useTheme } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';

export function NetworkBanner() {
  const { isOnline } = useNetworkStatus();
  const theme = useTheme();

  return (
    <Banner
      visible={!isOnline}
      actions={[{ label: 'Retry', onPress: () => NetInfo.refresh() }]}
      style={{ backgroundColor: theme.colors.errorContainer }}
      icon="wifi-off"
    >
      No internet connection
    </Banner>
  );
}
```

### `networkCheck.ts` Pattern

```typescript
// src/shared/services/networkCheck.ts
import NetInfo from '@react-native-community/netinfo';
import type { AppError } from '@features/subscriptions/types';

export async function checkConnectivity(): Promise<{ error: AppError | null }> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: 'No internet connection. Please check your connection and try again.',
      },
    };
  }
  return { error: null };
}
```

### `subscriptionService.ts` Changes

Add at the top of `createSubscription`, `updateSubscription`, `deleteSubscription`:

```typescript
import { checkConnectivity } from '@shared/services/networkCheck';

// Inside each function, before any Supabase call:
const connectivity = await checkConnectivity();
if (connectivity.error) {
  return { data: null, error: connectivity.error };
}
```

Keep the existing `TypeError` catch as fallback — connectivity can change between the check and the actual request.

### Foreground Refresh Pattern

In `src/app/navigation/index.tsx`, the existing `AppState` listener handles auth. Extend it:

```typescript
// Inside the existing appState change handler, after auth session check:
if (nextAppState === 'active' && appState.current.match(/inactive|background/)) {
  // Existing auth check...
  // ADD: Refresh subscriptions if session is valid
  if (session) {
    useSubscriptionStore.getState().fetchSubscriptions();
  }
}
```

### Testing Strategy

**Mock `@react-native-community/netinfo`:**
```typescript
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  refresh: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));
```

**`NetworkBanner` tests need `PaperProvider`** — same pattern as all other component tests.

**`subscriptionService` test updates:** Mock `checkConnectivity` to return error, verify Supabase is never called.

### Previous Story Intelligence (Story 5.4)

- `expo-file-system` v19 required `/legacy` import — check if `@react-native-community/netinfo` has any similar API changes
- PaperProvider wrapper is MANDATORY for all component/screen tests
- Testing baseline: 506 passing tests (as of Story 5.4 completion)
- Fire-and-forget pattern with `.catch(() => {})` used for non-blocking side effects

### Cross-Story Context

- **Story 5.6 (GDPR):** Will need the same network check before data export/deletion operations. The `checkConnectivity()` utility created here will be reusable.
- **Story 6.x (Premium):** Premium entitlement checks will also need connectivity. Same utility.

### Project Structure Notes

- `useNetworkStatus.ts` → `src/shared/hooks/` (shared hook, used across features)
- `NetworkBanner.tsx` → `src/shared/components/feedback/` (matches architecture.md: `shared/components/feedback/` for feedback components)
- `networkCheck.ts` → `src/shared/services/` (shared service utility)
- No new Supabase migrations or schema changes needed
- No new navigation routes needed

### References

- [Source: epics.md#Story-5.5] — Acceptance criteria for cloud data sync
- [Source: architecture.md#API-Communication-Patterns] — Real-time: Not used (MVP), Offline: "No connection" screen with retry
- [Source: architecture.md#Technical-Constraints] — Online-only operation (no offline mode in MVP)
- [Source: architecture.md#Project-Structure] — File placement conventions
- [Source: prd.md#NFR22] — Data sync success rate ≥99.9% (P0)
- [Source: prd.md#Offline-Mode] — Not supported in MVP, show "No internet connection" with retry
- [Source: ux-design-specification.md#Error-Feedback] — Error snackbar: "Couldn't save. Check your connection." + Retry
- [Source: src/shared/stores/useSubscriptionStore.ts] — Existing Zustand store with AsyncStorage persistence
- [Source: src/features/subscriptions/services/subscriptionService.ts] — Existing CRUD with TypeError network detection
- [Source: src/app/navigation/index.tsx] — Existing AppState listener for auth session check
- [Source: 5-4-export-subscription-data.md#Dev-Notes] — Previous story patterns and test baseline (506)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed `checkConnectivity` to use `=== false` instead of `!state.isConnected` to treat `null` (initial state) as connected
- Fixed test mocks for `@react-native-community/netinfo` — requires `__esModule: true` + `default` object for default import compatibility
- Used `jest.useFakeTimers()` + `jest.runAllTimers()` in NetworkBanner tests to handle react-native-paper Banner animations

### Completion Notes List

- Installed `@react-native-community/netinfo` via `npx expo install` (SDK 54 compatible)
- Created `useNetworkStatus` hook — reactive connectivity state with null-safe `isOnline` boolean
- Created `NetworkBanner` component — global offline banner with retry using react-native-paper `Banner`
- Created `networkCheck` service — imperative pre-mutation connectivity guard
- Integrated `NetworkBanner` in `App.tsx` above `RootNavigator` for global visibility
- Added foreground refresh in `navigation/index.tsx` — calls `fetchSubscriptions()` on background→active transition
- Added `checkConnectivity()` guard to `createSubscription`, `updateSubscription`, `deleteSubscription` in `subscriptionService.ts`
- Verified Task 6 (login data load) — existing screen `useEffect` hooks already fetch subscriptions and settings on mount
- Verified Task 8 (last-write-wins) — Supabase default behavior, no code changes needed
- Test suite: 520 passing (14 new tests added, 0 regressions)
- All ACs satisfied: AC1 (real-time sync already existed + foreground refresh), AC2 (cross-device via Supabase + foreground refresh), AC3 (network banner + pre-mutation guard), AC4 (last-write-wins verified)

### File List

- `src/shared/hooks/useNetworkStatus.ts` (new)
- `src/shared/hooks/useNetworkStatus.test.ts` (new)
- `src/shared/components/feedback/NetworkBanner.tsx` (new)
- `src/shared/components/feedback/NetworkBanner.test.tsx` (new)
- `src/shared/components/feedback/index.ts` (modified — added NetworkBanner export)
- `src/shared/services/networkCheck.ts` (new)
- `src/shared/services/networkCheck.test.ts` (new)
- `src/app/App.tsx` (modified — added NetworkBanner)
- `src/app/navigation/index.tsx` (modified — added foreground refresh)
- `src/features/subscriptions/services/subscriptionService.ts` (modified — added connectivity checks)
- `src/features/subscriptions/services/subscriptionService.test.ts` (modified — added connectivity test cases)
- `package.json` (modified — added @react-native-community/netinfo)
- `package-lock.json` (modified — lockfile update)

### Change Log

- 2026-03-18: Story 5.5 implemented — proactive connectivity detection, global network banner, foreground refresh, pre-mutation connectivity guard, 14 new tests (520 total)
