# Story 7.7: Bank Connection Status & Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my bank connection status and manage my connections,
so that I know if my data is being synced correctly.

## Acceptance Criteria

### AC1: Connection Status Display
- **Given** the user has connected bank accounts
- **When** they navigate to Settings > Bank Connections
- **Then** each connection shows: bank name, status (connected/expired/error), last sync date, and connection expiry date

### AC2: Active Connection Indicator
- **Given** a bank connection is in "active" status
- **When** the user views the connection
- **Then** a green indicator confirms active status
- **And** "Disconnect" and "Refresh Now" actions are available

### AC3: Expired Connection Warning & Reconnect
- **Given** a bank connection has expired
- **When** the user views the status
- **Then** a warning is displayed: "Connection expired. Reconnect to continue auto-detection."
- **And** a "Reconnect" button initiates a new OAuth flow

### AC4: Error Connection State
- **Given** a bank connection has an error
- **When** the user views the status
- **Then** the error is explained in user-friendly terms
- **And** troubleshooting steps or "Retry" option is provided

## Tasks / Subtasks

- [x] Task 1: Add `disconnectConnection` action to useBankStore (AC: 2)
  - [x] 1.1 Add action: `disconnectConnection(connectionId: string)` — updates `bank_connections` status to 'disconnected' in Supabase, removes from local `connections` array
  - [x] 1.2 Add state: `isDisconnecting: boolean`
  - [x] 1.3 Clear error state on start, set isDisconnecting during operation
  - [x] 1.4 In demo mode: use `mockDelay()` and update local state only (same pattern as other demo actions)
  - [x] 1.5 After disconnect: clear `detectedSubscriptions`, `dismissedMerchants`, `dismissedItems`, `matchResults`, `lastDetectionResult` from store state

- [x] Task 2: Add `reconnectBank` action to useBankStore (AC: 3)
  - [x] 2.1 Add action: `reconnectBank(connectionId: string)` — navigates to BankConnection screen with `autoConnect: true` param (reuse existing OAuth flow)
  - [x] 2.2 This is NOT a store action — it's a navigation helper. The reconnect is just navigating to `BankConnection` with `autoConnect: true` (existing flow handles OAuth + connection creation)

- [x] Task 3: Create ConnectionStatusCard component (AC: 1, 2, 3, 4)
  - [x] 3.1 Create `src/features/bank/components/ConnectionStatusCard.tsx`
  - [x] 3.2 Props: `connection: BankConnection`, `onDisconnect`, `onReconnect`, `onRefresh`, `isDisconnecting`, `isDetecting`
  - [x] 3.3 Display: bank name, status badge (color-coded), connected date, consent expiry date, last synced date (relative: "2 hours ago")
  - [x] 3.4 Status badge colors: active → green (theme.colors.secondary), expiring_soon → orange (theme.colors.tertiary), expired → red (theme.colors.error), error → red (theme.colors.error), disconnected → grey (theme.colors.outline)
  - [x] 3.5 Active state: show "Disconnect" (outlined/destructive) and "Refresh Now" (contained) buttons
  - [x] 3.6 Expiring soon state: show warning text "Consent expires on {date}. Reconnect to renew." + "Reconnect" button
  - [x] 3.7 Expired state: show warning "Connection expired. Reconnect to continue auto-detection." + "Reconnect" button
  - [x] 3.8 Error state: show error message + "Retry" button (calls onReconnect)
  - [x] 3.9 Disconnected state: show "Disconnected" text only (no actions — user can connect new from BankConnection screen)

- [x] Task 4: Create BankConnectionStatusScreen (AC: 1, 2, 3, 4)
  - [x] 4.1 Create `src/features/bank/screens/BankConnectionStatusScreen.tsx`
  - [x] 4.2 Load connections via `useFocusEffect` → `fetchConnections()`
  - [x] 4.3 FlatList of ConnectionStatusCard for each connection
  - [x] 4.4 Loading state with ActivityIndicator
  - [x] 4.5 Empty state: "No bank connections" with "Connect Bank" button → navigate to BankConnection
  - [x] 4.6 Disconnect confirmation: show Dialog (react-native-paper `Dialog`) before disconnecting — "Are you sure? This will stop auto-detection for this bank."
  - [x] 4.7 Success Snackbar after disconnect: "Bank disconnected successfully"
  - [x] 4.8 "Refresh Now" calls existing `detectSubscriptions(connectionId)` (reuse existing action)
  - [x] 4.9 "Reconnect" navigates to `BankConnection` screen with `autoConnect: true`

- [x] Task 5: Navigation & Settings Integration (AC: 1)
  - [x] 5.1 Add `BankConnectionStatus` to `SettingsStackParamList` in `src/app/navigation/types.ts`
  - [x] 5.2 Register BankConnectionStatusScreen in SettingsStack navigator
  - [x] 5.3 Update SettingsScreen Bank section: add "Connection Status" `List.Item` between existing "Bank Connection" and "Dismissed Items" entries
  - [x] 5.4 Only show when `isPremium && isBankConnected` (same guard as Dismissed Items)
  - [x] 5.5 Use icon `bank-transfer` and show connection status as description (e.g., "Connected", "Expired — reconnect needed")
  - [x] 5.6 Show status color indicator via `left` icon color (green for active, red for expired/error)

- [x] Task 6: Update BankConnectionScreen — post-disconnect state (AC: 2)
  - [x] 6.1 After disconnect, BankConnectionScreen should show the "not connected" state (already handles `isBankConnected === false`)
  - [x] 6.2 Verify existing BankConnectionScreen correctly resets when connections array becomes empty — no changes expected, just verify

- [x] Task 7: Mock data for demo mode (AC: all)
  - [x] 7.1 Add `MOCK_CONNECTIONS_MULTI` to `mockBankData.ts` — array with multiple connections in different statuses (active, expired, error) for testing all states
  - [x] 7.2 Add mock disconnect handler in demo mode

- [x] Task 8: Tests (AC: all)
  - [x] 8.1 Unit tests for `disconnectConnection` action in `useBankStore.test.ts` — success, error, demo mode
  - [x] 8.2 Component tests: `ConnectionStatusCard.test.tsx` — renders all 5 status states, button presses, loading states
  - [x] 8.3 Screen tests: `BankConnectionStatusScreen.test.tsx` — render, empty state, disconnect confirmation dialog, snackbar, reconnect navigation
  - [x] 8.4 Update SettingsScreen tests — verify "Connection Status" item renders with correct status description
  - [x] 8.5 Verify disconnect clears related state (detected subs, dismissed merchants, etc.)

## Dev Notes

### Existing Code to Reuse — DO NOT Reinvent
- **`fetchConnections()`** already exists in `useBankStore.ts` — loads all user connections from Supabase. Reuse as-is.
- **`detectSubscriptions(connectionId)`** already exists — reuse for "Refresh Now" button. Do NOT create a separate refresh action.
- **`BankConnectionScreen`** already handles the full OAuth reconnect flow with `autoConnect` param. Reconnect = navigate to it with `{ autoConnect: true }`.
- **`connections` state** is already persisted to AsyncStorage via `partialize`. Disconnect should update both Supabase and local state.
- **`BankConnection` type** already has `status: BankConnectionStatus` with values: `'active' | 'expiring_soon' | 'expired' | 'error' | 'disconnected'`. All status types are ready.
- **Demo mode pattern** (`env.DEMO_BANK_MODE`): Check flag, use `mockDelay()`, return mock data. Follow exact pattern from existing actions like `fetchConnections`, `dismissDetectedSubscription`.
- **`MOCK_CONNECTION`** already exists in `mockBankData.ts` with status 'active'. Extend with multi-status array.

### Architecture Patterns to Follow
- **Store pattern**: Zustand with `set()` / `getState()`, async actions with try/catch, `isLoading` + `error` state per operation. **Clear error at action start** (lesson from 7.6 code review).
- **Screen pattern**: FlatList with `renderItem`, loading/empty/error states, Snackbar for feedback
- **Component pattern**: React Native Paper components (`List.Item`, `Card`, `Button`, `Surface`, `Snackbar`, `Text`, `Dialog`)
- **Navigation**: Add to `SettingsStackParamList`, register in SettingsStack navigator
- **Database**: No new tables needed — `bank_connections` already has all required columns and status enum
- **Tests**: Co-located `*.test.tsx` files, Jest + React Native Testing Library

### Key Implementation Details

**Disconnect flow:**
1. Show confirmation Dialog (react-native-paper `Dialog`)
2. On confirm: call `disconnectConnection(connectionId)`
3. Store action: Supabase `update` → `{ status: 'disconnected' }` on `bank_connections` where `id = connectionId`
4. On success: remove connection from local `connections` array, clear related state
5. Show success Snackbar

**Status badge rendering:**
```typescript
const STATUS_CONFIG: Record<BankConnectionStatus, { label: string; color: string }> = {
  active: { label: 'Connected', color: theme.colors.secondary },
  expiring_soon: { label: 'Expiring Soon', color: theme.colors.tertiary },
  expired: { label: 'Expired', color: theme.colors.error },
  error: { label: 'Error', color: theme.colors.error },
  disconnected: { label: 'Disconnected', color: theme.colors.outline },
};
```

**Consent expiry display:**
- `consentExpiresAt` is already stored on `BankConnection` — calculate days remaining
- Show "Expires in X days" for active connections
- Show "Expired on {date}" for expired connections

**Reconnect is NOT a new OAuth flow implementation.** It's simply:
```typescript
navigation.navigate('BankConnection', { autoConnect: true });
```
The existing BankConnectionScreen already handles `autoConnect` param to skip the info screen and go straight to consent.

### Cross-Store Communication
- No cross-store reads needed. Everything is within `useBankStore`.
- Disconnect should clear: `detectedSubscriptions`, `dismissedMerchants`, `dismissedItems`, `matchResults`, `lastDetectionResult` — all are bank-specific state that becomes invalid after disconnect.

### Previous Story (7.6) Learnings
- **Clear error state on action start** — code review caught that `fetchDismissedMerchants()` and `fetchDismissedItems()` were not clearing `detectionError` at start. Apply to `disconnectConnection`.
- **Demo mode must still call update functions** — maintain pattern where demo mode simulates the full flow.
- **`dismissedAt` prop pattern** — when displaying dates, pass the actual date field, don't derive from unrelated fields.
- **`useFocusEffect` for data freshness** — use on the status screen to refresh connections when screen gains focus.

### File Structure
```
src/features/bank/
├── components/
│   ├── ConnectionStatusCard.tsx          ← NEW
│   └── ConnectionStatusCard.test.tsx     ← NEW
├── screens/
│   ├── BankConnectionStatusScreen.tsx    ← NEW
│   └── BankConnectionStatusScreen.test.tsx ← NEW
├── mocks/
│   └── mockBankData.ts                  ← MODIFY (add multi-status mock connections)
src/shared/stores/
├── useBankStore.ts                       ← MODIFY (add disconnectConnection action + isDisconnecting state)
├── useBankStore.test.ts                  ← MODIFY (add disconnect tests)
src/features/settings/screens/
├── SettingsScreen.tsx                    ← MODIFY (add Connection Status nav item)
├── SettingsScreen.test.tsx               ← MODIFY (add test)
src/app/navigation/
├── types.ts                              ← MODIFY (add BankConnectionStatus to SettingsStackParamList)
├── SettingsStack.tsx                     ← MODIFY (register new screen)
```

### UX Notes
- **ConnectionStatusCard**: Use `Surface` with elevation 1, similar to `connectedCard` in BankConnectionScreen
- **Status badge**: Use `Chip` or colored `Text` with background — keep consistent with app's visual language
- **Disconnect button**: Use `mode="outlined"` with `textColor={theme.colors.error}` for destructive action visual
- **Reconnect button**: Use `mode="contained"` — primary action CTA
- **Refresh Now button**: Use `mode="contained"` — same as existing "Scan for Subscriptions" button pattern
- **Confirmation Dialog**: Use react-native-paper `Dialog` with title, content, and Cancel/Disconnect actions
- **Last synced**: Show relative time ("2 hours ago", "Yesterday") — use same date formatting approach as DismissedItemCard
- **Empty state**: Centered text with icon, "Connect Bank" CTA button

### Project Structure Notes
- Alignment with `features/bank/` module structure — all new files go here
- Navigation registered in SettingsStack since BankConnectionStatus is accessed from Settings
- No new routes needed in BankStack
- No new database tables or migrations needed — `bank_connections` already has all required fields

### References
- [Source: epics.md — Epic 7, Story 7.7]
- [Source: architecture.md — Zustand Store Pattern, Database Naming, Testing Standards]
- [Source: 7-6 story file — Error clearing pattern, demo mode, code review learnings]
- [Source: BankConnectionScreen.tsx — Existing OAuth flow, autoConnect param, connected state UI]
- [Source: useBankStore.ts — fetchConnections, detectSubscriptions, connections persistence]
- [Source: ux-design-specification.md — Banking app patterns, security indicators]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `disconnectConnection(connectionId)` action in `useBankStore` with `isDisconnecting` state. Clears error at action start (7.6 lesson applied). Demo mode uses `mockDelay()` + local-only update. On success: removes connection from array, clears detectedSubscriptions, dismissedMerchants, dismissedItems, matchResults, lastDetectionResult.
- `reconnectBank` implemented as navigation helper in screen (not store action): `navigation.navigate('BankConnection', { autoConnect: true })`.
- `ConnectionStatusCard` created with color-coded status badge, relative date display, and state-appropriate action buttons for all 5 status types.
- `BankConnectionStatusScreen` created with FlatList, loading/empty states, disconnect confirmation Dialog, success Snackbar, Reconnect navigation.
- Navigation: added `BankConnectionStatus` to `SettingsStackParamList`, registered in `SettingsStack`, added "Connection Status" List.Item to SettingsScreen Bank section (guard: `isPremium && isBankConnected`).
- Added `MOCK_CONNECTIONS_MULTI` to `mockBankData.ts` with 4 connections covering active, expired, error, and expiring_soon statuses.
- All 908 tests pass (74 store + 19 card + 11 screen + 31 settings + existing).

### File List

- src/shared/stores/useBankStore.ts (modified — added isDisconnecting state + disconnectConnection action)
- src/shared/stores/useBankStore.test.ts (modified — added disconnectConnection test suite)
- src/features/bank/components/ConnectionStatusCard.tsx (new)
- src/features/bank/components/ConnectionStatusCard.test.tsx (new)
- src/features/bank/screens/BankConnectionStatusScreen.tsx (new)
- src/features/bank/screens/BankConnectionStatusScreen.test.tsx (new)
- src/features/bank/mocks/mockBankData.ts (modified — added MOCK_CONNECTIONS_MULTI)
- src/app/navigation/types.ts (modified — added BankConnectionStatus to SettingsStackParamList)
- src/app/navigation/SettingsStack.tsx (modified — registered BankConnectionStatusScreen)
- src/features/settings/screens/SettingsScreen.tsx (modified — added Connection Status List.Item)
- src/features/settings/screens/SettingsScreen.test.tsx (modified — added Connection Status section tests)

## Change Log

- 2026-03-25: Implemented Story 7.7 — Bank Connection Status & Management. Added disconnectConnection action to useBankStore, created ConnectionStatusCard component, BankConnectionStatusScreen, registered navigation route, integrated into SettingsScreen Bank section. 908 tests passing.
- 2026-03-25: [Code Review Fix] Demo mode disconnect bug — fetchConnections was unconditionally resetting connections to [MOCK_CONNECTION], undoing disconnects. Added `_demoDisconnectedIds` tracking to useBankStore so fetchConnections respects demo disconnects. initiateConnection clears the ID on reconnect. All 116 related tests passing.
