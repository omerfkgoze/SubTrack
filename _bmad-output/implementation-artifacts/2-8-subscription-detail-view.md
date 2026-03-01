# Story 2.8: Subscription Detail View

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to view detailed information about a specific subscription,
so that I can see all the relevant details including next renewal date.

## Acceptance Criteria

1. **View Full Subscription Details on Card Tap**
   - Given the user taps on a subscription card in the list
   - When the detail view opens
   - Then all subscription details are displayed: name, price, billing cycle, next renewal date, category, status (active/cancelled), trial status, notes, created date
   - And action buttons are available: Edit, Delete, Toggle Status
   - And the next renewal date is clearly highlighted

2. **Trial Information Display**
   - Given the subscription is a trial
   - When viewing the detail screen
   - Then the trial expiry date and countdown are prominently displayed
   - And the trial badge shows color-coded urgency (green >7 days, amber 4-7 days, orange 1-3 days, red expired)

3. **Action Buttons Functionality**
   - Given the user is viewing the subscription detail screen
   - When they tap "Edit Details"
   - Then they are navigated to the EditSubscription screen with the subscription ID
   - When they tap "Delete Subscription"
   - Then a confirmation dialog appears before deletion
   - And deletion triggers UndoSnackbar with 5-second undo window
   - When they tap "Toggle Status"
   - Then the subscription status toggles between active and cancelled with immediate visual feedback

4. **Cancelled Subscription Visual State**
   - Given the subscription is cancelled (is_active === false)
   - When viewing the detail screen
   - Then the price is shown with strikethrough
   - And the status shows "Cancelled" with muted styling
   - And the Toggle Status button shows "Activate" instead of "Cancel"

5. **Navigation Integration**
   - Given the user taps on any subscription card in the list
   - When the detail screen opens
   - Then the back button returns to the subscription list
   - And the header shows "Subscription Details" with Edit and Delete action icons

## Tasks / Subtasks

- [x] Task 1: Add SubscriptionDetail route to navigation (AC: #5)
  - [x] 1.1 Add `SubscriptionDetail: { subscriptionId: string }` to `SubscriptionsStackParamList` in `src/app/navigation/types.ts`
  - [x] 1.2 Register `SubscriptionDetailScreen` in `src/app/navigation/SubscriptionsStack.tsx` between SubscriptionsList and EditSubscription
  - [x] 1.3 Update `SubscriptionsScreen.tsx` card onPress to navigate to `SubscriptionDetail` instead of `EditSubscription`

- [x] Task 2: Create SubscriptionDetailScreen with full detail display (AC: #1, #4)
  - [x] 2.1 Create `src/features/subscriptions/screens/SubscriptionDetailScreen.tsx`
  - [x] 2.2 Get `subscriptionId` from route params, find subscription in store
  - [x] 2.3 Show "not found" message if subscription is missing (follow EditSubscriptionScreen pattern)
  - [x] 2.4 Display subscription header section: name (18px Medium), category icon + color stripe, price with billing cycle
  - [x] 2.5 Display key information section: price, billing cycle, next renewal date (highlighted with primary color), category name, status (Active/Cancelled badge), created date
  - [x] 2.6 Show strikethrough on price and "Cancelled" status badge when `is_active === false`
  - [x] 2.7 Display notes section if notes exist

- [x] Task 3: Add trial information display (AC: #2)
  - [x] 3.1 Use `getTrialInfo()` from `subscriptionUtils.ts` to get trial countdown and urgency
  - [x] 3.2 Display trial section with expiry date and color-coded countdown badge when `is_trial === true`
  - [x] 3.3 Hide trial section entirely when subscription is not a trial

- [x] Task 4: Add action buttons (AC: #3, #4)
  - [x] 4.1 Add "Edit Details" button (outlined/secondary style) — navigates to EditSubscription screen
  - [x] 4.2 Add "Delete Subscription" button (destructive style) — shows confirmation Dialog, then calls store `deleteSubscription`
  - [x] 4.3 Add "Cancel Subscription" / "Activate Subscription" text button (tertiary) — calls store `toggleSubscriptionStatus`
  - [x] 4.4 After delete, navigate back to subscription list and show UndoSnackbar
  - [x] 4.5 After toggle status, show success Snackbar ("Netflix cancelled" / "Netflix activated") and update UI

- [x] Task 5: Set up screen header with action icons (AC: #5)
  - [x] 5.1 Configure React Navigation header: title "Subscription Details", back button
  - [x] 5.2 Add Edit (pencil) and Delete (trash) icons in header right
  - [x] 5.3 Wire header icons to same handlers as body buttons

- [x] Task 6: Write tests for SubscriptionDetailScreen (AC: #1-#5)
  - [x] 6.1 Create `src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx`
  - [x] 6.2 Test: renders all subscription details (name, price, cycle, renewal, category, status, notes)
  - [x] 6.3 Test: highlights next renewal date
  - [x] 6.4 Test: shows trial information when is_trial is true
  - [x] 6.5 Test: hides trial section when is_trial is false
  - [x] 6.6 Test: shows strikethrough price and "Cancelled" badge for inactive subscription
  - [x] 6.7 Test: Edit button navigates to EditSubscription screen
  - [x] 6.8 Test: Delete button shows confirmation dialog
  - [x] 6.9 Test: Toggle status button calls toggleSubscriptionStatus
  - [x] 6.10 Test: shows "Subscription not found" for invalid ID
  - [x] 6.11 Test: accessibility labels are correct

- [x] Task 7: Update navigation tests and run full regression (AC: #5)
  - [x] 7.1 Verify SubscriptionsScreen card tap navigates to SubscriptionDetail (update existing test if needed)
  - [x] 7.2 Run full test suite — ensure 0 regressions
  - [x] 7.3 Run TypeScript type check and ESLint

## Dev Notes

### CRITICAL: Existing Implementation Analysis

**This is a NEW screen — no partial implementation exists.** However, many patterns and utilities already exist that MUST be reused:

**Already implemented (MUST reuse, DO NOT recreate):**
- `subscriptionUtils.ts` → `formatPrice(price, cycle)` returns "€17.99/mo" format
- `subscriptionUtils.ts` → `getRenewalInfo(renewalDate)` returns `{ text, daysUntil, isOverdue }`
- `subscriptionUtils.ts` → `getTrialInfo(isTrial, trialExpiryDate)` returns `{ daysRemaining, status, text, urgencyLevel }`
- `subscriptionUtils.ts` → `getCategoryConfig(categoryId)` returns `{ label, icon, color }`
- `subscriptionUtils.ts` → `formatBillingCycleShort(cycle)` returns 'mo', 'yr', 'qtr', 'wk'
- `useSubscriptionStore` → `deleteSubscription(id)`, `toggleSubscriptionStatus(id)`, `undoDelete()`, `clearPendingDelete()`
- `UndoSnackbar` shared component — for delete undo flow
- `SubscriptionCard.tsx` → existing card component shows how to display subscription info
- `EditSubscriptionScreen.tsx` → pattern for reading subscriptionId from route params and finding in store
- Navigation types and stack setup in `src/app/navigation/`

**What MUST be created (the actual work for this story):**

#### 1. Navigation Route — `SubscriptionDetail` does NOT exist

`SubscriptionsStackParamList` in `src/app/navigation/types.ts` currently only has:
```typescript
export type SubscriptionsStackParamList = {
  SubscriptionsList: { updated?: boolean } | undefined;
  EditSubscription: { subscriptionId: string };
};
```

Must add:
```typescript
SubscriptionDetail: { subscriptionId: string };
```

#### 2. Navigation Stack — Screen NOT registered

`SubscriptionsStack.tsx` currently registers:
- `SubscriptionsList` → SubscriptionsScreen
- `EditSubscription` → EditSubscriptionScreen

Must add `SubscriptionDetail` → SubscriptionDetailScreen between them.

#### 3. Card onPress — Currently navigates to Edit, NOT Detail

`SubscriptionsScreen.tsx` line 93 has:
```typescript
navigation.navigate('EditSubscription', { subscriptionId })
```

This MUST change to:
```typescript
navigation.navigate('SubscriptionDetail', { subscriptionId })
```

The Edit action will be accessed from the Detail screen instead.

#### 4. New Screen — `SubscriptionDetailScreen.tsx`

**Screen Layout (from UX spec):**
```
┌─────────────────────────────────────────────┐
│ ←  Subscription Details      🗑️  ✏️        │  ← Header (56px)
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │▌ 🎬  Netflix             €17.99/mo │   │  ← Hero card area
│  │▌      Entertainment                │   │
│  │▌      Renews in 5 days             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  DETAILS:                                   │
│  ─────────────────────────────────────     │
│  Price           €17.99/month              │
│  Billing Cycle   Monthly                   │
│  Next Renewal    February 7, 2026  ← highlighted │
│  Category        Entertainment             │
│  Status          Active  ← green badge     │
│  Created         January 10, 2026          │
│                                             │
│  TRIAL INFO (if applicable):               │
│  ─────────────────────────────────────     │
│  ⏳ Trial ends in 3 days                   │
│  Expires: February 5, 2026                 │
│                                             │
│  NOTES:                                    │
│  ─────────────────────────────────────     │
│  "Premium plan with extra screens"         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Edit Details                │   │  ← Outlined button
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │      Delete Subscription            │   │  ← Destructive button
│  └─────────────────────────────────────┘   │
│           Cancel Subscription              │  ← Text button
│                                             │
└─────────────────────────────────────────────┘
```

**Data access pattern (follow EditSubscriptionScreen):**
```typescript
const { subscriptionId } = route.params;
const subscription = useSubscriptionStore((s) =>
  s.subscriptions.find((sub) => sub.id === subscriptionId)
);
```

#### 5. Delete Flow — Reuse existing pattern from SubscriptionsScreen

The delete flow already exists in SubscriptionsScreen with Dialog + UndoSnackbar. Replicate the same pattern:
1. Show `Dialog` for confirmation
2. Call `deleteSubscription(id)` from store
3. Navigate back to SubscriptionsList
4. Show `UndoSnackbar` (note: snackbar should show AFTER navigation — consider passing a param or using the store's `pendingDelete`)

**IMPORTANT:** The UndoSnackbar is currently rendered in SubscriptionsScreen. After deleting from detail view and navigating back, the SubscriptionsScreen's UndoSnackbar should pick up the `pendingDelete` from the store automatically.

#### 6. Toggle Status — Reuse existing store action

Call `toggleSubscriptionStatus(id)` from store. Show success Snackbar feedback (established in Story 2.7 review).

#### 7. Renewal Date Highlighting

The next renewal date should be visually emphasized:
- Use `theme.colors.primary` (#6366F1) for the renewal date value
- Use bold/medium weight text
- Use `getRenewalInfo()` for "Renews in X days" / "Overdue by X days" text

### Project Structure Notes

- Feature boundary: New screen in `src/features/subscriptions/screens/`, navigation updates in `src/app/navigation/`
- One new file created: `SubscriptionDetailScreen.tsx` + its test file
- No new shared components needed — reuse existing utilities and components
- Follows co-located test pattern established in Stories 2.5–2.7
- ESLint flat config with path aliases (`@features/*`, `@shared/*`, `@config/*`)
- PaperProvider wrapper required for component tests (established in Story 2.5)

### Architecture Compliance

- **Component Pattern:** Functional components with TypeScript interfaces (PascalCase) — `SubscriptionDetailScreen.tsx`
- **Store Pattern:** Read subscription from Zustand store via selector, dispatch actions (delete, toggle) through store — NO direct service calls from screen
- **Service Pattern:** Screen never calls `subscriptionService` directly; all mutations go through store actions
- **Boundaries:** Screen → Store → Service → Supabase — same data flow as all other screens
- **Navigation Pattern:** React Navigation 6 with `createNativeStackNavigator`, strongly typed `SubscriptionsStackScreenProps<'SubscriptionDetail'>`
- **State Access:** `useSubscriptionStore((s) => s.subscriptions)` to find by ID — same pattern as EditSubscriptionScreen (line 43)
- **Error Handling:** Store-level error state (`error: AppError | null`), display via Snackbar
- **Loading States:** Use `isSubmitting` from store during delete/toggle operations to disable buttons

### Library/Framework Requirements

- **react-native-paper** components: `Button` (outlined, contained, text modes), `Dialog`, `Text`, `Divider`, `IconButton`, `useTheme()` — all already installed
- **react-native-paper** `Portal` — for Dialog rendering (already available via PaperProvider)
- **@react-navigation/native** — `useNavigation`, `useRoute` hooks for navigation
- **react-native** `ScrollView`, `View`, `StyleSheet` — standard layout
- **No new packages to install** — everything needed is already in the project

### File Structure Requirements

**Files to CREATE:**
```
src/features/subscriptions/screens/SubscriptionDetailScreen.tsx        ← New detail screen
src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx   ← Co-located tests
```

**Files to MODIFY:**
```
src/app/navigation/types.ts                                            ← Add SubscriptionDetail to SubscriptionsStackParamList
src/app/navigation/SubscriptionsStack.tsx                              ← Register SubscriptionDetailScreen
src/features/subscriptions/screens/SubscriptionsScreen.tsx             ← Change card onPress to navigate to SubscriptionDetail
```

**Files NOT to touch:**
```
src/features/subscriptions/components/SubscriptionCard.tsx             ← onPress prop already works, no changes needed
src/features/subscriptions/components/SwipeableSubscriptionCard.tsx    ← onPress prop already works, no changes needed
src/shared/stores/useSubscriptionStore.ts                              ← deleteSubscription, toggleSubscriptionStatus already exist
src/features/subscriptions/services/subscriptionService.ts             ← No new service methods needed
src/features/subscriptions/utils/subscriptionUtils.ts                  ← All helpers already exist
src/features/subscriptions/types/index.ts                              ← No type changes needed
src/features/subscriptions/types/schemas.ts                            ← No schema changes needed
src/features/subscriptions/screens/EditSubscriptionScreen.tsx          ← No changes needed
src/features/subscriptions/screens/AddSubscriptionScreen.tsx           ← No changes needed
src/shared/components/UndoSnackbar.tsx                                 ← Already works, no changes needed
src/config/theme.ts                                                    ← No theme changes needed
src/config/categories.ts                                               ← No category changes needed
```

### Testing Requirements

**SubscriptionDetailScreen tests (~11 new tests):**
- Renders all subscription details: name, price, billing cycle, renewal date, category, status, created date
- Highlights next renewal date with primary color styling
- Shows trial section with countdown when `is_trial === true` and `trial_expiry_date` is set
- Hides trial section when `is_trial === false`
- Shows strikethrough on price for cancelled subscription (`is_active === false`)
- Shows "Cancelled" status badge for inactive subscription
- Shows "Active" status badge for active subscription
- Edit button navigates to `EditSubscription` with correct `subscriptionId`
- Delete button shows confirmation dialog; confirming calls `deleteSubscription`
- Toggle status button calls `toggleSubscriptionStatus` and shows success snackbar
- Shows "Subscription not found" message for invalid subscription ID
- Accessibility labels are correct for all interactive elements

**Navigation integration tests (~2 updated tests):**
- SubscriptionsScreen card onPress navigates to `SubscriptionDetail` (update existing test)
- Back navigation from detail returns to subscription list

**Test Setup Pattern (follow EditSubscriptionScreen.test.tsx):**
```typescript
function renderWithProvider(subscriptionId: string) {
  const route = { params: { subscriptionId }, key: 'test', name: 'SubscriptionDetail' as const };
  return render(
    <PaperProvider theme={theme}>
      <SubscriptionDetailScreen route={route} navigation={mockNavigation} />
    </PaperProvider>,
  );
}

// Mock store state
useSubscriptionStore.setState({
  subscriptions: [mockSubscription],
  isLoading: false,
  isSubmitting: false,
  error: null,
  pendingDelete: null,
});
```

**Mock Requirements:**
- `AsyncStorage` — jest mock (already in setup)
- `@supabase/supabase-js` — mock client (already in setup)
- `react-native-paper-dates` `DatePickerInput` — mock (already in setup)
- `mockNavigation` — `{ navigate: jest.fn(), goBack: jest.fn() }`

**Regression:** All existing 148 tests must pass with 0 failures.

### Previous Story Intelligence (Story 2.7)

**Key learnings to apply:**
- Story 2.7 added `toggleSubscriptionStatus` to the store with optimistic toggle + rollback — reuse this action directly
- Story 2.7 added success snackbar feedback after toggle ("Netflix cancelled" / "Netflix activated") — replicate same feedback pattern
- Story 2.7 added `onToggleStatus` prop to SwipeableSubscriptionCard — detail screen should use same store action
- Code review added accessibility action for toggle status — ensure detail screen buttons have proper `accessibilityLabel`
- 148 tests currently passing (123 from earlier + 24 from 2.7 + 1 from code review)
- `PaperProvider` wrapper required in test setup (from `testHelpers.ts` or inline)
- `jest.requireMock` in helper functions for Supabase call chaining (service test pattern)
- Edit screen pattern: get subscription from store by ID, show "not found" if missing — follow same pattern exactly

**Files modified in Story 2.7 that are relevant:**
- `src/shared/stores/useSubscriptionStore.ts` — `toggleSubscriptionStatus` action and `undoDelete` fix; both will be called from detail screen
- `src/features/subscriptions/components/SubscriptionCard.tsx` — Strikethrough + "Cancelled" styling patterns; reference for detail screen visual states
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — `handleToggleStatus` callback pattern; replicate in detail screen
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx` — Route params + store access pattern; follow for detail screen

### Git Intelligence

**Recent commit pattern:** `story X.Y done`, `story X.Y in review`, `story X.Y ready-for-dev`
- Linear progression, no branching — follow same commit convention
- Last 10 commits all follow this pattern consistently

**Last completed work (Story 2.7):**
- Added subscription status management: toggle active/cancelled, visual styling, swipe action, edit switch
- 148 total tests passing after code review
- Code follows established patterns consistently
- All TypeScript and ESLint checks clean

**Codebase state:**
- Git status is clean (no uncommitted changes)
- Branch: master
- All 148 tests green

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.8: Subscription Detail View]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Detail screen layout, button styles, trial badge, typography, spacing, color system]
- [Source: _bmad-output/planning-artifacts/architecture.md — React Navigation 6, Zustand store pattern, feature module structure, service layer, testing standards]
- [Source: _bmad-output/planning-artifacts/prd.md — FR8-FR15 Subscription Management requirements]
- [Source: _bmad-output/implementation-artifacts/2-7-subscription-status-management.md — Previous story learnings, toggleSubscriptionStatus, 148 tests]
- [Source: src/app/navigation/types.ts — SubscriptionsStackParamList (missing SubscriptionDetail route)]
- [Source: src/app/navigation/SubscriptionsStack.tsx — Stack navigator registration (needs new screen)]
- [Source: src/features/subscriptions/screens/SubscriptionsScreen.tsx — Card onPress currently navigates to EditSubscription]
- [Source: src/features/subscriptions/screens/EditSubscriptionScreen.tsx — Route params + store access pattern to follow]
- [Source: src/features/subscriptions/utils/subscriptionUtils.ts — formatPrice, getRenewalInfo, getTrialInfo, getCategoryConfig helpers]
- [Source: src/shared/stores/useSubscriptionStore.ts — deleteSubscription, toggleSubscriptionStatus, undoDelete actions]
- [Source: src/shared/components/UndoSnackbar.tsx — Delete undo flow component]
- [Source: src/config/theme.ts — MD3 theme with primary #6366F1, error #EF4444, tertiary #10B981]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial test run: 3 tests failed due to multiple text matches (price shown in hero card + details, "Cancelled" in multiple places, trial expiry date format). Fixed by using `getAllByText` and regex patterns.

### Completion Notes List

- Created SubscriptionDetailScreen with hero card, details section, trial info, notes, and action buttons
- Navigation route added to SubscriptionsStackParamList and registered in SubscriptionsStack
- Card onPress in SubscriptionsScreen now navigates to SubscriptionDetail instead of EditSubscription
- Edit action accessible from detail screen header icons and body button
- Delete flow uses existing DeleteConfirmationDialog + store deleteSubscription, navigates back after delete (UndoSnackbar in SubscriptionsScreen picks up pendingDelete from store)
- Toggle status uses store toggleSubscriptionStatus with snackbar feedback
- Header configured with pencil (edit) and trash (delete) icons via useLayoutEffect
- Renewal date highlighted with theme.colors.primary
- Strikethrough price and "Cancelled" status for inactive subscriptions
- Trial section shows TrialBadge + expiry date, hidden when not a trial
- 13 new tests added (161 total, 0 regressions)
- TypeScript and ESLint checks pass clean

### Change Log

- 2026-03-01: Story 2.8 implementation — Subscription Detail View screen with full details, trial info, action buttons, header icons, and 13 tests

### File List

**Created:**
- src/features/subscriptions/screens/SubscriptionDetailScreen.tsx
- src/features/subscriptions/screens/SubscriptionDetailScreen.test.tsx

**Modified:**
- src/app/navigation/types.ts
- src/app/navigation/SubscriptionsStack.tsx
- src/features/subscriptions/screens/SubscriptionsScreen.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/2-8-subscription-detail-view.md
