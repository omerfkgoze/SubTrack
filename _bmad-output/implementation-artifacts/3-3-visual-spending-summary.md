# Story 3.3: Visual Spending Summary

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a compelling visual summary of my spending,
so that I feel the emotional impact and am motivated to take action.

## Acceptance Criteria

1. **Quick Stats Display**
   - Given the user views the dashboard
   - When spending data is loaded
   - Then the SpendingHero shows: total active subscriptions count, monthly cost, yearly cost, and average cost per subscription
   - And these stats are displayed as "quick stat cards" inside the SpendingHero hero section

2. **Shock Value — Yearly Conversion**
   - Given the user has active subscriptions
   - When they view the dashboard
   - Then the yearly cost is prominently displayed as "= €X,XXX.XX per year" in the accent color
   - And numbers animate smoothly using `react-native-reanimated` when values change

3. **Smooth Animations**
   - Given the user adds or modifies a subscription
   - When they return to the dashboard
   - Then all quick stats (count, average cost) update with a smooth scale pulse animation via `react-native-reanimated`
   - And animation is skipped when system reduced-motion is enabled (`useReducedMotion()`)

4. **Savings Indicator**
   - Given the user has cancelled (inactive) subscriptions
   - When they view the dashboard
   - Then a "You're saving" indicator shows the monthly amount saved by cancelling
   - And the savings amount is displayed in green (#10B981)
   - And the section reads: "You're saving €X.XX/month by cancelling [N] subscription(s)"

5. **Empty / No-Savings Edge Cases**
   - Given the user has no inactive subscriptions
   - When they view the dashboard
   - Then the savings indicator is not shown
   - Given the user has no subscriptions at all
   - When they view the dashboard
   - Then the hero displays €0.00 with the existing empty state message (no quick stats rendered)

## Tasks / Subtasks

- [x] Task 1: Add utility functions to `subscriptionUtils.ts` (AC: #1, #4, #5)
  - [x] 1.1 Add `calculateActiveCount(subscriptions)`: returns count of active subs (`is_active !== false`)
  - [x] 1.2 Add `calculateAverageMonthlyCost(subscriptions)`: returns `monthlyTotal / activeCount` (0 if no active)
  - [x] 1.3 Add `calculateMonthlySavings(subscriptions)`: returns sum of monthly equivalents for `is_active === false` subs
  - [x] 1.4 Add `calculateInactiveCount(subscriptions)`: returns count of subs where `is_active === false`

- [x] Task 2: Extend `SpendingHero` component (AC: #1, #2, #3, #5)
  - [x] 2.1 Add new optional props: `subscriptionCount?: number`, `averageAmount?: number`, `showQuickStats?: boolean`
  - [x] 2.2 Render quick stats row when `showQuickStats && subscriptionCount > 0`: show count card ("N Active") and average card ("€X.XX avg")
  - [x] 2.3 Quick stats card layout: small numeric value (24px bold white) above a label (12px white/70%)
  - [x] 2.4 Stat card accessibility: `accessibilityLabel` on each card (e.g., "12 active subscriptions", "€15.83 average monthly cost")
  - [x] 2.5 Animate new stats in with the existing scale pulse (`useSharedValue`, `withSequence`) when `subscriptionCount` or `averageAmount` changes
  - [x] 2.6 Do NOT animate on first render (existing `isFirstRender` ref pattern already in place)

- [x] Task 3: Add `SavingsIndicator` component (AC: #4, #5)
  - [x] 3.1 Create `src/features/dashboard/components/SavingsIndicator.tsx`
  - [x] 3.2 Accept props: `savingsAmount: number`, `inactiveCount: number`
  - [x] 3.3 Only render when `savingsAmount > 0` AND `inactiveCount > 0`
  - [x] 3.4 Display text: "You're saving €X.XX/month by cancelling N subscription(s)" (pluralize "subscription")
  - [x] 3.5 Use `Surface` with `elevation={1}`, `borderRadius: 12`, `marginHorizontal: 16`, `marginTop: 16`
  - [x] 3.6 Style savings amount in success green: use inline style `color: '#10B981'` (UX spec success color)
  - [x] 3.7 Set `accessibilityLabel`: "You are saving €X.XX per month by cancelling N subscriptions"
  - [x] 3.8 Add savings icon: use `react-native-paper` `Icon` component with `source="trending-down"` in green

- [x] Task 4: Update `HomeScreen` to pass new props (AC: #1, #3, #4, #5)
  - [x] 4.1 Import new utilities: `calculateActiveCount`, `calculateAverageMonthlyCost`, `calculateMonthlySavings`, `calculateInactiveCount`
  - [x] 4.2 Compute all values from existing `subscriptions` store state — NO new store or service calls
  - [x] 4.3 Pass `subscriptionCount`, `averageAmount`, `showQuickStats={true}` to `SpendingHero`
  - [x] 4.4 Render `SavingsIndicator` below `CategoryBreakdown`, only when `savingsAmount > 0`
  - [x] 4.5 Export `SavingsIndicator` from `src/features/dashboard/index.ts`

- [x] Task 5: Write tests (AC: #1, #2, #3, #4, #5)
  - [x] 5.1 Add unit tests in `subscriptionUtils.test.ts` for all 4 new utilities:
    - [x] `calculateActiveCount`: empty array → 0; all active → count; mixed → only active; is_active=null → counted as active
    - [x] `calculateAverageMonthlyCost`: empty → 0; single active → price; multiple active + billing cycle normalization; all inactive → 0
    - [x] `calculateMonthlySavings`: empty → 0; no inactive → 0; inactive with billing cycles → monthly equivalent sum
    - [x] `calculateInactiveCount`: empty → 0; no inactive → 0; mixed → count of false only
  - [x] 5.2 Create `src/features/dashboard/components/SavingsIndicator.test.tsx`
    - [x] Test: renders savings message when amount > 0
    - [x] Test: renders correct amount formatted as €X.XX
    - [x] Test: pluralizes "subscription" correctly (1 vs N)
    - [x] Test: does NOT render when savingsAmount = 0
    - [x] Test: accessibility label contains amount and count
  - [x] 5.3 Update `SpendingHero.test.tsx`:
    - [x] Test: renders active count card when `showQuickStats` and `subscriptionCount > 0`
    - [x] Test: renders average amount card when `showQuickStats` and `averageAmount > 0`
    - [x] Test: does NOT render quick stats when `subscriptionCount = 0`
    - [x] Test: accessibility labels on stat cards
  - [x] 5.4 Update `HomeScreen.test.tsx`:
    - [x] Test: SavingsIndicator renders when inactive subscriptions exist
    - [x] Test: SavingsIndicator does NOT render when all subscriptions are active
    - [x] Test: quick stats card shows correct subscription count
    - [x] Run full regression — 230 tests pass (193 existing + 37 new)

- [x] Task 6: TypeScript and lint checks
  - [x] 6.1 Run `npx tsc --noEmit` — zero errors
  - [x] 6.2 Run `npx eslint src/features/dashboard/ src/features/subscriptions/utils/` — zero errors/warnings

## Dev Notes

### CRITICAL: Chart Library Decision — No Chart Library Needed for Story 3.3

**Research Summary (Epic 2 Retro Action Item):**

| Library | Verdict | Reason |
|---------|---------|--------|
| `victory-native` v37+ | ❌ Reject | Requires `react-native-svg`, adds ~500KB bundle, Hermes compatibility requires extra Babel config. Story 3.3 ACs do not require charts. |
| `react-native-gifted-charts` | ❌ Reject | Also requires SVG, heavier weight, overkill for metrics display. |
| Custom reanimated/View | ✅ Accept | Zero new dependencies. Story 3.3 is a **metrics display** (counts + amounts) and **savings indicator**, not a chart-heavy visualization. |

**Decision: No chart library added.** Story 3.3 needs:
- Quick stat cards (plain `View` with `Text`) inside SpendingHero
- Savings indicator (plain `Surface` + `Text`)
- Scale pulse animation via existing `react-native-reanimated` ~4.1.1

Category proportion was already handled in Story 3.2 with plain View flex bars — same approach applies here.

If a true chart (pie/line) is ever needed, defer to a future epic where requirements clearly justify the dependency.

### New Utility Functions — Add to `subscriptionUtils.ts`

All 4 functions are pure, stateless additions. Add after `calculateCategoryBreakdown` at line 162.

```typescript
export function calculateActiveCount(
  subscriptions: { is_active: boolean | null }[],
): number {
  return subscriptions.filter((sub) => sub.is_active !== false).length;
}

export function calculateAverageMonthlyCost(
  subscriptions: { price: number; billing_cycle: string; is_active: boolean | null }[],
): number {
  const active = subscriptions.filter((sub) => sub.is_active !== false);
  if (active.length === 0) return 0;
  const total = active.reduce(
    (sum, sub) => sum + calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle),
    0,
  );
  return total / active.length;
}

export function calculateMonthlySavings(
  subscriptions: { price: number; billing_cycle: string; is_active: boolean | null }[],
): number {
  return subscriptions
    .filter((sub) => sub.is_active === false)
    .reduce(
      (sum, sub) => sum + calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle),
      0,
    );
}

export function calculateInactiveCount(
  subscriptions: { is_active: boolean | null }[],
): number {
  return subscriptions.filter((sub) => sub.is_active === false).length;
}
```

**is_active semantics (from DB schema and Epic 2 patterns):**
- `is_active === false` → explicitly cancelled/inactive → counted for savings
- `is_active === null` → treated as active (same as `calculateTotalMonthlyCost`)
- `is_active === true` → active

### `SpendingHero` Extension — Props Interface

Current props (DO NOT CHANGE existing props):
```typescript
interface SpendingHeroProps {
  amount: number;
  currency?: string;
  showYearly?: boolean;
  animateOnChange?: boolean;
}
```

Extended props (ADD to interface):
```typescript
interface SpendingHeroProps {
  amount: number;
  currency?: string;
  showYearly?: boolean;
  animateOnChange?: boolean;
  // NEW in Story 3.3:
  subscriptionCount?: number;
  averageAmount?: number;
  showQuickStats?: boolean;
}
```

**Quick Stats Layout (inside SpendingHero):**
```
┌─────────────────────────────────────┐
│  €189.99                            │  ← hero (existing, 48px bold white)
│  per month                          │  ← subtitle (existing)
│  = €2,279.88 per year               │  ← yearly (existing, tertiary color)
│                                     │
│  ┌─────────────┐  ┌───────────────┐ │  ← NEW: quick stats row
│  │     12      │  │   €15.83      │ │
│  │  active     │  │   average     │ │
│  └─────────────┘  └───────────────┘ │
└─────────────────────────────────────┘
```

**Quick stats styling:**
```typescript
// Quick stats row — render when showQuickStats && subscriptionCount > 0
<View style={styles.quickStatsRow}>
  <View
    style={styles.statCard}
    accessible
    accessibilityLabel={`${subscriptionCount} active subscriptions`}
  >
    <Text style={styles.statValue}>{subscriptionCount}</Text>
    <Text style={styles.statLabel}>active</Text>
  </View>
  <View
    style={styles.statCard}
    accessible
    accessibilityLabel={`${currency}${averageAmount?.toFixed(2)} average monthly cost`}
  >
    <Text style={styles.statValue}>{`${currency}${(averageAmount ?? 0).toFixed(2)}`}</Text>
    <Text style={styles.statLabel}>average</Text>
  </View>
</View>

// Styles:
quickStatsRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 16,
}
statCard: {
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  borderRadius: 8,
  minWidth: 90,
}
statValue: {
  fontSize: 24,
  fontWeight: '600',
  color: '#FFFFFF',
}
statLabel: {
  fontSize: 12,
  color: 'rgba(255, 255, 255, 0.7)',
  marginTop: 2,
}
```

### `SavingsIndicator` Component

**New file: `src/features/dashboard/components/SavingsIndicator.tsx`**

```typescript
// SavingsIndicator.tsx pattern:
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';

interface SavingsIndicatorProps {
  savingsAmount: number;
  inactiveCount: number;
}

export function SavingsIndicator({ savingsAmount, inactiveCount }: SavingsIndicatorProps) {
  if (savingsAmount <= 0 || inactiveCount <= 0) return null;

  const formattedAmount = `€${savingsAmount.toFixed(2)}`;
  const subText = inactiveCount === 1 ? 'subscription' : 'subscriptions';
  const accessibilityText = `You are saving ${formattedAmount} per month by cancelling ${inactiveCount} ${subText}`;

  return (
    <Surface
      style={styles.container}
      elevation={1}
      accessible
      accessibilityLabel={accessibilityText}
    >
      <View style={styles.row}>
        <Icon source="trending-down" size={20} color="#10B981" />
        <Text style={styles.text}>
          {"You're saving "}
          <Text style={styles.amount}>{formattedAmount}</Text>
          {`/month by cancelling ${inactiveCount} ${subText}`}
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
  },
  amount: {
    color: '#10B981',
    fontWeight: '600',
  },
});
```

**Why a separate component (not inside SpendingHero):**
- SpendingHero already has complex animation logic; savings is a conceptually separate "below the fold" indicator
- Follows the pattern of Story 3.2 adding `CategoryBreakdown` as a separate component rendered from `HomeScreen`
- Easier to test independently

### `HomeScreen` Updated Structure

After Story 3.3:
```typescript
export function HomeScreen() {
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const monthlyTotal = calculateTotalMonthlyCost(subscriptions);
  const categoryBreakdown = calculateCategoryBreakdown(subscriptions);
  const activeCount = calculateActiveCount(subscriptions);
  const averageMonthly = calculateAverageMonthlyCost(subscriptions);
  const monthlySavings = calculateMonthlySavings(subscriptions);
  const inactiveCount = calculateInactiveCount(subscriptions);
  const hasSubscriptions = subscriptions.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SpendingHero
        amount={monthlyTotal}
        currency="€"
        showYearly
        animateOnChange
        showQuickStats
        subscriptionCount={activeCount}
        averageAmount={averageMonthly}
      />
      {hasSubscriptions && categoryBreakdown.length > 0 && (
        <CategoryBreakdown breakdownData={categoryBreakdown} totalMonthly={monthlyTotal} />
      )}
      {monthlySavings > 0 && (
        <SavingsIndicator savingsAmount={monthlySavings} inactiveCount={inactiveCount} />
      )}
      {!hasSubscriptions && (
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Add')}
          style={styles.ctaButton}
        >
          Add First Subscription
        </Button>
      )}
    </ScrollView>
  );
}
```

### Architecture Compliance

- **Feature Module:** New component in `src/features/dashboard/components/` — established pattern
- **Utility Functions:** Added to `src/features/subscriptions/utils/subscriptionUtils.ts` — all subscription calculation utilities live here
- **No New Zustand Store:** All data from `useSubscriptionStore` via `HomeScreen` — same pattern as 3.1, 3.2
- **No New Dependencies:** `react-native-reanimated`, `react-native-paper`, plain `View` only
- **Cross-Feature Import:** Dashboard imports from `@features/subscriptions/utils/subscriptionUtils` — already established pattern
- **Component Pattern:** Functional components, TypeScript interfaces, PascalCase files

### File Structure

**Files to CREATE:**
```
src/features/dashboard/components/SavingsIndicator.tsx
src/features/dashboard/components/SavingsIndicator.test.tsx
```

**Files to MODIFY:**
```
src/features/subscriptions/utils/subscriptionUtils.ts       ← Add 4 new utility functions
src/features/subscriptions/utils/subscriptionUtils.test.ts  ← Add tests for new utilities
src/features/dashboard/components/SpendingHero.tsx          ← Add subscriptionCount, averageAmount, showQuickStats props
src/features/dashboard/components/SpendingHero.test.tsx     ← Add tests for new props
src/features/dashboard/screens/HomeScreen.tsx               ← Pass new props, render SavingsIndicator
src/features/dashboard/screens/HomeScreen.test.tsx          ← Add integration tests
src/features/dashboard/index.ts                             ← Add SavingsIndicator export
```

**Files NOT to touch:**
```
src/shared/stores/useSubscriptionStore.ts       ← No store changes needed
src/app/navigation/MainTabs.tsx                 ← No navigation changes
src/config/categories.ts                        ← No changes
```

### Testing Requirements

**subscriptionUtils.test.ts — new describe block:**
```typescript
describe('calculateActiveCount', () => {
  it('returns 0 for empty array', () => {
    expect(calculateActiveCount([])).toBe(0);
  });
  it('counts active and null as active', () => {
    expect(calculateActiveCount([
      { is_active: true },
      { is_active: null },
      { is_active: false },
    ])).toBe(2);
  });
});

describe('calculateAverageMonthlyCost', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverageMonthlyCost([])).toBe(0);
  });
  it('returns 0 when all inactive', () => {
    expect(calculateAverageMonthlyCost([
      { price: 10, billing_cycle: 'monthly', is_active: false },
    ])).toBe(0);
  });
  it('calculates average of monthly equivalents', () => {
    // 10/month + 120/year(=10/month) = 20 total / 2 = 10 average
    expect(calculateAverageMonthlyCost([
      { price: 10, billing_cycle: 'monthly', is_active: true },
      { price: 120, billing_cycle: 'yearly', is_active: true },
    ])).toBe(10);
  });
});

describe('calculateMonthlySavings', () => {
  it('returns 0 for empty array', () => {
    expect(calculateMonthlySavings([])).toBe(0);
  });
  it('returns 0 when no inactive subscriptions', () => {
    expect(calculateMonthlySavings([
      { price: 10, billing_cycle: 'monthly', is_active: true },
    ])).toBe(0);
  });
  it('sums monthly equivalents of inactive subscriptions', () => {
    expect(calculateMonthlySavings([
      { price: 10, billing_cycle: 'monthly', is_active: false },
      { price: 120, billing_cycle: 'yearly', is_active: false },
      { price: 5, billing_cycle: 'monthly', is_active: true },  // excluded
    ])).toBeCloseTo(20); // 10 + 120/12
  });
});

describe('calculateInactiveCount', () => {
  it('returns 0 for empty array', () => {
    expect(calculateInactiveCount([])).toBe(0);
  });
  it('counts only is_active === false (not null)', () => {
    expect(calculateInactiveCount([
      { is_active: false },
      { is_active: null },
      { is_active: true },
    ])).toBe(1);
  });
});
```

**SavingsIndicator.test.tsx setup:**
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { SavingsIndicator } from '../SavingsIndicator';

function renderComponent(props: { savingsAmount: number; inactiveCount: number }) {
  return render(
    <PaperProvider theme={theme}>
      <SavingsIndicator {...props} />
    </PaperProvider>,
  );
}
```

**SpendingHero.test.tsx additions:**
```typescript
it('renders active count stat card when showQuickStats and count > 0', () => {
  const { getByLabelText } = renderComponent({ amount: 17.99, showQuickStats: true, subscriptionCount: 5 });
  expect(getByLabelText(/5 active subscriptions/)).toBeTruthy();
});

it('renders average amount stat card', () => {
  const { getByLabelText } = renderComponent({
    amount: 17.99,
    showQuickStats: true,
    subscriptionCount: 2,
    averageAmount: 8.99,
  });
  expect(getByLabelText(/8.99 average monthly cost/)).toBeTruthy();
});

it('does not render stat cards when subscriptionCount is 0', () => {
  const { queryByLabelText } = renderComponent({ amount: 0, showQuickStats: true, subscriptionCount: 0 });
  expect(queryByLabelText(/active subscriptions/)).toBeNull();
});
```

**Mock requirements (same as established pattern):**
- `PaperProvider` wrapper required for all component tests
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned — do not change)
- `jest.runAllTimers()` for any Paper Snackbar timing (unlikely in this story)
- HomeScreen tests: mock `@react-navigation/native`, `@react-native-async-storage/async-storage`, `@shared/services/supabase`

**Regression baseline:** 193 tests must all pass.

### Epic 2 Retro Action Items — Apply to This Story

**Action Item #1 (HIGH): Gesture Accessibility**
- No swipe gestures in this story — display-only components
- Set `accessibilityLabel` on quick stat cards and SavingsIndicator (defined above)
- Quick stats `accessible` + `accessibilityLabel` per each card

**Action Item #2 (HIGH): Non-null assertion ban**
- NEVER use `result.data!` or any `!` non-null assertion
- Use `??` for defaults: `(averageAmount ?? 0).toFixed(2)`
- `savingsAmount.toFixed(2)` is safe (always number from utility)

**Action Item #3 (MEDIUM): Test gotchas**
- `PaperProvider` wrapper required (all component tests)
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` pinned — do not upgrade
- `jest.runAllTimers()` for Paper Snackbar (not applicable here)
- `getAllByText` if same text appears in multiple components (SpendingHero + SavingsIndicator may both show currency amounts)

### Previous Story Intelligence (Story 3.2)

- 193 tests total after Story 3.2 (175 + 18 new)
- HomeScreen structure: `ScrollView` → `SpendingHero` → `CategoryBreakdown` → empty state CTA
- `calculateCategoryBreakdown` in `subscriptionUtils.ts` established the pattern for multi-stat computations
- `CategoryBreakdown` component structure (Surface card, row layout) is the reference pattern for `SavingsIndicator`
- ESLint flat config, path aliases: `@features/*`, `@shared/*`, `@config/*`, `@app/*`
- `dashboard/index.ts` currently exports: `SpendingHero`, `CategoryBreakdown`, `HomeScreen` — add `SavingsIndicator`
- Test: `getAllByText` needed when same value appears in multiple places (HomeScreen.test.tsx pattern from Story 3.2)

### Git Intelligence

**Recent commits:**
```
3a66838 story 3.2 done
3e03c29 story 3.2 in review
27b78b0 story 3.2 ready-for-dev
b40e5c1 story 3.1 done
6fc2949 story 3.1 in review
```

**Commit pattern:** `create story X.Y` → `story X.Y ready-for-dev` → `story X.Y in review` → `story X.Y done`
**Current state:** 193 tests green, TypeScript clean, ESLint clean, branch: master

### Project Structure Notes

- All new files in `src/features/dashboard/components/` — feature boundary respected
- New utility functions in `src/features/subscriptions/utils/subscriptionUtils.ts` — established utility location
- `@features/subscriptions/utils/subscriptionUtils` import path in HomeScreen — cross-feature utility import is the established pattern
- Test files co-located with component files

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.3: Visual Spending Summary]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — SpendingHero anatomy (props: subscriptionCount, averageAmount, showQuickStats), Shock Value Pattern, color system (#10B981 = success/savings)]
- [Source: _bmad-output/planning-artifacts/architecture.md — dashboard feature module, Feature Mapping FR16-FR20]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-13.md — Action Items #1/#2/#3, Epic 3 Prep: Chart Library Decision, SpendingHero animation research]
- [Source: _bmad-output/implementation-artifacts/3-2-category-spending-breakdown.md — SavingsIndicator pattern, HomeScreen structure post-3.2, 193 test baseline]
- [Source: _bmad-output/implementation-artifacts/3-1-monthly-yearly-cost-summary.md — SpendingHero implementation, animation pattern (useSharedValue + withSequence), isFirstRender ref pattern]
- [Source: src/features/dashboard/components/SpendingHero.tsx — current implementation (102 lines), existing props + animation logic]
- [Source: src/features/dashboard/screens/HomeScreen.tsx — current structure after 3.2]
- [Source: src/features/subscriptions/utils/subscriptionUtils.ts — calculateTotalMonthlyCost (line 48), calculateMonthlyEquivalent (line 33), calculateCategoryBreakdown (line 134), getCategoryConfig (line 164)]
- [Source: src/shared/stores/useSubscriptionStore.ts — subscriptions state, is_active field typing]
- [Source: package.json — react-native-reanimated ~4.1.1 installed, lottie-react-native ~7.3.1 installed (not needed), no chart library installed]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- ✅ Task 1: 4 pure utility functions added to subscriptionUtils.ts — calculateActiveCount, calculateAverageMonthlyCost, calculateMonthlySavings, calculateInactiveCount. All follow is_active semantics (null=active, false=inactive).
- ✅ Task 2: SpendingHero extended with subscriptionCount, averageAmount, showQuickStats props. Quick stats row renders when showQuickStats && subscriptionCount > 0. Animation dependencies updated to include new props. isFirstRender pattern preserved.
- ✅ Task 3: SavingsIndicator component created at src/features/dashboard/components/SavingsIndicator.tsx. Renders only when savingsAmount > 0 AND inactiveCount > 0. Pluralization handled. Green (#10B981) amount styling and trending-down icon applied.
- ✅ Task 4: HomeScreen updated — 4 new utility imports, all values computed from existing subscriptions store state (no new store/service calls), showQuickStats props passed to SpendingHero, SavingsIndicator rendered conditionally. SavingsIndicator exported from dashboard/index.ts.
- ✅ Task 5: 37 new tests across 4 files. Full regression: 230 tests pass (0 failures, 0 regressions).
- ✅ Task 6: npx tsc --noEmit = zero errors. npx eslint = zero errors/warnings.

### File List

**Created:**
- src/features/dashboard/components/SavingsIndicator.tsx
- src/features/dashboard/components/SavingsIndicator.test.tsx

**Modified:**
- src/features/subscriptions/utils/subscriptionUtils.ts
- src/features/subscriptions/utils/subscriptionUtils.test.ts
- src/features/dashboard/components/SpendingHero.tsx
- src/features/dashboard/components/SpendingHero.test.tsx
- src/features/dashboard/screens/HomeScreen.tsx
- src/features/dashboard/screens/HomeScreen.test.tsx
- src/features/dashboard/index.ts
- _bmad-output/implementation-artifacts/3-3-visual-spending-summary.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-03-14: Story 3.3 implemented — Added 4 utility functions (calculateActiveCount, calculateAverageMonthlyCost, calculateMonthlySavings, calculateInactiveCount), extended SpendingHero with quick stats display, created SavingsIndicator component, updated HomeScreen to wire all new data. 37 new tests added; 230 total tests pass.
