# Story 6.5: Premium Entitlement Enforcement

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a premium user,
I want my unlimited subscription access to work reliably,
So that I get the value I'm paying for without interruptions.

## Acceptance Criteria

1. **AC1: Premium Features Fully Accessible**
   - **Given** the user has an active premium subscription (`isPremium === true`)
   - **When** they use the app
   - **Then** no subscription limit is enforced (already working via `canAddSubscription`)
   - **And** all premium features are accessible: unlimited subscriptions, calendar sync, data export, full analytics
   - **And** no upsell prompts are shown anywhere in the app

2. **AC2: Entitlement Validation on App Start/Resume**
   - **Given** the app starts or resumes from background
   - **When** the premium status is checked
   - **Then** the `validate-premium` Edge Function verifies entitlement with the store
   - **And** the local `usePremiumStore` Zustand store is updated
   - **And** premium status is cached locally in AsyncStorage to avoid unnecessary API calls

3. **AC3: Network Failure Grace Period**
   - **Given** the entitlement check fails due to network issues
   - **When** the app cannot reach the server
   - **Then** the cached premium status is used (grace period)
   - **And** a background retry is scheduled

## Tasks / Subtasks

- [ ] Task 1: Add premium feature gating for calendar sync, data export, and analytics (AC: #1)
  - [ ] 1.1: Add `isFeatureAvailable(feature: PremiumFeature)` helper to `usePremiumStore` — returns `true` if `isPremium`, otherwise checks if feature is in free tier. Free tier features: up to 5 subscriptions, basic reminders, basic dashboard overview. Premium-only features: `'calendar-sync'`, `'data-export'`, `'full-analytics'`
  - [ ] 1.2: In `SettingsScreen`, gate "Data Export" row — free users see a lock icon and tapping navigates to PaywallScreen instead of DataExport
  - [ ] 1.3: In `SettingsScreen`, gate "Preferred Calendar" row — free users see a lock icon and tapping navigates to PaywallScreen instead of opening calendar selection
  - [ ] 1.4: In subscription detail view, gate "Add to Calendar" button — free users see a premium badge; tapping navigates to PaywallScreen
  - [ ] 1.5: Ensure upsell prompts are NOT shown to premium users anywhere (verify SubscriptionCounter hidden, Add tab badge hidden, premium feature rows ungated)

- [ ] Task 2: Suppress all upsell prompts for premium users (AC: #1)
  - [ ] 2.1: Verify `SubscriptionCounter` component already hidden when `isPremium === true` (already done — no change needed)
  - [ ] 2.2: Verify MainTabs Add badge and PaywallScreen redirect already skip for premium (already done — no change needed)
  - [ ] 2.3: Add guard to any premium feature gate: if `isPremium`, always allow access without any upsell UI

- [ ] Task 3: Network failure grace period in `checkPremiumStatus` (AC: #3)
  - [ ] 3.1: In `usePremiumStore.checkPremiumStatus()`, when the Supabase query fails (network error), do NOT reset `isPremium` — keep the cached/persisted value from AsyncStorage as a grace period
  - [ ] 3.2: When `restorePurchasesService()` fails during expiry re-validation (line 82-84), do NOT immediately downgrade — instead keep cached `isPremium: true` as grace period and schedule a background retry
  - [ ] 3.3: Add `lastValidatedAt: string | null` to persisted state — track when entitlement was last successfully validated. If more than 7 days since last validation and still offline, then downgrade (prevents indefinite free riding)
  - [ ] 3.4: Add `scheduleRetry()` private helper — uses `setTimeout` (30s delay) to re-call `checkPremiumStatus()` silently. Maximum 3 retries per app session.

- [ ] Task 4: Tests (AC: #1, #2, #3)
  - [ ] 4.1: Unit test `isFeatureAvailable()` — premium user gets `true` for all features, free user gets `false` for premium-only features and `true` for free features
  - [ ] 4.2: Unit test SettingsScreen — premium user sees no lock icons on Data Export and Calendar; free user sees lock icons and tapping navigates to Premium screen
  - [ ] 4.3: Unit test `checkPremiumStatus()` grace period — when Supabase query fails, cached `isPremium` is preserved (not reset to false)
  - [ ] 4.4: Unit test `checkPremiumStatus()` grace expiry — when `lastValidatedAt` is >7 days old and still offline, `isPremium` is set to false
  - [ ] 4.5: Unit test retry logic — verify retry is scheduled on network failure, max 3 retries
  - [ ] 4.6: Co-locate tests with source files per project convention

## Dev Notes

### What Already Works (DO NOT Recreate)

| Feature | Location | Status |
|---------|----------|--------|
| Subscription limit gating (5 free) | `usePremiumStore.canAddSubscription()` | Working |
| Add tab PaywallScreen redirect | `MainTabs.tsx` lines 73-80 | Working |
| Add tab premium badge | `MainTabs.tsx` lines 57-69 | Working |
| SubscriptionCounter hidden for premium | `SubscriptionCounter.tsx` lines 12-14 | Working |
| Premium status check on auth change | `AuthProvider.tsx` line 38 | Working |
| Premium status refresh on foreground | `AuthProvider.tsx` lines 53-60 | Working |
| AsyncStorage cache of isPremium/planType/expiresAt | `usePremiumStore.ts` lines 175-183 | Working |
| Expiry re-validation via store restore | `usePremiumStore.checkPremiumStatus()` lines 67-85 | Working |
| PaywallScreen with free vs premium comparison | `PaywallScreen.tsx` | Working |
| PremiumStatusCard for active subscribers | `PremiumStatusCard.tsx` | Working |

### What Needs to Change

**1. Feature Gating (NEW)**

Currently calendar sync, data export, and full analytics are accessible to ALL users (no gating). The PaywallScreen LISTS them as premium features, but nothing actually blocks free users from using them. This story adds real enforcement.

Add to `usePremiumStore`:
```typescript
export type PremiumFeature = 'calendar-sync' | 'data-export' | 'full-analytics';

const FREE_FEATURES = new Set<string>([]); // No premium features in free tier

isFeatureAvailable: (feature: PremiumFeature) => {
  return get().isPremium || FREE_FEATURES.has(feature);
}
```

**2. SettingsScreen Gating Pattern**

For gated rows in SettingsScreen, use this pattern:
```typescript
const isPremium = usePremiumStore((s) => s.isPremium);

// For Data Export row:
onPress={() => isPremium ? navigation.navigate('DataExport') : navigation.navigate('Premium')}
// Add right icon: isPremium ? 'chevron-right' : 'lock'
```

Same pattern for Preferred Calendar row.

**3. Grace Period Fix (BUG FIX)**

Current `checkPremiumStatus()` has a problem: when `restorePurchasesService()` throws (network error) on line 82-84, it sets `isPremium: false`. This breaks AC3 — the user loses premium access just because they're offline. Fix:

```typescript
// BEFORE (current — incorrect):
} catch {
  set({ isPremium: false, planType: null, expiresAt: null, isLoading: false });
}

// AFTER (correct — grace period):
} catch {
  // Network failure: keep cached premium status as grace period
  set({ isLoading: false });
  scheduleRetry();
}
```

Also when the initial Supabase query fails (line 94-96), keep cached state:
```typescript
// BEFORE:
} else {
  set({ isLoading: false });
}

// AFTER — this is actually already correct (doesn't reset isPremium).
// But add lastValidatedAt tracking when query succeeds.
```

**4. Subscription Detail Calendar Button Gating**

Find where "Add to Calendar" button is rendered in the subscription detail screen. Gate it:
- Premium: show button normally
- Free: show button with lock icon, onPress navigates to PaywallScreen

### What NOT to Do

- Do NOT gate basic reminders — notification features are available to ALL tiers
- Do NOT gate the dashboard overview — the basic spending overview is free. "Full analytics" means category breakdown chart and detailed stats (if there's a distinction in the current implementation, gate accordingly; if not, skip this gating since the dashboard is already fully implemented for all users)
- Do NOT create a new screen for premium gating — reuse the existing PaywallScreen for all upsell redirects
- Do NOT modify the `validate-premium` Edge Function — it already works correctly
- Do NOT use RevenueCat — the project uses `react-native-iap` directly
- Do NOT add premium gating to notification features (reminders, history, settings) — these are free tier features
- Do NOT add feature flags or a remote config service — simple `isPremium` boolean check is sufficient for MVP

### Grace Period Constants

```typescript
const GRACE_PERIOD_DAYS = 7; // Max days to trust cached premium without validation
const RETRY_DELAY_MS = 30_000; // 30 seconds between retries
const MAX_RETRIES_PER_SESSION = 3;
```

### Existing Code Locations

| Component | Location | Change |
|-----------|----------|--------|
| usePremiumStore | `src/shared/stores/usePremiumStore.ts` | Add `isFeatureAvailable`, `lastValidatedAt`, grace period logic, retry |
| SettingsScreen | `src/features/settings/screens/SettingsScreen.tsx` | Gate Data Export and Calendar rows |
| AuthProvider | `src/app/providers/AuthProvider.tsx` | No changes needed |
| MainTabs | `src/app/navigation/MainTabs.tsx` | No changes needed |
| SubscriptionCounter | `src/features/premium/components/SubscriptionCounter.tsx` | No changes needed |
| PaywallScreen | `src/features/premium/screens/PaywallScreen.tsx` | No changes needed |
| Gate tests | `src/shared/stores/usePremiumStore.gate.test.ts` | Add `isFeatureAvailable` tests |
| SubscriptionDetail | Find via grep for "Add to Calendar" button | Gate calendar button |

### Testing Pattern

Follow co-located test pattern from Stories 6.1-6.4:
- Mock `react-native-iap` entirely
- Mock Supabase client (`from().select()`)
- Mock `restorePurchasesService` for network failure scenarios
- Test state transitions in Zustand store
- Use existing Jest + React Native Testing Library setup
- For SettingsScreen tests, verify navigation targets change based on `isPremium` state

### Project Structure Notes

- Modified: `src/shared/stores/usePremiumStore.ts` (add `isFeatureAvailable`, `lastValidatedAt`, grace period, retry)
- Modified: `src/shared/stores/usePremiumStore.gate.test.ts` (add feature availability tests)
- Modified: `src/shared/stores/usePremiumStore.test.ts` (add grace period and retry tests)
- Modified: `src/features/settings/screens/SettingsScreen.tsx` (gate Data Export and Calendar rows)
- Modified: `src/features/settings/screens/SettingsScreen.test.tsx` (test premium gating on settings rows)
- Modified: Subscription detail screen (gate Add to Calendar button)
- No new files needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR33-FR37 Premium → purchaseService.ts, usePremiumStore.ts]
- [Source: _bmad-output/implementation-artifacts/6-4-restore-previous-purchases.md — restore flow, checkPremiumStatus patterns]
- [Source: src/shared/stores/usePremiumStore.ts — current implementation]
- [Source: src/features/settings/screens/SettingsScreen.tsx — settings rows to gate]
- [Source: src/app/providers/AuthProvider.tsx — foreground refresh already working]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
