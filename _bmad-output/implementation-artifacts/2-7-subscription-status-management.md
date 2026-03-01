# Story 2.7: Subscription Status Management

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to mark subscriptions as active or cancelled,
so that I can keep track of which services I'm still paying for.

## Acceptance Criteria

1. **Toggle Status Between Active and Cancelled**
   - Given the user is viewing a subscription in the list
   - When they long-press or use an action to toggle the status
   - Then the `is_active` field is updated in Supabase (true ↔ false)
   - And the subscription list visually distinguishes cancelled subscriptions with muted styling and strikethrough on price

2. **Visual Distinction for Cancelled Subscriptions**
   - Given the user views the subscription list
   - When there are both active and cancelled subscriptions
   - Then active subscriptions are shown prominently (normal styling)
   - And cancelled subscriptions are visually de-emphasized (opacity + strikethrough on price + "Cancelled" label)
   - And the total monthly cost only includes active subscriptions

3. **Status Toggle via Edit Screen**
   - Given the user opens the Edit Subscription screen
   - When they toggle the "Active" switch
   - Then the subscription status is updated when the form is saved
   - And the UI reflects the new status immediately upon returning to the list

## Tasks / Subtasks

- [x] Task 1: Add `is_active` support to service layer and DTO (AC: #1)
  - [x] 1.1 Add `is_active?: boolean` to `CreateSubscriptionDTO` in `src/features/subscriptions/types/index.ts`
  - [x] 1.2 Add `is_active` handling in `subscriptionService.ts` `createSubscription()` insert payload
  - [x] 1.3 Add `is_active` handling in `subscriptionService.ts` `updateSubscription()` update payload
  - [x] 1.4 Write tests for service `is_active` handling

- [x] Task 2: Add `toggleSubscriptionStatus` action to Zustand store (AC: #1)
  - [x] 2.1 Add `toggleSubscriptionStatus: (id: string) => Promise<boolean>` to `SubscriptionActions` interface
  - [x] 2.2 Implement optimistic toggle: flip `is_active` locally, call `updateSubscription` service, rollback on error
  - [x] 2.3 Include `is_active` in `undoDelete` re-creation payload
  - [x] 2.4 Write store tests for toggleSubscriptionStatus (success, error rollback)

- [x] Task 3: Update SubscriptionCard cancelled visual styling (AC: #2)
  - [x] 3.1 Add strikethrough style on price text when `is_active === false`
  - [x] 3.2 Add "Cancelled" label in bottom row (replacing or alongside renewal info) when inactive
  - [x] 3.3 Keep existing `opacity: 0.5` for inactive cards
  - [x] 3.4 Update accessibility label to include "cancelled" status
  - [x] 3.5 Write/update SubscriptionCard tests for cancelled styling

- [x] Task 4: Add `is_active` toggle to Edit Subscription screen (AC: #3)
  - [x] 4.1 Add Switch/toggle control for "Active" status in `EditSubscriptionScreen.tsx`
  - [x] 4.2 Include `is_active` in form submission payload
  - [x] 4.3 Update Zod schema to include `is_active` (optional boolean)
  - [x] 4.4 Write/update EditSubscriptionScreen tests for status toggle

- [x] Task 5: Add swipe-to-toggle-status action (AC: #1)
  - [x] 5.1 Add "Toggle Status" swipe action to `SwipeableSubscriptionCard.tsx` (third swipe option or long-press)
  - [x] 5.2 Connect swipe action to store `toggleSubscriptionStatus`
  - [x] 5.3 Write/update SwipeableSubscriptionCard tests

- [x] Task 6: Verify cost calculations and run full test suite (AC: #2)
  - [x] 6.1 Verify `calculateTotalMonthlyCost` already filters out inactive (it does — just confirm no regression)
  - [x] 6.2 Run full test suite — ensure 0 regressions
  - [x] 6.3 Run TypeScript type check and ESLint

## Dev Notes

### CRITICAL: Existing Implementation Analysis

**Status tracking is ALREADY partially implemented.** The dev agent MUST understand what exists before making changes:

**Already implemented (DO NOT recreate):**
- `is_active` field exists in Supabase database schema (`boolean | null` in `database.types.ts`)
- `SubscriptionCard.tsx` line 24: `const isInactive = subscription.is_active === false;` — already detects inactive state
- `SubscriptionCard.tsx` line 31: `isInactive && styles.inactiveCard` — applies `opacity: 0.5` when inactive
- `subscriptionUtils.ts` `calculateTotalMonthlyCost()` — already filters `.filter((sub) => sub.is_active !== false)`, treats `null` as active
- `SubscriptionsScreen.tsx` line 130: `activeCount = subscriptions.filter((s) => s.is_active !== false).length` — already used in header
- Tests exist for cost calculation with inactive subscriptions in `subscriptionUtils.test.ts`

**What MUST be added (the actual work for this story):**

#### 1. Service Layer — `is_active` NOT in create/update payloads

`subscriptionService.ts` DOES NOT include `is_active` in either:
- `createSubscription()` insert payload (lines 26-37) — missing `is_active`
- `updateSubscription()` update payload (lines 82-91) — missing `is_active` handling

Both must be updated to pass `is_active` through to Supabase.

#### 2. DTO Type — `is_active` NOT in CreateSubscriptionDTO

`CreateSubscriptionDTO` in `src/features/subscriptions/types/index.ts` does NOT include `is_active`. Must add:
```typescript
is_active?: boolean;
```

#### 3. Store — No `toggleSubscriptionStatus` action

`useSubscriptionStore.ts` has no dedicated toggle action. Need to add optimistic toggle that:
1. Flips `is_active` locally (instant UI)
2. Calls `updateSubscription(id, { is_active: !currentValue })`
3. Rolls back on error

**Important:** Also fix `undoDelete` (lines 158-168) to include `is_active` in the re-creation payload — currently it's missing.

#### 4. SubscriptionCard — Missing strikethrough and "Cancelled" label

Current card has `opacity: 0.5` for inactive but per UX spec needs:
- **Strikethrough on price text** when cancelled
- **"Cancelled" label** shown in the info area (replace renewal info or show alongside)
- Muted colors (opacity already handled)

**Current card layout:**
```
┌─────────────────────────────────────┐
│▌  🎬  Netflix             €17.99/mo │  ← opacity: 0.5 when inactive
│▌       Entertainment · Renews in 5d │
└─────────────────────────────────────┘
```

**Target card layout (cancelled):**
```
┌─────────────────────────────────────┐
│▌  🎬  Netflix             €̶1̶7̶.̶9̶9̶/̶m̶o̶ │  ← strikethrough on price
│▌       Entertainment · Cancelled    │  ← "Cancelled" replaces renewal text
└─────────────────────────────────────┘
```

Implementation: Use `textDecorationLine: 'line-through'` on price Text when `isInactive`. Replace `renewalInfo.text` with "Cancelled" when `isInactive`.

#### 5. Edit Screen — No status toggle

`EditSubscriptionScreen.tsx` does not have a switch for `is_active`. Add a `Switch` component from react-native-paper:
```
Active Status:  [====O] ← Toggle switch
```

Place it after the notes field, before the Save button. When toggled off, should clearly communicate that the subscription is being marked as "Cancelled".

#### 6. Zod Schema — No `is_active` field

`createSubscriptionSchema` in `schemas.ts` does not include `is_active`. Add:
```typescript
is_active: z.boolean().optional(),
```

#### 7. Swipe Action — Consider approach carefully

Current `SwipeableSubscriptionCard` has Edit and Delete swipe actions. For status toggle, options:
- **Option A:** Add "Toggle" as third swipe action button
- **Option B:** Long-press to toggle (simpler, less cluttered)
- **Recommended:** Option A — add a small toggle button in swipe actions (green check for active → grey cancel icon for cancelled, and vice versa)

### Project Structure Notes

- Feature boundary: All changes within `src/features/subscriptions/` and `src/shared/stores/`
- No new files needed — all modifications to existing files
- The `is_active` field already exists at every layer (DB, types, card) — this story connects the dots
- Follow co-located test pattern established in Stories 2.5 and 2.6
- ESLint flat config with path aliases (`@features/*`, `@shared/*`, `@config/*`)
- PaperProvider wrapper required for component tests (established in Story 2.5)

### Architecture Compliance

- **Component Pattern:** Functional components with TypeScript interfaces (PascalCase)
- **Store Pattern:** Zustand with optimistic updates + error rollback (established in delete flow)
- **Service Pattern:** Same error handling structure as existing CRUD operations
- **Boundaries:** Store calls service, screen reads store — no direct service calls from screens
- **No new dependencies needed** — all libraries already installed (react-native-paper Switch, etc.)

### Library/Framework Requirements

- **react-native-paper** `Switch` component: For Active/Cancelled toggle in Edit screen
- **react-native** `StyleSheet`: `textDecorationLine: 'line-through'` for strikethrough on price
- **No new packages to install**

### File Structure Requirements

**Files to CREATE:**
```
(none — all modifications to existing files)
```

**Files to MODIFY:**
```
src/features/subscriptions/types/index.ts                    ← Add is_active to CreateSubscriptionDTO
src/features/subscriptions/types/schemas.ts                  ← Add is_active to Zod schema
src/features/subscriptions/services/subscriptionService.ts   ← Add is_active in create/update payloads
src/shared/stores/useSubscriptionStore.ts                    ← Add toggleSubscriptionStatus action, fix undoDelete
src/shared/stores/useSubscriptionStore.test.ts               ← Add toggle tests
src/features/subscriptions/components/SubscriptionCard.tsx   ← Strikethrough + "Cancelled" label
src/features/subscriptions/components/SubscriptionCard.test.tsx ← Update tests for cancelled styling
src/features/subscriptions/components/SwipeableSubscriptionCard.tsx ← Add toggle status swipe action
src/features/subscriptions/components/SwipeableSubscriptionCard.test.tsx ← Update tests
src/features/subscriptions/screens/EditSubscriptionScreen.tsx ← Add is_active Switch toggle
src/features/subscriptions/screens/EditSubscriptionScreen.test.tsx ← Update tests
```

**Files NOT to touch:**
```
src/shared/types/database.types.ts                           ← is_active already defined
src/features/subscriptions/utils/subscriptionUtils.ts        ← calculateTotalMonthlyCost already filters inactive
src/features/subscriptions/utils/subscriptionUtils.test.ts   ← Already has inactive filtering tests
src/config/categories.ts                                     ← No category changes
src/features/subscriptions/screens/AddSubscriptionScreen.tsx ← New subscriptions default to active (DB default)
src/features/subscriptions/screens/SubscriptionsScreen.tsx   ← Already counts activeCount correctly
```

### Testing Requirements

**Store tests (~6 new tests):**
- toggleSubscriptionStatus flips is_active from true to false
- toggleSubscriptionStatus flips is_active from false to true
- toggleSubscriptionStatus handles null is_active (treat as active, flip to false)
- toggleSubscriptionStatus rolls back on service error
- undoDelete includes is_active in re-creation payload
- updateSubscription passes is_active to service

**SubscriptionCard tests (~5 new/updated tests):**
- Cancelled subscription shows strikethrough on price
- Cancelled subscription shows "Cancelled" text instead of renewal info
- Active subscription shows normal price (no strikethrough)
- Accessibility label includes "cancelled" for inactive subscriptions
- Cancelled card has opacity 0.5 (existing test, verify not broken)

**SwipeableSubscriptionCard tests (~3 new tests):**
- Toggle status button renders in swipe actions
- Toggle status button calls toggleSubscriptionStatus
- Toggle button shows correct icon/label based on current status

**EditSubscriptionScreen tests (~3 new tests):**
- Active status switch renders and is togglable
- Switch reflects current subscription is_active state
- Form submission includes is_active value

**Regression:** All existing 123 tests must pass with 0 failures.

### Previous Story Intelligence (Story 2.6)

**Key learnings to apply:**
- Follow same modification pattern: update config → update components → update screens → update exports/tests
- Use `PaperProvider` wrapper in test setup (from `testHelpers.ts`)
- Optimistic UI updates work well for store actions (established in delete flow)
- Category name display pattern in SubscriptionCard bottom row — "Cancelled" should replace renewal text in same location
- All 123 tests must remain passing
- Export changes from feature `index.ts` if any new public components

**Files modified in Story 2.6 that are relevant:**
- `src/features/subscriptions/components/SubscriptionCard.tsx` — Bottom row already has `{categoryConfig.label} · {renewalInfo.text}` pattern; modify to show "Cancelled" when inactive
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx` — Form pattern to follow for adding Switch

### Git Intelligence

**Recent commit pattern:** `story X.Y done`, `story X.Y in review`, `story X.Y ready-for-dev`
- Linear progression, no branching
- Last 10 commits all follow this pattern

**Last completed work (Story 2.6):**
- Updated category config, created CategoryChip, added category name to SubscriptionCard
- 123 total tests passing
- Code follows established patterns consistently

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.7: Subscription Status Management]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — SubscriptionCard states: Cancelled = Strikethrough, muted colors]
- [Source: _bmad-output/planning-artifacts/architecture.md — Zustand Store Pattern, Service Pattern, Project Structure]
- [Source: _bmad-output/planning-artifacts/prd.md — FR14: User can mark a subscription as active or cancelled]
- [Source: _bmad-output/implementation-artifacts/2-6-subscription-categories.md — Previous story learnings, file patterns]
- [Source: src/features/subscriptions/services/subscriptionService.ts — Missing is_active in create/update payloads]
- [Source: src/shared/stores/useSubscriptionStore.ts — Missing toggleSubscriptionStatus action]
- [Source: src/features/subscriptions/components/SubscriptionCard.tsx — Existing isInactive detection and opacity styling]
- [Source: src/features/subscriptions/types/index.ts — Missing is_active in CreateSubscriptionDTO]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blockers. Service test mock pattern required `jest.requireMock` in helper functions (rather than module-level mock variables) to properly chain Supabase calls.

### Completion Notes List

- **Task 1 (Service Layer):** Added `is_active?: boolean` to `CreateSubscriptionDTO`. Updated `createSubscription()` to conditionally include `is_active` in Supabase insert using spread `...(dto.is_active !== undefined && { is_active: dto.is_active })`. Updated `updateSubscription()` to handle `'is_active' in dto` check in the update payload. Created new service test file with 6 tests verifying payload inclusion/exclusion.

- **Task 2 (Store):** Added `toggleSubscriptionStatus(id)` to `SubscriptionActions` interface and store implementation. Implements optimistic toggle: flips `is_active` locally (true↔false, null→false), calls `updateSubscription` service, rolls back with error on failure. Fixed `undoDelete` to include `is_active` in re-creation payload. 6 new store tests added.

- **Task 3 (SubscriptionCard):** Added `textDecorationLine: 'line-through'` style (via `styles.strikethrough`) on price Text when `isInactive`. Bottom row now shows `'Cancelled'` instead of `renewalInfo.text` when inactive. Accessibility label updated to include `', cancelled'` segment for inactive subscriptions. 5 new tests added.

- **Task 4 (EditSubscriptionScreen):** Added `is_active: z.boolean().optional()` to Zod schema. Form defaults `is_active` to `subscription.is_active !== false` (treats null as active). Added `Switch` with `accessibilityLabel="Active status"` after Notes field. Included `is_active: data.is_active` in form submission payload. 3 new tests added.

- **Task 5 (SwipeableSubscriptionCard):** Added `onToggleStatus?: () => void` prop. Added a third swipe action button (leftmost position) showing 'Cancel'/'Activate' label and appropriate icon (`close-circle-outline`/`check-circle-outline`) with grey/green background. Connected `onToggleStatus` to `SubscriptionsScreen` via `handleToggleStatus` callback. 4 new tests added.

- **Task 6:** `calculateTotalMonthlyCost` already filters inactive — confirmed no regression. All 147 tests pass. TypeScript clean. ESLint clean.

**Total new tests: 24** (6 service + 6 store + 5 card + 3 edit screen + 4 swipeable)
**Total tests: 147 (was 123)**

### File List

- `src/features/subscriptions/types/index.ts` — Added `is_active?: boolean` to `CreateSubscriptionDTO`
- `src/features/subscriptions/types/schemas.ts` — Added `is_active: z.boolean().optional()` to Zod schema
- `src/features/subscriptions/services/subscriptionService.ts` — `is_active` in create/update payloads
- `src/features/subscriptions/services/subscriptionService.test.ts` — NEW: 6 service tests for is_active
- `src/shared/stores/useSubscriptionStore.ts` — Added `toggleSubscriptionStatus`, fixed `undoDelete`
- `src/shared/stores/useSubscriptionStore.test.ts` — 6 new toggle tests added
- `src/features/subscriptions/components/SubscriptionCard.tsx` — Strikethrough + "Cancelled" label + a11y
- `src/features/subscriptions/components/SubscriptionCard.test.tsx` — 5 new cancelled styling tests
- `src/features/subscriptions/components/SwipeableSubscriptionCard.tsx` — Toggle status swipe action
- `src/features/subscriptions/components/SwipeableSubscriptionCard.test.tsx` — 4 new toggle tests
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx` — Active Switch added
- `src/features/subscriptions/screens/EditSubscriptionScreen.test.tsx` — 3 new toggle tests
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — `handleToggleStatus` wired up

## Change Log

- 2026-03-01: Story 2.7 implemented — subscription status management (is_active toggle, visual cancelled styling, swipe action, edit screen switch). 24 new tests added. Total: 147 tests passing.
