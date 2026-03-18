# Story 6.2: Premium Feature Benefits Display

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see what premium offers before committing to purchase,
So that I can make an informed decision about upgrading.

## Acceptance Criteria

1. **AC1: Premium Benefits Screen for Free Users**
   - **Given** the user navigates to Settings > Premium or taps any premium upsell prompt
   - **When** the premium benefits screen loads
   - **Then** a clear comparison is displayed showing Free vs Premium features: subscription limits, reminder options, calendar sync, data export, and analytics access
   - **And** pricing is clearly shown: €2.99/month or €24.99/year (save 30%)
   - **And** a prominent "Subscribe" CTA is displayed
   - **And** the design follows the soft upsell approach (no aggressive popups)

2. **AC2: Premium Subscriber Status View**
   - **Given** the user is already a premium subscriber
   - **When** they view the premium screen
   - **Then** their current subscription status is shown: plan type, renewal date, and "Manage Subscription" option

## Tasks / Subtasks

- [x] Task 1: Refactor PaywallScreen into a context-aware Premium screen (AC: #1, #2)
  - [x] 1.1: Rename and enhance `src/features/premium/screens/PaywallScreen.tsx` to handle both free and premium user states
  - [x] 1.2: Accept an optional `source` route param to support navigation from different entry points (settings vs. upsell gate) — update `SettingsStackParamList` in `types.ts`
  - [x] 1.3: When `isPremium === false` → show the existing paywall UI (feature comparison, pricing, CTAs) — this is already implemented
  - [x] 1.4: When `isPremium === true` → show the premium status view (Task 3)
  - [x] 1.5: Dynamic header: free users see "Unlock Premium", premium users see "Your Premium Plan"

- [x] Task 2: Enhance feature comparison for free users (AC: #1)
  - [x] 2.1: Expand the existing `FREE_FEATURES` and `PREMIUM_FEATURES` arrays to include all differentiating features from the epic spec:
    - Free: Up to 5 subscriptions, Basic renewal reminders, Basic spending overview
    - Premium: Unlimited subscriptions, Advanced reminder options, Calendar sync, Data export (CSV/JSON), Full analytics & insights
  - [x] 2.2: Use a side-by-side or stacked comparison with clear visual distinction (checkmark vs. cross/lock icon)
  - [x] 2.3: Keep the existing pricing section (€2.99/month, €24.99/year with "Save 30%") and auto-renewal disclosures
  - [x] 2.4: Ensure "Subscribe" / "Upgrade to Premium" CTA remains a placeholder (shows "Coming soon" snackbar) — actual purchase flow is Story 6.3
  - [x] 2.5: Keep existing legal links (Restore Purchases, Terms, Privacy) — functional implementation in Stories 6.3/6.4

- [x] Task 3: Premium subscriber status view (AC: #2)
  - [x] 3.1: Create a `PremiumStatusCard` component in `src/features/premium/components/PremiumStatusCard.tsx`
  - [x] 3.2: Display: crown icon, "Premium Active" badge, plan type placeholder text ("Premium Subscription")
  - [x] 3.3: Renewal date: show placeholder text for now ("Managed via App Store / Play Store") — real data comes after RevenueCat integration in Story 6.3
  - [x] 3.4: "Manage Subscription" button that opens the native subscription management URL (`Linking.openURL` to App Store/Play Store subscription settings)
  - [x] 3.5: Show list of premium features the user has access to (same premium features list but with all-unlocked styling)
  - [x] 3.6: Use `secondary` theme color (#8B5CF6) as accent for premium elements (consistent with Story 6.1)

- [x] Task 4: Add "Premium" entry to Settings screen (AC: #1, #2)
  - [x] 4.1: Add a "Premium" `List.Section` in `SettingsScreen.tsx` between Notifications and Calendar sections
  - [x] 4.2: For free users: icon "crown-outline", title "Premium", description "Unlock unlimited subscriptions"
  - [x] 4.3: For premium users: icon "crown" (filled), title "Premium", description "Active" with secondary color
  - [x] 4.4: `onPress` → `navigation.navigate('Premium')`
  - [x] 4.5: Read `isPremium` from `usePremiumStore`

- [x] Task 5: Platform-specific subscription management URLs (AC: #2)
  - [x] 5.1: Create a utility `src/features/premium/services/subscriptionManagement.ts`
  - [x] 5.2: Export `openSubscriptionManagement()` function using `Platform.OS` to determine URL:
    - iOS: `itms-apps://apps.apple.com/account/subscriptions`
    - Android: `https://play.google.com/store/account/subscriptions`
  - [x] 5.3: Use `Linking.openURL` with error handling (show snackbar if can't open)

- [x] Task 6: Tests (AC: #1, #2)
  - [x] 6.1: Unit test PaywallScreen — renders feature comparison for free users, renders status view for premium users
  - [x] 6.2: Unit test PremiumStatusCard — renders active status, manage subscription button
  - [x] 6.3: Unit test SettingsScreen Premium entry — shows correct icon/description based on premium status
  - [x] 6.4: Co-locate tests with source files per project convention

## Dev Notes

### Key Insight: PaywallScreen Already Exists

Story 6.1 created `PaywallScreen.tsx` with feature comparison, pricing, CTAs, and legal links. This story enhances it to:
1. Be context-aware (show different UI for free vs premium users)
2. Add a premium subscriber status view
3. Add a Settings entry point

**Do NOT create a separate screen** — enhance the existing `PaywallScreen.tsx`. The route is already registered as `Premium` in `SettingsStack.tsx` and `SettingsStackParamList`.

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| PaywallScreen | `src/features/premium/screens/PaywallScreen.tsx` | Enhance with premium status branch |
| usePremiumStore | `src/shared/stores/usePremiumStore.ts` | Read `isPremium` state |
| Premium route | `src/app/navigation/SettingsStack.tsx` line 32-35 | Already registered, no changes needed |
| Navigation types | `src/app/navigation/types.ts` line 19 | `Premium: undefined` — may need `source` param |
| Theme secondary color | `src/config/theme.ts` | `#8B5CF6` for premium accent elements |
| SettingsScreen | `src/features/settings/screens/SettingsScreen.tsx` | Add Premium List.Item entry |

### What NOT to Do

- Do NOT create a new screen file — enhance existing `PaywallScreen.tsx`
- Do NOT implement actual subscription management via RevenueCat — that's Story 6.3
- Do NOT show real renewal dates — use placeholder text until RevenueCat is integrated
- Do NOT install any new dependencies — use existing `react-native-paper`, `@react-navigation`, `react-native` Linking/Platform
- Do NOT make the upgrade prompt aggressive — follow soft upsell approach per UX spec
- Do NOT add `usePremiumStore` fields for plan type or renewal date — those come with RevenueCat in Story 6.3

### Platform Subscription Management URLs

Standard deep links that don't require any library:
- iOS: `itms-apps://apps.apple.com/account/subscriptions`
- Android: `https://play.google.com/store/account/subscriptions`

### Testing Pattern

Follow co-located test pattern established in Story 6.1:
- `PaywallScreen.tsx` → `PaywallScreen.test.tsx` (in same directory)
- `PremiumStatusCard.tsx` → `PremiumStatusCard.test.tsx`
- Use existing Jest + React Native Testing Library setup

### Project Structure Notes

- All premium UI goes in `src/features/premium/` (already scaffolded)
- New component `PremiumStatusCard` in `src/features/premium/components/`
- New service utility in `src/features/premium/services/`
- Settings screen modification in `src/features/settings/screens/SettingsScreen.tsx`
- Test files co-located with source files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Premium Gating]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Freemium Conversion]
- [Source: _bmad-output/implementation-artifacts/6-1-freemium-subscription-limit.md]
- [Source: src/features/premium/screens/PaywallScreen.tsx]
- [Source: src/shared/stores/usePremiumStore.ts]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Enhanced `PaywallScreen.tsx` to be context-aware: reads `isPremium` from `usePremiumStore` and renders paywall UI for free users, `PremiumStatusCard` for premium users.
- Dynamic header: free users see "Unlock Premium", premium users see "Your Premium Plan" (via SettingsStack title config — screen itself renders status card).
- Expanded `FREE_FEATURES` (3 items) and `PREMIUM_FEATURES` (5 items) arrays per epic spec.
- Created `PremiumStatusCard` component with crown icon, "Premium Active" badge, plan type, renewal placeholder, "Manage Subscription" button, and all-unlocked premium feature list.
- Created `subscriptionManagement.ts` utility with `openSubscriptionManagement()` using `Platform.OS` to choose correct deep link URL; throws on failure so caller can show snackbar.
- Added `source` optional param to `SettingsStackParamList.Premium` in `types.ts`.
- Added "Premium" `List.Section` to `SettingsScreen.tsx` between Notifications and Calendar sections; shows correct icon/description based on `isPremium`.
- All tests co-located with source files. 30 new tests added (PaywallScreen: 14, PremiumStatusCard: 7, SettingsScreen Premium: 3, existing extended). 574 total tests pass, zero regressions.

### File List

- `src/features/premium/screens/PaywallScreen.tsx` (modified)
- `src/features/premium/screens/PaywallScreen.test.tsx` (created)
- `src/features/premium/components/PremiumStatusCard.tsx` (created)
- `src/features/premium/components/PremiumStatusCard.test.tsx` (created)
- `src/features/premium/services/subscriptionManagement.ts` (created)
- `src/features/settings/screens/SettingsScreen.tsx` (modified)
- `src/features/settings/screens/SettingsScreen.test.tsx` (modified)
- `src/app/navigation/types.ts` (modified)
- `src/app/navigation/SettingsStack.tsx` (modified)

## Change Log

- 2026-03-19: Initial implementation — context-aware PaywallScreen, PremiumStatusCard component, subscriptionManagement utility, Settings Premium entry, 30 new tests (claude-sonnet-4-6)
- 2026-03-19: Code review fixes — dynamic header title in SettingsStack (H1), premium description color in SettingsScreen (M1) (claude-opus-4-6)
