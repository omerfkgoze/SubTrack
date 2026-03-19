# Story 6.4: Restore Previous Purchases

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who reinstalled the app or switched devices,
I want to restore my previous premium purchase,
So that I don't have to pay again.

## Acceptance Criteria

1. **AC1: Restore Purchases Button**
   - **Given** the user is on the premium screen (PaywallScreen) and has previously purchased premium
   - **When** they tap "Restore Purchases"
   - **Then** the app queries the store (App Store / Play Store) for previous purchases via `react-native-iap`'s `getAvailablePurchases()`
   - **And** if a valid premium subscription is found, it is restored
   - **And** `is_premium` is set to true in Supabase via the `validate-premium` Edge Function
   - **And** a confirmation message is displayed ("Premium restored successfully!")

2. **AC2: No Previous Purchases**
   - **Given** no previous purchases exist
   - **When** the restore check completes
   - **Then** a message is displayed ("No previous purchases found")
   - **And** the user is guided to subscribe

3. **AC3: Auto-Restore on Login (Background)**
   - **Given** the user logs into a new device
   - **When** they open the app and their Supabase profile shows `is_premium: true`
   - **Then** premium features are immediately available (from cached/DB state)
   - **And** entitlement is re-validated with the store in the background

4. **AC4: Restore Failure Handling**
   - **Given** the restore process encounters a network or store error
   - **When** the restore fails
   - **Then** a user-friendly error message is displayed ("Couldn't restore purchases. Please try again.")
   - **And** the user remains on their current tier

## Tasks / Subtasks

- [ ] Task 1: Add `restorePurchases` to `purchaseService.ts` (AC: #1, #2)
  - [ ] 1.1: Import `getAvailablePurchases` from `react-native-iap`
  - [ ] 1.2: Create `restorePurchases()` function — calls `getAvailablePurchases()`, filters for SubTrack SKUs (`MONTHLY_SKU`, `YEARLY_SKU`), returns the most recent valid purchase or null
  - [ ] 1.3: For each found purchase, call `validate-premium` Edge Function with receipt/purchaseToken to verify and update server-side premium status

- [ ] Task 2: Add `restorePurchases` action to `usePremiumStore` (AC: #1, #2, #4)
  - [ ] 2.1: Add state field: `restoreInProgress: boolean`
  - [ ] 2.2: Add action `restorePurchases()` — sets `restoreInProgress = true`, calls `purchaseService.restorePurchases()`, processes the result
  - [ ] 2.3: On success (valid purchase found): update `isPremium`, `planType`, `expiresAt` from Edge Function response; set `restoreInProgress = false`
  - [ ] 2.4: On no purchases found: set `restoreInProgress = false`, return indicator to caller
  - [ ] 2.5: On failure: set `restoreInProgress = false`, set `purchaseErrorMessage`

- [ ] Task 3: Wire "Restore Purchases" button in PaywallScreen (AC: #1, #2, #4)
  - [ ] 3.1: Replace the empty `onPress={() => {}}` on "Restore Purchases" button with actual `restorePurchases()` call
  - [ ] 3.2: Show loading indicator during restore (`restoreInProgress`)
  - [ ] 3.3: On success: show Snackbar "Premium restored successfully!" and refresh screen to show PremiumStatusCard
  - [ ] 3.4: On no purchases: show Snackbar "No previous purchases found"
  - [ ] 3.5: On error: show Snackbar with error message from store
  - [ ] 3.6: Disable Restore button while `restoreInProgress` or `purchaseInProgress`

- [ ] Task 4: Background entitlement re-validation on app resume (AC: #3)
  - [ ] 4.1: In `checkPremiumStatus()` (usePremiumStore), when `is_premium` is true but `premium_expires_at` is past, call `restorePurchases()` to re-verify with the store instead of immediately downgrading
  - [ ] 4.2: If restore confirms valid subscription: update `expiresAt` with new expiry from the store
  - [ ] 4.3: If restore finds no valid subscription: downgrade to free tier (set `isPremium = false`)
  - [ ] 4.4: This replaces the current immediate-downgrade logic in `checkPremiumStatus()`

- [ ] Task 5: Update `__mocks__/react-native-iap.js` (AC: #1, #2)
  - [ ] 5.1: Add `getAvailablePurchases` mock to the existing IAP mock file
  - [ ] 5.2: Default mock returns empty array (no purchases)

- [ ] Task 6: Tests (AC: #1, #2, #3, #4)
  - [ ] 6.1: Unit test `purchaseService.restorePurchases()` — mock `getAvailablePurchases`; test with valid purchase, no purchases, and error scenarios
  - [ ] 6.2: Unit test `usePremiumStore.restorePurchases()` — test success flow (premium restored), no-purchase flow, failure flow, loading state transitions
  - [ ] 6.3: Unit test `usePremiumStore.checkPremiumStatus()` — test that expired premium now triggers restore instead of immediate downgrade
  - [ ] 6.4: Unit test PaywallScreen — restore button triggers `restorePurchases`, loading state during restore, success/no-purchase/error snackbar messages
  - [ ] 6.5: Co-locate tests with source files per project convention

## Dev Notes

### Critical: `getAvailablePurchases()` Behavior

`react-native-iap`'s `getAvailablePurchases()`:
- **iOS:** Queries the App Store for all non-consumable and auto-renewable subscription receipts associated with the user's Apple ID. May trigger a Sign-in to App Store prompt.
- **Android:** Queries Google Play for purchases not yet acknowledged. Returns `purchaseToken` for each.
- Returns `ProductPurchase[]` — filter by `productId` matching `MONTHLY_SKU` or `YEARLY_SKU`
- Each purchase contains `transactionReceipt` (iOS) or `purchaseToken` (Android) needed for server-side validation

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| purchaseService | `src/features/premium/services/purchaseService.ts` | Add `restorePurchases()` function here |
| usePremiumStore | `src/shared/stores/usePremiumStore.ts` | Add `restorePurchases` action and `restoreInProgress` state |
| PaywallScreen | `src/features/premium/screens/PaywallScreen.tsx` | Wire existing "Restore Purchases" button (line ~195-197) |
| handlePurchaseUpdate | `purchaseService.ts` | Reuse for validating restored purchases via Edge Function |
| validate-premium Edge Function | `supabase/functions/validate-premium/index.ts` | Already handles receipt validation and premium status update — reuse as-is |
| IAP product config | `src/features/premium/config/iapProducts.ts` | `MONTHLY_SKU`, `YEARLY_SKU`, `ALL_SKUS` for filtering |
| IAP mock | `__mocks__/react-native-iap.js` | Add `getAvailablePurchases` mock |
| Expo Go IAP mock | `src/mocks/react-native-iap.ts` | Add `getAvailablePurchases` no-op for Expo Go compatibility |

### What NOT to Do

- Do NOT create a separate restore screen — use the existing PaywallScreen "Restore Purchases" button
- Do NOT skip server-side validation — restored purchases MUST be validated via `validate-premium` Edge Function, same as new purchases
- Do NOT call `finishTransaction()` on restored purchases — `getAvailablePurchases()` returns already-finished transactions; calling `finishTransaction` again is unnecessary (unlike `requestPurchase`)
- Do NOT use RevenueCat — the project uses `react-native-iap` directly
- Do NOT create new database tables or migrations — the existing `user_settings` table with `is_premium`, `premium_plan_type`, `premium_expires_at`, `premium_purchase_token` columns (added in Story 6.3) is sufficient
- Do NOT modify the `validate-premium` Edge Function — it already handles receipt validation for both platforms

### Platform-Specific Notes

**iOS (StoreKit 2):**
- `getAvailablePurchases()` returns all active subscriptions for the user's Apple ID
- Receipt is in `transactionReceipt` field
- May prompt user to sign in to their Apple ID

**Android (Google Play Billing):**
- `getAvailablePurchases()` returns acknowledged purchases
- Receipt is in `purchaseToken` field
- User must be signed into the same Google account that made the purchase

### Restore Flow Sequence

```
User taps "Restore Purchases"
    ↓
getAvailablePurchases() → queries store
    ↓
Filter results for SubTrack SKUs
    ↓
If found → handlePurchaseUpdate(purchase) → validate-premium Edge Function
    ↓
Edge Function validates receipt → updates user_settings
    ↓
Store updated: isPremium=true, planType, expiresAt
    ↓
UI shows success snackbar, refreshes to PremiumStatusCard
```

### Expiry Re-Validation Pattern Change

Currently in `checkPremiumStatus()`, when premium is expired, the user is immediately downgraded. With this story, the flow changes to:

1. `checkPremiumStatus()` detects expired `premium_expires_at`
2. Instead of immediate downgrade → call `restorePurchases()` silently
3. If store confirms valid subscription → update expiry, keep premium
4. If no valid subscription → then downgrade

This handles auto-renewal correctly: the store knows the subscription renewed even if our DB hasn't been updated yet.

### Testing Pattern

Follow co-located test pattern from Stories 6.1/6.2/6.3:
- Mock `react-native-iap` entirely (`getAvailablePurchases` returns configurable results)
- Mock Supabase Edge Function calls for validation
- Test state transitions in the Zustand store
- Use existing Jest + React Native Testing Library setup

### Project Structure Notes

- Modified: `src/features/premium/services/purchaseService.ts` (add `restorePurchases`)
- Modified: `src/shared/stores/usePremiumStore.ts` (add restore action/state, update expiry check)
- Modified: `src/features/premium/screens/PaywallScreen.tsx` (wire restore button)
- Modified: `__mocks__/react-native-iap.js` (add `getAvailablePurchases`)
- Modified: `src/mocks/react-native-iap.ts` (add `getAvailablePurchases` no-op)
- Modified tests: `purchaseService.test.ts`, `usePremiumStore.test.ts`, `PaywallScreen.test.tsx`
- No new files needed — this story extends existing code

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR33-FR37 Premium → purchaseService.ts, usePremiumStore.ts]
- [Source: _bmad-output/implementation-artifacts/6-3-in-app-purchase-flow.md — purchaseService patterns, Edge Function, store patterns]
- [Source: react-native-iap docs — getAvailablePurchases() for purchase restoration]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
