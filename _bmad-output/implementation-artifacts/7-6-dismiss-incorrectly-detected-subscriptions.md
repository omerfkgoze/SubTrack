# Story 7.6: Dismiss Incorrectly Detected Subscriptions

Status: done

## Story

As a user,
I want to dismiss transactions that were incorrectly identified as subscriptions,
so that my detected list stays accurate and relevant.

## Acceptance Criteria

### AC1: "Not a Subscription" Action
- **Given** the user views a detected subscription that isn't actually a subscription
- **When** they tap "Not a Subscription"
- **Then** the item is marked as a false positive (status → 'dismissed')
- **And** the merchant is excluded from future detection for this user (stored in `dismissed_merchants` table)
- **And** the item is removed from the detected list immediately

### AC2: Detection Algorithm Learns from Feedback
- **Given** the user has dismissed a merchant as "Not a Subscription"
- **When** the detection algorithm runs again (via fetchDetectedSubscriptions or new detection)
- **Then** transactions from that merchant are excluded from results for this user
- **And** the exclusion is persisted in Supabase (survives app restart)

### AC3: Dismissed Items Section in Settings
- **Given** the user has dismissed one or more items
- **When** they navigate to Settings → Bank section
- **Then** a "Dismissed Items" option is visible (with count badge)
- **And** tapping it navigates to a DismissedItemsScreen

### AC4: Dismissed Items List View
- **Given** the user opens the Dismissed Items screen
- **When** the list loads
- **Then** all dismissed items are shown with: merchant name, amount, frequency, date dismissed
- **And** each item has an "Undo Dismiss" action
- **And** empty state is shown when no dismissed items exist

### AC5: Un-dismiss (Restore) Item
- **Given** the user views a dismissed item
- **When** they tap "Undo Dismiss"
- **Then** the item status reverts to 'detected'
- **And** the merchant is removed from the excluded merchants list
- **And** the item reappears in the DetectedReviewScreen
- **And** a success Snackbar confirms the action

## Tasks / Subtasks

- [x] Task 1: Create `dismissed_merchants` table migration (AC: 2)
  - [x] 1.1 Add Supabase migration: `dismissed_merchants` table (id, user_id, merchant_name, dismissed_at) with RLS
  - [x] 1.2 Generate updated TypeScript types via `supabase gen types typescript`
  - [x] 1.3 Add `DismissedMerchant` type to `src/features/bank/types/index.ts`

- [x] Task 2: Update useBankStore — Dismissed Merchants State & Actions (AC: 1, 2, 5)
  - [x] 2.1 Add state: `dismissedMerchants: DismissedMerchant[]`, `isFetchingDismissed: boolean`
  - [x] 2.2 Add action: `fetchDismissedMerchants()` — loads from Supabase
  - [x] 2.3 Add action: `fetchDismissedItems()` — loads detected_subscriptions with status='dismissed'
  - [x] 2.4 Update `dismissDetectedSubscription(id)` — also insert into `dismissed_merchants`
  - [x] 2.5 Add action: `undismissDetectedSubscription(id)` — status → 'detected', remove from `dismissed_merchants`
  - [x] 2.6 Update `fetchDetectedSubscriptions()` — filter out merchants in `dismissedMerchants` list
  - [x] 2.7 Persist `dismissedMerchants` to AsyncStorage for offline filtering

- [x] Task 3: Create DismissedItemsScreen (AC: 3, 4, 5)
  - [x] 3.1 Create `src/features/bank/screens/DismissedItemsScreen.tsx` with FlatList
  - [x] 3.2 Create `src/features/bank/components/DismissedItemCard.tsx` — merchant name, amount, frequency, dismissed date, "Undo Dismiss" button
  - [x] 3.3 Add empty state: "No dismissed items" with descriptive text
  - [x] 3.4 Add loading state with ActivityIndicator
  - [x] 3.5 Add error handling with retry Snackbar

- [x] Task 4: Navigation & Settings Integration (AC: 3)
  - [x] 4.1 Add `DismissedItems` to `SettingsStackParamList` in `src/app/navigation/types.ts`
  - [x] 4.2 Add DismissedItemsScreen to SettingsStack navigator
  - [x] 4.3 Add "Dismissed Items" List.Item in SettingsScreen under Bank section (show count badge via `right` prop)
  - [x] 4.4 Only show when user has Premium + connected bank (same guard as existing Bank items)

- [x] Task 5: Update DetectedReviewScreen — "Not a Sub" handler (AC: 1)
  - [x] 5.1 Verify existing `handleNotSubscription` calls `dismissDetectedSubscription` (already exists from 7.4)
  - [x] 5.2 Ensure `dismissDetectedSubscription` now also stores merchant exclusion (from Task 2.4)
  - [x] 5.3 Add success Snackbar: "Merchant excluded from future detections"

- [x] Task 6: Tests (AC: all)
  - [x] 6.1 Unit tests for useBankStore new actions (fetchDismissedMerchants, undismissDetectedSubscription, merchant filtering) — co-located in `useBankStore.test.ts`
  - [x] 6.2 Component tests for DismissedItemCard — `DismissedItemCard.test.tsx`
  - [x] 6.3 Screen tests for DismissedItemsScreen — `DismissedItemsScreen.test.tsx` (render, empty state, undo action, error state)
  - [x] 6.4 Update DetectedReviewScreen tests — verify merchant exclusion Snackbar
  - [x] 6.5 Update SettingsScreen tests — verify "Dismissed Items" item renders with count

## Dev Notes

### Existing Code to Reuse — DO NOT Reinvent
- **`dismissDetectedSubscription(id)`** already exists in `useBankStore.ts` — it updates status to 'dismissed' in Supabase and removes from local array. EXTEND it, don't replace.
- **`handleNotSubscription()`** in `DetectedReviewScreen.tsx` already calls `dismissDetectedSubscription`. Just add merchant exclusion logic.
- **`DetectedReviewCard.tsx`** already has "Not a Sub" button — no UI changes needed on that card.
- **Demo bank mode** (`EXPO_PUBLIC_DEMO_BANK_MODE=true`) — add mock dismissed merchants to `src/features/bank/mocks/mockBankData.ts`.

### Architecture Patterns to Follow
- **Store pattern**: Zustand with `set()` / `getState()`, async actions with try/catch, `isLoading` + `error` state per operation
- **Screen pattern**: FlatList with `renderItem`, loading/empty/error states, Snackbar for feedback
- **Component pattern**: React Native Paper components (`List.Item`, `Card`, `Button`, `Snackbar`, `Text`)
- **Navigation**: Add to `SettingsStackParamList`, register in SettingsStack navigator
- **Database**: snake_case tables, UUID primary keys, RLS policies per user, `created_at`/`updated_at` timestamps
- **Tests**: Co-located `*.test.tsx` files, Jest + React Native Testing Library

### Database Schema — `dismissed_merchants`
```sql
CREATE TABLE dismissed_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, merchant_name)
);

ALTER TABLE dismissed_merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dismissed merchants"
  ON dismissed_merchants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Cross-Store Communication
- `useBankStore` reads its own `dismissedMerchants` to filter `fetchDetectedSubscriptions` results
- No cross-store reads needed for this story (unlike 7.5 which read useSubscriptionStore)

### Previous Story (7.5) Learnings
- **Client-side processing works well** — matching algorithm runs in memory, no Edge Function needed. Apply same pattern for merchant exclusion filtering.
- **Transient state pattern**: `matchResults` was NOT persisted to AsyncStorage. For `dismissedMerchants`, DO persist since it's a permanent user preference.
- **`getState()` pattern** for cross-store reads is established and works.
- **Demo mode**: Mock data layer exists — extend it with dismissed merchant mocks.
- **Code review caught**: Actions should clear error state on start. Apply this pattern to new actions.
- **Code review caught**: Demo mode must still call Supabase update functions. Maintain this pattern.

### File Structure
```
src/features/bank/
├── components/
│   ├── DismissedItemCard.tsx          ← NEW
│   └── DismissedItemCard.test.tsx     ← NEW
├── screens/
│   ├── DismissedItemsScreen.tsx       ← NEW
│   └── DismissedItemsScreen.test.tsx  ← NEW
├── mocks/
│   └── mockBankData.ts               ← MODIFY (add dismissed merchant mocks)
├── types/
│   └── index.ts                      ← MODIFY (add DismissedMerchant type)
src/shared/stores/
├── useBankStore.ts                    ← MODIFY (new state/actions)
├── useBankStore.test.ts               ← MODIFY (new tests)
src/features/settings/screens/
├── SettingsScreen.tsx                 ← MODIFY (add Dismissed Items nav item)
├── SettingsScreen.test.tsx            ← MODIFY (add test)
src/app/navigation/
├── types.ts                           ← MODIFY (add DismissedItems to SettingsStackParamList)
├── SettingsStack.tsx (or similar)     ← MODIFY (register new screen)
```

### UX Notes
- **"Not a Sub" button** on DetectedReviewCard: Already exists — no visual changes
- **Dismissed Items in Settings**: Use `List.Item` with `left` icon (e.g., `eye-off`) and `right` count badge
- **DismissedItemCard**: Show merchant name (bold), amount + frequency, dismissed date (relative: "3 days ago")
- **"Undo Dismiss" button**: Use outlined/secondary button style per UX spec
- **Success Snackbar**: Green accent, 3s auto-dismiss, bottom position above nav
- **Empty state**: Centered text with icon, similar to existing empty states in the app

### Project Structure Notes
- Alignment with `features/bank/` module structure — all new files go here
- Navigation registered in SettingsStack since DismissedItems is accessed from Settings
- No new routes needed in BankStack — this is a settings-level screen

### References
- [Source: epics.md — Epic 7, Story 7.6]
- [Source: architecture.md — Zustand Store Pattern, Database Naming, Testing Standards]
- [Source: 7-5 story file — Client-side processing pattern, demo mode, code review learnings]
- [Source: ux-design-specification.md — Button hierarchy, Snackbar patterns, empty states]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
None — implementation proceeded cleanly without blockers.

### Completion Notes List
- Created `dismissed_merchants` Supabase migration with UUID PK, RLS, and UNIQUE(user_id, merchant_name) constraint
- Added `DismissedMerchant` type to bank types
- Extended `useBankStore` with: `dismissedMerchants`, `isFetchingDismissed`, `dismissedItems`, `isFetchingDismissedItems` state fields
- Added `fetchDismissedMerchants()`, `fetchDismissedItems()`, `undismissDetectedSubscription()` actions
- Updated `dismissDetectedSubscription()` to also upsert into `dismissed_merchants` (best-effort, non-fatal if DB insert fails)
- Updated `fetchDetectedSubscriptions()` to filter out merchants in `dismissedMerchants` list (client-side exclusion)
- `dismissedMerchants` persisted to AsyncStorage; `dismissedItems` is transient
- Created `DismissedItemCard.tsx` component with merchant name, amount, frequency, relative dismissed date, and Undo button
- Created `DismissedItemsScreen.tsx` with FlatList, loading/empty/error states and success Snackbar on Undo
- Added `DismissedItems` route to `SettingsStackParamList` and `SettingsStack.tsx`
- Added "Dismissed Items" `List.Item` in Bank section of SettingsScreen — only shown for Premium+connected users
- Added count badge display to Dismissed Items nav entry
- Updated `handleNotSubscription` in `DetectedReviewScreen` to show "Merchant excluded from future detections" Snackbar
- Added mock dismissed merchants and dismissed detected subscriptions to `mockBankData.ts`
- All 865 tests pass with zero regressions

### Code Review Fixes (AI Review — 2026-03-25)
- **[M1] Fixed wrong dismissed date in DismissedItemCard**: Card was showing `lastSeen` (last bank transaction date) instead of actual `dismissedAt` from `dismissed_merchants` record. Added `dismissedAt` prop to `DismissedItemCard`, `DismissedItemsScreen` now looks up the real date from `dismissedMerchants` state and passes it through. Falls back to `lastSeen` if merchant record not found.
- **[M2] Fixed missing error state clearing**: `fetchDismissedMerchants()` and `fetchDismissedItems()` were not clearing `detectionError` at start — inconsistent with 7.5 lesson. Both now set `detectionError: null` on start. Added 2 new unit tests to verify.
- Updated `DismissedItemsScreen` to also call `fetchDismissedMerchants()` on focus (needed for M1 fix).
- Updated `DismissedItemCard.test.tsx` and `DismissedItemsScreen.test.tsx` mocks to include new props/state.
- All 88 tests in affected suites pass after fixes.

### Change Log
- Added `dismissed_merchants` Supabase migration (2026-03-25)
- Added `DismissedMerchant` type, store state/actions, and filtering logic (2026-03-25)
- Created `DismissedItemCard` component and `DismissedItemsScreen` screen (2026-03-25)
- Added navigation route and SettingsScreen integration for Dismissed Items (2026-03-25)
- Updated DetectedReviewScreen with merchant exclusion Snackbar (2026-03-25)
- Added 67 new unit tests + 10 component tests + 9 screen tests + 1 new DetectedReview test + 5 new SettingsScreen tests (2026-03-25)
- Code review fixes: DismissedItemCard dismissedAt prop, error clearing in fetch actions, updated tests (2026-03-25)

### File List
- supabase/migrations/20260325000000_create_dismissed_merchants.sql (NEW)
- src/features/bank/types/index.ts (MODIFIED)
- src/features/bank/mocks/mockBankData.ts (MODIFIED)
- src/shared/stores/useBankStore.ts (MODIFIED)
- src/shared/stores/useBankStore.test.ts (MODIFIED)
- src/features/bank/components/DismissedItemCard.tsx (NEW)
- src/features/bank/components/DismissedItemCard.test.tsx (NEW)
- src/features/bank/screens/DismissedItemsScreen.tsx (NEW)
- src/features/bank/screens/DismissedItemsScreen.test.tsx (NEW)
- src/app/navigation/types.ts (MODIFIED)
- src/app/navigation/SettingsStack.tsx (MODIFIED)
- src/features/settings/screens/SettingsScreen.tsx (MODIFIED)
- src/features/settings/screens/SettingsScreen.test.tsx (MODIFIED)
- src/features/bank/screens/DetectedReviewScreen.tsx (MODIFIED)
- src/features/bank/screens/DetectedReviewScreen.test.tsx (MODIFIED)
