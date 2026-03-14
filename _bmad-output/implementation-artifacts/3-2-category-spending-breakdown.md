# Story 3.2: Category Spending Breakdown

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my spending broken down by category,
so that I can understand where most of my subscription money goes.

## Acceptance Criteria

1. **Category Breakdown Display**
   - Given the user has subscriptions with assigned categories
   - When they view the dashboard
   - Then a visual breakdown shows spending per category using the category color system
   - And each category displays: category name, color indicator, total monthly cost, percentage of total
   - And categories are sorted by cost (highest first)

2. **Category Visualization**
   - Given the user has subscriptions in multiple categories
   - When viewing the breakdown
   - Then a horizontal bar chart or proportional bar visualizes the spending proportions
   - And the chart uses the predefined category colors (Entertainment: #8B5CF6, Music: #EF4444, Productivity: #3B82F6, Storage: #F97316, Gaming: #22C55E, News: #A16207, Health: #EC4899, Other: #6B7280)

3. **Single/No Category Edge Case**
   - Given all subscriptions are in the same category or uncategorized
   - When viewing the breakdown
   - Then a single category is shown with 100% of spending
   - And the visualization remains clean and informative

4. **Empty State**
   - Given the user has no active subscriptions
   - When viewing the dashboard
   - Then the category breakdown section is not rendered (or shows a minimal placeholder)

## Tasks / Subtasks

- [x] Task 1: Create `calculateCategoryBreakdown` utility function (AC: #1, #3, #4)
  - [x] 1.1 Add function to `src/features/subscriptions/utils/subscriptionUtils.ts`
  - [x] 1.2 Accept `subscriptions` array, return sorted array of `{ categoryId, categoryLabel, color, icon, monthlyTotal, percentage }`
  - [x] 1.3 Filter only active subscriptions (`is_active !== false`) — reuse same filter logic as `calculateTotalMonthlyCost`
  - [x] 1.4 Use `calculateMonthlyEquivalent` for each subscription to normalize billing cycles
  - [x] 1.5 Use `getCategoryConfig` to resolve category colors/labels (subscriptions with `null` category → "Other")
  - [x] 1.6 Sort by `monthlyTotal` descending (highest first per AC #1)
  - [x] 1.7 Calculate percentage as `(categoryTotal / grandTotal) * 100`, handle division-by-zero (return 0%)

- [x] Task 2: Create `CategoryBreakdown` component (AC: #1, #2, #3)
  - [x] 2.1 Create `src/features/dashboard/components/CategoryBreakdown.tsx`
  - [x] 2.2 Accept props: `breakdownData` (array from Task 1), `totalMonthly` (number)
  - [x] 2.3 Render section header: "Spending by Category" (Text variant `titleMedium`, 24px semibold per UX typography scale)
  - [x] 2.4 Render a proportional horizontal bar at the top — colored segments representing each category's percentage, using category colors
  - [x] 2.5 Below the bar, render a list of category rows, each showing: color dot (10px circle), category name, monthly cost (right-aligned), percentage (right-aligned)
  - [x] 2.6 Use React Native Paper `Surface` for card container, `Text` for labels
  - [x] 2.7 Set `accessibilityLabel` on each row: "[Category] spending: [amount] euros, [percentage] percent of total"

- [x] Task 3: Integrate into HomeScreen (AC: #1, #4)
  - [x] 3.1 Import `CategoryBreakdown` and `calculateCategoryBreakdown` in `HomeScreen.tsx`
  - [x] 3.2 Compute breakdown data from existing `subscriptions` state (NO new store or service calls)
  - [x] 3.3 Render `CategoryBreakdown` below `SpendingHero` (inside the existing `ScrollView`)
  - [x] 3.4 Only render when `hasSubscriptions` is true AND at least one active subscription exists
  - [x] 3.5 Add 16px top margin between SpendingHero and CategoryBreakdown

- [x] Task 4: Write tests (AC: #1, #2, #3, #4)
  - [x] 4.1 Add tests for `calculateCategoryBreakdown` in `subscriptionUtils.test.ts`
  - [x] 4.2 Test: returns empty array when no subscriptions
  - [x] 4.3 Test: returns empty array when all subscriptions are inactive
  - [x] 4.4 Test: groups subscriptions by category with correct totals
  - [x] 4.5 Test: normalizes billing cycles (yearly/quarterly/weekly → monthly equivalent)
  - [x] 4.6 Test: sorts categories by monthly total descending
  - [x] 4.7 Test: calculates correct percentages (summing to ~100%)
  - [x] 4.8 Test: subscriptions with null category mapped to "Other"
  - [x] 4.9 Test: single category shows 100%
  - [x] 4.10 Create `src/features/dashboard/components/CategoryBreakdown.test.tsx`
  - [x] 4.11 Test: renders section header "Spending by Category"
  - [x] 4.12 Test: renders category names and amounts
  - [x] 4.13 Test: renders color bar segments
  - [x] 4.14 Test: renders correct percentage values
  - [x] 4.15 Test: accessibility labels contain category name and amount
  - [x] 4.16 Update `HomeScreen.test.tsx` — test that CategoryBreakdown appears when subscriptions exist
  - [x] 4.17 Update `HomeScreen.test.tsx` — test that CategoryBreakdown does NOT appear when no subscriptions
  - [x] 4.18 Run full regression — all 175 existing tests pass (193 total with 18 new)

- [x] Task 5: TypeScript and lint checks
  - [x] 5.1 Run `npx tsc --noEmit` — zero errors
  - [x] 5.2 Run `npx eslint src/features/dashboard/ src/features/subscriptions/utils/` — zero errors/warnings

## Dev Notes

### CRITICAL: No New Dependencies — Use Only Existing Libraries

**DO NOT** install any chart library (victory-native, react-native-gifted-charts, etc.) for this story. The category breakdown visualization is a **simple proportional horizontal bar** — build it with plain `View` components using `flex` or percentage widths. This is trivially implementable without any charting library.

Chart library evaluation is deferred to Story 3.3 (Visual Spending Summary) which has more complex visualization needs.

### Data Access — No New Store or Service Calls

All data comes from the existing `useSubscriptionStore`:

```typescript
// HomeScreen.tsx
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { calculateTotalMonthlyCost, calculateCategoryBreakdown } from '@features/subscriptions/utils/subscriptionUtils';

const subscriptions = useSubscriptionStore((s) => s.subscriptions);
const monthlyTotal = calculateTotalMonthlyCost(subscriptions);
const categoryBreakdown = calculateCategoryBreakdown(subscriptions);
```

### Utility Function: `calculateCategoryBreakdown`

Add to `src/features/subscriptions/utils/subscriptionUtils.ts` (where all subscription utilities live):

```typescript
export interface CategoryBreakdownItem {
  categoryId: string;
  categoryLabel: string;
  color: string;
  icon: string;
  monthlyTotal: number;
  percentage: number;
}

export function calculateCategoryBreakdown(
  subscriptions: { price: number; billing_cycle: string; is_active: boolean | null; category: string | null }[],
): CategoryBreakdownItem[] {
  const active = subscriptions.filter((sub) => sub.is_active !== false);
  if (active.length === 0) return [];

  // Group by category, calculate monthly totals
  const categoryMap = new Map<string, number>();
  for (const sub of active) {
    const config = getCategoryConfig(sub.category);
    const monthly = calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle);
    categoryMap.set(config.id, (categoryMap.get(config.id) ?? 0) + monthly);
  }

  const grandTotal = [...categoryMap.values()].reduce((sum, val) => sum + val, 0);

  // Build result, sorted by total descending
  return [...categoryMap.entries()]
    .map(([catId, total]) => {
      const config = getCategoryConfig(catId);
      return {
        categoryId: catId,
        categoryLabel: config.label,
        color: config.color,
        icon: config.icon,
        monthlyTotal: total,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}
```

**Key reuse points:**
- `getCategoryConfig(categoryId)` — already exists in `subscriptionUtils.ts` (line 125), maps any category string (or null) to `{ id, label, icon, color }`
- `calculateMonthlyEquivalent(price, cycle)` — already exists (line 33), handles monthly/yearly/quarterly/weekly normalization
- `SUBSCRIPTION_CATEGORIES` — defined in `@config/categories.ts`, all 8 categories with colors
- Filter `is_active !== false` — same logic as `calculateTotalMonthlyCost` (line 52)

### CategoryBreakdown Component Layout

```
┌─────────────────────────────────────────┐
│  Spending by Category                    │  ← section title (titleMedium)
│                                          │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░ │  ← proportional color bar
│  (Entertainment)  (Music)  (Other)       │    (segments use flex proportions)
│                                          │
│  ● Entertainment        €10.99    45%   │  ← category row
│  ● Music                 €7.99    33%   │
│  ● Other                 €5.49    22%   │
└─────────────────────────────────────────┘
```

**Proportional Color Bar Implementation:**
```typescript
// Simple horizontal bar with flex segments — NO chart library needed
<View style={styles.colorBar}>
  {breakdownData.map((item) => (
    <View
      key={item.categoryId}
      style={{
        flex: item.percentage,
        backgroundColor: item.color,
        height: 8,
      }}
    />
  ))}
</View>
```

**Styling:**
- Container: `Surface` with `elevation={1}`, `borderRadius: 12`, `marginHorizontal: 16`, `marginTop: 16`, `padding: 16`
- Section title: `Text variant="titleMedium"`, `marginBottom: 12`
- Color bar: `height: 8`, `borderRadius: 4`, `overflow: 'hidden'`, `flexDirection: 'row'`
- Category rows: `flexDirection: 'row'`, `alignItems: 'center'`, `paddingVertical: 8`
- Color dot: `width: 10`, `height: 10`, `borderRadius: 5`, `backgroundColor: item.color`
- Category label: `flex: 1`, `marginLeft: 8`
- Amount: `Text`, right-aligned, formatted as `€X.XX`
- Percentage: `Text`, right-aligned, `width: 50`, formatted as `XX%`

### HomeScreen Integration

Current HomeScreen structure (from Story 3.1):
```
<ScrollView>
  <SpendingHero ... />
  {!hasSubscriptions && <Button>Add First Subscription</Button>}
</ScrollView>
```

After Story 3.2:
```
<ScrollView>
  <SpendingHero ... />
  {hasSubscriptions && categoryBreakdown.length > 0 && (
    <CategoryBreakdown breakdownData={categoryBreakdown} totalMonthly={monthlyTotal} />
  )}
  {!hasSubscriptions && <Button>Add First Subscription</Button>}
</ScrollView>
```

**No navigation changes needed.** CategoryBreakdown is a display-only component within the existing HomeScreen ScrollView.

### Architecture Compliance

- **Feature Module:** New component in `src/features/dashboard/components/` — matches architecture doc feature structure
- **Utility Function:** Added to `src/features/subscriptions/utils/subscriptionUtils.ts` — this is where ALL subscription calculation utilities live (established pattern)
- **Component Pattern:** Functional component with TypeScript interfaces (PascalCase) — `CategoryBreakdown.tsx`
- **Cross-feature import:** Dashboard imports `calculateCategoryBreakdown` from `@features/subscriptions/utils/subscriptionUtils` — same pattern as Story 3.1 with `calculateTotalMonthlyCost`
- **Boundaries:** NO new Zustand store needed — reads from existing `useSubscriptionStore` via HomeScreen
- **Naming:** `CategoryBreakdown.tsx` (PascalCase, descriptive)

### File Structure

**Files to CREATE:**
```
src/features/dashboard/components/CategoryBreakdown.tsx
src/features/dashboard/components/CategoryBreakdown.test.tsx
```

**Files to MODIFY:**
```
src/features/subscriptions/utils/subscriptionUtils.ts    ← Add calculateCategoryBreakdown + CategoryBreakdownItem interface
src/features/dashboard/screens/HomeScreen.tsx             ← Import and render CategoryBreakdown
src/features/dashboard/screens/HomeScreen.test.tsx        ← Add CategoryBreakdown integration tests
src/features/dashboard/index.ts                           ← Add CategoryBreakdown export
```

**Files to NOT touch:**
```
src/config/categories.ts                                  ← SUBSCRIPTION_CATEGORIES already defined, no changes
src/shared/stores/useSubscriptionStore.ts                 ← No store changes needed
src/app/navigation/MainTabs.tsx                           ← No navigation changes
src/features/subscriptions/utils/subscriptionUtils.test.ts ← ADD tests here (existing file)
```

### Testing Requirements

**subscriptionUtils.test.ts — New tests for `calculateCategoryBreakdown`:**
```typescript
import { calculateCategoryBreakdown } from '../subscriptionUtils';

describe('calculateCategoryBreakdown', () => {
  it('returns empty array for empty subscriptions', () => {
    expect(calculateCategoryBreakdown([])).toEqual([]);
  });

  it('returns empty array when all inactive', () => {
    const subs = [{ price: 10, billing_cycle: 'monthly', is_active: false, category: 'music' }];
    expect(calculateCategoryBreakdown(subs)).toEqual([]);
  });

  it('groups by category with correct monthly totals', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'music' },
      { price: 5, billing_cycle: 'monthly', is_active: true, category: 'music' },
      { price: 120, billing_cycle: 'yearly', is_active: true, category: 'entertainment' },
    ];
    const result = calculateCategoryBreakdown(subs);
    expect(result[0].categoryId).toBe('music'); // 15/month > 10/month
    expect(result[0].monthlyTotal).toBe(15);
    expect(result[1].categoryId).toBe('entertainment');
    expect(result[1].monthlyTotal).toBe(10); // 120/12
  });

  // ... etc
});
```

**CategoryBreakdown.test.tsx setup:**
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { CategoryBreakdown } from '../CategoryBreakdown';

function renderComponent(props: ComponentProps) {
  return render(
    <PaperProvider theme={theme}>
      <CategoryBreakdown {...props} />
    </PaperProvider>,
  );
}
```

**Mock requirements:**
- `PaperProvider` wrapper required (established pattern)
- No navigation mocks needed (CategoryBreakdown is display-only)
- No store mocks needed in component tests (data passed via props)

**Regression:** All 175 existing tests must pass.

### Epic 2 Retro Action Items — Apply To This Story

**Action Item #1 (HIGH): Gesture accessibility**
- No swipe gestures in this story — CategoryBreakdown is display-only
- Set `accessibilityLabel` on each category row for screen reader support

**Action Item #2 (HIGH): Non-null assertion ban**
- NEVER use `result.data!` or any `!` non-null assertions
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead
- `getCategoryConfig` already handles null categories gracefully — no `!` needed

**Action Item #3 (MEDIUM): Test gotchas**
- `PaperProvider` wrapper required for all component tests
- jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0 (pinned — do not change)
- Use `jest.runAllTimers()` if testing any timed animations (unlikely in this story)

### Previous Story Intelligence (Story 3.1)

- 175 tests total after Story 3.1 (164 pre-existing + 11 new)
- HomeScreen was rewritten from placeholder — now has `ScrollView`, `SpendingHero`, and empty state CTA
- `SpendingHero` uses reanimated for scale animation — CategoryBreakdown does NOT need animation
- ESLint flat config with path aliases: `@features/*`, `@shared/*`, `@config/*`, `@app/*`
- `expo-linear-gradient` NOT in package.json — SpendingHero used solid color fallback
- Animation approach: static Text with Animated.View scale pulse — no AnimatedTextInput
- Test mocks pattern: `@react-native-async-storage/async-storage` + `@shared/services/supabase` + `@react-navigation/native` in HomeScreen tests
- `dashboard/index.ts` exports `SpendingHero` and `HomeScreen` — add `CategoryBreakdown` export

### Git Intelligence

**Recent commits:**
```
b40e5c1 story 3.1 done
6fc2949 story 3.1 in review
6d0c1fd create story 3.1
bf5512e epic-2 retro
```

**Commit pattern:** `create story X.Y` → `story X.Y in review` → `story X.Y done`
**Current state:** 175 tests green, TypeScript clean, ESLint clean, branch: master

### Project Structure Notes

- Feature boundary: All new dashboard components in `src/features/dashboard/components/`
- Utility function in `src/features/subscriptions/utils/subscriptionUtils.ts` — established location for all subscription calculation logic
- Import path aliases: `@features/subscriptions/utils/subscriptionUtils` for cross-feature utility import (same as Story 3.1)
- Test files co-located with component files (established in Epic 2, continued in Story 3.1)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.2: Category Spending Breakdown, lines 676–698]
- [Source: _bmad-output/planning-artifacts/prd.md — FR18: User can view subscription breakdown by category (line 778)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Category Color System (lines 570–581), Shock Value Pattern: Category Breakdown (line 730), Typography Scale (lines 583–592)]
- [Source: _bmad-output/planning-artifacts/architecture.md — dashboard feature module (lines 640–658), Feature Mapping FR16-FR20 → features/dashboard (line 754)]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-13.md — Action Items #1 (accessibility), #2 (non-null assertion), #3 (test gotchas), Epic 3 Next Preview: Story 3.2 depends on SUBSCRIPTION_CATEGORIES (2.6) and getCategoryConfig (2.2)]
- [Source: src/features/subscriptions/utils/subscriptionUtils.ts — getCategoryConfig (line 125), calculateMonthlyEquivalent (line 33), calculateTotalMonthlyCost (line 48)]
- [Source: src/config/categories.ts — SUBSCRIPTION_CATEGORIES with 8 categories and hex colors]
- [Source: src/features/dashboard/screens/HomeScreen.tsx — current layout with ScrollView + SpendingHero + empty state CTA]
- [Source: src/features/dashboard/components/SpendingHero.tsx — established component pattern reference]
- [Source: src/shared/stores/useSubscriptionStore.ts — subscriptions state with category field (string | null)]
- [Source: src/shared/types/database.types.ts — Subscription Row: category: string | null (line 40)]
- [Source: _bmad-output/implementation-artifacts/3-1-monthly-yearly-cost-summary.md — Previous story: dev notes, completion notes, file list]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- HomeScreen tests had duplicate text matches after CategoryBreakdown integration (€15.99 appeared in both SpendingHero and CategoryBreakdown). Fixed by using `getAllByText` instead of `getByText`.

### Completion Notes List

- Implemented `calculateCategoryBreakdown` utility in subscriptionUtils.ts — groups active subscriptions by category, normalizes billing cycles, calculates percentages, sorts by cost descending
- Created `CategoryBreakdown` component with proportional color bar (plain View + flex), category rows with color dots, amounts, and percentages
- Integrated into HomeScreen below SpendingHero, only rendered when active subscriptions exist
- Added 18 new tests (9 unit tests for utility, 6 component tests, 2 HomeScreen integration tests, 1 regression confirmation)
- All 193 tests pass, TypeScript clean, ESLint clean
- No new dependencies added — color bar built with plain View components
- Accessibility labels on every category row

### Change Log

- 2026-03-14: Story 3.2 implementation complete — category spending breakdown with proportional color bar and category list

### File List

**Created:**
- src/features/dashboard/components/CategoryBreakdown.tsx
- src/features/dashboard/components/CategoryBreakdown.test.tsx

**Modified:**
- src/features/subscriptions/utils/subscriptionUtils.ts (added CategoryBreakdownItem interface + calculateCategoryBreakdown function)
- src/features/subscriptions/utils/subscriptionUtils.test.ts (added 9 tests for calculateCategoryBreakdown)
- src/features/dashboard/screens/HomeScreen.tsx (imported and rendered CategoryBreakdown)
- src/features/dashboard/screens/HomeScreen.test.tsx (added 2 integration tests, fixed duplicate text matches)
- src/features/dashboard/index.ts (added CategoryBreakdown export)
