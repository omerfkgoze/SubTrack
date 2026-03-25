# Story 7.8: Manual Bank Data Refresh

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to manually refresh my bank data on demand,
so that I can see the latest transactions without waiting for the daily sync.

## Acceptance Criteria

### AC1: Manual Refresh via "Refresh Now" Button
- **Given** the user has an active bank connection
- **When** they tap "Refresh Now" on the BankConnectionStatusScreen
- **Then** a fresh transaction sync is triggered via the aggregator API
- **And** a loading indicator shows sync progress
- **And** new transactions are analyzed for recurring patterns

### AC2: Pull-to-Refresh on BankConnectionStatusScreen
- **Given** the user is on the BankConnectionStatusScreen
- **When** they pull down on the connections list
- **Then** connections are re-fetched AND detection runs for each active connection
- **And** a RefreshControl spinner is shown during refresh

### AC3: Pull-to-Refresh on DetectedReviewScreen
- **Given** the user is on the DetectedReviewScreen
- **When** they pull down on the detected subscriptions list
- **Then** a fresh detection cycle runs for the active connection
- **And** newly detected subscriptions appear in the review queue
- **And** match results are recomputed

### AC4: Last Synced Timestamp Update
- **Given** a manual refresh completes successfully
- **When** new transactions are processed
- **Then** the "Last synced" timestamp is updated on the connection locally
- **And** the ConnectionStatusCard reflects the new timestamp

### AC5: Refresh Failure Handling
- **Given** a manual refresh fails
- **When** the sync cannot complete
- **Then** a user-friendly error Snackbar is displayed with the error message
- **And** the previous data remains intact (graceful degradation)
- **And** a "Retry" option is available (user can tap Refresh Now again)

### AC6: Concurrent Refresh Prevention
- **Given** a refresh is already in progress
- **When** the user attempts another refresh
- **Then** the Refresh Now button is disabled / RefreshControl doesn't trigger a duplicate call

## Tasks / Subtasks

- [x] Task 1: Add `refreshBankData` action to useBankStore (AC: 1, 4, 5, 6)
  - [x] 1.1 Add state: `isRefreshing: boolean` (for pull-to-refresh indicator, distinct from `isDetecting`)
  - [x] 1.2 Add action: `refreshBankData(connectionId: string)` — calls `detectSubscriptions` internally but also updates `lastSyncedAt` on success
  - [x] 1.3 On success: update matching connection's `lastSyncedAt` in local state to `new Date().toISOString()`
  - [x] 1.4 On success: also update `last_synced_at` in Supabase `bank_connections` table
  - [x] 1.5 In demo mode: use `mockDelay()`, update mock connection's `lastSyncedAt`, set `lastDetectionResult`
  - [x] 1.6 Clear `detectionError` at start (lesson from 7.6)
  - [x] 1.7 Guard: if `isRefreshing` or `isDetecting` is already true, return early (prevent concurrent)

- [x] Task 2: Add pull-to-refresh to BankConnectionStatusScreen (AC: 2, 6)
  - [x] 2.1 Import `RefreshControl` from `react-native`
  - [x] 2.2 Add `isRefreshing` selector from useBankStore
  - [x] 2.3 Add `handlePullToRefresh` callback: calls `refreshBankData` for first active connection
  - [x] 2.4 Add `refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} />}` to FlatList
  - [x] 2.5 Update existing `handleRefresh` (per-card Refresh Now) to call `refreshBankData` instead of `detectSubscriptions`

- [x] Task 3: Add pull-to-refresh to DetectedReviewScreen (AC: 3, 6)
  - [x] 3.1 Import `RefreshControl` from `react-native`
  - [x] 3.2 Add `isRefreshing` and `refreshBankData` and `connections` selectors from useBankStore
  - [x] 3.3 Add `handlePullToRefresh` callback: find first active connection, call `refreshBankData(connectionId)`, then `fetchDetectedSubscriptions()` + `computeMatches()`
  - [x] 3.4 Add `refreshControl` to FlatList
  - [x] 3.5 If no active connection, pull-to-refresh just calls `fetchDetectedSubscriptions()` (no bank sync)

- [x] Task 4: Update "Refresh Now" button behavior on BankConnectionScreen (AC: 1, 4, 5)
  - [x] 4.1 Update `handleScanPress` in `BankConnectionScreen.tsx` to call `refreshBankData` instead of `detectSubscriptions`
  - [x] 4.2 The loading/result/error UI already exists for detection — verify it works with `refreshBankData` (same state variables: `isDetecting`, `lastDetectionResult`, `detectionError`)

- [x] Task 5: Snackbar feedback for refresh results (AC: 5)
  - [x] 5.1 BankConnectionStatusScreen: after `refreshBankData` completes, check `detectionError` — show error Snackbar if present, success Snackbar with detection count if successful
  - [x] 5.2 DetectedReviewScreen: show Snackbar on refresh error

- [x] Task 6: Tests (AC: all)
  - [x] 6.1 Unit tests for `refreshBankData` in `useBankStore.test.ts`: success updates `lastSyncedAt`, failure keeps data intact, demo mode, concurrent guard
  - [x] 6.2 Update `BankConnectionStatusScreen.test.tsx`: pull-to-refresh triggers refresh, RefreshControl present, error snackbar on failure
  - [x] 6.3 Update `DetectedReviewScreen.test.tsx`: pull-to-refresh triggers refresh + re-fetch, works without active connection
  - [x] 6.4 Update `BankConnectionScreen.test.tsx`: scan button uses `refreshBankData`

## Dev Notes

### Existing Code to Reuse — DO NOT Reinvent
- **`detectSubscriptions(connectionId)`** already exists in `useBankStore.ts` — calls `tink-detect-subscriptions` edge function. `refreshBankData` should call this internally, NOT duplicate the edge function call logic.
- **`fetchDetectedSubscriptions()`** already fetches detected subs from DB. Reuse after refresh.
- **`fetchConnections()`** already loads connections. Reuse for pull-to-refresh connection list refresh.
- **`computeMatches()`** already computes match results. Call after refresh on DetectedReviewScreen.
- **`BankConnectionScreen`** already has scan button with result/error Snackbar UI — just swap `detectSubscriptions` → `refreshBankData`.
- **`ConnectionStatusCard`** already has `onRefresh` prop and "Refresh Now" button — no changes needed to card.
- **`RefreshControl` pattern** already used in `SubscriptionsScreen.tsx` (line 284-287) and `NotificationHistoryScreen.tsx` (line 129). Follow same pattern.
- **`MOCK_CONNECTION`** and **`MOCK_DETECTION_RESULT`** already exist in `mockBankData.ts`.

### Architecture Patterns to Follow
- **Store pattern**: Zustand with `set()` / `getState()`, async actions with try/catch. **Clear error at action start** (lesson from 7.6).
- **`isRefreshing`** is the architecture-standard name for pull-to-refresh state (see architecture.md AsyncState pattern). Use this for RefreshControl, keep `isDetecting` for the Scan button spinner.
- **RefreshControl pattern**: `<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} />` on FlatList.
- **Graceful degradation**: On refresh failure, `detectionError` is set but `detectedSubscriptions` and `connections` remain untouched — already handled by `detectSubscriptions` error path.
- **Database**: No new tables. Update `last_synced_at` on existing `bank_connections` row: `supabase.from('bank_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connectionId)`.
- **Tests**: Co-located `*.test.tsx` files, Jest + React Native Testing Library.

### Key Implementation Details

**`refreshBankData` action:**
```typescript
refreshBankData: async (connectionId: string) => {
  const { isRefreshing, isDetecting } = get();
  if (isRefreshing || isDetecting) return; // concurrent guard

  set({ isRefreshing: true, detectionError: null });

  try {
    // Reuse existing detection logic (which calls tink-detect-subscriptions edge function)
    await get().detectSubscriptions(connectionId);

    // On success (no detectionError), update lastSyncedAt
    const { detectionError } = get();
    if (!detectionError) {
      const now = new Date().toISOString();
      // Update local state
      set((state) => ({
        connections: state.connections.map((c) =>
          c.id === connectionId ? { ...c, lastSyncedAt: now } : c
        ),
      }));
      // Update Supabase (non-blocking, fire-and-forget)
      if (!env.DEMO_BANK_MODE) {
        supabase.from('bank_connections')
          .update({ last_synced_at: now })
          .eq('id', connectionId)
          .then(); // fire-and-forget
      }
    }
  } finally {
    set({ isRefreshing: false });
  }
},
```

**Note on `isRefreshing` vs `isDetecting`:**
- `isDetecting` is set by `detectSubscriptions` internally — used for the Scan/Refresh Now button spinner
- `isRefreshing` wraps the whole refresh flow — used for RefreshControl pull-to-refresh indicator
- Both can be true simultaneously (refreshBankData sets isRefreshing, then detectSubscriptions sets isDetecting)
- The concurrent guard checks both to prevent double-triggering

**Pull-to-refresh on BankConnectionStatusScreen:**
```typescript
const isRefreshing = useBankStore((s) => s.isRefreshing);
const refreshBankData = useBankStore((s) => s.refreshBankData);

const handlePullToRefresh = useCallback(async () => {
  const activeConn = connections.find((c) => c.status === 'active');
  if (activeConn) {
    await refreshBankData(activeConn.id);
  } else {
    await fetchConnections(); // just refresh the list
  }
}, [connections, refreshBankData, fetchConnections]);
```

**Pull-to-refresh on DetectedReviewScreen:**
```typescript
const handlePullToRefresh = useCallback(async () => {
  const { connections } = useBankStore.getState();
  const activeConn = connections.find((c) => c.status === 'active');
  if (activeConn) {
    await refreshBankData(activeConn.id);
  }
  await fetchDetectedSubscriptions();
  computeMatches();
}, [refreshBankData, fetchDetectedSubscriptions, computeMatches]);
```

### Cross-Store Communication
- No cross-store writes needed. Everything within `useBankStore`.
- `DetectedReviewScreen` reads from `useBankStore` (connections, refreshBankData) and `useSubscriptionStore` (for match computation) — both already imported.

### Previous Story (7.7) Learnings
- **Clear error state on action start** — apply to `refreshBankData` (clear `detectionError` at start).
- **Demo mode pattern**: Check `env.DEMO_BANK_MODE`, use `mockDelay()`, update local state only.
- **`useFocusEffect` for data freshness** — already used on both screens.
- **`_demoDisconnectedIds` tracking** — demo disconnect is properly tracked; `refreshBankData` in demo mode should respect this (only refresh non-disconnected connections).
- **Fire-and-forget Supabase updates** — for non-critical updates like `last_synced_at`, use fire-and-forget to avoid blocking the UI.

### File Structure
```
src/shared/stores/
├── useBankStore.ts                       ← MODIFY (add isRefreshing state + refreshBankData action)
├── useBankStore.test.ts                  ← MODIFY (add refreshBankData tests)
src/features/bank/screens/
├── BankConnectionStatusScreen.tsx        ← MODIFY (add pull-to-refresh, use refreshBankData)
├── BankConnectionStatusScreen.test.tsx   ← MODIFY (add pull-to-refresh tests)
├── DetectedReviewScreen.tsx              ← MODIFY (add pull-to-refresh)
├── DetectedReviewScreen.test.tsx         ← MODIFY (add pull-to-refresh tests)
├── BankConnectionScreen.tsx              ← MODIFY (swap detectSubscriptions → refreshBankData in handleScanPress)
├── BankConnectionScreen.test.tsx         ← MODIFY (update scan test)
```

### UX Notes
- **RefreshControl**: Use default system pull-to-refresh spinner — no custom styling needed
- **Refresh Now button**: Already exists on ConnectionStatusCard, already shows `isDetecting` loading state. No visual changes needed.
- **Scan for Subscriptions button**: Already exists on BankConnectionScreen with detection result Snackbar — just changing the underlying action.
- **Error Snackbar**: Already implemented on BankConnectionStatusScreen — extend to show refresh-specific errors.
- **Last synced update**: ConnectionStatusCard already renders `lastSyncedAt` as relative time — updating the value is sufficient.

### Project Structure Notes
- All modifications within existing `features/bank/` and `shared/stores/` modules
- No new files needed — all changes are modifications to existing files
- No new navigation routes
- No new database tables or migrations

### References
- [Source: epics.md — Epic 7, Story 7.8]
- [Source: architecture.md — AsyncState pattern (isRefreshing), Zustand Store Rules, Error Handling Pattern]
- [Source: 7-7 story file — Error clearing pattern, demo mode, disconnect tracking, fire-and-forget updates]
- [Source: useBankStore.ts — detectSubscriptions action, connections state, existing patterns]
- [Source: BankConnectionStatusScreen.tsx — Existing refresh handler, FlatList structure]
- [Source: DetectedReviewScreen.tsx — FlatList structure, useFocusEffect pattern]
- [Source: SubscriptionsScreen.tsx:284 — RefreshControl implementation pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `isRefreshing: boolean` state and `refreshBankData(connectionId)` action to `useBankStore.ts`
- `refreshBankData` wraps `detectSubscriptions` internally, updates `lastSyncedAt` on success (both local state + Supabase fire-and-forget), clears `detectionError` at start, and guards against concurrent calls
- Demo mode: uses `mockDelay`, respects `_demoDisconnectedIds`, updates local state without Supabase call
- Added `RefreshControl` pull-to-refresh to `BankConnectionStatusScreen` (FlatList) and `DetectedReviewScreen` (FlatList)
- `BankConnectionStatusScreen`: pull-to-refresh calls `refreshBankData` for active connection, falls back to `fetchConnections` if no active connection; per-card "Refresh Now" also uses `refreshBankData`; shows error/success snackbar after refresh
- `DetectedReviewScreen`: pull-to-refresh calls `refreshBankData` + `fetchDetectedSubscriptions` + `computeMatches`; if no active connection, skips bank sync; shows error snackbar on failure
- `BankConnectionScreen`: `handleScanPress` now calls `refreshBankData` instead of `detectSubscriptions`; existing result/error UI (`isDetecting`, `lastDetectionResult`, `detectionError`) unchanged
- All 275 bank tests pass, 7 new `refreshBankData` store tests added, screen tests updated for the new mock API

### File List

- src/shared/stores/useBankStore.ts
- src/shared/stores/useBankStore.test.ts
- src/features/bank/screens/BankConnectionStatusScreen.tsx
- src/features/bank/screens/BankConnectionStatusScreen.test.tsx
- src/features/bank/screens/DetectedReviewScreen.tsx
- src/features/bank/screens/DetectedReviewScreen.test.tsx
- src/features/bank/screens/BankConnectionScreen.tsx
- src/features/bank/screens/BankConnectionScreen.test.tsx
- _bmad-output/implementation-artifacts/7-8-manual-bank-data-refresh.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-03-25: Story implemented — added `refreshBankData` action to `useBankStore`, pull-to-refresh on `BankConnectionStatusScreen` and `DetectedReviewScreen`, updated scan button on `BankConnectionScreen` to use `refreshBankData`, Snackbar feedback for refresh results. All 275 bank tests pass.
- 2026-03-26: Code review fixes — `handlePullToRefresh` on `BankConnectionStatusScreen` now also calls `fetchConnections()` after `refreshBankData` when active connection exists (AC2 full compliance); `handleRefresh` (per-card Refresh Now) now shows success Snackbar with detection count (Task 5.1 full compliance). 18/18 screen tests pass.
