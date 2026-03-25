# Story 7.6: Dismiss Incorrectly Detected Subscriptions

Status: ready-for-dev

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

- [ ] Task 1: Create `dismissed_merchants` table migration (AC: 2)
  - [ ] 1.1 Add Supabase migration: `dismissed_merchants` table (id, user_id, merchant_name, dismissed_at) with RLS
  - [ ] 1.2 Generate updated TypeScript types via `supabase gen types typescript`
  - [ ] 1.3 Add `DismissedMerchant` type to `src/features/bank/types/index.ts`

- [ ] Task 2: Update useBankStore — Dismissed Merchants State & Actions (AC: 1, 2, 5)
  - [ ] 2.1 Add state: `dismissedMerchants: DismissedMerchant[]`, `isFetchingDismissed: boolean`
  - [ ] 2.2 Add action: `fetchDismissedMerchants()` — loads from Supabase
  - [ ] 2.3 Add action: `fetchDismissedItems()` — loads detected_subscriptions with status='dismissed'
  - [ ] 2.4 Update `dismissDetectedSubscription(id)` — also insert into `dismissed_merchants`
  - [ ] 2.5 Add action: `undismissDetectedSubscription(id)` — status → 'detected', remove from `dismissed_merchants`
  - [ ] 2.6 Update `fetchDetectedSubscriptions()` — filter out merchants in `dismissedMerchants` list
  - [ ] 2.7 Persist `dismissedMerchants` to AsyncStorage for offline filtering

- [ ] Task 3: Create DismissedItemsScreen (AC: 3, 4, 5)
  - [ ] 3.1 Create `src/features/bank/screens/DismissedItemsScreen.tsx` with FlatList
  - [ ] 3.2 Create `src/features/bank/components/DismissedItemCard.tsx` — merchant name, amount, frequency, dismissed date, "Undo Dismiss" button
  - [ ] 3.3 Add empty state: "No dismissed items" with descriptive text
  - [ ] 3.4 Add loading state with ActivityIndicator
  - [ ] 3.5 Add error handling with retry Snackbar

- [ ] Task 4: Navigation & Settings Integration (AC: 3)
  - [ ] 4.1 Add `DismissedItems` to `SettingsStackParamList` in `src/app/navigation/types.ts`
  - [ ] 4.2 Add DismissedItemsScreen to SettingsStack navigator
  - [ ] 4.3 Add "Dismissed Items" List.Item in SettingsScreen under Bank section (show count badge via `right` prop)
  - [ ] 4.4 Only show when user has Premium + connected bank (same guard as existing Bank items)

- [ ] Task 5: Update DetectedReviewScreen — "Not a Sub" handler (AC: 1)
  - [ ] 5.1 Verify existing `handleNotSubscription` calls `dismissDetectedSubscription` (already exists from 7.4)
  - [ ] 5.2 Ensure `dismissDetectedSubscription` now also stores merchant exclusion (from Task 2.4)
  - [ ] 5.3 Add success Snackbar: "Merchant excluded from future detections"

- [ ] Task 6: Tests (AC: all)
  - [ ] 6.1 Unit tests for useBankStore new actions (fetchDismissedMerchants, undismissDetectedSubscription, merchant filtering) — co-located in `useBankStore.test.ts`
  - [ ] 6.2 Component tests for DismissedItemCard — `DismissedItemCard.test.tsx`
  - [ ] 6.3 Screen tests for DismissedItemsScreen — `DismissedItemsScreen.test.tsx` (render, empty state, undo action, error state)
  - [ ] 6.4 Update DetectedReviewScreen tests — verify merchant exclusion Snackbar
  - [ ] 6.5 Update SettingsScreen tests — verify "Dismissed Items" item renders with count

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

### Debug Log References

### Completion Notes List

### Change Log

### File List
