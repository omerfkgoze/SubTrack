# Story 7.5: Match Detected with Manual Subscriptions

Status: ready-for-dev

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

- [ ] **Task 1: Matching Algorithm Utility** (AC: #1, #6)
  - [ ] 1.1: Create `src/features/bank/utils/matchingUtils.ts` with:
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
  - [ ] 1.2: Implement matching logic:
    - **Name similarity**: Normalize both names (lowercase, trim, remove common suffixes like "subscription", "premium", "monthly"). Use simple substring/includes check — if either name contains the other, or Levenshtein-like similarity. Keep it simple: `normalizedDetected.includes(normalizedManual) || normalizedManual.includes(normalizedDetected)`. Score: 0.5 if name matches.
    - **Amount proximity**: `Math.abs(detected.amount - subscription.price) / Math.max(detected.amount, subscription.price) <= 0.10`. Score: 0.3 if amount within ±10%.
    - **Billing cycle match**: `detected.frequency === subscription.billing_cycle`. Score: 0.2 if cycles match.
    - **Total score**: Sum of matched criteria scores. Threshold for suggesting a match: ≥ 0.5 (at minimum name must match).
    - Only return the best match per detected subscription (highest score).
  - [ ] 1.3: Create `src/features/bank/utils/matchingUtils.test.ts` with tests for: exact name match, partial name match (e.g. "Netflix" vs "Netflix Premium"), amount within tolerance, amount outside tolerance, cycle match/mismatch, combined scoring, no match found, multiple subscriptions with best match selection.

- [ ] **Task 2: `useBankStore` — Add Match State and Actions** (AC: #1, #3, #4, #5)
  - [ ] 2.1: Add new state to `useBankStore`:
    ```typescript
    // New state
    matchResults: Map<string, MatchResult>; // detectedId -> match info
    isMatching: boolean;
    ```
  - [ ] 2.2: Add `computeMatches()` action:
    ```typescript
    computeMatches: () => void;
    // 1. Get current detectedSubscriptions from own state
    // 2. Get subscriptions from useSubscriptionStore.getState().subscriptions
    // 3. Call findMatches() utility
    // 4. Set matchResults map
    ```
  - [ ] 2.3: Add `confirmMatch(detectedId: string)` action:
    ```typescript
    confirmMatch: (detectedId: string) => Promise<void>;
    // 1. Get matchResult from matchResults map
    // 2. Get detected subscription data from detectedSubscriptions array
    // 3. Update the manual subscription via useSubscriptionStore.getState().updateSubscription(matchResult.subscriptionId, { price: detected.amount, currency: detected.currency })
    // 4. Update detected_subscriptions row: status = 'matched'
    // 5. Remove from local detectedSubscriptions array
    // 6. Remove from matchResults map
    ```
  - [ ] 2.4: Add `replaceWithDetected(detectedId: string)` action:
    ```typescript
    replaceWithDetected: (detectedId: string) => Promise<void>;
    // 1. Get matchResult from matchResults map
    // 2. Get detected subscription data
    // 3. Update the manual subscription with ALL detected data: name, price, billing_cycle, currency
    //    via useSubscriptionStore.getState().updateSubscription(matchResult.subscriptionId, {
    //      name: detected.merchantName,
    //      price: detected.amount,
    //      billing_cycle: detected.frequency,
    //      currency: detected.currency,
    //    })
    // 4. Update detected_subscriptions row: status = 'matched'
    // 5. Remove from local detectedSubscriptions array
    // 6. Remove from matchResults map
    ```
  - [ ] 2.5: Add `dismissMatch(detectedId: string)` action:
    ```typescript
    dismissMatch: (detectedId: string) => void;
    // 1. Remove detectedId from matchResults map
    // 2. The detected subscription remains in detectedSubscriptions array (user can still Add/Ignore/NotSub)
    ```
  - [ ] 2.6: Call `computeMatches()` at the end of `fetchDetectedSubscriptions()` — after detected subs are loaded, automatically compute matches.
  - [ ] 2.7: Add `matchResults` and `isMatching` to `partialize` exclusion list (transient data, not persisted to AsyncStorage).

- [ ] **Task 3: MatchSuggestionCard Component** (AC: #2)
  - [ ] 3.1: Create `src/features/bank/components/MatchSuggestionCard.tsx`:
    - Props: `detected: DetectedSubscription`, `match: MatchResult`, `onConfirm: () => void`, `onDismiss: () => void`, `onReplace: () => void`
    - Layout: React Native Paper `Card` (mode="elevated") with a "Possible Match" `Chip` (icon: `link`) at the top
    - **Side-by-side comparison** using two columns:
      - Left: "Detected" — merchantName, amount, currency, frequency
      - Right: "Your Subscription" — match.subscriptionName, subscription.price, subscription.billing_cycle
      - Highlight differences in **bold** or use `theme.colors.error` color for differing values
    - **Match reasons** displayed as small `Chip` components (e.g. "Name Match", "Amount Close", "Same Cycle")
    - **Actions** row: "Confirm Match" (`Button` mode="contained"), "Not a Match" (`Button` mode="outlined"), "Replace" (`Button` mode="text")
    - Accessibility: `accessibilityLabel` on card, touch targets ≥44x44
  - [ ] 3.2: Create `src/features/bank/components/MatchSuggestionCard.test.tsx` — renders detected and manual data side-by-side, highlights differences, action buttons trigger callbacks, match reason chips displayed.

- [ ] **Task 4: Update DetectedReviewScreen** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] 4.1: Import `MatchSuggestionCard` and `matchResults` from `useBankStore`.
  - [ ] 4.2: In the FlatList `renderItem`, check if `matchResults.has(item.id)`:
    - If match exists → render `MatchSuggestionCard` instead of `DetectedReviewCard`
    - If no match → render `DetectedReviewCard` as before (Story 7.4 behavior)
  - [ ] 4.3: Sort order: matched items first (highest match score), then unmatched items by confidence score descending.
  - [ ] 4.4: Wire up MatchSuggestionCard actions:
    - "Confirm Match" → call `confirmMatch(detectedId)` + show success Snackbar
    - "Not a Match" → call `dismissMatch(detectedId)` (card reverts to normal DetectedReviewCard)
    - "Replace" → call `replaceWithDetected(detectedId)` + show success Snackbar
  - [ ] 4.5: Handle errors from confirmMatch/replaceWithDetected with error Snackbar.
  - [ ] 4.6: Update header count to show: "{matchCount} matches, {unmatchedCount} to review" when matches exist.

- [ ] **Task 5: Update DetectedReviewScreen to Fetch Subscriptions** (AC: #1, #7)
  - [ ] 5.1: In the `useFocusEffect`, also call `useSubscriptionStore.getState().fetchSubscriptions()` before `computeMatches()` to ensure the subscription list is fresh.
  - [ ] 5.2: Ensure `computeMatches()` is called after both `fetchDetectedSubscriptions()` and `fetchSubscriptions()` complete. Use sequential awaits:
    ```typescript
    useFocusEffect(
      useCallback(() => {
        const load = async () => {
          await fetchDetectedSubscriptions();
          await useSubscriptionStore.getState().fetchSubscriptions();
          computeMatches();
        };
        load();
      }, [])
    );
    ```

- [ ] **Task 6: Tests** (AC: #1–#7)
  - [ ] 6.1: `src/features/bank/utils/matchingUtils.test.ts` — matching algorithm unit tests (see Task 1.3).
  - [ ] 6.2: `src/features/bank/components/MatchSuggestionCard.test.tsx` — component render and action tests (see Task 3.2).
  - [ ] 6.3: Update `src/shared/stores/useBankStore.test.ts`:
    - Test `computeMatches()` — finds matches between detected and manual subscriptions
    - Test `confirmMatch()` — updates manual subscription + sets detected status to 'matched' + removes from arrays
    - Test `replaceWithDetected()` — updates manual subscription with all detected data + sets status to 'matched'
    - Test `dismissMatch()` — removes from matchResults but keeps detected sub in list
    - Test error handling for confirmMatch/replaceWithDetected failures
  - [ ] 6.4: Update `src/features/bank/screens/DetectedReviewScreen.test.tsx`:
    - Test matched item renders MatchSuggestionCard
    - Test unmatched item renders DetectedReviewCard
    - Test "Confirm Match" action flow
    - Test "Not a Match" reverts to normal card
    - Test "Replace" action flow
    - Test sort order (matched first, then by confidence)
    - Test header shows match count
  - [ ] 6.5: Co-locate all tests with source files. No `__tests__/` directories.

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
