# Story 3.1: Monthly & Yearly Cost Summary

Status: ready-for-dev

## Story

As a user,
I want to see my total monthly and yearly subscription cost prominently displayed,
so that I understand the real impact of my subscriptions on my budget.

## Acceptance Criteria

1. **Hero Cost Display**
   - Given the user navigates to the Home (Dashboard) tab
   - When the dashboard loads
   - Then the total monthly cost is displayed as a large hero number with animated count-up effect (SpendingHero component)
   - And the yearly equivalent is shown below (monthly × 12)
   - And only active subscriptions are included in the calculation
   - And the currency symbol (€) is displayed correctly
   - And the dashboard loads within 1.5 seconds (NFR4)

2. **Empty State**
   - Given the user has no subscriptions
   - When they view the dashboard
   - Then €0.00 is displayed with an encouraging message to add subscriptions
   - And a CTA button leads to the Add subscription tab/form

3. **Real-Time Updates**
   - Given the user adds or removes a subscription
   - When they return to the dashboard
   - Then the totals are updated immediately with smooth number animation

## Tasks / Subtasks

- [ ] Task 1: Research & decide SpendingHero animation approach (AC: #1, #3)
  - [ ] 1.1 Evaluate `react-native-reanimated` (already installed ~4.1.1) — `useSharedValue` + `withTiming` for count-up
  - [ ] 1.2 Evaluate `react-native-animated-numbers` as alternative (would be new dependency)
  - [ ] 1.3 Decision: **Prefer reanimated** (already installed, zero new dependency). Document in dev notes.
  - [ ] 1.4 Implement count-up animation using `useSharedValue`, `withTiming`, `useAnimatedProps` + `AnimatedTextInput` or equivalent pattern

- [ ] Task 2: Create SpendingHero component (AC: #1, #2, #3)
  - [ ] 2.1 Create `src/features/dashboard/components/SpendingHero.tsx`
  - [ ] 2.2 Accept props: `amount` (number, monthly total), `currency` (string, default '€'), `showYearly` (boolean), `animateOnChange` (boolean)
  - [ ] 2.3 Display hero number (48px, bold, white on gradient background) — monthly total
  - [ ] 2.4 Display subtitle: "per month" (16px, white/80% opacity)
  - [ ] 2.5 Display yearly conversion: "= €X,XXX per year" (monthly × 12, 20px, accent color)
  - [ ] 2.6 Implement count-up animation when `amount` changes (use `useReducedMotion()` from reanimated to skip animation if user preference)
  - [ ] 2.7 Empty state: when amount is 0, display "€0.00" + "Add your first subscription to see your spending" message
  - [ ] 2.8 Set `accessibilityRole="header"` and `accessibilityLabel="Total monthly spending: [amount] euros"`

- [ ] Task 3: Create HomeScreen with dashboard layout (AC: #1, #2, #3)
  - [ ] 3.1 Rewrite `src/features/dashboard/screens/HomeScreen.tsx` (currently a placeholder — **complete rewrite required**)
  - [ ] 3.2 Read subscriptions from `useSubscriptionStore((s) => s.subscriptions)` — NO new service calls
  - [ ] 3.3 Compute `monthlyTotal = calculateTotalMonthlyCost(subscriptions)` — reuse existing utility
  - [ ] 3.4 Render `SpendingHero` with computed values at top of screen
  - [ ] 3.5 Display empty state CTA: Button navigating to "Add" tab when no subscriptions exist
  - [ ] 3.6 Wrap in `ScrollView` for future expandability (Story 3.2–3.4 will add more sections below)
  - [ ] 3.7 Add screen header: title "Dashboard" with `headerShown: false` (tab bar already handles this)

- [ ] Task 4: Write tests (AC: #1, #2, #3)
  - [ ] 4.1 Create `src/features/dashboard/components/SpendingHero.test.tsx`
  - [ ] 4.2 Test: renders monthly total correctly formatted (e.g., "€17.99")
  - [ ] 4.3 Test: renders yearly total (monthly × 12) correctly
  - [ ] 4.4 Test: renders €0.00 when amount is 0
  - [ ] 4.5 Test: shows empty state message when amount is 0
  - [ ] 4.6 Test: accessibilityLabel contains monthly amount
  - [ ] 4.7 Create `src/features/dashboard/screens/HomeScreen.test.tsx`
  - [ ] 4.8 Test: renders SpendingHero with correct total from store subscriptions
  - [ ] 4.9 Test: only active subscriptions included in total (is_active=false excluded)
  - [ ] 4.10 Test: shows empty state when no subscriptions in store
  - [ ] 4.11 Test: CTA button present when no subscriptions (empty state)
  - [ ] 4.12 Run full regression — all 164 existing tests must pass

- [ ] Task 5: TypeScript and lint checks
  - [ ] 5.1 Run `npx tsc --noEmit` — zero errors
  - [ ] 5.2 Run `npx eslint src/features/dashboard/` — zero errors/warnings

## Dev Notes

### CRITICAL: Animation Decision — Use react-native-reanimated (Already Installed)

**Decision:** Use `react-native-reanimated` ~4.1.1 (already in package.json). Do NOT add `react-native-animated-numbers` — Epic 2 zero-new-dependency discipline should continue.

**Animated count-up implementation pattern:**
```typescript
import Animated, { useSharedValue, withTiming, useAnimatedProps, useReducedMotion } from 'react-native-reanimated';
import { TextInput } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const animatedValue = useSharedValue(0);
const reducedMotion = useReducedMotion();

useEffect(() => {
  animatedValue.value = reducedMotion
    ? amount
    : withTiming(amount, { duration: 500 });
}, [amount]);

const animatedProps = useAnimatedProps(() => ({
  text: `€${animatedValue.value.toFixed(2)}`,
  defaultValue: `€${amount.toFixed(2)}`,
}));

<AnimatedTextInput
  animatedProps={animatedProps}
  editable={false}
  style={styles.heroNumber}
/>
```

**Alternative if AnimatedTextInput has issues in tests:** Use `withTiming` on opacity/scale for entrance animation only, display static value. The test environment mocks reanimated — verify mocks work.

**Reduced Motion:** Always call `useReducedMotion()` and skip animation when true. UX spec requires this.

### CRITICAL: HomeScreen Is A Placeholder — Full Rewrite Required

Current `src/features/dashboard/screens/HomeScreen.tsx` (8 lines):
```typescript
export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Dashboard</Text>
      <Text variant="bodyMedium" style={styles.placeholder}>
        Spending dashboard will be implemented in Epic 3
      </Text>
    </View>
  );
}
```

**This file must be completely rewritten.** The component name `HomeScreen` stays the same (already registered in MainTabs.tsx navigation).

**MainTabs.tsx does NOT need changes** — HomeScreen already registered as "Home" tab.

### Data Access — No New Service Calls Required

```typescript
// HomeScreen.tsx
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { calculateTotalMonthlyCost } from '@features/subscriptions/utils/subscriptionUtils';

export function HomeScreen() {
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const monthlyTotal = calculateTotalMonthlyCost(subscriptions);
  const hasSubscriptions = subscriptions.length > 0;
  // ...
}
```

`calculateTotalMonthlyCost` already filters `is_active !== false` — active-only filtering is handled.

### Empty State CTA Navigation

HomeScreen is in the "Home" tab of MainTabs. To navigate to "Add" tab:

```typescript
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from '@app/navigation/types';

const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList>>();

// CTA button:
<Button onPress={() => navigation.navigate('Add')}>Add First Subscription</Button>
```

### File Structure

**Dashboard feature has only `.gitkeep` placeholders — this is the first real implementation:**
```
src/features/dashboard/
├── components/
│   ├── .gitkeep         ← exists (placeholder)
│   └── SpendingHero.tsx ← CREATE
├── screens/
│   ├── .gitkeep         ← exists (placeholder)
│   └── HomeScreen.tsx   ← REWRITE (exists as placeholder)
├── hooks/
│   └── .gitkeep         ← exists (placeholder)
├── types/
│   └── .gitkeep         ← exists (placeholder)
└── index.ts             ← EXISTS (check if needs export update)
```

**Files to CREATE:**
```
src/features/dashboard/components/SpendingHero.tsx
src/features/dashboard/components/SpendingHero.test.tsx
src/features/dashboard/screens/HomeScreen.test.tsx
```

**Files to REWRITE:**
```
src/features/dashboard/screens/HomeScreen.tsx  ← Full rewrite from placeholder
```

**Files to NOT touch:**
```
src/app/navigation/MainTabs.tsx               ← HomeScreen already registered, no changes
src/app/navigation/types.ts                   ← No new routes needed
src/features/subscriptions/utils/subscriptionUtils.ts  ← calculateTotalMonthlyCost already exists
src/shared/stores/useSubscriptionStore.ts     ← No changes needed
```

### SpendingHero Layout (UX Spec)

```
┌─────────────────────────────────────┐
│  ░░░░░░ GRADIENT BACKGROUND ░░░░░░  │
│                                     │
│         €189.99                     │  ← heroNumber (48px, bold, white)
│         per month                   │  ← subtitle (16px, white/80%)
│                                     │
│    = €2,279.88 per year             │  ← yearlyConversion (20px, accent)
│                                     │
└─────────────────────────────────────┘
```

**Gradient:** Use `LinearGradient` from `expo-linear-gradient` (already installed in Expo SDK 54) OR use theme primary color solid background as fallback. Check if `expo-linear-gradient` is in package.json before using.

**Colors:**
- Background: gradient from `theme.colors.primary` (#6366F1) to a darker shade, OR solid `theme.colors.primary`
- Hero number: white (#FFFFFF)
- Subtitle: white at 80% opacity
- Yearly conversion: `theme.colors.tertiary` (#10B981) accent color

### Architecture Compliance

- **Feature Module:** `src/features/dashboard/` — all dashboard files go here
- **Component Pattern:** Functional components with TypeScript interfaces (PascalCase) — `SpendingHero.tsx`
- **Store Pattern:** HomeScreen reads from `useSubscriptionStore` via selector — NO direct service calls from screen
- **Cross-feature imports:** Dashboard feature may import from `@features/subscriptions/utils/subscriptionUtils` (feature→shared utils allowed) — but check if it would be cleaner to import from `@shared/utils/` if available
- **Boundaries:** Dashboard screen → reads from subscription store — NO new dashboard-specific Zustand store needed for Story 3.1 (data already available)
- **Naming:** `SpendingHero.tsx` (matches architecture doc spec exactly at line 754)

### Testing Requirements

**SpendingHero.test.tsx setup:**
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { SpendingHero } from '../SpendingHero';

function renderComponent(amount: number) {
  return render(
    <PaperProvider theme={theme}>
      <SpendingHero amount={amount} currency="€" showYearly animateOnChange />
    </PaperProvider>,
  );
}
```

**HomeScreen.test.tsx setup:**
```typescript
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';

// Before each test, set store state:
useSubscriptionStore.setState({
  subscriptions: [mockSubscription], // or []
  isLoading: false,
  isSubmitting: false,
  error: null,
  pendingDelete: null,
});
```

**Mock requirements:**
- `AsyncStorage` — jest mock (already in setup)
- `@supabase/supabase-js` — mock client (already in setup)
- `react-native-reanimated` — jest mock (already configured in jest.config.js via jest-expo preset)
- `mockNavigation` for useNavigation: `jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }))`

**Reanimated testing note:** `jest-expo` preset includes reanimated mock. Animated values resolve immediately in tests — assert static values, not animation frames.

**Regression:** All 164 existing tests must pass.

### Epic 2 Retro Action Items — Apply To This Story

**Action Item #1 (HIGH): Gesture accessibility**
- SpendingHero has `accessibilityRole="header"` and `accessibilityLabel="Total monthly spending: X euros"` (UX spec line 2553)
- No swipe gestures in this story — N/A for gesture `accessibilityActions`

**Action Item #2 (HIGH): Non-null assertion ban**
- NEVER use `result.data!` or any `!` non-null assertions
- Use optional chaining (`?.`) or explicit null checks instead
- Example: `const amount = result.data?.total ?? 0` NOT `result.data!.total`

**Action Item #3 (MEDIUM): Test gotchas**
- Use `jest.runAllTimers()` for Paper Snackbar (if used in this story)
- `PaperProvider` wrapper required for all component tests
- jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0 (pinned — do not change)

### Previous Story Intelligence (Story 2.8 — Last Completed)

- 164 tests total passing after Story 2.8 code review
- `useSubscriptionStore` has `subscriptions`, `isLoading`, `isSubmitting`, `error`, `pendingDelete` state
- All subscription utility functions (`calculateTotalMonthlyCost`, `getRenewalInfo`, `getTrialInfo`, `getCategoryConfig`) are battle-tested and ready
- ESLint flat config with path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`) — use these aliases consistently
- TypeScript strict mode — all props must be typed
- No new npm packages were added in stories 2.2–2.8 — maintain this discipline (reanimated already installed)

### Git Intelligence

**Commit pattern:** `story X.Y done` → `story X.Y in review` → `story X.Y ready-for-dev`
- Follow same convention for Story 3.1

**Current state:** 164 tests green, TypeScript clean, ESLint clean, git status clean, branch: master

### SpendingHero Research Summary (Retro Action: Story 3.1 Creation)

**Recommendation:** Use `react-native-reanimated` ~4.1.1 (already installed).

**Pattern for count-up animation:**
- `useSharedValue(0)` → `withTiming(amount, { duration: 500 })`
- Render value via `useAnimatedProps` on `Animated.createAnimatedComponent(TextInput)` (editable=false)
- OR: simpler approach — animate opacity/scale of Surface container, display static formatted number (avoids AnimatedTextInput complexity in tests)
- `useReducedMotion()` — skip animation if system setting

**Decision log:** `react-native-animated-numbers` rejected — new dependency not needed, reanimated covers this use case.

### Project Structure Notes

- Feature boundary: All new files in `src/features/dashboard/`
- Import utilities from `@features/subscriptions/utils/subscriptionUtils` (cross-feature import for utils is acceptable; data flows via store)
- ESLint path aliases: `@features/*` resolves to `src/features/*`
- Test files co-located with component/screen files (established in 2.5–2.8)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1: Monthly & Yearly Cost Summary, lines 647–675]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — SpendingHero anatomy, props, states, accessibility (lines 1432–1481), Focus Order (line 2558–2566)]
- [Source: _bmad-output/planning-artifacts/architecture.md — dashboard feature module structure (lines 640–658), Feature Mapping FR16-FR20 → features/dashboard (line 754)]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-13.md — Action Items #1 (accessibility), #2 (non-null assertion), #3 (test gotchas), Epic 3 preparation tasks]
- [Source: src/features/subscriptions/utils/subscriptionUtils.ts — calculateTotalMonthlyCost (line 48), calculateMonthlyEquivalent (line 33)]
- [Source: src/shared/stores/useSubscriptionStore.ts — subscriptions state, store interface]
- [Source: src/features/dashboard/screens/HomeScreen.tsx — current placeholder (complete rewrite required)]
- [Source: src/app/navigation/MainTabs.tsx — HomeScreen registered as "Home" tab, no nav changes needed]
- [Source: package.json — react-native-reanimated ~4.1.1 already installed]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
