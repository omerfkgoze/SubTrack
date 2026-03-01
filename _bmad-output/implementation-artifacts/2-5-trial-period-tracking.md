# Story 2.5: Trial Period Tracking

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to mark a subscription as a trial with an expiry date,
so that I don't forget to cancel before I'm charged.

## Acceptance Criteria

1. **AC1 - Trial Badge with Countdown:** Given a subscription is marked as a trial (`is_trial === true`) with a `trial_expiry_date`, when it appears in the subscription list, then a color-coded TrialBadge component replaces the existing simple "Trial" chip. The badge displays a countdown showing days remaining until trial expires (e.g., "5 days left"). The badge uses urgency-based colors: gray (>7 days), amber (4-7 days), orange (1-3 days), red (0 days / expired).

2. **AC2 - Urgency Color Levels:** Given a trial subscription is displayed, when the TrialBadge renders, then the color coding follows this urgency scheme:
   - **Low urgency (>7 days):** Gray background (`#6B7280`), timer-sand icon, text "X days left"
   - **Medium urgency (4-7 days):** Amber background (`#F59E0B`), timer-sand icon, text "X days left"
   - **High urgency (1-3 days):** Orange background (`#F97316`), alert icon, text "X days left" (singular "1 day left")
   - **Critical (0 days — today):** Red background (`#EF4444`), alert-circle icon, text "Expires today"
   - **Expired (past date):** Red background (`#EF4444`), alert-circle icon, text "Trial expired"

3. **AC3 - Trial Expired State:** Given a trial subscription whose `trial_expiry_date` has passed, when the card is rendered, then the TrialBadge displays "Trial expired" with red styling and an alert-circle icon. The badge is visually distinct from active trial badges.

4. **AC4 - No Trial Badge for Non-Trials:** Given a subscription where `is_trial` is false or null, when the card is rendered, then no TrialBadge or trial indicator is displayed (same behavior as current implementation).

5. **AC5 - Trial Info Utility Function:** Given `is_trial` and `trial_expiry_date` values, when `getTrialInfo()` is called, then it returns a structured object with: `daysRemaining` (number), `status` ('active' | 'expiring-soon' | 'critical' | 'expired' | 'none'), `text` (display string), and `urgencyLevel` ('low' | 'medium' | 'high' | 'critical'). Edge cases: null `trial_expiry_date` with `is_trial === true` returns status 'active' with text "Trial" (fallback).

6. **AC6 - Accessibility:** The TrialBadge has `accessibilityLabel` describing the trial status (e.g., "Trial, 5 days remaining" or "Trial expired"). The SubscriptionCard's overall `accessibilityLabel` is updated to include trial countdown info when applicable (e.g., "Netflix, 17.99 euros per monthly, Trial 5 days left, Renews in 30 days").

7. **AC7 - Form Functionality Preserved:** Given the user is adding or editing a subscription, when they toggle "This is a trial" switch, then the trial expiry date field appears (already implemented in Stories 2.1/2.2). This story does NOT modify form behavior — only enhances list display.

## Tasks / Subtasks

- [x] Task 1: Add `getTrialInfo` Utility Function (AC: #5)
  - [x] 1.1 Add `getTrialInfo(isTrial: boolean | null, trialExpiryDate: string | null)` to `src/features/subscriptions/utils/subscriptionUtils.ts`
  - [x] 1.2 Return type: `{ daysRemaining: number; status: 'active' | 'expiring-soon' | 'critical' | 'expired' | 'none'; text: string; urgencyLevel: 'low' | 'medium' | 'high' | 'critical' }`
  - [x] 1.3 Implement day calculation using `date-fns` (`differenceInDays`, `parseISO`, `startOfDay`, `isToday`) — same pattern as existing `getRenewalInfo`
  - [x] 1.4 Handle edge cases: `is_trial === false` → status 'none'; `is_trial === true` with null expiry → status 'active' with text "Trial"
  - [x] 1.5 Add `getTrialInfo` tests to `subscriptionUtils.test.ts` (all urgency levels, edge cases, singular/plural days)

- [x] Task 2: Create `TrialBadge` Component (AC: #1, #2, #3, #4, #6)
  - [x] 2.1 Create `src/features/subscriptions/components/TrialBadge.tsx`
  - [x] 2.2 Props: `isTrial: boolean | null`, `trialExpiryDate: string | null`
  - [x] 2.3 Use `getTrialInfo()` internally to compute display state
  - [x] 2.4 Render nothing if status is 'none' (not a trial)
  - [x] 2.5 Render compact badge with icon + text, color-coded by urgency level
  - [x] 2.6 Use `MaterialCommunityIcons` via React Native Paper `Icon` component: `timer-sand` (low/medium), `alert` (high), `alert-circle` (critical/expired)
  - [x] 2.7 Add `accessibilityLabel` with descriptive text (e.g., "Trial, 5 days remaining")
  - [x] 2.8 Create `src/features/subscriptions/components/TrialBadge.test.tsx`

- [x] Task 3: Update `SubscriptionCard` to Use `TrialBadge` (AC: #1, #3, #4, #6)
  - [x] 3.1 Replace the existing `<Chip>Trial</Chip>` block (lines 65-69) with `<TrialBadge isTrial={subscription.is_trial} trialExpiryDate={subscription.trial_expiry_date} />`
  - [x] 3.2 Remove unused `Chip` import if no longer needed
  - [x] 3.3 Remove `trialChip` and `trialChipText` styles from StyleSheet (no longer used)
  - [x] 3.4 Update `accessibilityLabel` on Card to include trial info when applicable
  - [x] 3.5 Update existing SubscriptionCard tests for new trial badge behavior

- [x] Task 4: Update Feature Exports and Final Verification (AC: all)
  - [x] 4.1 Add `TrialBadge` export to `src/features/subscriptions/index.ts`
  - [x] 4.2 Add `getTrialInfo` export to `src/features/subscriptions/index.ts`
  - [x] 4.3 Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
  - [x] 4.4 Verify ESLint passes: `npx eslint src/` — zero errors/warnings
  - [x] 4.5 Run all tests: `npx jest` — all pass (no regressions)

## Dev Notes

### Critical Technical Requirements

**CRITICAL: `getTrialInfo` Utility — Follow Existing `getRenewalInfo` Pattern Exactly:**

```typescript
// Add to src/features/subscriptions/utils/subscriptionUtils.ts

export type TrialStatus = 'active' | 'expiring-soon' | 'critical' | 'expired' | 'none';
export type TrialUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface TrialInfo {
  daysRemaining: number;
  status: TrialStatus;
  text: string;
  urgencyLevel: TrialUrgency;
}

export function getTrialInfo(
  isTrial: boolean | null,
  trialExpiryDate: string | null,
): TrialInfo {
  // Not a trial — return 'none' status
  if (!isTrial) {
    return { daysRemaining: 0, status: 'none', text: '', urgencyLevel: 'low' };
  }

  // Trial without expiry date — fallback to simple "Trial" display
  if (!trialExpiryDate) {
    return { daysRemaining: 0, status: 'active', text: 'Trial', urgencyLevel: 'low' };
  }

  const expiryDate = startOfDay(parseISO(trialExpiryDate));
  const today = startOfDay(new Date());

  if (isToday(expiryDate)) {
    return { daysRemaining: 0, status: 'critical', text: 'Expires today', urgencyLevel: 'critical' };
  }

  const days = differenceInDays(expiryDate, today);

  if (days < 0) {
    return { daysRemaining: days, status: 'expired', text: 'Trial expired', urgencyLevel: 'critical' };
  }

  const dayText = `${days} ${days === 1 ? 'day' : 'days'} left`;

  if (days <= 3) {
    return { daysRemaining: days, status: 'critical', text: dayText, urgencyLevel: 'high' };
  }

  if (days <= 7) {
    return { daysRemaining: days, status: 'expiring-soon', text: dayText, urgencyLevel: 'medium' };
  }

  return { daysRemaining: days, status: 'active', text: dayText, urgencyLevel: 'low' };
}
```

**CRITICAL: `date-fns` Functions Already Imported:**
The file `subscriptionUtils.ts` already imports `differenceInDays`, `isToday`, `parseISO`, `startOfDay` from `date-fns` (line 1). No new imports needed from `date-fns`.

**CRITICAL: TrialBadge Component — Compact Badge Design:**

```typescript
// src/features/subscriptions/components/TrialBadge.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import { getTrialInfo } from '@features/subscriptions/utils/subscriptionUtils';
import type { TrialUrgency } from '@features/subscriptions/utils/subscriptionUtils';

interface TrialBadgeProps {
  isTrial: boolean | null;
  trialExpiryDate: string | null;
}

const URGENCY_COLORS: Record<TrialUrgency, string> = {
  low: '#6B7280',      // Gray
  medium: '#F59E0B',   // Amber
  high: '#F97316',     // Orange
  critical: '#EF4444', // Red
};

const URGENCY_ICONS: Record<TrialUrgency, string> = {
  low: 'timer-sand',
  medium: 'timer-sand',
  high: 'alert',
  critical: 'alert-circle',
};

export function TrialBadge({ isTrial, trialExpiryDate }: TrialBadgeProps) {
  const trialInfo = getTrialInfo(isTrial, trialExpiryDate);

  if (trialInfo.status === 'none') {
    return null;
  }

  const color = URGENCY_COLORS[trialInfo.urgencyLevel];
  const icon = URGENCY_ICONS[trialInfo.urgencyLevel];

  const accessibilityText =
    trialInfo.status === 'expired'
      ? 'Trial expired'
      : trialInfo.daysRemaining === 0
        ? 'Trial expires today'
        : `Trial, ${trialInfo.daysRemaining} ${trialInfo.daysRemaining === 1 ? 'day' : 'days'} remaining`;

  return (
    <View
      style={[styles.badge, { backgroundColor: `${color}18` }]}
      accessibilityLabel={accessibilityText}
      accessibilityRole="text"
    >
      <Icon source={icon} size={12} color={color} />
      <Text style={[styles.text, { color }]}>{trialInfo.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
```

**CRITICAL: Background Color with Opacity:**
The badge uses `${color}18` for the background (hex color + 18 alpha = ~9% opacity). This creates a subtle tinted background that adapts to the urgency color without being overpowering. This is the same approach used by React Native Paper Chip internally.

**CRITICAL: SubscriptionCard Update — Replace Chip with TrialBadge:**

```typescript
// In SubscriptionCard.tsx — REPLACE the existing trial chip block:

// REMOVE this (lines 65-69):
// {subscription.is_trial && (
//   <Chip compact textStyle={styles.trialChipText} style={styles.trialChip}>
//     Trial
//   </Chip>
// )}

// REPLACE WITH:
<TrialBadge
  isTrial={subscription.is_trial}
  trialExpiryDate={subscription.trial_expiry_date}
/>
```

**CRITICAL: Update Imports in SubscriptionCard.tsx:**
```typescript
// REMOVE Chip from import (line 3):
// import { Card, Text, Icon, Chip, useTheme } from 'react-native-paper';
// REPLACE WITH:
import { Card, Text, Icon, useTheme } from 'react-native-paper';

// ADD TrialBadge import:
import { TrialBadge } from '@features/subscriptions/components/TrialBadge';

// ADD getTrialInfo import for accessibility label:
import {
  getCategoryConfig,
  formatPrice,
  getRenewalInfo,
  getTrialInfo,
} from '@features/subscriptions/utils/subscriptionUtils';
```

**CRITICAL: Update SubscriptionCard Accessibility Label:**
```typescript
// Current (line 30):
accessibilityLabel={`${subscription.name}, ${subscription.price} euros per ${subscription.billing_cycle}, ${renewalInfo.text}`}

// UPDATED — include trial info when applicable:
const trialInfo = getTrialInfo(subscription.is_trial, subscription.trial_expiry_date);
// ...
accessibilityLabel={`${subscription.name}, ${subscription.price} euros per ${subscription.billing_cycle}${trialInfo.status !== 'none' ? `, ${trialInfo.text}` : ''}, ${renewalInfo.text}`}
```

**CRITICAL: Remove Unused Styles from SubscriptionCard:**
```typescript
// REMOVE these styles (lines 126-131) — no longer used after Chip removal:
// trialChip: {
//   height: 24,
// },
// trialChipText: {
//   fontSize: 11,
// },
```

**CRITICAL: Type Exports from subscriptionUtils.ts:**
The `TrialStatus`, `TrialUrgency`, and `TrialInfo` types must be exported from `subscriptionUtils.ts` since `TrialBadge` imports `TrialUrgency` for the color/icon lookup maps. Add these to the feature `index.ts` exports as well.

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure (extend existing):**

   ```
   features/subscriptions/
   ├── components/
   │   ├── SubscriptionCard.tsx              (MODIFY — replace Chip with TrialBadge, update accessibility)
   │   ├── SubscriptionCard.test.tsx         (MODIFY — update trial badge tests)
   │   ├── SwipeableSubscriptionCard.tsx     (NO CHANGE)
   │   ├── SwipeableSubscriptionCard.test.tsx (NO CHANGE)
   │   ├── CostSummaryHeader.tsx             (NO CHANGE)
   │   ├── CostSummaryHeader.test.tsx        (NO CHANGE)
   │   ├── EmptySubscriptionState.tsx        (NO CHANGE)
   │   ├── SubscriptionListSkeleton.tsx      (NO CHANGE)
   │   ├── DeleteConfirmationDialog.tsx      (NO CHANGE)
   │   ├── DeleteConfirmationDialog.test.tsx (NO CHANGE)
   │   ├── TrialBadge.tsx                    (CREATE)
   │   └── TrialBadge.test.tsx              (CREATE)
   ├── screens/
   │   ├── AddSubscriptionScreen.tsx         (NO CHANGE — trial toggle already exists)
   │   ├── EditSubscriptionScreen.tsx        (NO CHANGE — trial toggle already exists)
   │   └── SubscriptionsScreen.tsx           (NO CHANGE)
   ├── services/
   │   └── subscriptionService.ts            (NO CHANGE — trial fields already handled)
   ├── types/
   │   ├── index.ts                          (NO CHANGE — trial types already in Subscription)
   │   └── schemas.ts                        (NO CHANGE — trial validation already exists)
   ├── utils/
   │   ├── subscriptionUtils.ts              (MODIFY — add getTrialInfo function + types)
   │   └── subscriptionUtils.test.ts         (MODIFY — add getTrialInfo tests)
   └── index.ts                              (MODIFY — add TrialBadge and getTrialInfo exports)
   ```

2. **Component Boundaries:**
   - `TrialBadge` → Pure presentational component. Receives `isTrial` and `trialExpiryDate`, internally calls `getTrialInfo()`, renders badge or null. Zero business logic beyond display.
   - `SubscriptionCard` → Already renders trial info. Replace `<Chip>Trial</Chip>` with `<TrialBadge>`. No new props needed — it already has the full `Subscription` object.
   - `getTrialInfo()` → Pure function in utils. Same pattern as `getRenewalInfo()`. No side effects, deterministic output.

3. **Naming Conventions:**
   - Components: PascalCase files (`TrialBadge.tsx`)
   - Functions: camelCase (`getTrialInfo`)
   - Types: PascalCase (`TrialInfo`, `TrialStatus`, `TrialUrgency`)
   - Test files: co-located (`TrialBadge.test.tsx` next to source)
   - Constants: UPPER_SNAKE_CASE (`URGENCY_COLORS`, `URGENCY_ICONS`)

4. **Import Aliases — REQUIRED:**

   ```typescript
   import { TrialBadge } from '@features/subscriptions/components/TrialBadge';
   import { getTrialInfo } from '@features/subscriptions/utils/subscriptionUtils';
   import type { TrialInfo, TrialUrgency } from '@features/subscriptions/utils/subscriptionUtils';
   ```

5. **Theme Compliance:**
   - TrialBadge uses hardcoded urgency colors (NOT theme colors) because these are domain-specific urgency indicators, not theme-controlled UI elements. The UX spec defines these exact colors for urgency levels.
   - The badge background uses the urgency color with `18` hex alpha (~9% opacity) for subtle tinted background.
   - React Native Paper `Icon` component is used (not raw `MaterialCommunityIcons`) to stay consistent with the component library.

6. **Error Handling Pattern:** No error handling needed — `getTrialInfo()` handles all edge cases (null values, missing dates) and always returns a valid `TrialInfo` object. TrialBadge renders nothing for non-trial subscriptions.

### Library & Framework Requirements

**No New Dependencies to Install:**

All required libraries are already installed from previous stories.

**Existing Dependencies Used:**

| Package                    | Version    | Usage in This Story                                    |
| -------------------------- | ---------- | ------------------------------------------------------ |
| react-native-paper         | ^5.15.0    | `Icon`, `Text` in TrialBadge; `Card` in SubscriptionCard |
| date-fns                   | ^4.1.0     | `differenceInDays`, `parseISO`, `startOfDay`, `isToday` for `getTrialInfo()` |
| react-native               | 0.76.9     | `View`, `StyleSheet` in TrialBadge                     |

**CRITICAL: Do NOT install any additional packages.** Everything needed is already available. Specifically:
- Do NOT install a countdown/timer library — `date-fns` `differenceInDays` is sufficient for day-based countdown
- Do NOT install an animation library for badge transitions — static badges are sufficient for MVP
- Do NOT install a color utility library — hardcoded hex with alpha suffix handles the tinted backgrounds

**CRITICAL: `date-fns` Functions Already Available:**
The `subscriptionUtils.ts` file (line 1) already imports `differenceInDays`, `isToday`, `parseISO`, `startOfDay` from `date-fns`. The `getTrialInfo` function uses the exact same imports — no additional `date-fns` imports needed.

**CRITICAL: @expo/vector-icons Ionicons Bug (from Story 2.1):**
Use `MaterialCommunityIcons` only. For TrialBadge icons, use React Native Paper's `Icon` component with Material Community Icon names: `timer-sand`, `alert`, `alert-circle`.

### File Structure Requirements

**Files to CREATE:**

- `src/features/subscriptions/components/TrialBadge.tsx` — Color-coded trial countdown badge component
- `src/features/subscriptions/components/TrialBadge.test.tsx` — TrialBadge tests (all urgency levels, accessibility)

**Files to MODIFY:**

- `src/features/subscriptions/utils/subscriptionUtils.ts` — Add `getTrialInfo()` function + `TrialInfo`, `TrialStatus`, `TrialUrgency` type exports
- `src/features/subscriptions/utils/subscriptionUtils.test.ts` — Add `getTrialInfo` tests (all urgency thresholds, edge cases, singular/plural)
- `src/features/subscriptions/components/SubscriptionCard.tsx` — Replace `<Chip>Trial</Chip>` with `<TrialBadge>`, remove `Chip` import, update accessibility label, remove unused trial chip styles
- `src/features/subscriptions/components/SubscriptionCard.test.tsx` — Update trial badge tests for new countdown behavior (test different day values, expired state)
- `src/features/subscriptions/index.ts` — Add `TrialBadge` and `getTrialInfo` exports

**Files NOT to touch:**

- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` — Trial toggle already implemented (Story 2.1)
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx` — Trial toggle already implemented (Story 2.2)
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — No changes needed (renders SwipeableSubscriptionCard which wraps SubscriptionCard)
- `src/features/subscriptions/components/SwipeableSubscriptionCard.tsx` — Wraps SubscriptionCard, no changes needed
- `src/features/subscriptions/services/subscriptionService.ts` — Trial fields already handled in create/update/delete
- `src/shared/stores/useSubscriptionStore.ts` — Trial fields already in Subscription type, no store changes
- `src/features/subscriptions/types/index.ts` — Subscription type already includes `is_trial` and `trial_expiry_date`
- `src/features/subscriptions/types/schemas.ts` — Trial validation schema already exists
- `src/config/theme.ts` — No theme changes (urgency colors are domain-specific, not theme colors)
- `src/config/categories.ts` — No category changes
- `supabase/migrations/*` — No schema changes (trial columns already exist)
- `package.json` — No new dependencies

### Testing Requirements

- Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
- Verify ESLint passes: `npx eslint src/` — zero errors/warnings
- Run existing tests: `npx jest` — all 77 existing tests pass (no regressions)

**New Test Coverage:**

**subscriptionUtils.test.ts — `getTrialInfo` Tests:**
- Test returns status 'none' when `isTrial` is false
- Test returns status 'none' when `isTrial` is null
- Test returns status 'active' with text "Trial" when `isTrial` is true but `trialExpiryDate` is null (fallback)
- Test returns status 'active' with urgencyLevel 'low' for >7 days remaining (e.g., 15 days)
- Test returns status 'expiring-soon' with urgencyLevel 'medium' for 4-7 days remaining (e.g., 5 days → "5 days left")
- Test returns status 'critical' with urgencyLevel 'high' for 1-3 days remaining (e.g., 2 days → "2 days left")
- Test returns singular "1 day left" for exactly 1 day remaining
- Test returns status 'critical' with urgencyLevel 'critical' for 0 days (today) → "Expires today"
- Test returns status 'expired' with urgencyLevel 'critical' for past dates → "Trial expired"
- Test returns correct `daysRemaining` values (positive, zero, negative)
- Test boundary: exactly 7 days → urgencyLevel 'medium'
- Test boundary: exactly 8 days → urgencyLevel 'low'
- Test boundary: exactly 3 days → urgencyLevel 'high'
- Test boundary: exactly 4 days → urgencyLevel 'medium'

**TrialBadge.test.tsx:**
- Test renders nothing when `isTrial` is false
- Test renders nothing when `isTrial` is null
- Test renders "Trial" text when trial has no expiry date
- Test renders countdown text for active trial (e.g., "10 days left")
- Test renders "Expires today" for trial expiring today
- Test renders "Trial expired" for expired trial
- Test correct accessibility label for active trial
- Test correct accessibility label for expired trial
- Test renders correct icon for low urgency (timer-sand)
- Test renders correct icon for critical urgency (alert-circle)

**SubscriptionCard.test.tsx — Updated Tests:**
- Update existing "shows trial badge when is_trial is true" test → verify countdown text appears (e.g., with specific trial_expiry_date)
- Update existing "does not show trial badge when is_trial is false" test → verify TrialBadge returns null
- Add test: trial with expiry date shows countdown text
- Add test: expired trial shows "Trial expired"
- Add test: accessibility label includes trial info when trial is active
- Add test: accessibility label does NOT include trial info when not a trial

**Manual Smoke Test:**
1. App launches → Login → navigate to "Subscriptions" tab
2. **Add a trial subscription:** Tap "+" → fill name/price → toggle "This is a trial" → set expiry date 10 days from now → save
3. **Verify low urgency badge:** Card shows gray badge with timer-sand icon and "10 days left"
4. **Edit to 5 days:** Edit subscription → change expiry to 5 days from now → save
5. **Verify medium urgency badge:** Card shows amber badge with "5 days left"
6. **Edit to 2 days:** Change expiry to 2 days from now → save
7. **Verify high urgency badge:** Card shows orange badge with alert icon and "2 days left"
8. **Edit to today:** Change expiry to today → save
9. **Verify critical badge:** Card shows red badge with alert-circle icon and "Expires today"
10. **Edit to yesterday:** Change expiry to yesterday → save
11. **Verify expired badge:** Card shows red badge with "Trial expired"
12. **Accessibility test:** VoiceOver reads "Trial, 5 days remaining" for the badge
13. **Accessibility test:** Full card label reads "Netflix, 9.99 euros per monthly, 5 days left, Renews in 30 days"
14. **Toggle trial off:** Edit subscription → toggle off trial → save → verify no badge shown
15. **Regression test:** Non-trial subscriptions show no trial badge (same as before)
16. **Regression test:** Edit/Delete/Swipe flows still work
17. **Regression test:** CostSummaryHeader still calculates correctly

### Previous Story Intelligence (Story 2.4)

**Key Learnings from Story 2.4 — Apply to This Story:**

- **Zustand store already has `(set, get)` signature:** Story 2.4 changed the persist callback from `(set)` to `(set, get)`. No store signature changes needed for Story 2.5 (no store changes at all).
- **Consolidated Snackbar pattern:** SubscriptionsScreen has a unified snackbar state `{ message: string; type: 'success' | 'error' } | null` plus a separate UndoSnackbar. Story 2.5 does not add any snackbar behavior — no risk of conflict.
- **`onSwipeableOpen` auto-close pattern:** Swipeable management is stable and does not need changes.
- **Non-null assertion avoidance:** Story 2.3 review mandated type narrowing over `result.data!`. Story 2.5 has no service calls or result handling — purely display logic. But follow the pattern: use `subscription.is_trial` (nullable boolean) with proper null checks in `getTrialInfo`.
- **Test mocking patterns established:** Mock `@shared/services/supabase`, `@react-native-async-storage/async-storage`. For TrialBadge tests, only `PaperProvider` wrapper is needed (same as SubscriptionCard tests). No service or store mocking needed — TrialBadge is pure presentational.
- **ESLint flat config:** `eslint.config.js`. Use `// eslint-disable-next-line no-console` before any `console.error` lines (unlikely needed in this story — no error logging in display components).
- **TypeScript strict mode:** All props must be typed. No `any` types. Use interfaces for component props.
- **Path aliases REQUIRED:** `@features/*`, `@shared/*`, `@config/*`, `@app/*` — never use relative paths that cross module boundaries.
- **`Chip` import cleanup:** When removing the `Chip` import from SubscriptionCard, verify no other usage of `Chip` in the file. Currently only the trial chip uses it — safe to remove.
- **`useTheme()` hook:** SubscriptionCard already imports and uses `useTheme()`. Story 2.5 does NOT need `useTheme()` in TrialBadge because urgency colors are hardcoded domain-specific values (per UX spec), not theme-controlled.
- **Test count baseline:** Story 2.4 had 77 tests total (66 from 2.4 + 11 from review). Verify this baseline before adding new tests.

**Story 2.4 Code Review Findings (relevant for this story):**
- M1: Guard against race conditions — not applicable (no async operations in Story 2.5)
- L1: Create barrel exports for new shared directories — not applicable (TrialBadge is feature-specific, not shared)
- L2: Import proper types instead of inline casts — ensure `TrialUrgency` type is properly imported in TrialBadge, not cast inline

### Git Intelligence

**Recent Commits (last 10):**

```
013dc41 story 2.4 done
1268165 story 2.4 in review
729650e story 2.4 ready-for-dev
e964ca8 story 2.3 done
f445f3c story 2.3 in review
60f6d31 story 2.3 add Follow-up tasks
ca2db1a story 2.3 in review
279b6f7 story 2.3 ready-for-dev
c0f2918 story 2.2 done
221ffb7 story 2.2 in review
```

**Key Insights:**

- Stories 2.1-2.4 followed a consistent workflow: ready-for-dev → in review → done. Story 2.5 should follow the same pattern.
- The trial toggle and date picker were added in Story 2.1 (AddSubscriptionScreen) and Story 2.2 (EditSubscriptionScreen). The simple "Trial" chip was added in Story 2.2 (SubscriptionCard). Story 2.5 enhances this chip into a full TrialBadge.
- The SubscriptionCard was last modified in Story 2.2 (add trial chip). Story 2.5 modifies it again (replace chip with TrialBadge).
- `subscriptionUtils.ts` was created in Story 2.2 with `formatPrice`, `getRenewalInfo`, `getCategoryConfig`, etc. Story 2.5 adds `getTrialInfo` following the exact same pattern as `getRenewalInfo`.
- All 77 tests pass on current master — baseline for regression check.
- The `src/shared/components/feedback/` directory now has `UndoSnackbar.tsx` and `index.ts` (from Story 2.4). TrialBadge goes in `features/subscriptions/components/` — not in shared (it's subscription-specific).

### Project Structure Notes

- `TrialBadge` is a **feature-specific** component — it belongs in `features/subscriptions/components/` (not shared, since it's tightly coupled to subscription trial logic via `getTrialInfo`)
- `getTrialInfo` is a **feature-specific** utility — it stays in `features/subscriptions/utils/subscriptionUtils.ts` alongside `getRenewalInfo`, `formatPrice`, etc.
- No new directories needed — all files go into existing directories
- No new navigation screens or stacks — trial badge is rendered inside existing SubscriptionCard
- No new types file needed — `TrialInfo`, `TrialStatus`, `TrialUrgency` are exported directly from `subscriptionUtils.ts`

### Scope Boundaries — What This Story Does NOT Include

**Explicitly OUT OF SCOPE (handled by future stories):**

- **Trial notifications/reminders** → Story 4.4 (Trial Expiry Notifications) handles push notifications for approaching trial expiry
- **Celebration overlay on trial cancellation** → Story 2.7 (Subscription Status Management) handles active/cancelled with optional celebration animation
- **Subscription detail view trial display** → Story 2.8 (Subscription Detail View) will show trial expiry date and countdown in the detail screen
- **Trial countdown progress bar** → UX spec mentions this but it's not in the AC — skip for MVP
- **Cancel Now quick action from trial badge** → UX spec mentions one-tap cancel, but this belongs in Story 2.7/2.8
- **Family note "Started by: [Name]"** → Not in any MVP epic
- **Trial-specific filtering or sorting** → Not in any MVP epic
- **Trial expiry date validation (must be future)** → The Zod schema validates presence but not future date constraint. This is acceptable — users may want to track already-expired trials they forgot about.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5: Trial Period Tracking]
- [Source: _bmad-output/planning-artifacts/prd.md#FR12 — User can mark a subscription as a trial with expiry date]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Naming — is_ prefix for booleans (is_trial)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Feature-based modular, component boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Structure, Testing]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#TrialBadge — Props, urgency colors, icon mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#SubscriptionCard States — Trial state with orange badge + countdown]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility — Screen reader labels for trial info]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Build Priority — TrialBadge P0]
- [Source: _bmad-output/implementation-artifacts/2-4-delete-subscription.md — Previous story learnings, test patterns, ESLint config]
- [Source: _bmad-output/implementation-artifacts/2-2-view-subscription-list.md — AC7 trial chip placeholder: "Story 2.5 will enhance with countdown"]
- [Source: src/features/subscriptions/utils/subscriptionUtils.ts — getRenewalInfo pattern, date-fns imports]
- [Source: src/features/subscriptions/components/SubscriptionCard.tsx — Current Chip-based trial badge (lines 65-69)]
- [Source: src/features/subscriptions/components/SubscriptionCard.test.tsx — Existing trial badge tests]
- [Source: src/features/subscriptions/types/index.ts — Subscription type with is_trial, trial_expiry_date]
- [Source: supabase/migrations/20260227000000_create_subscriptions.sql — is_trial BOOLEAN, trial_expiry_date DATE columns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- TrialBadge test fix: PaperProvider wraps all rendered output so `toJSON()` never returns null for empty components. Used `queryByRole('text')` instead. Icon names not serialized in test renderer — tested urgency colors instead.

### Completion Notes List

- **Task 1:** Added `getTrialInfo()` utility function to `subscriptionUtils.ts` following the exact same pattern as `getRenewalInfo()`. Exports `TrialInfo`, `TrialStatus`, `TrialUrgency` types. 14 tests added covering all urgency levels, boundaries, edge cases, singular/plural.
- **Task 2:** Created `TrialBadge` component as a pure presentational component. Uses hardcoded urgency colors (gray/amber/orange/red) with hex alpha backgrounds. 10 tests added covering render states, accessibility labels, urgency colors.
- **Task 3:** Replaced `<Chip>Trial</Chip>` in SubscriptionCard with `<TrialBadge>`. Removed `Chip` import and unused `trialChip`/`trialChipText` styles. Updated accessibility label to include trial countdown info. 4 new tests added.
- **Task 4:** Added `TrialBadge`, `getTrialInfo`, and type exports to feature `index.ts`. All quality gates passed: TypeScript (0 errors), ESLint (0 errors/warnings), Jest (105/105 tests pass).

### Change Log

- 2026-03-01: Implemented Story 2.5 Trial Period Tracking — added `getTrialInfo` utility, created `TrialBadge` component with urgency-based color coding, replaced static "Trial" chip with dynamic countdown badge in SubscriptionCard, updated accessibility labels. 28 new tests added (105 total, 0 regressions).

### File List

- `src/features/subscriptions/utils/subscriptionUtils.ts` — MODIFIED: Added `TrialStatus`, `TrialUrgency`, `TrialInfo` types and `getTrialInfo()` function
- `src/features/subscriptions/utils/subscriptionUtils.test.ts` — MODIFIED: Added 14 `getTrialInfo` tests
- `src/features/subscriptions/components/TrialBadge.tsx` — CREATED: Color-coded trial countdown badge component
- `src/features/subscriptions/components/TrialBadge.test.tsx` — CREATED: 10 TrialBadge tests
- `src/features/subscriptions/components/SubscriptionCard.tsx` — MODIFIED: Replaced Chip with TrialBadge, removed Chip import, removed unused styles, updated accessibility label
- `src/features/subscriptions/components/SubscriptionCard.test.tsx` — MODIFIED: Updated existing trial test, added 4 new tests (countdown, expired, accessibility)
- `src/features/subscriptions/index.ts` — MODIFIED: Added TrialBadge, getTrialInfo, and type exports
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: Updated 2-5-trial-period-tracking status
- `_bmad-output/implementation-artifacts/2-5-trial-period-tracking.md` — MODIFIED: Updated task checkboxes, Dev Agent Record, File List, Change Log, Status
