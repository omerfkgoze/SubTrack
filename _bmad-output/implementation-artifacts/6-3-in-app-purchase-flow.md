# Story 6.3: In-App Purchase Flow

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to purchase a premium subscription through the app,
So that I can unlock unlimited subscriptions and advanced features.

## Acceptance Criteria

1. **AC1: Initiate Purchase Flow**
   - **Given** the user taps "Subscribe" on the premium screen (PaywallScreen)
   - **When** the purchase flow initiates
   - **Then** the native in-app purchase dialog is presented via `react-native-iap` (StoreKit 2 on iOS, Google Play Billing on Android)
   - **And** available plans are shown: monthly (€2.99) and yearly (€24.99)

2. **AC2: Successful Purchase**
   - **Given** the user completes the purchase successfully
   - **When** payment is confirmed by the store
   - **Then** the premium entitlement is validated via the `validate-premium` Supabase Edge Function
   - **And** `is_premium` is set to true in the user's profile in Supabase
   - **And** the subscription limit is removed immediately
   - **And** a success celebration animation is displayed
   - **And** the user is returned to the app with premium features unlocked

3. **AC3: Failed or Cancelled Purchase**
   - **Given** the purchase fails or is cancelled
   - **When** the user returns to the app
   - **Then** a user-friendly message is displayed ("Purchase wasn't completed. You can try again anytime.")
   - **And** the user remains on the free tier

4. **AC4: Subscription Expiry (Non-Renewal)**
   - **Given** the user's premium subscription expires (non-renewal)
   - **When** the app checks entitlement status
   - **Then** the user is downgraded to free tier
   - **And** existing subscriptions beyond the 5 limit remain visible but read-only
   - **And** the user is informed with a gentle prompt to re-subscribe

## Tasks / Subtasks

- [x] Task 1: Install and configure `react-native-iap` (AC: #1)
  - [x] 1.1: Install `react-native-iap` — `npx expo install react-native-iap`
  - [x] 1.2: Add IAP product IDs to a config file `src/features/premium/config/iapProducts.ts` — export `MONTHLY_SKU = 'com.subtrack.premium.monthly'` and `YEARLY_SKU = 'com.subtrack.premium.yearly'`
  - [x] 1.3: Create `src/features/premium/services/purchaseService.ts` with store connection init, product fetching, and purchase request logic

- [x] Task 2: Implement `purchaseService.ts` (AC: #1, #2, #3)
  - [x] 2.1: `initIAP()` — call `initConnection()` from `react-native-iap`, set up `purchaseUpdatedListener` and `purchaseErrorListener`
  - [x] 2.2: `getSubscriptions()` — call `getSubscriptions({ skus: [MONTHLY_SKU, YEARLY_SKU] })` and return product details (price, currency, description)
  - [x] 2.3: `buySubscription(sku: string)` — platform-aware purchase request: iOS uses `{ sku }`, Android uses `{ skus: [sku], subscriptionOffers }` with `offerToken`
  - [x] 2.4: `handlePurchaseUpdate(purchase)` — validate receipt via `validate-premium` Edge Function, then call `finishTransaction({ purchase, isConsumable: false })`
  - [x] 2.5: `handlePurchaseError(error)` — map error codes to user-friendly messages; distinguish user cancellation from real errors
  - [x] 2.6: `cleanupIAP()` — remove listeners, call `endConnection()`

- [x] Task 3: Create `validate-premium` Supabase Edge Function (AC: #2, #4)
  - [x] 3.1: Create `supabase/functions/validate-premium/index.ts`
  - [x] 3.2: Accept POST body: `{ platform: 'ios' | 'android', receipt: string, userId: string }`
  - [x] 3.3: For iOS: validate receipt with Apple App Store Server API (or use `transactionReceipt` verification)
  - [x] 3.4: For Android: validate `purchaseToken` with Google Play Developer API
  - [x] 3.5: On valid receipt: update `user_settings` table — set `is_premium = true`, store `premium_expires_at`, `premium_plan_type` ('monthly'|'yearly'), `premium_purchase_token`
  - [x] 3.6: On invalid/expired receipt: set `is_premium = false`, return appropriate error
  - [x] 3.7: Return JSON `{ valid: boolean, expiresAt?: string, error?: string }`

- [x] Task 4: Extend `usePremiumStore` Zustand store (AC: #2, #4)
  - [x] 4.1: Add state fields: `planType: 'monthly' | 'yearly' | null`, `expiresAt: string | null`, `purchaseInProgress: boolean`
  - [x] 4.2: Add action `purchaseSubscription(sku: string)` — sets `purchaseInProgress`, calls `buySubscription`, handles result
  - [x] 4.3: Add action `handlePurchaseSuccess(purchase)` — calls `validate-premium` Edge Function, updates local state (`isPremium = true`, `planType`, `expiresAt`)
  - [x] 4.4: Add action `handlePurchaseFailure(error)` — resets `purchaseInProgress`, returns user-friendly error message
  - [x] 4.5: Modify existing `checkPremiumStatus()` to also fetch `premium_expires_at` and `premium_plan_type` from Supabase

- [x] Task 5: Update PaywallScreen to trigger real purchases (AC: #1, #2, #3)
  - [x] 5.1: Replace `handleUpgradePress` "Coming soon" snackbar with actual purchase flow — call `purchaseSubscription(selectedSku)`
  - [x] 5.2: Add plan selection state: let user toggle between monthly/yearly before purchasing
  - [x] 5.3: Show loading indicator during `purchaseInProgress`
  - [x] 5.4: On success: show success celebration (Snackbar or simple animation with checkmark), then navigate back or refresh screen to show PremiumStatusCard
  - [x] 5.5: On failure/cancel: show Snackbar with user-friendly message
  - [x] 5.6: Display real prices fetched from store (via `getSubscriptions()`) instead of hardcoded €2.99/€24.99

- [x] Task 6: Update PremiumStatusCard with real data (AC: #2, #4)
  - [x] 6.1: Read `planType` and `expiresAt` from `usePremiumStore` instead of placeholder text
  - [x] 6.2: Display plan type: "Monthly Plan" or "Yearly Plan"
  - [x] 6.3: Display renewal date formatted with `date-fns`: `format(parseISO(expiresAt), 'dd MMM yyyy')`
  - [x] 6.4: Keep "Manage Subscription" button (already opens native subscription management from Story 6.2)

- [x] Task 7: Handle subscription expiry/downgrade (AC: #4)
  - [x] 7.1: In `checkPremiumStatus()`, if `premium_expires_at` is in the past, call `validate-premium` Edge Function to re-verify with the store
  - [x] 7.2: If subscription expired: set `isPremium = false` in Supabase and local store
  - [x] 7.3: Subscriptions beyond limit 5 remain visible but add-subscription gate still enforced (existing logic from Story 6.1)
  - [x] 7.4: Show gentle re-subscribe prompt on PaywallScreen when expired (e.g., "Your premium has ended. Renew to keep unlimited access.")

- [x] Task 8: Initialize IAP on app startup (AC: #1)
  - [x] 8.1: Call `initIAP()` in the app initialization flow (e.g., in `App.tsx` or a dedicated `useIAPSetup` hook)
  - [x] 8.2: Call `cleanupIAP()` on app unmount
  - [x] 8.3: Ensure IAP listeners are active before any purchase attempt

- [x] Task 9: Database migration (AC: #2, #4)
  - [x] 9.1: Create Supabase migration to add columns to `user_settings` table: `premium_plan_type TEXT`, `premium_expires_at TIMESTAMPTZ`, `premium_purchase_token TEXT`
  - [x] 9.2: Ensure RLS policies allow user to read their own premium fields

- [x] Task 10: Tests (AC: #1, #2, #3, #4)
  - [x] 10.1: Unit test `purchaseService.ts` — mock `react-native-iap` module; test `initIAP`, `getSubscriptions`, `buySubscription`, `handlePurchaseUpdate`, error handling
  - [x] 10.2: Unit test `usePremiumStore` purchase actions — mock `purchaseService`; test success flow, failure flow, expiry check
  - [x] 10.3: Unit test PaywallScreen — purchase button triggers `purchaseSubscription`, loading state shown during purchase, success/failure messages displayed
  - [x] 10.4: Unit test PremiumStatusCard — renders real plan type and expiry date
  - [x] 10.5: Co-locate tests with source files per project convention

## Dev Notes

### Critical: `react-native-iap` Integration Pattern

The library requires a specific lifecycle:
1. `initConnection()` — must be called before any IAP operations
2. Set up `purchaseUpdatedListener` and `purchaseErrorListener` — these fire asynchronously when store completes/fails
3. `getSubscriptions({ skus })` — fetch product details from store (prices may differ by region)
4. `requestPurchase()` — platform-specific: iOS uses `{ sku }`, Android needs `{ skus, subscriptionOffers }` with `offerToken` from subscription offer details
5. In the purchase listener: validate receipt server-side, then call `finishTransaction({ purchase, isConsumable: false })` — **failure to finish will cause the purchase to replay on every app launch**
6. `endConnection()` — cleanup on app unmount

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| PaywallScreen | `src/features/premium/screens/PaywallScreen.tsx` | Replace "Coming soon" handler with real purchase flow |
| PremiumStatusCard | `src/features/premium/components/PremiumStatusCard.tsx` | Update to show real plan type and expiry |
| usePremiumStore | `src/shared/stores/usePremiumStore.ts` | Extend with purchase actions and new state fields |
| subscriptionManagement | `src/features/premium/services/subscriptionManagement.ts` | Already handles native subscription management URLs |
| Supabase client | `src/shared/services/supabase.ts` | For Edge Function calls and DB queries |
| Theme secondary color | `src/config/theme.ts` | `#8B5CF6` for premium accent |
| SettingsStack | `src/app/navigation/SettingsStack.tsx` | Premium route already registered |

### What NOT to Do

- Do NOT use RevenueCat — the epics spec uses `react-native-iap` directly
- Do NOT hardcode prices in the purchase flow — fetch real prices from the store via `getSubscriptions()`; the hardcoded €2.99/€24.99 in PaywallScreen should be replaced with store-fetched prices
- Do NOT skip `finishTransaction()` — this causes purchases to replay endlessly
- Do NOT validate receipts client-side only — always validate server-side via the Edge Function
- Do NOT block the UI during store connection init — it should happen in the background on app startup
- Do NOT create a separate purchase screen — enhance the existing `PaywallScreen.tsx`
- Do NOT remove the "Restore Purchases" button/link — keep it as placeholder (functional implementation in Story 6.4)

### Platform-Specific Notes

**iOS (StoreKit 2):**
- Product IDs must be configured in App Store Connect
- Receipt validation uses Apple's App Store Server API
- `requestPurchase({ request: { sku: subscriptionId }, type: 'subs' })`

**Android (Google Play Billing):**
- Product IDs must be configured in Google Play Console
- Requires `offerToken` from `subscriptionOfferDetails` for purchase requests
- `requestPurchase({ request: { skus: [sku], subscriptionOffers: [{ sku, offerToken }] }, type: 'subs' })`
- Validate using `purchaseToken` with Google Play Developer API

### Edge Function Pattern

Follow existing Edge Function pattern from `supabase/functions/calculate-reminders/` and `supabase/functions/delete-account/`:
- Deno runtime
- Import `createClient` from `@supabase/supabase-js`
- Use `Deno.env.get()` for secrets
- Return JSON responses with proper HTTP status codes

### Database Schema Addition

```sql
ALTER TABLE user_settings
ADD COLUMN premium_plan_type TEXT CHECK (premium_plan_type IN ('monthly', 'yearly')),
ADD COLUMN premium_expires_at TIMESTAMPTZ,
ADD COLUMN premium_purchase_token TEXT;
```

### Testing Pattern

Follow co-located test pattern established in Stories 6.1/6.2:
- Mock `react-native-iap` entirely — it won't work in test environment
- Mock Supabase Edge Function calls
- Test state transitions in the Zustand store
- Use existing Jest + React Native Testing Library setup

### Project Structure Notes

- New files in `src/features/premium/services/purchaseService.ts`
- New file `src/features/premium/config/iapProducts.ts`
- New Edge Function `supabase/functions/validate-premium/index.ts`
- New migration in `supabase/migrations/`
- Modified: `PaywallScreen.tsx`, `PremiumStatusCard.tsx`, `usePremiumStore.ts`, app initialization

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Edge Functions]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR33-FR37 Premium → purchaseService.ts, usePremiumStore.ts]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Freemium Conversion]
- [Source: _bmad-output/implementation-artifacts/6-2-premium-feature-benefits-display.md]
- [Source: react-native-iap docs — subscription purchase flow, finishTransaction pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- ✅ Task 1: Installed `react-native-iap`, created IAP product config with MONTHLY_SKU and YEARLY_SKU, created purchaseService.ts with full IAP lifecycle management
- ✅ Task 2: Implemented all purchaseService functions: initIAP, fetchSubscriptions, buySubscription (platform-aware), handlePurchaseUpdate (server-side validation + finishTransaction), handlePurchaseError (user-friendly messages), cleanupIAP
- ✅ Task 3: Created `validate-premium` Supabase Edge Function with Apple/Google receipt validation, user_settings update, proper auth verification, and userId mismatch protection
- ✅ Task 4: Extended usePremiumStore with planType, expiresAt, purchaseInProgress state; purchaseSubscription, handlePurchaseSuccess, handlePurchaseFailure actions; enhanced checkPremiumStatus with expiry re-verification
- ✅ Task 5: Updated PaywallScreen with plan selection toggle, real purchase flow, store-fetched prices with fallbacks, loading state during purchase, success celebration snackbar, expired user prompt
- ✅ Task 6: Updated PremiumStatusCard to display real planType ("Monthly Plan"/"Yearly Plan") and formatted renewal date using date-fns
- ✅ Task 7: Implemented expiry handling in checkPremiumStatus (re-verifies with Edge Function when expired), downgrade flow, gentle re-subscribe prompt on PaywallScreen
- ✅ Task 8: Created useIAPSetup hook, integrated in App.tsx for IAP initialization on startup and cleanup on unmount
- ✅ Task 9: Created database migration adding premium_plan_type, premium_expires_at, premium_purchase_token columns to user_settings
- ✅ Task 10: Full test coverage — 10 purchaseService tests, 14 usePremiumStore tests, 12 PaywallScreen tests, 10 PremiumStatusCard tests; all 593 tests pass with 0 failures

### File List

- `src/features/premium/config/iapProducts.ts` (new)
- `src/features/premium/services/purchaseService.ts` (new)
- `src/features/premium/services/purchaseService.test.ts` (new)
- `src/features/premium/hooks/useIAPSetup.ts` (new)
- `supabase/functions/validate-premium/index.ts` (new)
- `supabase/migrations/20260319000000_add_premium_purchase_fields.sql` (new)
- `__mocks__/react-native-iap.js` (new)
- `src/shared/stores/usePremiumStore.ts` (modified)
- `src/shared/stores/usePremiumStore.test.ts` (modified)
- `src/features/premium/screens/PaywallScreen.tsx` (modified)
- `src/features/premium/screens/PaywallScreen.test.tsx` (modified)
- `src/features/premium/components/PremiumStatusCard.tsx` (modified)
- `src/features/premium/components/PremiumStatusCard.test.tsx` (modified)
- `src/app/App.tsx` (modified)
- `jest.config.js` (modified)
- `package.json` (modified — react-native-iap dependency added)

## Change Log

- 2026-03-19: Story 6.3 implementation complete — full in-app purchase flow with react-native-iap, server-side receipt validation via Supabase Edge Function, extended premium store with purchase actions, updated PaywallScreen and PremiumStatusCard with real purchase flow and data, subscription expiry handling, database migration, comprehensive test coverage (593 tests passing)
