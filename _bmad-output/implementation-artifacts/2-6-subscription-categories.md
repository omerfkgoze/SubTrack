# Story 2.6: Subscription Categories

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to assign categories to my subscriptions,
so that I can organize and visually group my subscriptions.

## Acceptance Criteria

1. **Display Categories When Adding or Editing**
   - Given the user is adding or editing a subscription
   - When they reach the category field
   - Then 8 preset categories are displayed as color-coded chips: Entertainment (#8B5CF6), Music (#EF4444), Productivity (#3B82F6), Storage (#F97316), Gaming (#22C55E), News (#A16207), Health (#EC4899), Other (#6B7280)
   - And category selection is optional (not blocking)

2. **Category Display in Subscription List**
   - Given a subscription has a category assigned
   - When it appears in the list
   - Then the subscription card shows the category color stripe on the left edge
   - And the category name is displayed on the card

3. **Default Category for Uncategorized Subscriptions**
   - Given no category is assigned
   - When the subscription appears in the list
   - Then the "Other" category color (gray #6B7280) is used as default

## Tasks / Subtasks

- [ ] Task 1: Update category definitions to match UX spec (AC: #1, #2, #3)
  - [ ] 1.1 Update `src/config/categories.ts` with UX-spec colors, labels, and icons
  - [ ] 1.2 Update `getCategoryConfig()` in subscriptionUtils.ts if needed
  - [ ] 1.3 Update `src/config/popularServices.ts` defaultCategory references if IDs changed
  - [ ] 1.4 Write/update tests for category configuration and getCategoryConfig()
- [ ] Task 2: Create dedicated CategoryChip component (AC: #1)
  - [ ] 2.1 Create `src/features/subscriptions/components/CategoryChip.tsx`
  - [ ] 2.2 Implement selected/deselected states with category color background
  - [ ] 2.3 Add accessibility labels and roles
  - [ ] 2.4 Create `src/features/subscriptions/components/CategoryChip.test.tsx`
- [ ] Task 3: Update SubscriptionCard to display category name (AC: #2, #3)
  - [ ] 3.1 Add category name text to SubscriptionCard below or alongside existing info
  - [ ] 3.2 Ensure "Other" default is properly displayed for uncategorized subscriptions
  - [ ] 3.3 Update accessibility label to include category name
  - [ ] 3.4 Update SubscriptionCard tests for new category name display
- [ ] Task 4: Refactor Add/Edit forms to use CategoryChip (AC: #1)
  - [ ] 4.1 Replace generic `Chip` with `CategoryChip` in `AddSubscriptionScreen.tsx`
  - [ ] 4.2 Replace generic `Chip` with `CategoryChip` in `EditSubscriptionScreen.tsx`
  - [ ] 4.3 Verify form submission still includes category value correctly
  - [ ] 4.4 Update form tests if applicable
- [ ] Task 5: Update feature exports and verification (AC: #1, #2, #3)
  - [ ] 5.1 Export CategoryChip from `src/features/subscriptions/index.ts`
  - [ ] 5.2 Run full test suite - ensure 0 regressions
  - [ ] 5.3 Run TypeScript type check and ESLint
  - [ ] 5.4 Manual smoke test: Add subscription with category, verify list display

## Dev Notes

### CRITICAL: Existing Implementation Analysis

**Categories are ALREADY partially implemented.** The dev agent MUST understand what exists before making changes:

**Already implemented (DO NOT recreate):**
- `src/config/categories.ts` — `SUBSCRIPTION_CATEGORIES` array with 8 categories (SubscriptionCategory interface: id, label, icon, color)
- `src/features/subscriptions/utils/subscriptionUtils.ts` — `getCategoryConfig(categoryId)` function with fallback to "Other"
- `src/features/subscriptions/components/SubscriptionCard.tsx` — Category color stripe (4px left edge) + category icon display
- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` — Category selection via horizontal ScrollView of Chips
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx` — Category selection via horizontal ScrollView of Chips (identical pattern)
- Database schema: `category: string | null` in subscriptions table
- Zod schema: `category: z.string().optional()` in `src/features/subscriptions/types/schemas.ts`
- TypeScript types: `category?: string` in CreateSubscriptionDTO

**What MUST change (the actual work for this story):**

#### 1. Category Color/Name/Icon Mismatches vs UX Spec

Current `src/config/categories.ts` vs UX spec — UPDATE REQUIRED:

| Category | Current ID | UX Spec ID | Current Color | UX Spec Color | Current Label | UX Spec Label | Current Icon | UX Spec Icon |
|----------|-----------|------------|---------------|---------------|---------------|---------------|--------------|--------------|
| Entertainment | `entertainment` | `entertainment` | #6366F1 | **#8B5CF6** | Entertainment | Entertainment | `movie-open` | `movie-open` |
| Music | `music` | `music` | #8B5CF6 | **#EF4444** | Music | Music | `music` | `music` |
| Productivity | `productivity` | `productivity` | #3B82F6 | #3B82F6 ✅ | Productivity | Productivity | `briefcase` | `briefcase` |
| Storage | `cloud` | **`storage`** | #06B6D4 | **#F97316** | Cloud Storage | **Storage** | `cloud` | `cloud` |
| Gaming | `gaming` | `gaming` | #EF4444 | **#22C55E** | Gaming | Gaming | `gamepad-variant` | `gamepad-variant` |
| News | `news` | `news` | #F59E0B | **#A16207** | News & Reading | **News** | `newspaper` | `newspaper` |
| Health | `fitness` | **`health`** | #10B981 | **#EC4899** | Fitness | **Health** | `dumbbell` | **`heart-pulse`** |
| Other | `other` | `other` | #6B7280 | #6B7280 ✅ | Other | Other | `dots-horizontal-circle` | **`package-variant`** |

**ID CHANGES WARNING:** Two category IDs change: `cloud` → `storage`, `fitness` → `health`. This affects:
- Any existing subscription records in Supabase with `category = 'cloud'` or `category = 'fitness'`
- The `getCategoryConfig()` function already handles unknown IDs by falling back to "Other", so old data won't crash
- `src/config/popularServices.ts` may reference old IDs in `defaultCategory` fields — MUST update

**Decision:** Since this is early development, update IDs directly. The fallback in `getCategoryConfig()` ensures existing data degrades gracefully to "Other" category. No migration needed.

#### 2. CategoryChip Component (NEW)

Per UX spec, create a dedicated `CategoryChip` component:

```
┌─────────────────┐
│ 🎬 Entertainment│  ← icon + label with category color background
└─────────────────┘
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `category` | `SubscriptionCategory` | Category data object |
| `selected` | `boolean` | Selection state |
| `onPress` | `() => void` | Selection callback |
| `disabled` | `boolean` | Disabled state |

**Implementation pattern:** Follow `TrialBadge` component pattern from Story 2.5 — pure presentational component, co-located test file.

**Color behavior:**
- Unselected: Default chip style (no tinted background)
- Selected: Category color at ~12% opacity as background (`color + '1F'`)
- Icon always uses category color regardless of selected state

#### 3. Category Name on SubscriptionCard (MISSING)

Current SubscriptionCard shows category **icon** but NOT category **name**. Per AC #2, category name must be displayed. Add it as secondary text near the category icon or in the bottom row.

**Current card layout:**
```
┌─────────────────────────────────────┐
│▌  🎬  Netflix             €17.99/mo │
│▌       Renews in 5 days             │
└─────────────────────────────────────┘
```

**Target card layout (add category name):**
```
┌─────────────────────────────────────┐
│▌  🎬  Netflix             €17.99/mo │
│▌       Entertainment · Renews in 5d │
└─────────────────────────────────────┘
```

Place category name before renewal text in the bottom row, separated by " · " (middle dot). Use `theme.colors.onSurfaceVariant` for category name text (same as renewal text).

### Project Structure Notes

- Feature boundary: All changes within `src/features/subscriptions/` and `src/config/`
- CategoryChip is a **feature-specific** component (not shared), used by SubscriptionCard, AddSubscriptionScreen, EditSubscriptionScreen
- Component Dependencies per UX spec: CategoryChip depends on Theme → used by SubscriptionCard, AddForm, EditForm
- Follow co-located test pattern: `CategoryChip.test.tsx` alongside `CategoryChip.tsx`
- ESLint flat config with path aliases (`@features/*`, `@shared/*`, `@config/*`)
- PaperProvider wrapper required for component tests (established in Story 2.5)
- Test helper at `src/features/subscriptions/utils/testHelpers.ts` available

### Architecture Compliance

- **Component Pattern:** Functional components with TypeScript interfaces (PascalCase)
- **File Pattern:** `CategoryChip.tsx` (PascalCase for components)
- **State:** No new Zustand store changes needed — category is already part of subscription data flow
- **Boundaries:** Features can import from `@config/*` (categories config) — this is allowed
- **No new dependencies needed** — all libraries already installed (react-native-paper Chip, etc.)

### Library/Framework Requirements

- **react-native-paper** `Chip` component: Used as base for CategoryChip (already imported in forms)
- **Material Community Icons** via react-native-paper: Icon names must be valid from `materialdesignicons.com`
  - Verify `heart-pulse` and `package-variant` exist as valid icon names before using
  - Fallback icons if not available: `heart` for Health, `dots-horizontal-circle` for Other
- **No new packages to install**

### File Structure Requirements

**Files to CREATE:**
```
src/features/subscriptions/components/CategoryChip.tsx        ← NEW component
src/features/subscriptions/components/CategoryChip.test.tsx   ← NEW tests
```

**Files to MODIFY:**
```
src/config/categories.ts                                      ← Update colors, labels, IDs, icons
src/config/popularServices.ts                                 ← Update defaultCategory references
src/features/subscriptions/components/SubscriptionCard.tsx    ← Add category name text
src/features/subscriptions/components/SubscriptionCard.test.tsx ← Update tests
src/features/subscriptions/screens/AddSubscriptionScreen.tsx  ← Replace Chip with CategoryChip
src/features/subscriptions/screens/EditSubscriptionScreen.tsx ← Replace Chip with CategoryChip
src/features/subscriptions/index.ts                           ← Export CategoryChip
src/features/subscriptions/utils/subscriptionUtils.test.ts    ← Add/update getCategoryConfig tests
```

**Files NOT to touch:**
```
src/shared/stores/useSubscriptionStore.ts          ← No store changes needed
src/features/subscriptions/types/index.ts          ← Types already have category
src/features/subscriptions/types/schemas.ts        ← Schema already has category
src/features/subscriptions/services/subscriptionService.ts ← Service already handles category
src/shared/types/database.types.ts                 ← DB types already have category
```

### Testing Requirements

**CategoryChip component tests (~10 tests):**
- Renders with category data (label, icon visible)
- Selected state shows tinted background
- Unselected state shows default style
- Calls onPress when tapped
- Disabled state prevents interaction
- Accessibility label includes category name
- All 8 categories render correctly (snapshot or individual)

**getCategoryConfig tests (~6 tests):**
- Returns correct config for each valid category ID
- Returns "Other" config for null category
- Returns "Other" config for unknown/invalid category ID
- Returns "Other" config for empty string

**SubscriptionCard category name tests (~4 new tests):**
- Displays category name text on card
- Shows "Other" for uncategorized subscription
- Category name appears in accessibility label
- Category name uses correct text style

**Regression:** All existing 105 tests must pass with 0 failures.

### Previous Story Intelligence (Story 2.5)

**Key learnings to apply:**
- Follow `TrialBadge` pattern for `CategoryChip` — pure presentational, no business logic in component
- Use `PaperProvider` wrapper in test setup (from `testHelpers.ts`)
- Non-null assertion avoidance — use proper type narrowing
- Co-located test files within feature components directory
- Export new component from feature `index.ts`
- Update sprint-status.yaml after completion

**Files created in Story 2.5 that are relevant:**
- `src/features/subscriptions/components/TrialBadge.tsx` — Reference pattern for CategoryChip
- `src/features/subscriptions/utils/testHelpers.ts` — Shared test utilities

### Git Intelligence

**Recent commit pattern:** `story X.Y done`, `story X.Y in review`, `story X.Y ready-for-dev`
- 10 most recent commits all follow this pattern
- No complex branching detected — linear progression

**Last completed work (Story 2.5):**
- Added getTrialInfo utility, TrialBadge component
- 28 new tests added, 105 total
- Code review fixes applied (accessibility bug, test helpers extracted)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.6]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — CategoryChip component, Category Color System, SubscriptionCard anatomy]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure, Naming Patterns, Component Boundaries]
- [Source: _bmad-output/planning-artifacts/prd.md — FR13: User can assign a category]
- [Source: _bmad-output/implementation-artifacts/2-5-trial-period-tracking.md — Previous story learnings]
- [Source: src/config/categories.ts — Current category implementation]
- [Source: src/features/subscriptions/components/SubscriptionCard.tsx — Current card implementation]
- [Source: src/features/subscriptions/screens/AddSubscriptionScreen.tsx — Current form implementation]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
