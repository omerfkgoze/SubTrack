# Story 2.3: Edit Subscription Details

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to edit an existing subscription's details,
so that I can keep my information accurate when prices change or details update.

## Acceptance Criteria

1. **AC1 - Swipe-to-Edit Action:** Given the user is viewing the subscription list, when they swipe left on a subscription card, then an "Edit" action button is revealed (blue background, pencil icon). The swipe uses `react-native-gesture-handler` `Swipeable` component with spring animation (damping: 20). The swipe action area is 72px wide minimum (touch target compliance). A "Delete" action button is also revealed (red background, trash icon) — but delete functionality is Story 2.4 scope (the button is visible but triggers no action yet, or can be hidden and added in 2.4).

2. **AC2 - Edit Navigation via Tap:** Given the user taps the "Edit" swipe action button OR taps on a subscription card directly, when the action is triggered, then the user is navigated to the EditSubscriptionScreen with the subscription data pre-filled. Navigation uses a new `SubscriptionsStack` (NativeStackNavigator) wrapping the Subscriptions tab, matching the SettingsStack pattern.

3. **AC3 - Edit Form Pre-fill:** Given the user opens the edit form for a subscription, when the EditSubscriptionScreen mounts, then ALL current subscription fields are pre-filled: name, price, billing cycle (SegmentedButtons), renewal date (DatePickerInput), category (Chips), trial toggle + trial expiry date (if applicable), and notes. The form uses the same layout and components as AddSubscriptionScreen.

4. **AC4 - Form Validation:** Given the user modifies fields and submits, when the form is validated, then the same Zod schema validation rules apply as AddSubscriptionScreen: name required (1-100 chars), price positive number, billing cycle required, renewal date required, trial expiry date required if trial enabled. Invalid fields show inline error messages.

5. **AC5 - Save Changes:** Given the user submits valid changes, when the update is processed, then the subscription is updated in Supabase via a new `updateSubscription` service method, the `updated_at` timestamp is refreshed server-side, the Zustand store's subscription array is updated optimistically (replace the matching item), and the user is navigated back to the subscription list with a success Snackbar ("Subscription updated").

6. **AC6 - Error Handling:** Given a network error or server error occurs during update, when the save fails, then a user-friendly error Snackbar is displayed ("Failed to update subscription. Please try again."), the form remains open with all entered data preserved, and a "Retry" action is available. Previously saved data in the store is NOT modified on failure.

7. **AC7 - Loading State:** Given the user taps "Save Changes", when the update is in progress, then the save button shows a loading spinner and is disabled (`isSubmitting` state), all form fields are disabled during submission, and the back/cancel button is also disabled to prevent data loss.

8. **AC8 - Cancel Edit:** Given the user taps the back button or a "Cancel" action, when changes have been made to the form, then the user is navigated back to the subscription list without saving changes. No confirmation dialog needed (keeping it simple for MVP — user can always re-edit).

9. **AC9 - Accessibility:** All swipe action buttons have `accessibilityLabel` ("Edit [subscription name]", "Delete [subscription name]"). The edit form inherits accessibility patterns from AddSubscriptionScreen (field labels, roles, hints). Swipe actions are announced via `accessibilityActions` as an alternative to gesture (for screen reader users who cannot swipe).

## Tasks / Subtasks

- [x] Task 1: Add `updateSubscription` Service Method (AC: #5, #6)
  - [x] 1.1 Add `updateSubscription(id: string, dto: Partial<CreateSubscriptionDTO>)` to `src/features/subscriptions/services/subscriptionService.ts`
  - [x] 1.2 Method uses `supabase.from('subscriptions').update(dto).eq('id', id).eq('user_id', userId).select().single()`
  - [x] 1.3 Returns `SubscriptionResult` (same pattern as `createSubscription`)
  - [x] 1.4 Supabase automatically updates `updated_at` timestamp

- [x] Task 2: Add `updateSubscription` Store Action (AC: #5, #6, #7)
  - [x] 2.1 Add `UpdateSubscriptionDTO` type to `src/features/subscriptions/types/index.ts` — `Partial<CreateSubscriptionDTO> & { id: string }`
  - [x] 2.2 Add `updateSubscription(id: string, dto: Partial<CreateSubscriptionDTO>)` action to `useSubscriptionStore`
  - [x] 2.3 Uses `isSubmitting` flag (same as `addSubscription`)
  - [x] 2.4 On success: replace matching subscription in `subscriptions` array (by id), set `isSubmitting: false`
  - [x] 2.5 On failure: set `error`, set `isSubmitting: false`, return `false`
  - [x] 2.6 Import `updateSubscription` from service in store file

- [x] Task 3: Create SubscriptionsStack Navigator (AC: #2)
  - [x] 3.1 Create `src/app/navigation/SubscriptionsStack.tsx` — NativeStackNavigator with two screens:
    - `SubscriptionsList` → `SubscriptionsScreen` (headerShown: false)
    - `EditSubscription` → `EditSubscriptionScreen` (header title: "Edit Subscription")
  - [x] 3.2 Add `SubscriptionsStackParamList` to `src/app/navigation/types.ts`:
    - `SubscriptionsList: undefined`
    - `EditSubscription: { subscriptionId: string }`
  - [x] 3.3 Update `MainTabs.tsx`: Replace `SubscriptionsScreen` with `SubscriptionsStack` as the Subscriptions tab component

- [x] Task 4: Create SwipeableSubscriptionCard Wrapper (AC: #1, #9)
  - [x] 4.1 Create `src/features/subscriptions/components/SwipeableSubscriptionCard.tsx`:
    - Wraps `SubscriptionCard` with `Swipeable` from `react-native-gesture-handler`
    - `renderRightActions` renders "Edit" button (blue, pencil-outline icon) and "Delete" button (red, trash-can-outline icon)
    - Each action button: 72px width, centered icon + label, full card height
    - Props: `subscription`, `onEdit`, `onDelete`, `onPress`
    - Spring animation: overshootRight false, friction 2
    - Accessibility: `accessibilityActions` for edit/delete, `onAccessibilityAction` handler
  - [x] 4.2 Create `src/features/subscriptions/components/SwipeableSubscriptionCard.test.tsx`:
    - Test renders subscription card
    - Test swipe reveals action buttons
    - Test edit callback fires on edit button press
    - Test accessibility actions

- [x] Task 5: Create EditSubscriptionScreen (AC: #3, #4, #5, #6, #7, #8)
  - [x] 5.1 Create `src/features/subscriptions/screens/EditSubscriptionScreen.tsx`:
    - Receives `subscriptionId` from navigation params
    - Looks up subscription from `useSubscriptionStore` by ID
    - Uses `react-hook-form` with `createSubscriptionSchema` (same Zod schema as Add)
    - Pre-fills all form fields with current subscription values via `defaultValues`
    - Form layout mirrors AddSubscriptionScreen: Name → Price → Billing Cycle → Renewal Date → Category → Trial Toggle → Trial Expiry → Notes
    - Submit button: "Save Changes" (instead of "Add Subscription")
    - Calls `updateSubscription(id, changedFields)` on submit
    - On success: navigate back + show success Snackbar
    - On error: show error Snackbar, keep form open
    - Loading: `isSubmitting` disables all fields and button
    - No celebration overlay (only for first subscription add)
  - [x] 5.2 Create `src/features/subscriptions/screens/EditSubscriptionScreen.test.tsx`:
    - Test form pre-fills with subscription data
    - Test form validation
    - Test successful update navigates back

- [x] Task 6: Update SubscriptionsScreen with Swipeable Cards (AC: #1, #2)
  - [x] 6.1 Replace `SubscriptionCard` with `SwipeableSubscriptionCard` in SubscriptionsScreen FlatList `renderItem`
  - [x] 6.2 Add `onEdit` handler: navigate to `EditSubscription` screen with subscriptionId
  - [x] 6.3 Add `onPress` handler on card: same navigation to `EditSubscription` screen
  - [x] 6.4 Add `onDelete` handler: no-op for now (Story 2.4 scope) or omit prop
  - [x] 6.5 Add success Snackbar display after returning from edit (listen for navigation focus + store changes)

- [x] Task 7: Update Feature Exports and Final Verification (AC: all)
  - [x] 7.1 Update `src/features/subscriptions/index.ts` with new exports: `SwipeableSubscriptionCard`, `EditSubscriptionScreen`
  - [x] 7.2 Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
  - [x] 7.3 Verify ESLint passes: `npx eslint src/` — zero errors/warnings
  - [x] 7.4 Run existing tests: `npx jest` — all pass (no regressions)

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] AC9: Add `accessibilityActions` and `onAccessibilityAction` handler to SwipeableSubscriptionCard for screen reader users who cannot swipe [`src/features/subscriptions/components/SwipeableSubscriptionCard.tsx`]
- [x] [AI-Review][HIGH] AC5: Implement success Snackbar after returning from edit — `setSuccessSnackbar` is never called; add navigation focus listener to detect return from EditSubscription and show "Subscription updated" message [`src/features/subscriptions/screens/SubscriptionsScreen.tsx:34`]
- [x] [AI-Review][HIGH] AC7: Disable header back button during `isSubmitting` via `navigation.setOptions({ headerBackVisible: false })` or `gestureEnabled: false` to prevent data loss [`src/features/subscriptions/screens/EditSubscriptionScreen.tsx`]
- [x] [AI-Review][MEDIUM] Remove non-null assertion `result.data!` in updateSubscription store action — use a const assignment with early return or type narrowing instead (contradicts Story 2.2 review fix) [`src/shared/stores/useSubscriptionStore.ts:81`]
- [x] [AI-Review][MEDIUM] Improve test assertions: (1) successful submit test should verify `mockGoBack` was called, (2) failed submit test should verify snackbar error message is displayed [`src/features/subscriptions/screens/EditSubscriptionScreen.test.tsx:97-133`]
- [x] [AI-Review][LOW] AC1: Spring animation spec says "damping: 20" but Swipeable uses `friction={2}` — verify with UX spec if current behavior is acceptable [`src/features/subscriptions/components/SwipeableSubscriptionCard.tsx:56-57`]
- [x] [AI-Review][LOW] Currency is hardcoded to 'EUR' on edit submit — if subscription had different currency, it would be overwritten [`src/features/subscriptions/screens/EditSubscriptionScreen.tsx:78`]

## Dev Notes

### Critical Technical Requirements

**Swipe Gesture Implementation — react-native-gesture-handler Swipeable:**

```typescript
import { Swipeable } from 'react-native-gesture-handler';

// SwipeableSubscriptionCard wrapper
function SwipeableSubscriptionCard({ subscription, onEdit, onDelete, onPress }: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editAction]}
        onPress={() => {
          swipeableRef.current?.close();
          onEdit?.();
        }}
        accessibilityLabel={`Edit ${subscription.name}`}
        accessibilityRole="button"
      >
        <Icon source="pencil-outline" size={22} color="#FFFFFF" />
        <Text style={styles.actionLabel}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete?.();
        }}
        accessibilityLabel={`Delete ${subscription.name}`}
        accessibilityRole="button"
      >
        <Icon source="trash-can-outline" size={22} color="#FFFFFF" />
        <Text style={styles.actionLabel}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <SubscriptionCard subscription={subscription} onPress={onPress} />
    </Swipeable>
  );
}

// Action button styles:
// editAction: backgroundColor '#3B82F6' (blue-500)
// deleteAction: backgroundColor '#EF4444' (red-500)
// Each button: 72px width, justifyContent 'center', alignItems 'center'
```

**CRITICAL: Swipeable from react-native-gesture-handler (NOT ReanimatedSwipeable):**
Use the classic `Swipeable` from `react-native-gesture-handler`. The `ReanimatedSwipeable` variant exists but the classic one is simpler and sufficient. Import from `react-native-gesture-handler` directly.

**CRITICAL: GestureHandlerRootView Already Configured:**
The app already wraps with `GestureHandlerRootView` (required by react-native-gesture-handler). Verify this exists in the app entry point. If not present, add it at the root.

**CRITICAL: SubscriptionsStack Navigation Pattern:**

```typescript
// src/app/navigation/SubscriptionsStack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SubscriptionsStackParamList } from './types';
import { SubscriptionsScreen } from '@features/subscriptions/screens/SubscriptionsScreen';
import { EditSubscriptionScreen } from '@features/subscriptions/screens/EditSubscriptionScreen';

const Stack = createNativeStackNavigator<SubscriptionsStackParamList>();

export function SubscriptionsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SubscriptionsList"
        component={SubscriptionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditSubscription"
        component={EditSubscriptionScreen}
        options={{ title: 'Edit Subscription' }}
      />
    </Stack.Navigator>
  );
}
```

**CRITICAL: Navigation Types Update:**

```typescript
// Add to src/app/navigation/types.ts
export type SubscriptionsStackParamList = {
  SubscriptionsList: undefined;
  EditSubscription: { subscriptionId: string };
};

// Update MainTabsParamList:
export type MainTabsParamList = {
  Home: undefined;
  Subscriptions: NavigatorScreenParams<SubscriptionsStackParamList>;
  Add: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};
```

**CRITICAL: EditSubscriptionScreen Form Pre-fill Pattern:**

```typescript
// EditSubscriptionScreen.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSubscriptionSchema, type CreateSubscriptionFormData } from '@features/subscriptions/types/schemas';

export function EditSubscriptionScreen({ route, navigation }) {
  const { subscriptionId } = route.params;
  const { subscriptions, updateSubscription, isSubmitting, error } = useSubscriptionStore();
  const subscription = subscriptions.find(s => s.id === subscriptionId);

  // Guard: subscription not found (edge case — deleted while navigating)
  if (!subscription) {
    // Navigate back or show error
    return null;
  }

  const { control, handleSubmit, watch, formState: { errors, isDirty } } = useForm<CreateSubscriptionFormData>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      name: subscription.name,
      price: subscription.price,
      billing_cycle: subscription.billing_cycle as BillingCycle,
      renewal_date: subscription.renewal_date,
      is_trial: subscription.is_trial ?? false,
      trial_expiry_date: subscription.trial_expiry_date ?? undefined,
      category: subscription.category ?? undefined,
      notes: subscription.notes ?? undefined,
    },
  });

  const onSubmit = async (data: CreateSubscriptionFormData) => {
    const success = await updateSubscription(subscriptionId, data);
    if (success) {
      navigation.goBack();
      // Snackbar handled in SubscriptionsScreen via focus listener
    }
  };

  // ... form layout identical to AddSubscriptionScreen
}
```

**CRITICAL: updateSubscription Service Implementation:**

```typescript
// Add to subscriptionService.ts
export async function updateSubscription(
  id: string,
  dto: Partial<CreateSubscriptionDTO>,
): Promise<SubscriptionResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { code: 'AUTH_ERROR', message: 'Please log in to update subscriptions.' } };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(dto)
      .eq('id', id)
      .eq('user_id', user.id) // RLS + explicit check
      .select()
      .single();

    if (error) {
      return { data: null, error: { code: 'DB_ERROR', message: 'Failed to update subscription. Please try again.' } };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'NETWORK_ERROR', message: 'Network error. Check your connection and try again.' } };
  }
}
```

**CRITICAL: updateSubscription Store Action:**

```typescript
// Add to useSubscriptionStore.ts
updateSubscription: async (id: string, dto: Partial<CreateSubscriptionDTO>) => {
  set({ isSubmitting: true, error: null });

  const result = await updateSubscription(id, dto);

  if (result.error || !result.data) {
    set({
      isSubmitting: false,
      error: result.error ?? { code: 'UNKNOWN', message: 'Failed to update subscription.' },
    });
    return false;
  }

  set((state) => ({
    subscriptions: state.subscriptions.map((sub) =>
      sub.id === id ? result.data! : sub
    ),
    isSubmitting: false,
  }));
  return true;
},
```

**CRITICAL: FlatList getItemLayout Compatibility:**
Story 2.2's SubscriptionsScreen uses `getItemLayout` for performance (fixed 72px card height + 12px separator). Wrapping cards with `Swipeable` does NOT change the collapsed card height — `Swipeable` only adds width when swiped, not height. So `getItemLayout` remains valid. However, if using `getItemLayout` with `ListHeaderComponent`, the offset calculation must account for the header height. Verify the existing implementation handles this correctly.

**CRITICAL: Monthly Cost Recalculation After Edit:**
When a subscription price or billing cycle is edited, the `CostSummaryHeader` in SubscriptionsScreen automatically recalculates because it derives from the `subscriptions` array in the store. `calculateTotalMonthlyCost()` is called on every render with the current subscriptions. No additional work needed — the reactive store handles this.

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure (extend existing):**

   ```
   features/subscriptions/
   ├── components/
   │   ├── SubscriptionCard.tsx              (NO CHANGE)
   │   ├── SubscriptionCard.test.tsx         (NO CHANGE)
   │   ├── SwipeableSubscriptionCard.tsx     (CREATE)
   │   ├── SwipeableSubscriptionCard.test.tsx (CREATE)
   │   ├── CostSummaryHeader.tsx             (NO CHANGE)
   │   ├── CostSummaryHeader.test.tsx        (NO CHANGE)
   │   ├── EmptySubscriptionState.tsx        (NO CHANGE)
   │   └── SubscriptionListSkeleton.tsx      (NO CHANGE)
   ├── hooks/
   │   └── .gitkeep                          (NO CHANGE)
   ├── screens/
   │   ├── AddSubscriptionScreen.tsx         (NO CHANGE — do NOT modify for edit mode)
   │   ├── EditSubscriptionScreen.tsx        (CREATE)
   │   ├── EditSubscriptionScreen.test.tsx   (CREATE)
   │   └── SubscriptionsScreen.tsx           (MODIFY — use SwipeableSubscriptionCard, add navigation)
   ├── services/
   │   └── subscriptionService.ts            (MODIFY — add updateSubscription method)
   ├── types/
   │   ├── index.ts                          (MODIFY — add UpdateSubscriptionDTO)
   │   └── schemas.ts                        (NO CHANGE — reuse createSubscriptionSchema)
   ├── utils/
   │   ├── subscriptionUtils.ts              (NO CHANGE)
   │   └── subscriptionUtils.test.ts         (NO CHANGE)
   └── index.ts                              (MODIFY — add new exports)
   ```

2. **Component Boundaries:**
   - SwipeableSubscriptionCard → wraps SubscriptionCard with gesture handling, delegates edit/delete callbacks to parent
   - EditSubscriptionScreen → reads subscription from `useSubscriptionStore`, calls `updateSubscription` on submit
   - SubscriptionsScreen → orchestrates swipe actions, handles navigation to EditSubscriptionScreen
   - SubscriptionCard → UNCHANGED, remains a pure presentational component
   - Do NOT add edit logic to SubscriptionCard — keep it presentation-only

3. **Naming Conventions (same as Story 2.2):**
   - Components: PascalCase files (`SwipeableSubscriptionCard.tsx`, `EditSubscriptionScreen.tsx`)
   - Functions: camelCase (`updateSubscription`, `renderRightActions`)
   - Test files: co-located (`SwipeableSubscriptionCard.test.tsx` next to source)
   - Navigation stacks: PascalCase (`SubscriptionsStack.tsx`)

4. **Import Aliases — REQUIRED:**

   ```typescript
   import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
   import { SubscriptionCard } from '@features/subscriptions/components/SubscriptionCard';
   import type { Subscription, CreateSubscriptionDTO } from '@features/subscriptions/types';
   import { createSubscriptionSchema } from '@features/subscriptions/types/schemas';
   import type { SubscriptionsStackParamList } from '@app/navigation/types';
   ```

5. **Theme Compliance (same as Story 2.2):**
   - Use `useTheme()` hook for ALL colors
   - Exception: Swipe action button backgrounds use fixed colors (#3B82F6 blue for edit, #EF4444 red for delete) — these are semantic action colors, not theme colors
   - Edit form uses same theme-driven styling as AddSubscriptionScreen

6. **Error Handling Pattern:** Same as Story 2.1/2.2 — store manages error state, screen displays Snackbar with user-friendly messages, retry capability provided.

### Library & Framework Requirements

**No New Dependencies to Install:**

All required libraries are already installed from previous stories.

**Existing Dependencies Used:**

| Package                   | Version  | Usage in This Story                                         |
| ------------------------- | -------- | ----------------------------------------------------------- |
| react-native-gesture-handler | 2.28.0 | `Swipeable` for swipe-to-edit/delete actions                |
| react-native-paper        | ^5.15.0  | Card, Text, Icon, TextInput, SegmentedButtons, Chip, Button, Snackbar |
| react-hook-form            | (installed) | Form state management for EditSubscriptionScreen          |
| @hookform/resolvers        | (installed) | Zod resolver for form validation                          |
| zod                       | (installed) | Reuse `createSubscriptionSchema` for edit validation       |
| react-native-paper-dates   | (installed) | DatePickerInput for renewal date and trial expiry date     |
| @react-navigation/native-stack | (installed) | SubscriptionsStack navigator                           |
| zustand                   | ^5.0.11  | `useSubscriptionStore` — add `updateSubscription` action    |
| @supabase/supabase-js     | ^2.95.3  | Via subscriptionService.updateSubscription()                |

**CRITICAL: Do NOT install any additional packages.** Everything needed is already available. Specifically:
- Do NOT install `@react-native-community/hooks` or similar — use React's built-in hooks
- Do NOT install a separate swipeable library — `react-native-gesture-handler` already provides `Swipeable`
- Do NOT create a custom gesture handler — use the provided `Swipeable` component

**CRITICAL: @expo/vector-icons Ionicons Bug (from Story 2.1):**
Expo SDK 54 has a known bug where Ionicons render as `[?]`. Use `MaterialCommunityIcons` only. For swipe action icons, use `react-native-paper` `Icon` component which uses MaterialCommunityIcons internally: `pencil-outline` for edit, `trash-can-outline` for delete.

### File Structure Requirements

**Files to CREATE:**

- `src/features/subscriptions/components/SwipeableSubscriptionCard.tsx` — Swipeable wrapper around SubscriptionCard
- `src/features/subscriptions/components/SwipeableSubscriptionCard.test.tsx` — Swipe action tests
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx` — Edit form screen
- `src/features/subscriptions/screens/EditSubscriptionScreen.test.tsx` — Edit screen tests
- `src/app/navigation/SubscriptionsStack.tsx` — Stack navigator for subscriptions feature

**Files to MODIFY:**

- `src/features/subscriptions/services/subscriptionService.ts` — Add `updateSubscription` method
- `src/shared/stores/useSubscriptionStore.ts` — Add `updateSubscription` action + import
- `src/features/subscriptions/types/index.ts` — Add `UpdateSubscriptionDTO` type export
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — Use SwipeableSubscriptionCard, add edit navigation
- `src/features/subscriptions/index.ts` — Add new exports
- `src/app/navigation/types.ts` — Add `SubscriptionsStackParamList`, update `MainTabsParamList`
- `src/app/navigation/MainTabs.tsx` — Replace SubscriptionsScreen with SubscriptionsStack

**Files NOT to touch:**

- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` — Separate screen, do NOT merge with edit
- `src/features/subscriptions/components/SubscriptionCard.tsx` — Keep as pure presentational
- `src/features/subscriptions/components/SubscriptionCard.test.tsx` — No changes
- `src/features/subscriptions/components/CostSummaryHeader.tsx` — No changes
- `src/features/subscriptions/components/EmptySubscriptionState.tsx` — No changes
- `src/features/subscriptions/components/SubscriptionListSkeleton.tsx` — No changes
- `src/features/subscriptions/types/schemas.ts` — Reuse existing schema as-is
- `src/features/subscriptions/utils/subscriptionUtils.ts` — No utility changes needed
- `src/config/categories.ts` — No changes
- `src/config/theme.ts` — No changes
- `src/features/auth/*` — No auth changes
- `package.json` — No new dependencies

### Testing Requirements

- Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
- Verify ESLint passes: `npx eslint src/` — zero errors/warnings
- Run existing tests: `npx jest` — all 43 existing tests pass (no regressions)
- **Manual Smoke Test:**
  1. App launches → Login → navigate to "Subscriptions" tab
  2. **Swipe left** on a subscription card → Edit (blue) and Delete (red) buttons revealed
  3. **Tap "Edit" button** → navigates to EditSubscriptionScreen
  4. **Verify pre-fill:** All fields match the original subscription (name, price, cycle, date, category, trial, notes)
  5. **Edit price:** Change price → tap "Save Changes" → success Snackbar → back to list
  6. **Verify update:** Subscription card shows new price, CostSummaryHeader recalculates total
  7. **Tap on card directly** → also navigates to edit screen (alternative to swipe)
  8. **Validation test:** Clear name field → tap save → inline "Subscription name is required" error
  9. **Cancel test:** Make changes → tap back → returns to list without saving
  10. **Network error test:** Enable airplane mode → tap save → error Snackbar, form stays open
  11. **Loading state test:** Tap save → button shows spinner, fields disabled during request
  12. **Accessibility test:** VoiceOver reads swipe actions: "Edit Netflix", "Delete Netflix"
  13. **Performance test:** Swipe animation smooth, no jank on list scroll after adding Swipeable wrapper
  14. **Regression test:** Pull-to-refresh still works, empty state still works, skeleton loading still works

### Previous Story Intelligence (Story 2.2)

**Key Learnings from Story 2.2 (CRITICAL — Apply to this story):**

- **Zustand persist provides instant cached data:** After editing, the updated subscription is immediately visible on next app open because Zustand persist saves to AsyncStorage.
- **isSubmitting for form submission:** Same flag used in addSubscription. Reuse for updateSubscription. Do NOT create a separate `isUpdating` flag — `isSubmitting` is the standard per architecture patterns.
- **Theme compliance:** Use `theme.colors.*` via `useTheme()` hook, NOT hardcoded hex values (except swipe action button colors which are semantic).
- **Path aliases REQUIRED:** `@features/*`, `@shared/*`, `@config/*`, `@app/*`.
- **ESLint flat config:** `eslint.config.js`. Unused variables in catch blocks → use bare `catch {}`.
- **Snackbar pattern established:** Used in AddSubscriptionScreen for success/error feedback. Reuse same pattern in SubscriptionsScreen for post-edit success message.
- **TypeScript strict mode:** Enabled. All props must be typed. No `any` types.
- **SubscriptionCard `onPress` already exists:** The card already accepts `onPress` prop — use this for edit navigation (in addition to swipe edit button).
- **FlatList `getItemLayout` with fixed 72px card height:** Swipeable wrapper does NOT change collapsed height. Keep existing optimizations.
- **`getCategoryConfig()` safe fallback:** Already handles null/missing categories gracefully (defaults to "Other").
- **Jest 29.7.0 + jest-expo@55:** Testing framework established. Follow same patterns for new tests.
- **react-test-renderer pinned to 19.1.0:** Must match React version.
- **Timezone issue in date handling:** Use `startOfDay` from date-fns to normalize date comparisons if needed.
- **Code review fixes from Story 2.2:** Non-null assertions were removed, conditional accessibilityRole/Hint added (only when onPress provided). Follow these same safe patterns.

### Git Intelligence

**Recent Commits (last 5):**

```
c0f2918 story 2.2 done
221ffb7 story 2.2 in review
4708318 story 2.2 ready-for-dev
be1d240 story 2.1 done
6f4e127 story 2-1 in review
```

**Key Insights:**

- Story 2.2 just completed — SubscriptionCard, FlatList, Zustand consumption all fresh and stable
- Swipeable wrapper is new — no existing swipe patterns in codebase to follow
- Navigation pattern: SettingsStack exists as reference for creating SubscriptionsStack
- The store currently has `addSubscription` but no `updateSubscription` — this story adds it
- The service currently has `createSubscription` and `getSubscriptions` but no `updateSubscription` — this story adds it

### Latest Technical Information

**react-native-gesture-handler v2.28.0 — Swipeable API:**

- Import: `import { Swipeable } from 'react-native-gesture-handler'`
- `renderRightActions`: renders the action panel when swiping left
- `renderLeftActions`: renders the action panel when swiping right (not used in this story)
- `overshootRight={false}`: prevents overscroll past action buttons
- `friction={2}`: resistance factor for the swipe (lower = easier to swipe)
- `ref`: use `swipeableRef.current?.close()` to programmatically close after action tap
- **Note:** `Swipeable` must be inside `GestureHandlerRootView` (already configured in app root)
- The classic `Swipeable` (not `ReanimatedSwipeable`) is recommended for simplicity

**@react-navigation/native-stack — Stack within Tab:**

- Nesting a NativeStackNavigator inside a tab is a well-supported pattern
- The tab bar remains visible when navigating to the EditSubscription screen (standard behavior)
- Use `navigation.goBack()` to return to the list from the edit screen
- Pass `subscriptionId` as route param (lightweight, subscription data lives in Zustand store)

**react-hook-form with defaultValues:**

- `defaultValues` in `useForm()` pre-fills all fields on mount
- `isDirty` flag tracks if the user has changed any field (useful for future confirmation dialog)
- `reset()` can re-set form to original values if needed
- The Zod resolver validates on submit (same validation as AddSubscriptionScreen)

### Project Structure Notes

- `SwipeableSubscriptionCard` is a **feature-specific** component — it belongs in `features/subscriptions/components/`
- `EditSubscriptionScreen` is a **feature-specific** screen — it belongs in `features/subscriptions/screens/`
- `SubscriptionsStack` is a **navigation** component — it belongs in `app/navigation/` (matching SettingsStack pattern)
- `UpdateSubscriptionDTO` is a type — add to `features/subscriptions/types/index.ts`
- The existing `createSubscriptionSchema` in `schemas.ts` is reused for edit validation — do NOT create a separate schema
- AddSubscriptionScreen and EditSubscriptionScreen are **separate screens** — do NOT merge them into a single "SubscriptionFormScreen" with mode switching. Separate screens are clearer and avoid conditional complexity.

### Scope Boundaries — What This Story Does NOT Include

**Explicitly OUT OF SCOPE (handled by future stories):**

- **Delete subscription functionality** → Story 2.4 (the delete button in swipe actions is visible but non-functional, or hidden until 2.4)
- **Undo snackbar for delete** → Story 2.4
- **Trial countdown badge with urgency colors** → Story 2.5
- **Category assignment enhancements** → Story 2.6 (basic category selection already works from Add)
- **Active/Cancelled status toggle** → Story 2.7
- **Subscription detail view (expanded)** → Story 2.8
- **Confirmation dialog on cancel with unsaved changes** → Post-MVP polish
- **Swipe right for quick delete** → Story 2.4

**Preparation for Story 2.4 (Delete):**

- SwipeableSubscriptionCard already renders the "Delete" action button in the swipe panel
- `onDelete` prop is defined but can be passed as undefined/no-op until Story 2.4
- When Story 2.4 implements delete, it only needs to: add `deleteSubscription` to service/store, wire up the `onDelete` callback, and add undo snackbar logic
- No structural changes to SwipeableSubscriptionCard needed for Story 2.4

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Edit Subscription Details]
- [Source: _bmad-output/planning-artifacts/prd.md#FR9 — User can edit an existing subscription's details]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Feature-based modular, Zustand]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Structure, Communication]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — Feature module structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#SubscriptionCard — Swipe actions, Edit/Delete]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Gesture Navigation — Swipe left for edit/delete]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Swipe Actions — iOS Mail pattern, 72pt width]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility — Swipe action labels and hints]
- [Source: _bmad-output/implementation-artifacts/2-2-view-subscription-list.md — SubscriptionCard, Zustand patterns, FlatList optimization]
- [Source: src/shared/stores/useSubscriptionStore.ts — Current store actions (fetch, add)]
- [Source: src/features/subscriptions/services/subscriptionService.ts — Current service methods (create, get)]
- [Source: src/features/subscriptions/types/schemas.ts — createSubscriptionSchema for validation]
- [Source: src/features/subscriptions/types/index.ts — Subscription type, CreateSubscriptionDTO, BillingCycle]
- [Source: src/features/subscriptions/components/SubscriptionCard.tsx — Current card component with onPress]
- [Source: src/features/subscriptions/screens/AddSubscriptionScreen.tsx — Form pattern to reuse for edit]
- [Source: src/app/navigation/SettingsStack.tsx — Stack-within-tab pattern reference]
- [Source: src/app/navigation/types.ts — Current navigation type definitions]
- [Source: src/app/navigation/MainTabs.tsx — Current tab configuration]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- ESLint warning fixed: removed unused `useTheme` import from EditSubscriptionScreen
- EditSubscriptionScreen test required mocking `react-native-paper-dates`, `@react-native-async-storage/async-storage`, and `@shared/services/supabase` to resolve Jest transformation and env variable issues
- Fixed test assertion: Notes field uses `getByDisplayValue` not `getByText` since it renders inside TextInput

### Completion Notes List

- Task 1: Added `updateSubscription` service method following same error handling pattern as `createSubscription` (AUTH_ERROR, DB_ERROR, NETWORK_ERROR)
- Task 2: Added `UpdateSubscriptionDTO` type and `updateSubscription` store action with optimistic array replacement via `.map()`
- Task 3: Created `SubscriptionsStack` navigator (NativeStackNavigator) with SubscriptionsList and EditSubscription screens, updated MainTabs to use stack instead of direct screen
- Task 4: Created `SwipeableSubscriptionCard` wrapper using `Swipeable` from react-native-gesture-handler with Edit (blue) and Delete (red) action buttons, 72px width, accessibility labels
- Task 5: Created `EditSubscriptionScreen` with full form pre-fill via `defaultValues`, Zod validation (reusing `createSubscriptionSchema`), error Snackbar with Retry action, subscription-not-found guard
- Task 6: Updated `SubscriptionsScreen` to use `SwipeableSubscriptionCard`, added edit navigation via `CompositeNavigationProp`, card tap also navigates to edit, success Snackbar added
- Task 7: Updated feature exports, verified TypeScript (0 errors), ESLint (0 errors/warnings), Jest (54/54 tests pass, 0 regressions)
- ✅ Resolved review finding [HIGH]: Added `accessibilityActions` and `onAccessibilityAction` to SwipeableSubscriptionCard wrapper View for screen reader users
- ✅ Resolved review finding [HIGH]: Implemented success Snackbar via route param `updated` — EditSubscriptionScreen navigates with `{ updated: true }`, SubscriptionsScreen reads param and shows "Subscription updated"
- ✅ Resolved review finding [HIGH]: Disabled header back button and swipe-back gesture during `isSubmitting` via `navigation.setOptions({ headerBackVisible, gestureEnabled })`
- ✅ Resolved review finding [MEDIUM]: Removed non-null assertion `result.data!` — replaced with const assignment `updatedSubscription` for type safety
- ✅ Resolved review finding [MEDIUM]: Improved test assertions — successful submit now verifies `mockNavigate` called with correct params, failed submit verifies error snackbar message displayed
- ✅ Resolved review finding [LOW]: Added comment explaining friction vs damping difference (classic Swipeable uses friction, not Reanimated damping)
- ✅ Resolved review finding [LOW]: Replaced hardcoded 'EUR' currency with `subscription?.currency ?? 'EUR'` to preserve existing currency on edit

### File List

**Created:**
- `src/app/navigation/SubscriptionsStack.tsx`
- `src/features/subscriptions/components/SwipeableSubscriptionCard.tsx`
- `src/features/subscriptions/components/SwipeableSubscriptionCard.test.tsx`
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx`
- `src/features/subscriptions/screens/EditSubscriptionScreen.test.tsx`

**Modified:**
- `src/features/subscriptions/services/subscriptionService.ts` — Added `updateSubscription` method
- `src/shared/stores/useSubscriptionStore.ts` — Added `updateSubscription` action and import
- `src/features/subscriptions/types/index.ts` — Added `UpdateSubscriptionDTO` type
- `src/app/navigation/types.ts` — Added `SubscriptionsStackParamList`, `SubscriptionsStackScreenProps`, updated `MainTabsParamList`; updated `SubscriptionsList` params to accept `{ updated?: boolean }`
- `src/app/navigation/MainTabs.tsx` — Replaced `SubscriptionsScreen` with `SubscriptionsStack`
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — Replaced `SubscriptionCard` with `SwipeableSubscriptionCard`, added edit navigation, success Snackbar via route param listener
- `src/features/subscriptions/index.ts` — Added new exports (`EditSubscriptionScreen`, `SwipeableSubscriptionCard`, `UpdateSubscriptionDTO`, `updateSubscription`)

### Change Log

- 2026-02-28: Story 2.3 implemented — Edit subscription feature with swipe-to-edit, SubscriptionsStack navigation, form pre-fill, updateSubscription service/store, 11 new tests (5 SwipeableSubscriptionCard + 6 EditSubscriptionScreen)
- 2026-02-28: Addressed 7 code review findings (3 HIGH, 2 MEDIUM, 2 LOW) — accessibility actions, success snackbar, back button disable during submit, non-null assertion fix, test improvements, animation comment, currency preservation. All 56 tests pass, 0 TypeScript errors, 0 ESLint warnings.
