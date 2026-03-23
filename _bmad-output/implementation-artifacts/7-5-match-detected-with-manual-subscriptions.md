# Story 7.5: Match Detected with Manual Subscriptions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to match auto-detected transactions with my existing manual subscriptions,
so that I avoid duplicates and can verify my tracking is accurate.

## Acceptance Criteria

1. **AC1: Automatic Match Detection**
   - **Given** the user has both manual subscriptions and detected subscriptions (status = `'detected'`)
   - **When** the DetectedReviewScreen loads or a new detection completes
   - **Then** potential matches are identified based on: similar merchant name (fuzzy match), similar amount (±10%), and similar billing cycle
   - **And** matched detected subscriptions show a "Possible Match" indicator with the linked manual subscription name

2. **AC2: Match Suggestion Card UI**
   - **Given** a detected subscription has a potential match with a manual subscription
   - **When** the user views it on the DetectedReviewScreen
   - **Then** both items are shown side-by-side (detected vs. manual) with differences highlighted
   - **And** the user can: "Confirm Match" (link them), "Not a Match" (dismiss suggestion), or "Replace" (update manual subscription with detected data)

3. **AC3: Confirm Match Action**
   - **Given** the user taps "Confirm Match" on a match suggestion
   - **When** the action is saved
   - **Then** the manual subscription is updated with real transaction data: actual amount (from `detected.amount`), actual last seen date
   - **And** the `detected_subscriptions` row status is updated to `'matched'`
   - **And** the card is removed from the review list
   - **And** a success Snackbar is shown: "Subscription matched successfully!"

4. **AC4: Not a Match Action**
   - **Given** the user taps "Not a Match" on a match suggestion
   - **When** the action is confirmed (immediate, no dialog)
   - **Then** the match suggestion is dismissed but the detected subscription remains in the review list as a normal (unmatched) card
   - **And** the user can still "Add", "Ignore", or "Not a Subscription" on it as before (Story 7.4 actions)

5. **AC5: Replace Manual with Detected Data**
   - **Given** the user taps "Replace" on a match suggestion
   - **When** the action is saved
   - **Then** the manual subscription's name, price, billing_cycle, and currency are updated with the detected values
   - **And** the `detected_subscriptions` row status is updated to `'matched'`
   - **And** the card is removed from the review list
   - **And** a success Snackbar is shown: "Subscription updated with bank data!"

6. **AC6: No Matches Found**
   - **Given** no detected subscriptions have potential matches with manual subscriptions
   - **When** the DetectedReviewScreen loads
   - **Then** all detected subscriptions display as normal review cards (Story 7.4 behavior, no match indicators)

7. **AC7: Matching Runs on Detection Completion**
   - **Given** a new bank scan completes (Story 7.3) and new detected subscriptions are inserted
   - **When** the user navigates to DetectedReviewScreen
   - **Then** matching is computed client-side against the current subscription list
   - **And** match suggestions are shown inline on relevant detected cards

## Tasks / Subtasks

- [x] **Task 1: Matching Algorithm Utility** (AC: #1, #6)
  - [x] 1.1: Create `src/features/bank/utils/matchingUtils.ts` with:
    ```typescript
    export interface MatchResult {
      detectedId: string;
      subscriptionId: string;
      subscriptionName: string;
      matchScore: number; // 0.0 - 1.0
      matchReasons: string[]; // e.g. ['name_similar', 'amount_close', 'cycle_match']
    }

    export function findMatches(
      detected: DetectedSubscription[],
      subscriptions: Subscription[]
    ): Map<string, MatchResult>
    // Returns Map keyed by detectedId -> best match
    ```
  - [x] 1.2: Implement matching logic:
    - **Name similarity**: Normalize both names (lowercase, trim, remove common suffixes like "subscription", "premium", "monthly"). Use simple substring/includes check — if either name contains the other, or Levenshtein-like similarity. Keep it simple: `normalizedDetected.includes(normalizedManual) || normalizedManual.includes(normalizedDetected)`. Score: 0.5 if name matches.
    - **Amount proximity**: `Math.abs(detected.amount - subscription.price) / Math.max(detected.amount, subscription.price) <= 0.10`. Score: 0.3 if amount within ±10%.
    - **Billing cycle match**: `detected.frequency === subscription.billing_cycle`. Score: 0.2 if cycles match.
    - **Total score**: Sum of matched criteria scores. Threshold for suggesting a match: ≥ 0.5 (at minimum name must match).
    - Only return the best match per detected subscription (highest score).
  - [x] 1.3: Create `src/features/bank/utils/matchingUtils.test.ts` with tests for: exact name match, partial name match (e.g. "Netflix" vs "Netflix Premium"), amount within tolerance, amount outside tolerance, cycle match/mismatch, combined scoring, no match found, multiple subscriptions with best match selection.

- [x] **Task 2: `useBankStore` — Add Match State and Actions** (AC: #1, #3, #4, #5)
  - [x] 2.1: Add new state to `useBankStore`:
    ```typescript
    // New state
    matchResults: Map<string, MatchResult>; // detectedId -> match info
    isMatching: boolean;
    ```
  - [x] 2.2: Add `computeMatches()` action
  - [x] 2.3: Add `confirmMatch(detectedId: string)` action
  - [x] 2.4: Add `replaceWithDetected(detectedId: string)` action
  - [x] 2.5: Add `dismissMatch(detectedId: string)` action
  - [x] 2.6: Call `computeMatches()` at the end of `fetchDetectedSubscriptions()`
  - [x] 2.7: Add `matchResults` and `isMatching` to `partialize` exclusion list

- [x] **Task 3: MatchSuggestionCard Component** (AC: #2)
  - [x] 3.1: Create `src/features/bank/components/MatchSuggestionCard.tsx`
  - [x] 3.2: Create `src/features/bank/components/MatchSuggestionCard.test.tsx`

- [x] **Task 4: Update DetectedReviewScreen** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 4.1: Import `MatchSuggestionCard` and `matchResults` from `useBankStore`.
  - [x] 4.2: Conditional renderItem: MatchSuggestionCard for matches, DetectedReviewCard for unmatched
  - [x] 4.3: Sort order: matched items first (highest match score), then unmatched by confidence score desc
  - [x] 4.4: Wire up MatchSuggestionCard actions with success Snackbars
  - [x] 4.5: Error Snackbar handling for confirmMatch/replaceWithDetected failures
  - [x] 4.6: Header count: "{matchCount} matches, {unmatchedCount} to review" when matches exist

- [x] **Task 5: Update DetectedReviewScreen to Fetch Subscriptions** (AC: #1, #7)
  - [x] 5.1: In the `useFocusEffect`, also call `useSubscriptionStore.getState().fetchSubscriptions()` before `computeMatches()`
  - [x] 5.2: Sequential awaits: fetchDetectedSubscriptions → fetchSubscriptions → computeMatches

- [x] **Task 6: Tests** (AC: #1–#7)
  - [x] 6.1: `src/features/bank/utils/matchingUtils.test.ts` — 24 tests passing
  - [x] 6.2: `src/features/bank/components/MatchSuggestionCard.test.tsx` — 16 tests passing
  - [x] 6.3: Updated `src/shared/stores/useBankStore.test.ts` — 48 tests passing (19 new)
  - [x] 6.4: Updated `src/features/bank/screens/DetectedReviewScreen.test.tsx` — 25 tests passing (13 new)
  - [x] 6.5: All tests co-located with source files. No `__tests__/` directories.

## Dev Notes

### Architecture Decision: Client-Side Matching (Not Edge Function)

Matching logic runs entirely client-side because:
- Both data sources (manual subscriptions + detected subscriptions) are already in client memory (Zustand stores)
- Matching is a lightweight comparison (typically <20 items on each side)
- No need for server round-trips — improves UX responsiveness
- The matching result is transient (recomputed on each screen focus, not persisted)

The only server interaction is when the user **acts** on a match (confirm/replace) — which updates both the `subscriptions` table (via `useSubscriptionStore.updateSubscription`) and the `detected_subscriptions` table (status → `'matched'`).

### Matching Algorithm Design

Keep it simple and deterministic:
1. **Normalize names**: lowercase, trim whitespace, strip common suffixes ("subscription", "premium", "plus", "monthly", "yearly")
2. **Name check**: `normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)` — covers "Netflix" matching "Netflix Premium" and "Spotify" matching "Spotify"
3. **Amount check**: `|a - b| / max(a, b) <= 0.10` — allows small price differences (tax rounding, currency conversion)
4. **Cycle check**: direct equality (`monthly === monthly`)
5. **Scoring**: name=0.5, amount=0.3, cycle=0.2. Threshold ≥ 0.5 means at minimum the name must match.

Do NOT use Levenshtein distance or any external string similarity library. The simple includes-based check is sufficient for real subscription names and avoids adding dependencies.

### State Management

```
useBankStore:
  matchResults: Map<string, MatchResult>  // transient, recomputed on focus
  isMatching: boolean

Flow:
  fetchDetectedSubscriptions() → fetchSubscriptions() → computeMatches()
  → matchResults populated
  → DetectedReviewScreen renders MatchSuggestionCard for matched items
```

`matchResults` is a `Map<string, MatchResult>` keyed by `detectedId`. This is NOT persisted to AsyncStorage (add to `partialize` exclusion). It is recomputed each time the screen gains focus.

### Cross-Store Communication

Story 7.5 is the first time `useBankStore` needs to read from AND write to `useSubscriptionStore`. Use `getState()` for cross-store access:
```typescript
// Reading subscriptions for matching
const subs = useSubscriptionStore.getState().subscriptions;

// Updating subscription on confirm/replace
await useSubscriptionStore.getState().updateSubscription(subId, updates);
```

This pattern is already used in Story 7.4 where `DetectedReviewScreen` reads from `usePremiumStore`. Do NOT create a new combined store.

### Navigation — No New Routes Needed

Story 7.5 does NOT add new screens or routes. All changes happen within the existing `DetectedReviewScreen`:
- Matched items render `MatchSuggestionCard` instead of `DetectedReviewCard`
- Unmatched items continue to render `DetectedReviewCard` (Story 7.4 behavior preserved)

### Side-by-Side Comparison Layout

Use a simple two-column `View` with `flexDirection: 'row'`:
```
┌──────────────────────────────────────────┐
│  🔗 Possible Match                       │
├──────────────────────────────────────────┤
│  Detected          │  Your Subscription  │
│  Netflix           │  Netflix Premium    │
│  €12.99/mo         │  €12.99/mo          │
│  Monthly           │  Monthly            │
├──────────────────────────────────────────┤
│  ✓ Name Match  💰 Amount Close  🔄 Same │
├──────────────────────────────────────────┤
│  [Confirm Match] [Not a Match] [Replace] │
└──────────────────────────────────────────┘
```

Differing values (e.g. name: "Netflix" vs "Netflix Premium") should be shown in `theme.colors.tertiary` or bold to draw attention.

### Supabase Query Patterns for Story 7.5

**Update detected status to matched (same pattern as approve/dismiss):**
```typescript
const { error } = await supabase
  .from('detected_subscriptions')
  .update({ status: 'matched' })
  .eq('id', detectedId)
  .eq('user_id', user.id);
```

**Update manual subscription (via existing store action):**
```typescript
await useSubscriptionStore.getState().updateSubscription(subscriptionId, {
  price: detected.amount,
  currency: detected.currency,
  // For "Replace": also name, billing_cycle
});
```

### Previous Story Intelligence (Story 7.4)

1. **DetectedReviewScreen already has FlatList rendering** with confidence sort, loading/empty states, and Snackbar feedback. Extend this, don't rewrite.
2. **`approveDetectedSubscription` / `dismissDetectedSubscription` patterns** in useBankStore show exactly how to update `detected_subscriptions` status. Follow the same pattern for `confirmMatch` and `replaceWithDetected` (status → `'matched'`).
3. **`fetchDetectedSubscriptions()` already filters `status = 'detected'`** — matched items (status='matched') won't reappear after re-fetch.
4. **749 tests passing** as of Story 7.4 completion. Do not break any existing tests.
5. **Co-located tests** — all test files live next to their source files. No `__tests__/` directories.
6. **`partialize` in useBankStore** already excludes `detectedSubscriptions`. Add `matchResults` and `isMatching` to the exclusion list too.
7. **AddPrefillParams and pre-fill flow** exist from Story 7.4. Story 7.5 does NOT modify AddSubscriptionScreen — "Confirm Match" and "Replace" update existing subscriptions, they don't create new ones.

### What NOT to Do

- **DO NOT** create an Edge Function for matching — matching runs client-side
- **DO NOT** add a Levenshtein distance library — simple includes-based name matching is sufficient
- **DO NOT** persist matchResults to AsyncStorage — transient data recomputed on screen focus
- **DO NOT** create a new store — extend existing `useBankStore`
- **DO NOT** create new screens or navigation routes — all UI changes are within DetectedReviewScreen
- **DO NOT** modify `detected_subscriptions` table schema — the `'matched'` status value is already in the CHECK constraint
- **DO NOT** auto-match without user confirmation — always present match suggestions for user action
- **DO NOT** modify AddSubscriptionScreen — Story 7.5 only updates existing subscriptions
- **DO NOT** create new feature folders — all files go in `src/features/bank/`
- **DO NOT** modify any Edge Functions — this is a client-only story
- **DO NOT** implement "future transactions auto-update" from the epic — that is a future enhancement, not in scope

### Network Failure Handling

| Scenario | Supabase returns | User sees | Retry |
|----------|-----------------|-----------|-------|
| Confirm match success | `{ error: null }` on both updates | Card removed + "Subscription matched!" Snackbar | N/A |
| Confirm match failure | `{ error }` on subscription update or detected update | "Failed to confirm match. Please try again." Snackbar | Tap again |
| Replace success | `{ error: null }` on both updates | Card removed + "Subscription updated with bank data!" Snackbar | N/A |
| Replace failure | `{ error }` | "Failed to update. Please try again." Snackbar | Tap again |
| Dismiss match | N/A (local only) | Card reverts to normal DetectedReviewCard | N/A |

### Testing Pattern

**Jest mocks (same pattern as existing bank tests):**
```typescript
jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    })),
  },
}));
```

**Mock useSubscriptionStore for cross-store tests:**
```typescript
jest.mock('@shared/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: {
    getState: jest.fn(() => ({
      subscriptions: mockSubscriptions,
      updateSubscription: jest.fn().mockResolvedValue(true),
      fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));
```

### Project Structure Notes

- New utility: `src/features/bank/utils/matchingUtils.ts`
- New component: `src/features/bank/components/MatchSuggestionCard.tsx`
- Modified: `src/shared/stores/useBankStore.ts` (new state + actions)
- Modified: `src/features/bank/screens/DetectedReviewScreen.tsx` (conditional rendering + match actions)
- New tests: `src/features/bank/utils/matchingUtils.test.ts`, `src/features/bank/components/MatchSuggestionCard.test.tsx`
- Modified tests: `src/shared/stores/useBankStore.test.ts`, `src/features/bank/screens/DetectedReviewScreen.test.tsx`
- No new screens, routes, migrations, or Edge Functions

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.5] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#FR44] — Match detected transactions with existing manual subscriptions
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture] — Zustand pattern, feature structure
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Fuzzy match warning for duplicate prevention
- [Source: _bmad-output/implementation-artifacts/7-4-review-approve-detected-subscriptions.md] — Previous story patterns, store actions, test patterns
- [Source: supabase/migrations/20260322200000_create_detected_subscriptions.sql] — Table schema with 'matched' status in CHECK constraint
- [Source: src/shared/stores/useBankStore.ts] — Current store state and actions
- [Source: src/shared/stores/useSubscriptionStore.ts] — Subscription store with updateSubscription action

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Pre-Implementation: Demo Bank Mode (Mock Layer)

**Problem**: Tink sandbox/console does not provide realistic demo credentials for subscription detection, scanning, and matching scenarios. This makes it impossible to manually test Epic 7 features end-to-end in the app.

**Solution**: A mock data layer was added that bypasses all Tink API calls and Supabase queries when `EXPO_PUBLIC_DEMO_BANK_MODE=true` is set in `.env`.

**How it works**:
- When `env.DEMO_BANK_MODE` is `true`, every `useBankStore` action returns mock data instead of calling Supabase/Tink edge functions.
- Mock data includes: 1 active bank connection, 10 realistic detected subscriptions (Netflix, Spotify, iCloud, YouTube Premium, ChatGPT Plus, gym, Adobe CC, Xbox Game Pass, Medium, Cloudflare), and 10 supported banks across SE/DE/GB/NL/FR/TR markets.
- Network delays are simulated with `mockDelay()` to preserve realistic UX timing.
- `fetchDetectedSubscriptions()` in demo mode preserves local state so approve/dismiss actions work correctly within a session.

**Developer instructions for Story 7.5 implementation**:
1. Set `EXPO_PUBLIC_DEMO_BANK_MODE=true` in `.env` to enable mock mode.
2. All store actions (`fetchConnections`, `createLinkSession`, `initiateConnection`, `detectSubscriptions`, `fetchDetectedSubscriptions`, `approveDetectedSubscription`, `dismissDetectedSubscription`, `fetchSupportedBanks`) work with mock data in this mode.
3. The mock detected subscriptions include variety: different confidence scores (0.65–0.95), multiple currencies (EUR/USD), monthly and yearly frequencies — ideal for testing the matching algorithm.
4. To add more mock subscriptions for testing edge cases, edit `src/features/bank/mocks/mockBankData.ts`.
5. When Story 7.5 adds `confirmMatch`, `replaceWithDetected`, and `dismissMatch` actions to `useBankStore`, add corresponding demo mode branches following the same pattern (early return with `mockDelay` + local state update).
6. Set `EXPO_PUBLIC_DEMO_BANK_MODE=false` (or remove the line) to use real Tink API.

**Files changed**:
- `src/config/env.ts` — Added `DEMO_BANK_MODE: boolean` to Env interface
- `.env` — Added `EXPO_PUBLIC_DEMO_BANK_MODE=true`
- `.env.example` — Added commented-out `EXPO_PUBLIC_DEMO_BANK_MODE` reference
- `src/features/bank/mocks/mockBankData.ts` — **NEW** — Mock data: connection, 10 detected subscriptions, 10 supported banks, detection result, mockDelay helper
- `src/shared/stores/useBankStore.ts` — Added demo mode early-return branches to all 8 actions
- `src/shared/stores/useBankStore.test.ts` — Added `@config/env` and `@features/bank/mocks/mockBankData` mocks for test compatibility

**Test status**: 749/749 passing (no regressions)

### Completion Notes List

- ✅ Implemented client-side matching algorithm (`matchingUtils.ts`) with name normalization, amount ±10% check, cycle match scoring (name=0.5, amount=0.3, cycle=0.2, threshold ≥0.5 with name required)
- ✅ Extended `useBankStore` with `matchResults: Map<string, MatchResult>`, `isMatching`, `computeMatches()`, `confirmMatch()`, `replaceWithDetected()`, `dismissMatch()` — all with demo mode support
- ✅ Created `MatchSuggestionCard` component with side-by-side comparison, difference highlighting via `theme.colors.tertiary`, match reason chips, and accessible action buttons (≥44px)
- ✅ Updated `DetectedReviewScreen`: sequential `fetchDetectedSubscriptions → fetchSubscriptions → computeMatches` on focus, conditional rendering (MatchSuggestionCard vs DetectedReviewCard), matched-first sort order, updated header count
- ✅ 821/821 tests passing (72 new tests added, 0 regressions from 749 baseline)
- ✅ `matchResults` and `isMatching` excluded from AsyncStorage persist (transient data)
- ✅ No new screens, routes, edge functions, or store created — all within existing `src/features/bank/`

### File List

- `src/features/bank/utils/matchingUtils.ts` — NEW
- `src/features/bank/utils/matchingUtils.test.ts` — NEW
- `src/features/bank/components/MatchSuggestionCard.tsx` — NEW
- `src/features/bank/components/MatchSuggestionCard.test.tsx` — NEW
- `src/shared/stores/useBankStore.ts` — MODIFIED (new state, 4 new actions, computeMatches call in fetchDetectedSubscriptions)
- `src/shared/stores/useBankStore.test.ts` — MODIFIED (19 new tests, mock setup for useSubscriptionStore + matchingUtils)
- `src/features/bank/screens/DetectedReviewScreen.tsx` — MODIFIED (match rendering, sort order, header, new handlers, sequential focus effect)
- `src/features/bank/screens/DetectedReviewScreen.test.tsx` — MODIFIED (13 new tests for match flows)

## Change Log

- 2026-03-23: Implemented Story 7.5 — Match Detected with Manual Subscriptions. Added client-side matching algorithm, MatchSuggestionCard component, extended useBankStore with match state/actions, updated DetectedReviewScreen with conditional rendering and match action flows. 72 new tests (821 total, 0 regressions).
- 2026-03-23: Code review fixes — (1) confirmMatch/replaceWithDetected now clear detectionError at start to prevent stale error snackbar on retry; (2) demo mode confirmMatch/replaceWithDetected now call updateSubscription for complete simulation; (3) MatchSuggestionCard divider color switched from hardcoded #e0e0e0 to theme.colors.outlineVariant.
