# Story 7.4: Review & Approve Detected Subscriptions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to review auto-detected subscriptions before they're added to my list,
so that I have full control over what gets tracked.

## Acceptance Criteria

1. **AC1: Detected Subscriptions Review Screen**
   - **Given** subscriptions have been auto-detected (status = `'detected'` in `detected_subscriptions` table)
   - **When** the user opens the "Detected Subscriptions" screen (navigated from BankConnectionScreen)
   - **Then** each detected subscription is shown as a review card with: merchant name, amount, billing frequency, confidence score (as percentage), and last transaction date
   - **And** each card has actions: "Add to My Subscriptions", "Ignore", "Not a Subscription"
   - **And** cards are sorted by confidence score (highest first)
   - **And** the screen shows a count badge/header: "{count} Detected Subscriptions"

2. **AC2: Add to My Subscriptions**
   - **Given** the user taps "Add to My Subscriptions" on a detected subscription card
   - **When** the add subscription form screen opens
   - **Then** the form is pre-filled with: name (from `merchantName`), price (from `amount`), billing cycle (from `frequency`), currency (from `currency`)
   - **And** the user can adjust details (name, category, renewal date, etc.) before saving
   - **And** upon save, the subscription is added to the `subscriptions` table via `useSubscriptionStore.addSubscription()`
   - **And** the `detected_subscriptions` row status is updated to `'approved'`
   - **And** the card is removed from the review list
   - **And** a success Snackbar is shown: "Subscription added successfully!"

3. **AC3: Ignore Detected Subscription**
   - **Given** the user taps "Ignore" on a detected subscription card
   - **When** the action is confirmed (no extra dialog needed — immediate action)
   - **Then** the `detected_subscriptions` row status is updated to `'dismissed'`
   - **And** the card is removed from the review list with animation
   - **And** it won't be shown again unless the user resets ignored items (Story 7.6 scope)

4. **AC4: "Not a Subscription" Action**
   - **Given** the user taps "Not a Subscription" on a detected subscription card
   - **When** the action is confirmed
   - **Then** the `detected_subscriptions` row status is updated to `'dismissed'`
   - **And** the card is removed from the review list
   - **Note:** Learning from this feedback (merchant exclusion) is deferred to Story 7.6

5. **AC5: Empty State**
   - **Given** the user has no detected subscriptions with status `'detected'`
   - **When** the review screen loads
   - **Then** an empty state is shown: "No subscriptions to review. Scan your bank transactions to detect subscriptions."
   - **And** a button links back to BankConnectionScreen

6. **AC6: Free Tier Limit Enforcement**
   - **Given** the user is on the free tier and already has 5 subscriptions
   - **When** they tap "Add to My Subscriptions"
   - **Then** the premium upsell is shown (same pattern as Add tab gate in `MainTabs.tsx`)
   - **And** the detected subscription remains in `'detected'` status until they upgrade or free up a slot

7. **AC7: Navigation from BankConnectionScreen**
   - **Given** the user has completed a scan (Story 7.3) and detected subscriptions exist
   - **When** detection succeeds with count > 0
   - **Then** the success Snackbar includes an action button "Review" that navigates to the DetectedReviewScreen
   - **And** a persistent "Review Detected ({count})" button is shown on BankConnectionScreen when detected count > 0

## Tasks / Subtasks

- [x] **Task 1: Database — Add UPDATE RLS Policy for `detected_subscriptions`** (AC: #2, #3, #4)
  - [x] 1.1: Create Supabase migration to add an UPDATE RLS policy allowing authenticated users to update `status` on their own rows:
    ```sql
    CREATE POLICY "Users can update status of own detected subscriptions"
      ON detected_subscriptions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    ```
  - [x] 1.2: This allows the client to directly update `detected_subscriptions.status` via Supabase JS client (no Edge Function needed for status changes).

- [x] **Task 2: Navigation — Add DetectedReviewScreen route** (AC: #1, #7)
  - [x] 2.1: Add `DetectedReview` to `SettingsStackParamList` in `src/app/navigation/types.ts`:
    ```typescript
    DetectedReview: undefined;
    ```
  - [x] 2.2: Add the screen to `SettingsStack.tsx`:
    ```typescript
    <Stack.Screen
      name="DetectedReview"
      component={DetectedReviewScreen}
      options={{ title: 'Detected Subscriptions' }}
    />
    ```
  - [x] 2.3: Add `SettingsStackScreenProps<'DetectedReview'>` type export if needed.

- [x] **Task 3: `useBankStore` — Add review actions** (AC: #2, #3, #4)
  - [x] 3.1: Add new actions to `useBankStore`:
    ```typescript
    // New actions
    approveDetectedSubscription: (id: string) => Promise<void>;
    dismissDetectedSubscription: (id: string) => Promise<void>;
    ```
  - [x] 3.2: `approveDetectedSubscription(id)`:
    1. Update `detected_subscriptions` row: `status = 'approved'` via `supabase.from('detected_subscriptions').update({ status: 'approved' }).eq('id', id).eq('user_id', user.id)`
    2. Remove the item from local `detectedSubscriptions` array
    3. On error: set `detectionError` with message
  - [x] 3.3: `dismissDetectedSubscription(id)`:
    1. Update `detected_subscriptions` row: `status = 'dismissed'` via `supabase.from('detected_subscriptions').update({ status: 'dismissed' }).eq('id', id).eq('user_id', user.id)`
    2. Remove the item from local `detectedSubscriptions` array
    3. On error: set `detectionError` with message
  - [x] 3.4: Add computed getter: `detectedCount` — number of items with status `'detected'` in `detectedSubscriptions` array (for badge display).
  - [x] 3.5: Update `fetchDetectedSubscriptions()` to only fetch `status = 'detected'` rows (add `.eq('status', 'detected')` filter). Currently it fetches all rows.

- [x] **Task 4: DetectedReviewCard Component** (AC: #1)
  - [x] 4.1: Create `src/features/bank/components/DetectedReviewCard.tsx`:
    - Props: `item: DetectedSubscription`, `onApprove: () => void`, `onDismiss: () => void`, `onNotSubscription: () => void`
    - Use React Native Paper `Card` (mode="elevated", elevation={1}) — same pattern as `SubscriptionCard.tsx`
    - Card content: merchant name (`Text variant="titleMedium"`), amount + currency (`Text variant="bodyMedium"`), frequency (`Chip` or `Text variant="labelSmall"`), confidence score as percentage with color indicator (green ≥80%, yellow ≥60%, red <60%), last seen date formatted with `date-fns` `format()`
    - Card actions: three `Button` components — "Add" (mode="contained"), "Ignore" (mode="outlined"), "Not a Sub" (mode="text")
    - Accessibility: `accessibilityLabel` on card, touch targets ≥44x44 (NFR29-33)
  - [x] 4.2: Create `src/features/bank/components/DetectedReviewCard.test.tsx` — co-located test.

- [x] **Task 5: DetectedReviewScreen** (AC: #1, #2, #3, #4, #5, #6)
  - [x] 5.1: Create `src/features/bank/screens/DetectedReviewScreen.tsx`:
    - Use `useFocusEffect` to call `fetchDetectedSubscriptions()` on screen focus (same pattern as BankConnectionScreen)
    - Render `FlatList` of `DetectedReviewCard` components
    - Sort by `confidenceScore` descending
    - Show count in header or as a `Text` element: "{count} subscriptions to review"
    - Loading state: `ActivityIndicator` when `isFetchingDetected` is true
    - Empty state: message + "Go to Bank Connection" button when list is empty
  - [x] 5.2: "Add" action handler:
    1. Check premium limit: call `usePremiumStore.getState().canAddSubscription(activeSubscriptionCount)`. If false, navigate to `Premium` screen with `{ source: 'upsell' }` and return
    2. Navigate to `AddSubscriptionScreen` with pre-filled params (see Task 6)
    3. On return (via `useFocusEffect` re-fetch or callback), call `approveDetectedSubscription(id)` to update status
  - [x] 5.3: "Ignore" and "Not a Subscription" handlers: call `dismissDetectedSubscription(id)` — both map to `'dismissed'` status
  - [x] 5.4: Show Snackbar for success/error feedback
  - [x] 5.5: Create `src/features/bank/screens/DetectedReviewScreen.test.tsx` — co-located test.

- [x] **Task 6: Pre-fill Add Subscription Form** (AC: #2)
  - [x] 6.1: Extend `MainTabsParamList` `Add` screen params to accept optional pre-fill data, OR use a shared state/context approach. **Recommended approach:** Add a `prefill` field to navigation params:
    - Add to `SubscriptionsStackParamList` or use a top-level approach:
      ```typescript
      // In types.ts — update MainTabsParamList
      Add: { prefill?: { name: string; price: number; billing_cycle: string; currency: string; detectedId: string } } | undefined;
      ```
    - In `AddSubscriptionScreen.tsx`, read `route.params?.prefill` and use `setValue()` to pre-fill form fields on mount
  - [x] 6.2: After successful subscription save in `AddSubscriptionScreen`, if `detectedId` is present in params, call `useBankStore.getState().approveDetectedSubscription(detectedId)` to update the detected row status.
  - [x] 6.3: Calculate a reasonable `renewal_date` from `lastSeen` + frequency interval (e.g., if monthly, add 30 days to `lastSeen`).

- [x] **Task 7: BankConnectionScreen — Navigation to Review** (AC: #7)
  - [x] 7.1: Update the detection success Snackbar (Story 7.3) to include an action button:
    ```typescript
    <Snackbar action={{ label: 'Review', onPress: () => navigation.navigate('DetectedReview') }}>
      {`${count} subscriptions detected!`}
    </Snackbar>
    ```
  - [x] 7.2: Add a persistent "Review Detected ({count})" button below the "Scan for Subscriptions" button. Visible when `detectedSubscriptions.length > 0`. Use `Button` mode="outlined" with an icon.
  - [x] 7.3: Fetch detected count on screen focus to keep the button count updated.

- [x] **Task 8: Tests** (AC: #1–#7)
  - [x] 8.1: `src/features/bank/components/DetectedReviewCard.test.tsx` — renders merchant name, amount, frequency, confidence percentage, last seen date; action buttons trigger callbacks; accessibility labels present.
  - [x] 8.2: `src/features/bank/screens/DetectedReviewScreen.test.tsx` — renders list of detected items, empty state when no items, loading state, approve action calls store method, dismiss action calls store method, premium limit enforcement redirects to Premium.
  - [x] 8.3: Update `src/shared/stores/useBankStore.test.ts` — test `approveDetectedSubscription` (updates DB + removes from local array), `dismissDetectedSubscription` (updates DB + removes from local array), error handling for both, `fetchDetectedSubscriptions` now filters by `status = 'detected'`.
  - [x] 8.4: Update `src/features/bank/screens/BankConnectionScreen.test.tsx` — "Review Detected" button visibility when detected count > 0, Snackbar action navigates to DetectedReview.
  - [x] 8.5: Update `src/features/subscriptions/screens/AddSubscriptionScreen.test.tsx` — pre-fill from route params populates form fields, successful save with `detectedId` calls `approveDetectedSubscription`.
  - [x] 8.6: Co-locate all tests with source files. No `__tests__/` directories.

## Dev Notes

### Architecture Decision: Client-Side Status Update (Not Edge Function)

Story 7.3 restricted `detected_subscriptions` to SELECT-only RLS (INSERT/UPDATE via service role / Edge Function). For Story 7.4, we add an UPDATE RLS policy so the client can directly update `status` via Supabase JS. This is appropriate because:
- The only client-writable field is `status` (approve/dismiss actions)
- RLS ensures users can only update their own rows
- No sensitive data is being modified (unlike token/connection data)
- Avoids unnecessary Edge Function round-trips for simple status changes

### Navigation Strategy

The DetectedReviewScreen belongs in `SettingsStack` (alongside BankConnectionScreen) since it's accessed from the bank connection flow. Navigation path:
```
Settings > Bank Connection > [Scan] > Snackbar "Review" action → Detected Review
Settings > Bank Connection > "Review Detected (N)" button → Detected Review
```

The "Add to My Subscriptions" action from DetectedReviewScreen navigates to the `Add` tab with pre-fill params. The flow is:
```
DetectedReview > tap "Add" → navigate to Add tab with prefill params
Add screen > save → approveDetectedSubscription(detectedId) called
Add screen > back without saving → no status change
```

### Pre-fill Strategy

Pass pre-fill data via navigation params to AddSubscriptionScreen:
```typescript
navigation.navigate('Main', {
  screen: 'Add',
  params: {
    prefill: {
      name: detected.merchantName,
      price: detected.amount,
      billing_cycle: detected.frequency,
      currency: detected.currency,
      detectedId: detected.id,
    },
  },
});
```

In `AddSubscriptionScreen`, on mount:
```typescript
const prefill = route.params?.prefill;
useEffect(() => {
  if (prefill) {
    setValue('name', prefill.name);
    setValue('price', prefill.price);
    setValue('billing_cycle', prefill.billing_cycle);
    // Calculate next renewal date from frequency
  }
}, [prefill]);
```

After successful save, if `prefill?.detectedId` exists:
```typescript
await useBankStore.getState().approveDetectedSubscription(prefill.detectedId);
```

### Confidence Score Display

Show confidence as a colored percentage badge:
- Green (≥80%): High confidence — likely a subscription
- Yellow (60-79%): Medium confidence — probably a subscription
- Red (<60%): Low confidence — might not be a subscription

Use `theme.colors.primary` for green range, `theme.colors.secondary` for yellow, `theme.colors.error` for red. Or use custom colors from the theme.

### Supabase Query Patterns for Story 7.4

**Fetch detected (status='detected' only):**
```typescript
const { data, error } = await supabase
  .from('detected_subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'detected')
  .order('confidence_score', { ascending: false });
```

**Update status to approved:**
```typescript
const { error } = await supabase
  .from('detected_subscriptions')
  .update({ status: 'approved' })
  .eq('id', detectedId)
  .eq('user_id', user.id);
```

**Update status to dismissed:**
```typescript
const { error } = await supabase
  .from('detected_subscriptions')
  .update({ status: 'dismissed' })
  .eq('id', detectedId)
  .eq('user_id', user.id);
```

### Previous Story Intelligence (Story 7.3)

1. **Architecture pivot happened:** Tink Data Enrichment API was unavailable. Custom recurring detection was implemented using `transactions:read` scope + Tink Search API. This is stable and working — no changes needed for 7.4.
2. **Server-side authorization grant:** `tink-link-session` creates permanent Tink user → delegated auth code → Tink Link. `tink-detect-subscriptions` uses auth grant → fetch transactions → custom detection. Story 7.4 does NOT touch any of this.
3. **`detectedSubscriptions` state exists in `useBankStore`** — already has `fetchDetectedSubscriptions()`, `isDetecting`, `isFetchingDetected`, `detectionError`. Extend, don't recreate.
4. **`extractEdgeFunctionError` / `extractEdgeFunctionErrorWithBody`** helpers exist in `useBankStore.ts` for Edge Function errors. Story 7.4 doesn't call Edge Functions, so use standard Supabase error handling instead.
5. **`useFocusEffect` pattern** established for fetching data on screen focus — reuse in DetectedReviewScreen.
6. **`partialize` in useBankStore** already excludes `detectedSubscriptions` from AsyncStorage. No changes needed.
7. **708 tests passing** as of Story 7.3 completion. Do not break any existing tests.
8. **Co-located tests** — all test files live next to their source files. No `__tests__/` directories.

### What NOT to Do

- **DO NOT** create an Edge Function for status updates — use direct Supabase client with the new UPDATE RLS policy
- **DO NOT** auto-approve detected subscriptions — user must explicitly tap "Add"
- **DO NOT** create a separate store — extend existing `useBankStore` for review actions
- **DO NOT** implement "reset dismissed items" — that is Story 7.6 scope
- **DO NOT** implement merchant exclusion learning from "Not a Subscription" — that is Story 7.6 scope
- **DO NOT** implement matching with manual subscriptions — that is Story 7.5 scope
- **DO NOT** persist `detectedSubscriptions` to AsyncStorage — transient data fetched from server
- **DO NOT** create new feature folders — all files go in `src/features/bank/`
- **DO NOT** modify `tink-detect-subscriptions` or any other Edge Function — this is a client-only story
- **DO NOT** use `react-native-tink-sdk` npm package — wrong library (see Story 7.1 notes)
- **DO NOT** add a new tab or bottom navigation item — review is accessed from Settings > Bank Connection flow

### Network Failure Handling

| Scenario | Supabase returns | User sees | Retry |
|----------|-----------------|-----------|-------|
| Fetch detected success | `{ data, error: null }` | Review card list | N/A |
| Fetch detected failure | `{ data: null, error }` | "Failed to load detected subscriptions." | Pull-to-refresh |
| Approve success | `{ error: null }` | Card removed + "Subscription added!" Snackbar | N/A |
| Approve failure | `{ error }` | "Failed to update. Please try again." Snackbar | Tap again |
| Dismiss success | `{ error: null }` | Card removed from list | N/A |
| Dismiss failure | `{ error }` | "Failed to dismiss. Please try again." Snackbar | Tap again |
| Premium limit hit | N/A (client check) | Navigate to Premium screen | N/A |

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

**Screen test wrapper:**
```typescript
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';

const renderWithProviders = (component: React.ReactElement) =>
  render(<PaperProvider theme={theme}>{component}</PaperProvider>);
```

### Project Structure Notes

- New screen `DetectedReviewScreen.tsx` in `src/features/bank/screens/`
- New component `DetectedReviewCard.tsx` in `src/features/bank/components/`
- Modified: `src/shared/stores/useBankStore.ts` (new actions)
- Modified: `src/app/navigation/types.ts` (new route + Add params)
- Modified: `src/app/navigation/SettingsStack.tsx` (new screen registration)
- Modified: `src/features/bank/screens/BankConnectionScreen.tsx` (review navigation)
- Modified: `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` (pre-fill from params)
- New migration: `supabase/migrations/YYYYMMDDHHMMSS_add_detected_subscriptions_update_policy.sql`
- No new feature folders needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.4] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture] — Zustand pattern, feature structure, React Native Paper components
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR29-33] — Accessibility requirements (touch targets, screen readers)
- [Source: _bmad-output/planning-artifacts/prd.md#FR43] — Review auto-detected subscriptions before adding
- [Source: _bmad-output/planning-artifacts/prd.md#FR36-FR37] — Freemium limits (5 free → unlimited premium)
- [Source: _bmad-output/implementation-artifacts/7-3-automatic-subscription-detection.md] — Previous story patterns, detected_subscriptions table, useBankStore state
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Single-handed design, trust through transparency, zero-friction entry
- [Source: supabase/migrations/20260322200000_create_detected_subscriptions.sql] — Table schema, current RLS (SELECT only)
- [Source: React Native Paper docs — Card, Dialog, Button] — Component API reference
- [Source: Supabase JS Client docs — update, eq, select] — Query patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation completed without blocking issues.

### Completion Notes List

- Created Supabase migration `20260323100000_add_detected_subscriptions_update_policy.sql` adding UPDATE RLS policy for `detected_subscriptions`.
- Extended `useBankStore` with `approveDetectedSubscription`, `dismissDetectedSubscription`, `detectedCount` actions; updated `fetchDetectedSubscriptions` to filter by `status = 'detected'` and order by `confidence_score DESC`.
- Added `DetectedReview` route to `SettingsStackParamList` and registered screen in `SettingsStack.tsx`.
- Added `AddPrefillParams` type and updated `Add` tab params in `MainTabsParamList`.
- Created `DetectedReviewCard` component with confidence color badge (green ≥80%, yellow ≥60%, red <60%), accessibility labels, and three action buttons.
- Created `DetectedReviewScreen` with FlatList, loading/empty states, premium gate check, and dismiss/approve flows.
- Updated `AddSubscriptionScreen` to read `prefill` route params via `useRoute`, pre-fill name/price/billing_cycle via `useEffect`, compute renewal date from frequency, and call `approveDetectedSubscription(detectedId)` after successful save.
- Updated `BankConnectionScreen` to fetch detected count on focus, show persistent "Review Detected (N)" button, and add "Review" action to detection success Snackbar.
- All 749 tests pass (41 new tests added: 13 DetectedReviewCard + 12 DetectedReviewScreen + 10 useBankStore + 4 BankConnectionScreen + 5 AddSubscriptionScreen — plus 3 existing useBankStore mocks updated).

### File List

- `supabase/migrations/20260323100000_add_detected_subscriptions_update_policy.sql` (new)
- `src/app/navigation/types.ts` (modified — DetectedReview route, AddPrefillParams, Add tab params)
- `src/app/navigation/SettingsStack.tsx` (modified — DetectedReviewScreen registered)
- `src/shared/stores/useBankStore.ts` (modified — approveDetectedSubscription, dismissDetectedSubscription, fetchDetectedSubscriptions filter)
- `src/features/bank/components/DetectedReviewCard.tsx` (new)
- `src/features/bank/components/DetectedReviewCard.test.tsx` (new)
- `src/features/bank/screens/DetectedReviewScreen.tsx` (new)
- `src/features/bank/screens/DetectedReviewScreen.test.tsx` (new)
- `src/features/bank/screens/BankConnectionScreen.tsx` (modified — Review Detected button, Snackbar Review action, fetch on focus)
- `src/features/bank/screens/BankConnectionScreen.test.tsx` (modified — 4 new AC7 tests)
- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` (modified — prefill params, approveDetectedSubscription on save)
- `src/features/subscriptions/screens/AddSubscriptionScreen.test.tsx` (new)
- `src/shared/stores/useBankStore.test.ts` (modified — updated 3 mocks + 10 new tests)

## Change Log

- 2026-03-23: Story 7.4 implemented — DetectedReviewScreen, DetectedReviewCard, useBankStore review actions (approve/dismiss), navigation routes, AddSubscriptionScreen prefill, BankConnectionScreen Review button. 749 tests pass.
- 2026-03-23: Code review fixes — (H1) Added try/catch to approveDetectedSubscription/dismissDetectedSubscription for network error handling. (H2) Added lastSeen to AddPrefillParams and use it for renewal date calculation instead of today. (M1) Removed dead calculateRenewalDate export from DetectedReviewScreen. (M2) Removed unused detectedCount getter from useBankStore. All 86 affected tests pass.
