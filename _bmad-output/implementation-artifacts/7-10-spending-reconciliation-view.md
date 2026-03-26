# Story 7.10: Spending Reconciliation View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see the difference between my tracked subscriptions and actual bank spending,
so that I can identify subscriptions I might have missed.

## Acceptance Criteria

### AC1: Reconciliation Comparison Display
- **Given** the user has both manual subscriptions and bank transaction data (detected subscriptions)
- **When** they navigate to a "Reconciliation" view (accessible from Dashboard or Settings)
- **Then** a comparison is displayed: total tracked (manual) vs. total detected (bank) subscription spending
- **And** unmatched bank transactions that look like subscriptions are highlighted
- **And** the difference amount is shown prominently

### AC2: Unmatched Recurring Transactions List
- **Given** there are unmatched recurring transactions (detected subscriptions with status `'detected'` — not `'approved'`, `'matched'`, or `'dismissed'`)
- **When** the user views the reconciliation
- **Then** each unmatched transaction shows: merchant name, amount, frequency
- **And** a CTA allows them to add it to their subscription list (navigate to add flow pre-filled) or dismiss it

### AC3: Perfect Match Confirmation
- **Given** tracked and detected amounts match perfectly (difference is zero or negligible ≤ €0.50)
- **When** the reconciliation view loads
- **Then** a positive confirmation is displayed: "Your tracking is 100% accurate!"

## Tasks / Subtasks

- [x] Task 1: Create ReconciliationScreen and types (AC: 1, 2, 3)
  - [x] 1.1 Create `src/features/bank/types/reconciliation.ts` with `ReconciliationSummary` interface: `{ trackedTotal: number, detectedTotal: number, difference: number, unmatchedDetected: DetectedSubscription[], isFullyReconciled: boolean }`
  - [x] 1.2 Create `src/features/bank/utils/reconciliationUtils.ts` with `computeReconciliation(subscriptions, detectedSubscriptions)` pure function
  - [x] 1.3 Create `src/features/bank/utils/reconciliationUtils.test.ts` — unit tests for the computation

- [x] Task 2: Create ReconciliationSummaryCard component (AC: 1, 3)
  - [x] 2.1 Create `src/features/bank/components/ReconciliationSummaryCard.tsx`
  - [x] 2.2 Display: "Tracked: €X/mo" vs "Detected: €X/mo" with difference amount
  - [x] 2.3 Use green checkmark + "Your tracking is 100% accurate!" when `isFullyReconciled`
  - [x] 2.4 Use amber/red warning with difference amount when not reconciled
  - [x] 2.5 Create `ReconciliationSummaryCard.test.tsx`

- [x] Task 3: Create UnmatchedTransactionCard component (AC: 2)
  - [x] 3.1 Create `src/features/bank/components/UnmatchedTransactionCard.tsx`
  - [x] 3.2 Show merchant name, amount, frequency for each unmatched detected subscription
  - [x] 3.3 "Add to Subscriptions" button — navigate to AddSubscription screen pre-filled with merchant data
  - [x] 3.4 "Dismiss" button — call `dismissDetectedSubscription(id)` from `useBankStore`
  - [x] 3.5 Create `UnmatchedTransactionCard.test.tsx`

- [x] Task 4: Create ReconciliationScreen (AC: 1, 2, 3)
  - [x] 4.1 Create `src/features/bank/screens/ReconciliationScreen.tsx`
  - [x] 4.2 Use `useFocusEffect` to fetch subscriptions + detected subscriptions on focus
  - [x] 4.3 Compute reconciliation via `computeReconciliation()` — no new store action needed, compute in screen
  - [x] 4.4 Layout: `ReconciliationSummaryCard` at top, then `FlatList` of `UnmatchedTransactionCard` items
  - [x] 4.5 Handle loading, empty (no bank connection), and populated states
  - [x] 4.6 Snackbar feedback for dismiss actions

- [x] Task 5: Navigation integration (AC: 1)
  - [x] 5.1 Add `Reconciliation` to `SettingsStackParamList` in `src/app/navigation/types.ts`
  - [x] 5.2 Add `<Stack.Screen name="Reconciliation" component={ReconciliationScreen} />` to `SettingsStack.tsx`
  - [x] 5.3 Add navigation entry point: a "Reconciliation" card/button in `BankConnectionStatusScreen` or a new row in Settings
  - [ ] 5.4 Optionally add a shortcut from HomeScreen dashboard (e.g., in the bank status section)

- [x] Task 6: Tests (AC: all)
  - [x] 6.1 Unit tests for `reconciliationUtils` (covered in 1.3)
  - [x] 6.2 Component tests for `ReconciliationSummaryCard` (covered in 2.5)
  - [x] 6.3 Component tests for `UnmatchedTransactionCard` (covered in 3.5)
  - [x] 6.4 Screen test for `ReconciliationScreen` — loading state, reconciled state, unmatched items display

## Dev Notes

### Existing Code to Reuse — DO NOT Reinvent
- **`useBankStore`** (`src/shared/stores/useBankStore.ts`): Already has `detectedSubscriptions`, `fetchDetectedSubscriptions()`, `dismissDetectedSubscription(id)`. Read detected subs from here — do NOT create a new store.
- **`useSubscriptionStore`** (`src/shared/stores/useSubscriptionStore.ts`): Already has `subscriptions`, `fetchSubscriptions()`. Read tracked subs from here.
- **`matchingUtils.ts`** (`src/features/bank/utils/matchingUtils.ts`): Has `findMatches()` and `normalizeName()`. You may use `findMatches` to identify which detected subs are already matched, but do NOT duplicate matching logic.
- **`DetectedReviewScreen`** (`src/features/bank/screens/DetectedReviewScreen.tsx`): Follow the same screen pattern — `useFocusEffect`, loading/empty/populated states, `FlatList`, snackbar.
- **`DetectedReviewCard`** (`src/features/bank/components/DetectedReviewCard.tsx`): Pattern for displaying detected subscription info in a card.
- **`MatchSuggestionCard`** (`src/features/bank/components/MatchSuggestionCard.tsx`): Side-by-side comparison pattern.
- **`ConnectionStatusCard`** (`src/features/bank/components/ConnectionStatusCard.tsx`): Card styling with status colors.

### Architecture Patterns to Follow
- **Feature location**: All new files under `src/features/bank/` — this is a bank feature, NOT a new feature module.
- **Screen pattern**: `useFocusEffect` → fetch data → compute derived state → render. NO new store actions for derived data — compute in the screen or a utility function.
- **Navigation**: Register in `SettingsStack.tsx` alongside other bank screens. Add to `SettingsStackParamList` type.
- **Component pattern**: React Native Paper components (`Card`, `Text`, `Button`, `Divider`). Use `useTheme()` for colors.
- **Store reads**: `useBankStore((s) => s.detectedSubscriptions)` and `useSubscriptionStore((s) => s.subscriptions)`. Read from both stores in the screen.
- **Database**: No new tables or migrations needed. All data already exists in `subscriptions` and `detected_subscriptions` tables. Reconciliation is a pure client-side computation.
- **Tests**: Co-located `*.test.tsx` files, Jest + React Native Testing Library.

### Key Implementation Details

**reconciliationUtils.ts — Core computation:**
```typescript
import { Subscription } from '@shared/types';
import { DetectedSubscription } from '@features/bank/types';

export interface ReconciliationSummary {
  trackedTotal: number;       // Sum of active subscriptions (monthly-normalized)
  detectedTotal: number;      // Sum of detected subs (status='detected' or 'approved', monthly-normalized)
  difference: number;         // detectedTotal - trackedTotal
  unmatchedDetected: DetectedSubscription[];  // status='detected' only (not approved/matched/dismissed)
  isFullyReconciled: boolean; // Math.abs(difference) <= 0.50
}

// Normalize all amounts to monthly for fair comparison
function normalizeToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

export function computeReconciliation(
  subscriptions: Subscription[],
  detectedSubscriptions: DetectedSubscription[]
): ReconciliationSummary {
  const activeSubscriptions = subscriptions.filter(s => s.isActive);
  const trackedTotal = activeSubscriptions.reduce(
    (sum, s) => sum + normalizeToMonthly(s.price, s.billingCycle), 0
  );

  // Include detected + approved (not dismissed/matched — those are resolved)
  const relevantDetected = detectedSubscriptions.filter(
    d => d.status === 'detected' || d.status === 'approved'
  );
  const detectedTotal = relevantDetected.reduce(
    (sum, d) => sum + normalizeToMonthly(d.amount, d.frequency), 0
  );

  // Also add matched detected subs to detected total (they're confirmed real)
  const matchedDetected = detectedSubscriptions.filter(d => d.status === 'matched');
  const matchedTotal = matchedDetected.reduce(
    (sum, d) => sum + normalizeToMonthly(d.amount, d.frequency), 0
  );

  const totalDetectedSpending = detectedTotal + matchedTotal;
  const difference = totalDetectedSpending - trackedTotal;

  const unmatchedDetected = detectedSubscriptions.filter(d => d.status === 'detected');

  return {
    trackedTotal: Math.round(trackedTotal * 100) / 100,
    detectedTotal: Math.round(totalDetectedSpending * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    unmatchedDetected,
    isFullyReconciled: Math.abs(difference) <= 0.50 && unmatchedDetected.length === 0,
  };
}
```

**ReconciliationScreen layout pattern:**
```typescript
// src/features/bank/screens/ReconciliationScreen.tsx
// Follow DetectedReviewScreen pattern exactly:
// - useFocusEffect to fetch data from both stores
// - Loading state: ActivityIndicator
// - No bank connection: empty state with CTA to connect
// - No detected subs: "Connect your bank to see reconciliation"
// - Populated: ReconciliationSummaryCard + FlatList of UnmatchedTransactionCard
```

**Navigation entry point — add to BankConnectionStatusScreen:**
```typescript
// In BankConnectionStatusScreen, add a "Reconciliation" button/card
// that navigates to the new Reconciliation screen
// e.g., a Card with "View Spending Reconciliation" → navigation.navigate('Reconciliation')
```

**"Add to Subscriptions" from UnmatchedTransactionCard:**
```typescript
// Navigate to the AddSubscription screen with pre-filled data
// Check how DetectedReviewCard handles "Add to My Subscriptions" — it calls approveDetectedSubscription
// For reconciliation, use the same pattern:
// navigation.navigate('AddSubscription', {
//   prefill: { name: item.merchantName, price: item.amount, billingCycle: item.frequency }
// })
// OR call approveDetectedSubscription(id) which marks it as 'approved' and lets the existing
// review flow handle it. Check which approach the existing codebase uses.
```

### Previous Story (7.9) Learnings
- **Clear error state on action start** — apply to any loading states.
- **Demo mode**: Check `env.DEMO_BANK_MODE`, use `mockDelay()`, read from `useBankStore.connections` which includes mock connections. The reconciliation view should work in demo mode — detected subs from mock data should appear.
- **`useFocusEffect` pattern** — already established in HomeScreen, DetectedReviewScreen. Use same pattern to fetch fresh data.
- **Banner patterns**: `BankConnectionExpiryBanner` was just added to HomeScreen — don't conflict with its placement.

### Cross-Store Communication
- `ReconciliationScreen` reads from TWO stores: `useBankStore` (detectedSubscriptions) and `useSubscriptionStore` (subscriptions).
- No cross-store writes. Reconciliation is read-only computation.
- `dismissDetectedSubscription` is the only write action, already in `useBankStore`.

### File Structure
```
src/features/bank/types/
├── reconciliation.ts                          <- CREATE (ReconciliationSummary interface)
src/features/bank/utils/
├── reconciliationUtils.ts                     <- CREATE (computeReconciliation function)
├── reconciliationUtils.test.ts                <- CREATE (unit tests)
src/features/bank/components/
├── ReconciliationSummaryCard.tsx               <- CREATE (summary comparison card)
├── ReconciliationSummaryCard.test.tsx           <- CREATE (component tests)
├── UnmatchedTransactionCard.tsx                <- CREATE (unmatched item card)
├── UnmatchedTransactionCard.test.tsx            <- CREATE (component tests)
src/features/bank/screens/
├── ReconciliationScreen.tsx                    <- CREATE (main screen)
├── ReconciliationScreen.test.tsx               <- CREATE (screen tests)
src/app/navigation/
├── types.ts                                    <- MODIFY (add Reconciliation to SettingsStackParamList)
├── SettingsStack.tsx                           <- MODIFY (add Reconciliation screen)
src/features/bank/screens/
├── BankConnectionStatusScreen.tsx              <- MODIFY (add navigation to Reconciliation)
```

### UX Notes
- **Summary card**: Prominent display of tracked vs detected totals. Use `react-native-paper` `Card` with large text for amounts.
- **Difference display**: Green for match (icon: `check-circle`), amber/red for mismatch (icon: `alert-circle`). Follow existing color scheme: green `#10B981`, amber `#F59E0B`, red `#EF4444`.
- **Unmatched items**: Card-based list similar to `DetectedReviewCard`. Two action buttons: "Add" (primary) and "Dismiss" (outline/secondary).
- **Empty state**: If no bank connection exists, show explanation with CTA to connect bank. If bank connected but no detected subs, show "No transactions detected yet".
- **100% accurate state (AC3)**: Celebratory green card with checkmark icon and "Your tracking is 100% accurate!" message.
- **Frequency normalization**: All amounts normalized to monthly for comparison. Display as "€X/mo".

### Project Structure Notes
- All files under existing `src/features/bank/` — no new feature module needed.
- New screen registered in `SettingsStack` alongside existing bank screens.
- No new database tables or migrations — pure client-side computation.
- Types file `reconciliation.ts` is small enough to be separate from main bank types.

### References
- [Source: epics.md — Epic 7, Story 7.10 Acceptance Criteria]
- [Source: architecture.md — Zustand Store Pattern, Screen Pattern, Navigation Structure]
- [Source: ux-design-specification.md — Phase 2 reconciliation mention, color scheme]
- [Source: DetectedReviewScreen.tsx — Screen pattern with useFocusEffect, FlatList, snackbar]
- [Source: matchingUtils.ts — findMatches(), normalizeName() for reference]
- [Source: useBankStore.ts — detectedSubscriptions state, dismissDetectedSubscription action]
- [Source: useSubscriptionStore.ts — subscriptions state, fetchSubscriptions action]
- [Source: 7-9-bank-connection-expiry-notifications.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `ReconciliationSummary` interface in `src/features/bank/types/reconciliation.ts`
- Implemented `computeReconciliation()` pure function with monthly normalization for all billing cycles (weekly ×4.33, monthly ×1, quarterly ÷3, yearly ÷12). Includes detected+approved+matched in detectedTotal; only status='detected' items are unmatchedDetected.
- `isFullyReconciled` requires both Math.abs(difference) <= 0.50 AND unmatchedDetected.length === 0
- `is_active=null` is treated as active (consistent with existing `!== false` pattern in DetectedReviewScreen)
- Used `Icon` from `react-native-paper` for icons (codebase does not use direct vector-icons imports)
- Navigation entry point added as a Button in `BankConnectionStatusScreen` above the connections FlatList
- 37 new tests added across 3 test files; all 1000 tests pass

### File List

- src/features/bank/types/reconciliation.ts (created)
- src/features/bank/utils/reconciliationUtils.ts (created)
- src/features/bank/utils/reconciliationUtils.test.ts (created)
- src/features/bank/components/ReconciliationSummaryCard.tsx (created)
- src/features/bank/components/ReconciliationSummaryCard.test.tsx (created)
- src/features/bank/components/UnmatchedTransactionCard.tsx (created)
- src/features/bank/components/UnmatchedTransactionCard.test.tsx (created)
- src/features/bank/screens/ReconciliationScreen.tsx (created)
- src/features/bank/screens/ReconciliationScreen.test.tsx (created)
- src/app/navigation/types.ts (modified — added Reconciliation to SettingsStackParamList)
- src/app/navigation/SettingsStack.tsx (modified — added Reconciliation screen)
- src/features/bank/screens/BankConnectionStatusScreen.tsx (modified — added View Spending Reconciliation button)

## Change Log

- Implemented Spending Reconciliation View: ReconciliationSummary type, computeReconciliation utility, ReconciliationSummaryCard, UnmatchedTransactionCard, ReconciliationScreen, navigation integration, 37 tests added (Date: 2026-03-26)
- Code review fix: Removed misleading "/mo" suffix from UnmatchedTransactionCard amount display; raw detected amount is not monthly-normalized so the suffix was factually wrong for yearly/quarterly/weekly subs. Updated test assertion accordingly. (Date: 2026-03-26)
