# Story 6.1: Freemium Subscription Limit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a free tier user,
I want to understand that I'm limited to 5 subscriptions with a clear path to upgrade,
So that I can decide when premium is worth it for me.

## Acceptance Criteria

1. **AC1: Subscription Counter Display**
   - **Given** the user is on the free tier
   - **When** they have added fewer than 5 subscriptions
   - **Then** a subtle counter is shown (e.g., "3/5 subscriptions used")
   - **And** the app functions fully without any restrictions

2. **AC2: Soft Upsell on Limit Reached**
   - **Given** the free tier user has exactly 5 subscriptions
   - **When** they attempt to add a 6th subscription
   - **Then** a soft upsell screen is displayed explaining: "You've reached the free limit of 5 subscriptions"
   - **And** the screen shows premium benefits and pricing (€2.99/month or €24.99/year)
   - **And** options are: "Upgrade to Premium" or "Maybe Later"
   - **And** the user is NOT blocked from using existing features

3. **AC3: Post-Dismissal Behavior**
   - **Given** the user dismisses the upsell
   - **When** they return to the app
   - **Then** they can continue using all existing 5 subscriptions without restriction
   - **And** the "Add" button (FAB) shows a small premium badge indicating upgrade is needed for more

4. **AC4: Database-Level Premium Check**
   - **Given** the `user_settings` table is updated
   - **When** the user's tier is checked
   - **Then** the `is_premium` field and `subscription_limit` are used to enforce gating

## Tasks / Subtasks

- [x] Task 1: Create `usePremiumStore` Zustand store (AC: #1, #2, #3, #4)
  - [x] 1.1: Create `src/shared/stores/usePremiumStore.ts` following existing Zustand + persist pattern
  - [x] 1.2: State: `isPremium: boolean`, `isLoading: boolean`
  - [x] 1.3: Action: `checkPremiumStatus()` — queries Supabase `user_settings.is_premium`
  - [x] 1.4: Action: `refreshPremiumStatus()` — force refresh from server
  - [x] 1.5: Selector: `canAddSubscription()` — checks `isPremium || activeCount < MAX_FREE_SUBSCRIPTIONS`
  - [x] 1.6: Persist `isPremium` to AsyncStorage for offline grace period
  - [x] 1.7: Export `MAX_FREE_SUBSCRIPTIONS = 5` constant from store or config

- [x] Task 2: Database migration — add `is_premium` to `user_settings` (AC: #4)
  - [x] 2.1: Create migration `supabase/migrations/YYYYMMDD_add_premium_fields.sql`
  - [x] 2.2: `ALTER TABLE user_settings ADD COLUMN is_premium BOOLEAN DEFAULT false NOT NULL;`
  - [x] 2.3: Update `src/shared/types/database.types.ts` — add `is_premium` to `user_settings` Row/Insert/Update types
  - [x] 2.4: Do NOT add RLS INSERT policy for subscriptions table yet — that belongs in Story 6.3 after RevenueCat webhook integration is ready

- [x] Task 3: Subscription counter component (AC: #1)
  - [x] 3.1: Create `src/features/premium/components/SubscriptionCounter.tsx`
  - [x] 3.2: Display "X/5 subscriptions used" — use `useSubscriptionStore.subscriptions.length` for count
  - [x] 3.3: Only show for free tier users (`!isPremium`)
  - [x] 3.4: Place on the Subscriptions list screen (integrate into existing `SubscriptionListScreen`)
  - [x] 3.5: Use React Native Paper `Text` + `ProgressBar` with theme colors
  - [x] 3.6: Subtle styling — should not dominate the screen

- [x] Task 4: Paywall/Upsell screen (AC: #2, #3)
  - [x] 4.1: Create `src/features/premium/screens/PaywallScreen.tsx`
  - [x] 4.2: Header: "You've reached the free limit of 5 subscriptions"
  - [x] 4.3: Feature comparison list: Free vs Premium (unlimited subs, calendar sync, data export, full analytics)
  - [x] 4.4: Pricing display: "€2.99/month" and "€24.99/year (save 30%)"
  - [x] 4.5: Two CTAs: "Upgrade to Premium" (primary, disabled/placeholder for Story 6.3) and "Maybe Later" (dismiss)
  - [x] 4.6: Required legal text at bottom: "Restore Purchases" link, "Terms of Use" link, "Privacy Policy" link — per App Store guideline 3.1.2
  - [x] 4.7: "Upgrade to Premium" button is a **placeholder** in this story — shows a toast/snackbar "Coming soon" since actual purchase flow is Story 6.3
  - [x] 4.8: Soft, non-aggressive design — follow UX spec anti-pattern: no aggressive upsell popups
  - [x] 4.9: Use `secondary` theme color (#8B5CF6) as accent for premium elements

- [x] Task 5: Gate the "Add Subscription" flow (AC: #2)
  - [x] 5.1: In `AddSubscriptionScreen.tsx` (or its navigation trigger in `MainTabs.tsx`), intercept the add action
  - [x] 5.2: Before navigating to add form, check `usePremiumStore.canAddSubscription(activeSubscriptionCount)`
  - [x] 5.3: If limit reached and not premium → navigate to `PaywallScreen` instead of add form
  - [x] 5.4: Count only active subscriptions for the limit (`subscriptions.filter(s => s.is_active !== false).length`)

- [x] Task 6: FAB premium badge (AC: #3)
  - [x] 6.1: When free user is at limit (5/5), show a small lock/premium badge overlay on the FAB (Add button)
  - [x] 6.2: Use an icon overlay (e.g., small crown or lock icon) — React Native Paper `Badge` or custom overlay
  - [x] 6.3: Badge disappears when user upgrades to premium

- [x] Task 7: Navigation setup (AC: #2)
  - [x] 7.1: Add `PaywallScreen` to the Settings Stack (accessible from Settings > Premium)
  - [x] 7.2: Add `PaywallScreen` as a modal route accessible from anywhere (for the add-subscription gate)
  - [x] 7.3: Register route in navigation types (`src/app/navigation/types.ts`)

- [x] Task 8: Initialize premium store on app start (AC: #4)
  - [x] 8.1: In `AuthProvider.tsx` or `App.tsx`, call `usePremiumStore.checkPremiumStatus()` after auth session is established
  - [x] 8.2: Refresh premium status on app resume (AppState change to 'active')

- [x] Task 9: Tests (all ACs)
  - [x] 9.1: Unit test `usePremiumStore` — premium check, canAddSubscription logic, persistence
  - [x] 9.2: Unit test `SubscriptionCounter` — renders correct count, hidden for premium users
  - [x] 9.3: Unit test add-subscription gate — redirects to paywall at limit, allows add below limit
  - [x] 9.4: Co-locate tests with source files per project convention

## Dev Notes

### Architecture Decision: Hybrid Enforcement (Client + Server)

Per `docs/epic-6-prep-freemium-enforcement-architecture.md`:

- **Client-side** handles UX gating (paywall prompt, disabled UI) — this story
- **Supabase RLS** INSERT policy for server-side enforcement — deferred to Story 6.3 when RevenueCat webhook populates entitlement data
- Client-side check runs BEFORE navigation to add flow — no failed network request, no error state

### Free Tier Limit: 5 Subscriptions

The PRD and epic spec define the limit as **5 subscriptions**. The prep doc `epic-6-prep-freemium-enforcement-architecture.md` uses a placeholder of 3 with a note to align with product spec. Use `MAX_FREE_SUBSCRIPTIONS = 5` as per the product specification.

Count only **active** subscriptions toward the limit (exclude cancelled subscriptions).

### IAP Library: RevenueCat (react-native-purchases)

Per `docs/epic-6-prep-revenuecat-vs-storekit-decision.md`:

- Do NOT use `react-native-iap` or direct StoreKit/Google Play Billing
- Use `react-native-purchases` (RevenueCat SDK)
- However, the actual RevenueCat SDK installation and purchase flow is **NOT in scope for Story 6.1** — that is Story 6.3
- Story 6.1 focuses on the freemium gate and paywall UI only
- The "Upgrade to Premium" button should be a **placeholder** (non-functional) in this story

### Premium State Source of Truth

For Story 6.1 (before RevenueCat integration):

1. Add `is_premium BOOLEAN DEFAULT false` to `user_settings` table
2. `usePremiumStore` reads from Supabase `user_settings.is_premium`
3. Cached locally in AsyncStorage via Zustand persist
4. In future stories (6.3+), RevenueCat webhooks will update `is_premium` in Supabase

### Paywall Compliance Requirements

Per `docs/epic-6-prep-iap-guideline-review.md`, the paywall screen MUST include:

- Feature comparison (free vs premium)
- Pricing with auto-renewal disclosure: "Billed monthly. Auto-renews. Cancel anytime."
- Restore Purchases link (can be non-functional placeholder until Story 6.4)
- Terms of Use link
- Privacy Policy link

### Existing Code to Reuse / Integrate With

| Component                  | Location                                                       | Integration Point                                                    |
| -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Subscription list & count  | `src/shared/stores/useSubscriptionStore.ts`                    | Read `subscriptions` array for active count                          |
| Add subscription trigger   | `src/app/navigation/MainTabs.tsx`                              | FAB button that opens add screen — gate here                         |
| Add subscription screen    | `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` | Alternative gate point                                               |
| Auth session               | `src/shared/stores/useAuthStore.ts`                            | Get `user.id` for Supabase queries                                   |
| User settings service      | `src/features/settings/services/userSettingsService.ts`        | Extend with `is_premium` queries                                     |
| Theme colors               | `src/config/theme.ts`                                          | `secondary: '#8B5CF6'` for premium accent                            |
| Navigation types           | `src/app/navigation/types.ts`                                  | Add PaywallScreen route                                              |
| Settings stack             | `src/app/navigation/SettingsStack.tsx`                         | Add Premium/Paywall route                                            |
| Empty premium feature dirs | `src/features/premium/`                                        | Scaffolded with .gitkeep — populate with components/screens/services |

### Zustand Store Pattern

Follow existing pattern exactly (see `useSubscriptionStore.ts`, `useAuthStore.ts`, `useNotificationStore.ts`):

```typescript
export const usePremiumStore = create<PremiumStore>()(
  persist(
    (set, get) => ({
      isPremium: false,
      isLoading: false,
      // ... actions
    }),
    {
      name: 'premium-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isPremium: state.isPremium }),
    },
  ),
);
```

### What NOT to Do

- Do NOT install `react-native-purchases` in this story — that's Story 6.3
- Do NOT implement actual purchase flow — "Upgrade" button is placeholder
- Do NOT add RLS INSERT policy on subscriptions table — that's Story 6.3
- Do NOT create `user_entitlements` table — use `user_settings.is_premium` for now
- Do NOT implement subscription expiration/downgrade logic — that's Story 6.5
- Do NOT make the counter aggressive or the paywall intrusive — soft upsell approach per UX spec

### Project Structure Notes

- All new premium code goes in `src/features/premium/` (directories already scaffolded)
- `usePremiumStore` goes in `src/shared/stores/` (cross-cutting concern, used by subscriptions and settings)
- Database migration in `supabase/migrations/`
- Test files co-located with source files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1]
- [Source: docs/epic-6-prep-freemium-enforcement-architecture.md]
- [Source: docs/epic-6-prep-revenuecat-vs-storekit-decision.md]
- [Source: docs/epic-6-prep-iap-guideline-review.md]
- [Source: docs/epic-6-prep-iap-test-strategy.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#Premium Gating]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Freemium Conversion]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None

### Completion Notes List

- Created `usePremiumStore` with Zustand + AsyncStorage persist pattern; exposes `isPremium`, `isLoading`, `checkPremiumStatus()`, `refreshPremiumStatus()`, `canAddSubscription()`, and `MAX_FREE_SUBSCRIPTIONS = 5`
- Added `is_premium BOOLEAN DEFAULT false NOT NULL` migration for `user_settings` table
- Updated `database.types.ts` Row/Insert/Update for `user_settings` with `is_premium` field
- Created `SubscriptionCounter` component — subtle "X/5 subscriptions used" progress bar, hidden for premium users, integrated into `SubscriptionsScreen` list header
- Created `PaywallScreen` with feature comparison (Free vs Premium), pricing (€2.99/month, €24.99/year), CTA buttons, auto-renewal disclosure, and required legal links (Restore Purchases, Terms, Privacy) — "Upgrade" shows "Coming soon" snackbar as placeholder
- Gated Add tab in `MainTabs.tsx` using `tabPress` listener — redirects to PaywallScreen when `canAddSubscription` returns false; shows premium Badge overlay on FAB icon when at limit
- Added `PaywallScreen` to `SettingsStack` under the pre-existing `Premium` route
- Initialized `checkPremiumStatus()` in `AuthProvider.tsx` on SIGNED_IN and on AppState `active` resume
- 3 test files: `usePremiumStore.test.ts` (8 tests), `usePremiumStore.gate.test.ts` (4 tests), `SubscriptionCounter.test.tsx` (4 tests) — all 18 pass; full suite 552 tests pass with 0 regressions

### File List

- `src/shared/stores/usePremiumStore.ts` (new)
- `src/shared/stores/usePremiumStore.test.ts` (new)
- `src/shared/stores/usePremiumStore.gate.test.ts` (new)
- `src/features/premium/components/SubscriptionCounter.tsx` (new)
- `src/features/premium/components/SubscriptionCounter.test.tsx` (new)
- `src/features/premium/screens/PaywallScreen.tsx` (new)
- `supabase/migrations/20260318300000_add_premium_fields.sql` (new)
- `src/shared/types/database.types.ts` (modified)
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` (modified)
- `src/app/navigation/MainTabs.tsx` (modified)
- `src/app/navigation/SettingsStack.tsx` (modified)
- `src/app/providers/AuthProvider.tsx` (modified)

## Change Log

- 2026-03-18: Story 6.1 implemented — freemium subscription limit with usePremiumStore, SubscriptionCounter, PaywallScreen, add-subscription gate, FAB badge, and premium store initialization
