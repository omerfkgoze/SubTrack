# Story 3.4: Upcoming Renewals Overview

Status: review

## Story

As a user,
I want to see my upcoming subscription renewals for the next 30 days,
so that I can prepare for upcoming charges and make decisions.

## Acceptance Criteria

1. **AC1: Upcoming Renewals List**
   - **Given** the user has active subscriptions with renewal dates within the next 30 days
   - **When** they view the dashboard
   - **Then** an "Upcoming Renewals" section lists subscriptions renewing in the next 30 days
   - **And** each entry shows: subscription name, renewal date, price, and days until renewal
   - **And** entries are sorted by renewal date (soonest first)
   - **And** trial expiry dates are highlighted with a warning indicator

2. **AC2: Empty State**
   - **Given** the user has no renewals in the next 30 days
   - **When** they view the upcoming renewals section
   - **Then** a calm message is displayed ("No upcoming renewals in the next 30 days")

3. **AC3: Urgent Renewal Highlight**
   - **Given** a renewal is within 3 days
   - **When** it appears in the upcoming list
   - **Then** it is visually highlighted as urgent (e.g., accent color, bold text)

## Tasks / Subtasks

- [x] Task 1: Create `getUpcomingRenewals` utility function (AC: #1, #2)
  - [x] 1.1: Filter active subscriptions (`is_active !== false`) with `renewal_date` within next 30 days
  - [x] 1.2: Sort by `daysUntil` ascending (soonest first)
  - [x] 1.3: Return array of `{ subscription, daysUntil, isUrgent, isTrial, trialInfo, renewalInfo }` objects
  - [x] 1.4: Return empty array when no upcoming renewals
  - [x] 1.5: Write unit tests for the utility

- [x] Task 2: Create `UpcomingRenewals` component (AC: #1, #2, #3)
  - [x] 2.1: Section title "Upcoming Renewals" (`titleMedium`)
  - [x] 2.2: Render renewal rows: subscription name, formatted renewal date, price with billing cycle, days-until text
  - [x] 2.3: Trial subscriptions: show warning indicator (TrialBadge or amber icon)
  - [x] 2.4: Urgent renewals (≤3 days): visually distinct — use Warning color `#F59E0B` border/text
  - [x] 2.5: Empty state: calm message "No upcoming renewals in the next 30 days"
  - [x] 2.6: Wrap in `Surface` card (elevation=1, borderRadius=12) matching existing dashboard cards
  - [x] 2.7: Add `accessibilityLabel` on each renewal row
  - [x] 2.8: Write component tests (rendering, empty state, urgent highlight, trial indicator)

- [x] Task 3: Integrate into HomeScreen (AC: #1, #2)
  - [x] 3.1: Import and wire `getUpcomingRenewals` + `UpcomingRenewals` component
  - [x] 3.2: Render between `SavingsIndicator` and empty-state CTA (or after CategoryBreakdown if no savings)
  - [x] 3.3: Only render when `hasSubscriptions` is true
  - [x] 3.4: Export from `src/features/dashboard/index.ts`
  - [x] 3.5: Write HomeScreen integration tests

- [x] Task 4: Verify all tests pass (AC: all)
  - [x] 4.1: `npx tsc --noEmit` — zero errors
  - [x] 4.2: `npx eslint src/features/dashboard/ src/features/subscriptions/utils/` — zero errors
  - [x] 4.3: Full test suite green (baseline: 230+ tests)

## Dev Notes

### Existing Utilities to REUSE (DO NOT recreate)

All these exist in `src/features/subscriptions/utils/subscriptionUtils.ts`:

- **`getRenewalInfo(renewalDate: string)`** → `{ text: string, daysUntil: number, isOverdue: boolean }`
  - Already calculates days until renewal, handles today/overdue/future
  - Use `daysUntil` for sorting and urgency check (`daysUntil <= 3`)
  - Use `text` for display ("Renews in 5 days", "Renews today", etc.)

- **`getTrialInfo(isTrial, trialExpiryDate)`** → `{ daysRemaining, status, text, urgencyLevel }`
  - Use to detect trial subscriptions and get trial display info

- **`formatPrice(price, currency)`** — format price display
- **`getCategoryConfig(categoryId)`** — get category color/icon for visual enhancement

- **`calculateMonthlyEquivalent(price, billingCycle)`** — if needed for display

### New Utility: `getUpcomingRenewals`

Location: `src/features/subscriptions/utils/subscriptionUtils.ts`

```typescript
interface UpcomingRenewal {
  subscription: Subscription;
  daysUntil: number;
  isUrgent: boolean;       // daysUntil <= 3
  renewalText: string;     // from getRenewalInfo().text
  isTrial: boolean;
  trialText: string;       // from getTrialInfo().text if trial
}

export function getUpcomingRenewals(
  subscriptions: Subscription[]
): UpcomingRenewal[]
```

Logic:
1. Filter: `is_active !== false` (null = active, same pattern as all other utilities)
2. For each: call `getRenewalInfo(sub.renewal_date)` to get `daysUntil`
3. Filter: `daysUntil >= 0 && daysUntil <= 30` (today through 30 days, exclude overdue)
4. For each: call `getTrialInfo(sub.is_trial, sub.trial_expiry_date)` for trial info
5. Map to `UpcomingRenewal` with `isUrgent: daysUntil <= 3`
6. Sort ascending by `daysUntil`

### Component: `UpcomingRenewals`

Location: `src/features/dashboard/components/UpcomingRenewals.tsx`

```
Props: { renewals: UpcomingRenewal[] }
```

Visual layout (each renewal row):

```
┌────────────────────────────────────────────┐
│  Upcoming Renewals                         │  ← titleMedium
│                                            │
│  🎬 Netflix              €17.99/mo         │  ← name + formatted price
│     Renews in 5 days                       │  ← secondary text (gray)
│                                            │
│  ⚠️ 🎵 Spotify [TRIAL]    €9.99/mo        │  ← trial indicator (amber)
│     Renews tomorrow                   🔥   │  ← urgent (≤3 days, amber)
│                                            │
│  📺 Disney+               €8.99/mo         │
│     Renews in 12 days                      │
└────────────────────────────────────────────┘
```

Empty state:
```
┌────────────────────────────────────────────┐
│  Upcoming Renewals                         │
│                                            │
│  No upcoming renewals in the next 30 days  │  ← bodyMedium, gray text
└────────────────────────────────────────────┘
```

Styling guidelines:
- Container: `Surface` elevation=1, borderRadius=12, marginHorizontal=16, marginTop=16
- Section title: `titleMedium`, marginBottom=12
- Each row: paddingVertical=8, borderBottom (gray 300 divider) except last
- Urgent rows (≤3 days): left border 3px Warning `#F59E0B`, or background tint `rgba(245,158,11,0.08)`
- Trial indicator: amber/orange text or icon matching TrialBadge pattern from `src/features/subscriptions/components/TrialBadge.tsx`
- Category icon: use `getCategoryConfig(sub.category)` for icon/color (optional enhancement if category exists)
- Price: right-aligned, `bodyMedium` bold
- Days text: `bodySmall`, color `theme.colors.onSurfaceVariant` (default), Warning color if urgent

### HomeScreen Integration

Current structure (after Story 3.3):
```tsx
<ScrollView>
  <SpendingHero ... />
  {hasSubscriptions && categoryBreakdown.length > 0 && <CategoryBreakdown ... />}
  {monthlySavings > 0 && <SavingsIndicator ... />}
  {!hasSubscriptions && <Button>Add First Subscription</Button>}
</ScrollView>
```

Target structure:
```tsx
<ScrollView>
  <SpendingHero ... />
  {hasSubscriptions && categoryBreakdown.length > 0 && <CategoryBreakdown ... />}
  {monthlySavings > 0 && <SavingsIndicator ... />}
  {hasSubscriptions && <UpcomingRenewals renewals={upcomingRenewals} />}
  {!hasSubscriptions && <Button>Add First Subscription</Button>}
</ScrollView>
```

Note: Always render UpcomingRenewals when there are subscriptions (component handles its own empty state message).

### Data Access Pattern

Same as all Epic 3 stories — NO new service calls:
```typescript
const subscriptions = useSubscriptionStore((s) => s.subscriptions);
const upcomingRenewals = getUpcomingRenewals(subscriptions);
```

### Architecture Compliance

- Feature module: `src/features/dashboard/`
- Utilities: `src/features/subscriptions/utils/subscriptionUtils.ts`
- Cross-feature import: `@features/subscriptions/utils/subscriptionUtils`
- Component naming: PascalCase (`UpcomingRenewals.tsx`)
- Functional components with TypeScript interfaces
- React Native Paper components (Surface, Text, Icon)
- NO new dependencies — use existing libraries only

### Testing Requirements

**Test file locations:**
- `src/features/dashboard/components/UpcomingRenewals.test.tsx`
- Tests in `src/features/subscriptions/utils/subscriptionUtils.test.ts` (append utility tests)
- `src/features/dashboard/screens/HomeScreen.test.tsx` (append integration tests)

**Required test coverage:**
- Utility: subscriptions within 30 days filtered correctly, overdue excluded, sorted soonest first, empty array when none, urgent flag set correctly (≤3 days), trial info extracted, `is_active === false` excluded, `is_active === null` included
- Component: renders renewal list with correct info, empty state message displayed, urgent styling applied (≤3 days), trial indicator shown, accessibility labels present
- Integration: UpcomingRenewals visible on HomeScreen with subscriptions, hidden when no subscriptions

**Test patterns (MUST follow):**
- Wrap all component renders in `<PaperProvider>`
- Mock: `@react-native-async-storage/async-storage`, `@shared/services/supabase`, `@react-navigation/native`
- Use `getAllByText` when same text may appear in multiple components
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Use `jest.runAllTimers()` for Paper Snackbar timing (not `advanceTimersByTime`)

### Epic 2 Retro Action Items (MUST apply)

**#1 Gesture Accessibility:** No swipe gestures in this component (display-only). Ensure `accessibilityLabel` on each renewal row with full context: e.g., `"Netflix, renews in 5 days, 17.99 euros per month"`.

**#2 Non-null assertion ban:** NEVER use `!` operator. Use `??` for defaults:
- `(sub.currency ?? '€')`
- `(sub.category ?? 'other')`

**#3 Test gotchas:** PaperProvider wrapper, `getAllByText` for duplicates, pinned versions.

### is_active Semantics (Critical — same as all Epic 3)

- `is_active === false` → explicitly cancelled/inactive → EXCLUDE from upcoming
- `is_active === null` → treated as active → INCLUDE
- `is_active === true` → active → INCLUDE

### UX Reference

- Warning color `#F59E0B` for urgent renewals (from UX design spec color system)
- Smart Home Screen: "Adaptive content - show upcoming renewals when urgent" [Source: ux-design-specification.md#Design-Opportunities]
- SubscriptionCard Expiring state: "Warning border (amber)" when days until renewal ≤ 3 [Source: ux-design-specification.md#SubscriptionCard]

### Files to Create

- `src/features/dashboard/components/UpcomingRenewals.tsx`
- `src/features/dashboard/components/UpcomingRenewals.test.tsx`

### Files to Modify

- `src/features/subscriptions/utils/subscriptionUtils.ts` (add `getUpcomingRenewals` + `UpcomingRenewal` interface)
- `src/features/subscriptions/utils/subscriptionUtils.test.ts` (add utility tests)
- `src/features/dashboard/screens/HomeScreen.tsx` (integrate UpcomingRenewals)
- `src/features/dashboard/screens/HomeScreen.test.tsx` (integration tests)
- `src/features/dashboard/index.ts` (add UpcomingRenewals export)

### Project Structure Notes

- Alignment with unified project structure: all paths follow `src/features/{feature}/components/` and `src/features/{feature}/screens/` pattern
- Cross-feature imports use `@features/subscriptions/` alias (established in Epic 2, reused in all Epic 3 stories)
- No conflicts or variances detected

### References

- [Source: epics.md#Story-3.4] — Acceptance criteria and user story
- [Source: ux-design-specification.md#Color-System] — Warning color #F59E0B for upcoming renewals
- [Source: ux-design-specification.md#SubscriptionCard] — Expiring state visual pattern
- [Source: ux-design-specification.md#Design-Opportunities] — Smart Home Screen adaptive content
- [Source: architecture.md] — Feature module structure, component patterns
- [Source: epic-2-retro-2026-03-13.md#Action-Items] — Gesture accessibility, non-null assertion ban, test gotchas
- [Source: 3-3-visual-spending-summary.md] — Previous story patterns, HomeScreen structure, test baseline (230+ tests)
- [Source: subscriptionUtils.ts:58-78] — Existing `getRenewalInfo` utility
- [Source: subscriptionUtils.ts:87-107] — Existing `getTrialInfo` utility

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- HomeScreen test: mockSubscription renewal_date '2026-04-01' is 18 days away (within 30 days), so empty-state test needed a date beyond 30 days ('2026-05-01').

### Completion Notes List

- Added `UpcomingRenewal` interface and `getUpcomingRenewals` function to `subscriptionUtils.ts` — filters active subs renewing in 0-30 days, sorts ascending, flags urgent (≤3 days) and trial
- Created `UpcomingRenewals.tsx` component using Surface/Text/Icon from react-native-paper; urgent row gets amber left border + background tint; trial badge with timer-sand icon; empty state message
- Integrated into `HomeScreen.tsx` after `SavingsIndicator`, only when `hasSubscriptions`
- Exported from `src/features/dashboard/index.ts`
- 259 tests passing (up from 230+); TSC zero errors; ESLint zero errors

### File List

- src/features/subscriptions/utils/subscriptionUtils.ts (modified — added UpcomingRenewal interface + getUpcomingRenewals)
- src/features/subscriptions/utils/subscriptionUtils.test.ts (modified — added getUpcomingRenewals tests)
- src/features/dashboard/components/UpcomingRenewals.tsx (created)
- src/features/dashboard/components/UpcomingRenewals.test.tsx (created)
- src/features/dashboard/screens/HomeScreen.tsx (modified — integrated UpcomingRenewals)
- src/features/dashboard/screens/HomeScreen.test.tsx (modified — added integration tests)
- src/features/dashboard/index.ts (modified — added UpcomingRenewals export)

### Change Log

- 2026-03-14: Implemented Story 3.4 — Upcoming Renewals Overview feature (utility, component, HomeScreen integration, tests)
