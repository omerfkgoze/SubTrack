# Story 2.4: Delete Subscription

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to delete a subscription I no longer need to track,
so that my list stays clean and relevant.

## Acceptance Criteria

1. **AC1 - Delete via Swipe Action Button:** Given the user is viewing the subscription list, when they swipe left on a subscription card, then the existing "Delete" action button (red background #EF4444, trash-can-outline icon, 72px width) from Story 2.3's SwipeableSubscriptionCard triggers a confirmation dialog. The `onDelete` callback (already defined as prop but unwired) is now connected to `handleDelete` in SubscriptionsScreen.

2. **AC2 - Confirmation Dialog:** Given the user taps the "Delete" swipe action button, when the dialog appears, then it shows: trash icon (🗑️), title "Delete [subscription name]?" (18px bold), body "This subscription will be removed from your tracking. This action can be undone for the next 5 seconds.", and two buttons: "Cancel" (ghost/tertiary) and "Delete" (destructive red filled). Uses React Native Paper `Dialog` component inside a `Portal`. Pressing "Cancel" dismisses the dialog with no changes.

3. **AC3 - Soft Delete with Undo Snackbar:** Given the user confirms deletion in the dialog, when the deletion is processed, then: (a) the subscription is immediately removed from the Zustand store's `subscriptions` array (optimistic removal for instant UI feedback), (b) an undo Snackbar appears at the bottom showing "[Subscription name] deleted" with an [UNDO] action button and a 5-second countdown, (c) the Supabase `.delete()` call is made in the background. If the Supabase call fails, the subscription is restored to the store and an error Snackbar is shown.

4. **AC4 - Undo Functionality:** Given the undo Snackbar is visible, when the user taps "UNDO" within 5 seconds, then the subscription is restored to the Zustand store immediately (re-inserted at original position), the pending Supabase delete is cancelled or the subscription is re-inserted via `createSubscription` if already deleted server-side, and the Snackbar dismisses with no further action.

5. **AC5 - Permanent Deletion on Timer Expiry:** Given the undo Snackbar is displayed, when 5 seconds pass without the user tapping "UNDO", then the Snackbar disappears, the deletion is permanent (already committed to Supabase), and the CostSummaryHeader recalculates totals automatically (reactive Zustand store).

6. **AC6 - Error Handling:** Given a network or server error occurs during the Supabase delete call, when the deletion fails, then: the subscription is restored to the Zustand store's `subscriptions` array at its original position, a user-friendly error Snackbar is displayed ("Failed to delete subscription. Please try again."), and the subscription card reappears in the list.

7. **AC7 - Loading State:** Given the user taps "Delete" in the confirmation dialog, when the optimistic removal happens, then: the dialog closes immediately, the card is removed from the list instantly (optimistic), and the undo Snackbar appears. No full-screen spinner is needed — the operation feels instant to the user.

8. **AC8 - Accessibility:** The confirmation dialog is focusable by screen readers with `accessibilityLabel` on title and body. The "Delete" button has `accessibilityLabel="Confirm delete [subscription name]"`. The undo Snackbar action has `accessibilityLabel="Undo delete [subscription name]"`. Haptic feedback: medium impact on delete confirmation (`react-native-haptic-feedback` or `Haptics.impactAsync` from expo-haptics if available, otherwise skip haptics for MVP).

9. **AC9 - Data Integrity:** Given a subscription is deleted, when the operation completes, then: the `subscriptions` table row is hard-deleted (not soft-delete), the subscription count decreases by 1, the CostSummaryHeader total monthly cost recalculates, and the empty state component appears if no subscriptions remain after deletion.

## Tasks / Subtasks

- [ ] Task 1: Add `deleteSubscription` Service Method (AC: #3, #6)
  - [ ] 1.1 Add `deleteSubscription(id: string)` to `src/features/subscriptions/services/subscriptionService.ts`
  - [ ] 1.2 Method uses `supabase.from('subscriptions').delete().eq('id', id).eq('user_id', userId).select().single()`
  - [ ] 1.3 Returns `SubscriptionResult` (same pattern as create/update) — returns deleted row data for undo capability
  - [ ] 1.4 Error handling: AUTH_ERROR, DB_ERROR, NETWORK_ERROR (same pattern)

- [ ] Task 2: Add `deleteSubscription` Store Action (AC: #3, #4, #5, #6, #7)
  - [ ] 2.1 Add `deleteSubscription(id: string)` action to `useSubscriptionStore`
  - [ ] 2.2 Optimistic removal: immediately filter out subscription from `subscriptions` array, store removed item + original index for undo
  - [ ] 2.3 Call `deleteSubscription` service in background
  - [ ] 2.4 On failure: restore subscription to original position in array, set error
  - [ ] 2.5 Add `undoDelete()` action: re-insert cached subscription at original index, call `createSubscription` service to restore server-side if needed
  - [ ] 2.6 Add `pendingDelete` state: `{ subscription: Subscription; originalIndex: number } | null` — tracks the subscription being deleted for undo
  - [ ] 2.7 Add `clearPendingDelete()` action: called when undo timer expires, clears cached data

- [ ] Task 3: Create Delete Confirmation Dialog Component (AC: #2, #8)
  - [ ] 3.1 Create `src/features/subscriptions/components/DeleteConfirmationDialog.tsx`
  - [ ] 3.2 Uses React Native Paper `Dialog` + `Portal` pattern
  - [ ] 3.3 Props: `visible: boolean`, `subscriptionName: string`, `onConfirm: () => void`, `onDismiss: () => void`
  - [ ] 3.4 Trash icon, title "Delete [name]?", body text about undo, Cancel + Delete buttons
  - [ ] 3.5 Delete button: red/destructive style (`buttonColor: theme.colors.error`)
  - [ ] 3.6 Accessibility labels on all interactive elements

- [ ] Task 4: Create UndoSnackbar Component (AC: #3, #4, #5, #8)
  - [ ] 4.1 Create `src/shared/components/feedback/UndoSnackbar.tsx` (shared — reusable for future destructive operations)
  - [ ] 4.2 Props: `visible`, `message`, `onUndo`, `onDismiss`, `duration` (default 5000ms)
  - [ ] 4.3 Uses React Native Paper `Snackbar` with "UNDO" action button
  - [ ] 4.4 Auto-dismiss after `duration` ms — calls `onDismiss` when timer expires
  - [ ] 4.5 Accessibility: `accessibilityLabel` on undo action
  - [ ] 4.6 Create `src/shared/components/feedback/UndoSnackbar.test.tsx`

- [ ] Task 5: Wire Delete Flow in SubscriptionsScreen (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] 5.1 Add `handleDelete(subscription)` function: sets `selectedSubscription` state, opens confirmation dialog
  - [ ] 5.2 Pass `onDelete` callback to SwipeableSubscriptionCard: `() => handleDelete(subscription)`
  - [ ] 5.3 On dialog confirm: call `store.deleteSubscription(id)`, close dialog, show UndoSnackbar
  - [ ] 5.4 On undo tap: call `store.undoDelete()`, dismiss snackbar
  - [ ] 5.5 On snackbar dismiss (timer expiry): call `store.clearPendingDelete()`
  - [ ] 5.6 On delete error: show error Snackbar (reuse existing error snackbar pattern)
  - [ ] 5.7 Manage dialog and snackbar visibility state

- [ ] Task 6: Update Feature Exports and Tests (AC: all)
  - [ ] 6.1 Update `src/features/subscriptions/index.ts` with new exports: `DeleteConfirmationDialog`
  - [ ] 6.2 Update `src/shared/components/feedback/` — ensure index exports UndoSnackbar
  - [ ] 6.3 Create `src/features/subscriptions/components/DeleteConfirmationDialog.test.tsx`
  - [ ] 6.4 Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
  - [ ] 6.5 Verify ESLint passes: `npx eslint src/` — zero errors/warnings
  - [ ] 6.6 Run all tests: `npx jest` — all pass (no regressions)

## Dev Notes

### Critical Technical Requirements

**CRITICAL: Delete Service Implementation — Follow Existing Pattern Exactly:**

```typescript
// Add to src/features/subscriptions/services/subscriptionService.ts
export async function deleteSubscription(id: string): Promise<SubscriptionResult> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        data: null,
        error: { code: 'AUTH_ERROR', message: 'Please log in to delete subscriptions.' },
      };
    }

    // .select().single() returns the deleted row — needed for undo restore
    const { data, error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Supabase delete error:', error.message, error.code, error.details);
      return {
        data: null,
        error: { code: 'DB_ERROR', message: 'Failed to delete subscription. Please try again.' },
      };
    }

    return { data, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      data: null,
      error: {
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
      },
    };
  }
}
```

**CRITICAL: Supabase RLS Policy Already Exists:**
The database migration `20260227000000_create_subscriptions.sql` already has a delete policy: `"Users can delete own subscriptions"`. The `.eq('user_id', user.id)` in the service is an extra safety check matching the create/update pattern. No database migration needed.

**CRITICAL: Store Delete with Optimistic Removal + Undo Support:**

```typescript
// Add to SubscriptionState interface:
pendingDelete: { subscription: Subscription; originalIndex: number } | null;

// Add to SubscriptionActions interface:
deleteSubscription: (id: string) => Promise<boolean>;
undoDelete: () => Promise<void>;
clearPendingDelete: () => void;
```

```typescript
// Store implementation pattern:
deleteSubscription: async (id: string) => {
  const state = get();
  const index = state.subscriptions.findIndex((s) => s.id === id);
  if (index === -1) return false;

  const subscription = state.subscriptions[index];

  // Optimistic removal — instant UI feedback
  set({
    subscriptions: state.subscriptions.filter((s) => s.id !== id),
    pendingDelete: { subscription, originalIndex: index },
    error: null,
  });

  // Background Supabase delete
  const result = await deleteSubscription(id);

  if (result.error) {
    // Restore on failure — splice back at original index
    set((state) => {
      const restored = [...state.subscriptions];
      restored.splice(subscription_originalIndex, 0, subscription);
      return {
        subscriptions: restored,
        pendingDelete: null,
        error: result.error,
      };
    });
    return false;
  }

  return true;
},

undoDelete: async () => {
  const state = get();
  if (!state.pendingDelete) return;

  const { subscription, originalIndex } = state.pendingDelete;

  // Restore locally first (instant)
  set((state) => {
    const restored = [...state.subscriptions];
    // Clamp index to current array length to prevent out-of-bounds
    const insertIndex = Math.min(originalIndex, restored.length);
    restored.splice(insertIndex, 0, subscription);
    return {
      subscriptions: restored,
      pendingDelete: null,
    };
  });

  // Re-create server-side (the row was already deleted from Supabase)
  const result = await createSubscription({
    name: subscription.name,
    price: subscription.price,
    currency: subscription.currency,
    billing_cycle: subscription.billing_cycle as BillingCycle,
    renewal_date: subscription.renewal_date,
    is_trial: subscription.is_trial ?? false,
    trial_expiry_date: subscription.trial_expiry_date ?? undefined,
    category: subscription.category ?? undefined,
    notes: subscription.notes ?? undefined,
  });

  if (result.error) {
    // Server restore failed — fetch fresh data
    get().fetchSubscriptions();
  } else if (result.data) {
    // Replace the local copy with the server copy (new ID from Supabase)
    set((state) => ({
      subscriptions: state.subscriptions.map((s) =>
        s.id === subscription.id ? result.data! : s
      ),
    }));
  }
},

clearPendingDelete: () => {
  set({ pendingDelete: null });
},
```

**CRITICAL: `pendingDelete` Must NOT Be Persisted:**
The `partialize` function in the persist middleware already only saves `subscriptions`. The new `pendingDelete` state will NOT be persisted to AsyncStorage (correct behavior — undo state should not survive app restarts).

**CRITICAL: Import `deleteSubscription` from Service:**
Add `deleteSubscription` to the import statement in `useSubscriptionStore.ts`:
```typescript
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptions,
} from '@features/subscriptions/services/subscriptionService';
```
Note: `createSubscription` is already imported — it's needed for the `undoDelete` action.

**CRITICAL: Zustand `get()` for Reading Current State in Actions:**
The store currently uses only `set()`. For `deleteSubscription`, you need `get()` to read current state before modifying it. Update the persist callback signature:
```typescript
persist(
  (set, get) => ({  // ADD get HERE — currently only (set) is destructured
    ...
  }),
```

**CRITICAL: DeleteConfirmationDialog — React Native Paper Dialog Pattern:**

```typescript
// src/features/subscriptions/components/DeleteConfirmationDialog.tsx
import React from 'react';
import { Dialog, Portal, Text, Button, useTheme } from 'react-native-paper';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  subscriptionName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function DeleteConfirmationDialog({
  visible,
  subscriptionName,
  onConfirm,
  onDismiss,
}: DeleteConfirmationDialogProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Icon icon="trash-can-outline" />
        <Dialog.Title style={{ textAlign: 'center' }}>
          {`Delete ${subscriptionName}?`}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
            This subscription will be removed from your tracking. This action can be undone for the next 5 seconds.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={onConfirm}
            textColor={theme.colors.error}
            accessibilityLabel={`Confirm delete ${subscriptionName}`}
          >
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
```

**CRITICAL: Portal Requirement for Dialog:**
React Native Paper `Dialog` MUST be wrapped in `Portal`. The app already has `PaperProvider` in the provider tree (set up in Story 1.1), which includes `Portal.Host`. No additional setup needed.

**CRITICAL: UndoSnackbar — Shared Reusable Component:**

```typescript
// src/shared/components/feedback/UndoSnackbar.tsx
import React from 'react';
import { Snackbar } from 'react-native-paper';

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function UndoSnackbar({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 5000,
}: UndoSnackbarProps) {
  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={duration}
      action={{
        label: 'UNDO',
        onPress: onUndo,
        accessibilityLabel: `Undo: ${message}`,
      }}
    >
      {message}
    </Snackbar>
  );
}
```

**CRITICAL: Snackbar Conflict in SubscriptionsScreen:**
The screen currently has ONE `Snackbar` for success/error messages. Adding UndoSnackbar creates TWO snackbars. They must NOT overlap. Strategy:
- The existing `Snackbar` handles success (updated) and error messages
- `UndoSnackbar` handles delete undo flow
- Only one should be visible at a time — dismiss existing snackbar before showing undo snackbar
- Use separate state: `undoSnackbar: { visible: boolean; subscriptionName: string } | null`

**CRITICAL: SubscriptionsScreen Delete Flow Wiring:**

```typescript
// Add state:
const [deleteDialogSubscription, setDeleteDialogSubscription] = useState<Subscription | null>(null);
const [undoSnackbarVisible, setUndoSnackbarVisible] = useState(false);
const [deletedSubscriptionName, setDeletedSubscriptionName] = useState('');

// Add store destructuring for new actions:
const { subscriptions, isLoading, error, fetchSubscriptions, clearError,
        deleteSubscription: storeDelete, undoDelete, clearPendingDelete } =
  useSubscriptionStore();

// handleDelete — triggered by SwipeableSubscriptionCard onDelete:
const handleDelete = useCallback((subscription: Subscription) => {
  setDeleteDialogSubscription(subscription);
}, []);

// onDialogConfirm — user confirms deletion:
const handleConfirmDelete = useCallback(async () => {
  if (!deleteDialogSubscription) return;
  const name = deleteDialogSubscription.name;
  setDeleteDialogSubscription(null); // Close dialog
  setSnackbar(null); // Dismiss any existing snackbar

  const success = await storeDelete(deleteDialogSubscription.id);
  if (success) {
    setDeletedSubscriptionName(name);
    setUndoSnackbarVisible(true);
  }
  // On failure, store.error is set → existing error snackbar shows
}, [deleteDialogSubscription, storeDelete]);

// onUndo:
const handleUndoDelete = useCallback(async () => {
  setUndoSnackbarVisible(false);
  await undoDelete();
}, [undoDelete]);

// onUndoSnackbarDismiss (timer expired):
const handleUndoDismiss = useCallback(() => {
  setUndoSnackbarVisible(false);
  clearPendingDelete();
}, [clearPendingDelete]);

// Wire onDelete in renderItem:
const renderItem = useCallback(
  ({ item }: { item: Subscription }) => (
    <SwipeableSubscriptionCard
      subscription={item}
      onEdit={() => handleEdit(item.id)}
      onDelete={() => handleDelete(item)}  // ← NEW
      onPress={() => handleEdit(item.id)}
      onSwipeableOpen={handleSwipeableOpen}
    />
  ),
  [handleEdit, handleDelete, handleSwipeableOpen],
);

// Add to JSX (before closing SafeAreaView):
<DeleteConfirmationDialog
  visible={!!deleteDialogSubscription}
  subscriptionName={deleteDialogSubscription?.name ?? ''}
  onConfirm={handleConfirmDelete}
  onDismiss={() => setDeleteDialogSubscription(null)}
/>
<UndoSnackbar
  visible={undoSnackbarVisible}
  message={`${deletedSubscriptionName} deleted`}
  onUndo={handleUndoDelete}
  onDismiss={handleUndoDismiss}
/>
```

**CRITICAL: FlatList Updates After Deletion:**
When a subscription is optimistically removed from the Zustand store, the FlatList automatically re-renders because `subscriptions` is a new array reference (filtered). `CostSummaryHeader` also recalculates via `calculateTotalMonthlyCost(subscriptions)`. `EmptySubscriptionState` appears if array is empty. No manual list updates needed.

**CRITICAL: Swipeable Auto-Close Before Dialog:**
Story 2.3 implemented `onSwipeableOpen` to auto-close previously opened swipeables. When the delete button is tapped in the swipe panel, `swipeableRef.current?.close()` is called before `onDelete?.()` fires. The swipe panel closes, THEN the confirmation dialog opens. This is the correct sequence — no additional swipeable management needed.

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure (extend existing):**

   ```
   features/subscriptions/
   ├── components/
   │   ├── SubscriptionCard.tsx              (NO CHANGE)
   │   ├── SubscriptionCard.test.tsx         (NO CHANGE)
   │   ├── SwipeableSubscriptionCard.tsx     (NO CHANGE — onDelete prop already exists)
   │   ├── SwipeableSubscriptionCard.test.tsx (NO CHANGE)
   │   ├── CostSummaryHeader.tsx             (NO CHANGE)
   │   ├── CostSummaryHeader.test.tsx        (NO CHANGE)
   │   ├── EmptySubscriptionState.tsx        (NO CHANGE)
   │   ├── SubscriptionListSkeleton.tsx      (NO CHANGE)
   │   ├── DeleteConfirmationDialog.tsx      (CREATE)
   │   └── DeleteConfirmationDialog.test.tsx (CREATE)
   ├── screens/
   │   ├── AddSubscriptionScreen.tsx         (NO CHANGE)
   │   ├── EditSubscriptionScreen.tsx        (NO CHANGE)
   │   ├── EditSubscriptionScreen.test.tsx   (NO CHANGE)
   │   └── SubscriptionsScreen.tsx           (MODIFY — add delete flow, dialog, undo snackbar)
   ├── services/
   │   └── subscriptionService.ts            (MODIFY — add deleteSubscription method)
   ├── types/
   │   ├── index.ts                          (NO CHANGE — existing types sufficient)
   │   └── schemas.ts                        (NO CHANGE)
   ├── utils/
   │   ├── subscriptionUtils.ts              (NO CHANGE)
   │   └── subscriptionUtils.test.ts         (NO CHANGE)
   └── index.ts                              (MODIFY — add DeleteConfirmationDialog export)

   shared/
   ├── components/
   │   └── feedback/
   │       ├── UndoSnackbar.tsx              (CREATE)
   │       └── UndoSnackbar.test.tsx         (CREATE)
   └── stores/
       └── useSubscriptionStore.ts           (MODIFY — add delete/undo actions, pendingDelete state)
   ```

2. **Component Boundaries:**
   - DeleteConfirmationDialog → Pure presentational, receives `visible`, `subscriptionName`, `onConfirm`, `onDismiss`. Zero business logic.
   - UndoSnackbar → Pure presentational shared component. Receives `visible`, `message`, `onUndo`, `onDismiss`, `duration`. Reusable for any future destructive operation.
   - SwipeableSubscriptionCard → UNCHANGED. Already has `onDelete` prop wired to close + callback.
   - SubscriptionsScreen → Orchestrates delete flow: dialog state, undo state, store actions.
   - useSubscriptionStore → Contains all delete business logic: optimistic removal, undo, pending state.

3. **Naming Conventions:**
   - Components: PascalCase files (`DeleteConfirmationDialog.tsx`, `UndoSnackbar.tsx`)
   - Functions: camelCase (`deleteSubscription`, `handleDelete`, `handleConfirmDelete`, `handleUndoDelete`)
   - Test files: co-located (`DeleteConfirmationDialog.test.tsx` next to source, `UndoSnackbar.test.tsx` next to source)
   - Store state: camelCase (`pendingDelete`, `clearPendingDelete`)

4. **Import Aliases — REQUIRED:**

   ```typescript
   import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
   import { UndoSnackbar } from '@shared/components/feedback/UndoSnackbar';
   import { DeleteConfirmationDialog } from '@features/subscriptions/components/DeleteConfirmationDialog';
   import type { Subscription } from '@features/subscriptions/types';
   ```

5. **Theme Compliance:**
   - Use `useTheme()` hook for ALL colors in DeleteConfirmationDialog
   - Delete button uses `theme.colors.error` for text color (not hardcoded #EF4444)
   - Dialog styling inherits from React Native Paper theme defaults
   - UndoSnackbar uses Paper Snackbar defaults (theme-aware)

6. **Error Handling Pattern:** Same as Story 2.1/2.2/2.3 — store manages error state, screen displays error Snackbar with user-friendly messages. On delete failure, subscription is restored to store (optimistic rollback).

### Library & Framework Requirements

**No New Dependencies to Install:**

All required libraries are already installed from previous stories.

**Existing Dependencies Used:**

| Package                    | Version    | Usage in This Story                                    |
| -------------------------- | ---------- | ------------------------------------------------------ |
| react-native-paper         | ^5.15.0    | Dialog, Portal, Button, Text, Snackbar                 |
| react-native-gesture-handler | 2.28.0   | Swipeable (existing — no changes)                      |
| zustand                    | ^5.0.11    | `useSubscriptionStore` — add delete/undo actions       |
| @supabase/supabase-js      | ^2.95.3    | Via subscriptionService.deleteSubscription()            |
| @react-native-async-storage/async-storage | (installed) | Zustand persist (no change — pendingDelete NOT persisted) |

**CRITICAL: Do NOT install any additional packages.** Everything needed is already available. Specifically:
- Do NOT install `react-native-haptic-feedback` — skip haptics for MVP simplicity (can be added in polish phase)
- Do NOT install a timer library — use React Native Paper Snackbar's built-in `duration` prop for auto-dismiss
- Do NOT install an animation library for the undo progress bar — the UX spec's progress bar is a nice-to-have; Paper Snackbar's built-in auto-dismiss timer is sufficient for MVP

**CRITICAL: @expo/vector-icons Ionicons Bug (from Story 2.1):**
Use `MaterialCommunityIcons` only. For the dialog icon, use Dialog.Icon with `icon="trash-can-outline"` (Material Community Icon name).

### File Structure Requirements

**Files to CREATE:**

- `src/features/subscriptions/components/DeleteConfirmationDialog.tsx` — Confirmation dialog before delete
- `src/features/subscriptions/components/DeleteConfirmationDialog.test.tsx` — Dialog tests
- `src/shared/components/feedback/UndoSnackbar.tsx` — Reusable undo snackbar component
- `src/shared/components/feedback/UndoSnackbar.test.tsx` — Undo snackbar tests

**Files to MODIFY:**

- `src/features/subscriptions/services/subscriptionService.ts` — Add `deleteSubscription` method
- `src/shared/stores/useSubscriptionStore.ts` — Add `deleteSubscription`, `undoDelete`, `clearPendingDelete` actions + `pendingDelete` state + change `(set)` to `(set, get)`
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — Add delete flow: dialog state, undo snackbar state, handleDelete/handleConfirmDelete/handleUndoDelete callbacks, render dialog + undo snackbar
- `src/features/subscriptions/index.ts` — Add `DeleteConfirmationDialog` export

**Files NOT to touch:**

- `src/features/subscriptions/components/SwipeableSubscriptionCard.tsx` — Already has onDelete prop, no changes needed
- `src/features/subscriptions/components/SwipeableSubscriptionCard.test.tsx` — No changes
- `src/features/subscriptions/components/SubscriptionCard.tsx` — Pure presentational, no changes
- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` — Unrelated
- `src/features/subscriptions/screens/EditSubscriptionScreen.tsx` — Unrelated
- `src/features/subscriptions/types/index.ts` — Existing types sufficient (SubscriptionResult used for delete return)
- `src/features/subscriptions/types/schemas.ts` — No schema changes
- `src/features/subscriptions/utils/subscriptionUtils.ts` — No utility changes
- `src/app/navigation/SubscriptionsStack.tsx` — No new screens
- `src/app/navigation/types.ts` — No navigation type changes
- `src/app/navigation/MainTabs.tsx` — No tab changes
- `src/config/categories.ts` — No changes
- `src/config/theme.ts` — No changes
- `package.json` — No new dependencies
- `supabase/migrations/*` — No schema changes (delete RLS policy already exists)

### Testing Requirements

- Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
- Verify ESLint passes: `npx eslint src/` — zero errors/warnings
- Run existing tests: `npx jest` — all 56 existing tests pass (no regressions)

**New Test Coverage:**

**DeleteConfirmationDialog.test.tsx:**
- Test renders dialog with subscription name in title
- Test Cancel button calls onDismiss
- Test Delete button calls onConfirm
- Test dialog not visible when visible=false
- Test accessibility: Delete button has correct accessibilityLabel

**UndoSnackbar.test.tsx:**
- Test renders message text
- Test UNDO button calls onUndo
- Test auto-dismiss calls onDismiss (mock timer with jest.advanceTimersByTime)
- Test not visible when visible=false

**Manual Smoke Test:**
1. App launches → Login → navigate to "Subscriptions" tab
2. **Swipe left** on a subscription card → Edit and Delete buttons revealed
3. **Tap "Delete" button** → confirmation dialog appears with subscription name
4. **Tap "Cancel"** → dialog closes, subscription unchanged
5. **Tap "Delete" again → Tap "Delete" in dialog** → dialog closes instantly, card disappears from list, undo snackbar appears
6. **Verify CostSummaryHeader** recalculates total monthly cost immediately
7. **Tap "UNDO" within 5 seconds** → subscription reappears in list, snackbar dismisses
8. **Delete again and wait 5 seconds** → snackbar disappears, deletion is permanent
9. **Refresh list** (pull-to-refresh) → deleted subscription stays gone
10. **Delete all subscriptions** → empty state component appears after last deletion
11. **Network error test:** Enable airplane mode → delete → error snackbar shows, subscription reappears
12. **Accessibility test:** VoiceOver reads "Delete Netflix?" dialog title, "Confirm delete Netflix" on delete button, "Undo: Netflix deleted" on undo action
13. **Performance test:** Optimistic removal feels instant, no visible delay between dialog close and card disappearing
14. **Regression test:** Edit flow still works, pull-to-refresh still works, success snackbar for edit still works, add subscription still works

### Previous Story Intelligence (Story 2.3)

**Key Learnings from Story 2.3 — Apply to This Story:**

- **SwipeableSubscriptionCard `onDelete` already exists:** The prop is defined (`onDelete?: () => void`), the delete button (red, trash-can-outline, 72px) is rendered, and it calls `swipeableRef.current?.close()` then `onDelete?.()`. All you need to do is pass a callback from SubscriptionsScreen — do NOT modify SwipeableSubscriptionCard.
- **`onSwipeableOpen` auto-close pattern:** Story 2.3 added logic to close the previously opened swipeable when a new one opens. This means when the user swipes to delete, any other open swipeable closes first. This pattern works correctly with the delete flow.
- **Consolidated Snackbar state in SubscriptionsScreen:** Story 2.3 review consolidated the dual-snackbar into a single `snackbar` state: `{ message: string; type: 'success' | 'error' } | null`. The UndoSnackbar is a SEPARATE component with SEPARATE state — it does not conflict with the existing snackbar. However, dismiss the existing snackbar before showing UndoSnackbar to avoid visual overlap.
- **Non-null assertion removed in Story 2.3 review:** Store update action uses `const updatedSubscription = result.data;` with type narrowing instead of `result.data!`. Follow the same pattern in deleteSubscription — use `const deletedSubscription = result.data;` after the `if (result.error || !result.data)` guard.
- **`isSubmitting` is for form submission only:** Do NOT use `isSubmitting` for delete operations. Delete is optimistic and instant — no form to disable. The `pendingDelete` state tracks the undo window instead.
- **Zustand persist only saves `subscriptions`:** The `partialize` function explicitly whitelists only `subscriptions`. New state like `pendingDelete` is automatically excluded from persistence. No change to partialize needed.
- **Test mocking patterns established:** Mock `@shared/services/supabase`, `@react-native-async-storage/async-storage`. For Dialog/Portal tests, React Native Paper's `Portal` needs `PaperProvider` wrapper in test renders.
- **ESLint flat config:** `eslint.config.js`. Use bare `catch {}` for unused error variables. Use `// eslint-disable-next-line no-console` before `console.error` lines.
- **TypeScript strict mode:** All props must be typed. No `any` types. Use interfaces for component props.
- **Path aliases REQUIRED:** `@features/*`, `@shared/*`, `@config/*`, `@app/*` — never use relative paths that cross module boundaries.
- **Currency preserved on undo:** Story 2.3 fixed hardcoded 'EUR' to use `subscription?.currency ?? 'EUR'`. When restoring via `undoDelete`, pass the original subscription's `currency` field to `createSubscription`.
- **`accessibilityActions` pattern:** Story 2.3 added `accessibilityActions` with `edit` and `delete` to the SwipeableSubscriptionCard wrapper. Delete action already fires `onDelete?.()` — no changes needed there.

**Story 2.3 Code Review Findings (relevant for this story):**
- Avoid non-null assertions (`result.data!`) — use type narrowing
- Always provide meaningful accessibility labels (not just "Delete" but "Delete Netflix")
- Use `registerTranslation` in screens that use `react-native-paper-dates` (not relevant here — no date picker in delete flow)
- Consolidate snackbar state to avoid confusion (UndoSnackbar is separate component, so this is already clean)

### Git Intelligence

**Recent Commits (last 5):**

```
e964ca8 story 2.3 done
f445f3c story 2.3 in review
60f6d31 story 2.3 add Follow-up tasks
ca2db1a story 2.3 in review
279b6f7 story 2.3 ready-for-dev
```

**Key Insights:**

- Story 2.3 just completed — SwipeableSubscriptionCard with delete button is fresh and stable
- The store has `fetchSubscriptions`, `addSubscription`, `updateSubscription` — delete is the 4th CRUD operation
- The service has `createSubscription`, `updateSubscription`, `getSubscriptions`, `getSubscriptionCount` — delete completes the set
- SubscriptionsScreen was recently modified for edit flow — adding delete flow extends the same screen
- `src/shared/components/feedback/` directory exists with `.gitkeep` — UndoSnackbar will be the first real file there
- All 56 tests pass on current master — baseline for regression check

### Project Structure Notes

- `DeleteConfirmationDialog` is a **feature-specific** component — it belongs in `features/subscriptions/components/` (not shared, since the dialog text is subscription-specific)
- `UndoSnackbar` is a **shared** component — it belongs in `shared/components/feedback/` because it's reusable for any destructive operation (future: account deletion, category removal, etc.)
- No new navigation screens or stacks needed — delete happens entirely within the existing SubscriptionsScreen via dialog overlay
- No new types needed — `SubscriptionResult` (already exists) is the return type for `deleteSubscription` service
- The `pendingDelete` state type is defined inline in the store interface — no separate type file needed

### Scope Boundaries — What This Story Does NOT Include

**Explicitly OUT OF SCOPE (handled by future stories):**

- **Swipe right for quick delete** → The UX spec mentions "Right swipe = Delete" but Story 2.3 implemented left swipe for both Edit and Delete. Keep this pattern for consistency — no right swipe needed.
- **Progress bar on undo snackbar** → UX spec shows a visual countdown progress bar. Paper Snackbar doesn't natively support this. Skip for MVP — the 5-second auto-dismiss is sufficient.
- **Haptic feedback on delete** → UX spec mentions medium impact haptics. Skip for MVP — can be added in a polish sprint with `expo-haptics`.
- **Batch delete (select multiple)** → Not in any epic. Single delete only.
- **Soft delete / archive** → This is a hard delete. No "archived" or "trash" concept.
- **Celebration overlay on subscription cancel** → Story 2.7 (status management) handles active/cancelled — not related to delete.
- **Trial countdown badge** → Story 2.5
- **Category filtering** → Story 2.6

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4: Delete Subscription]
- [Source: _bmad-output/planning-artifacts/prd.md#FR10 — User can delete a subscription]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Zustand stores, feature-based modular]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Structure, Communication, Error Handling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — Component boundaries, data boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UndoSnackbar — Props, 5s duration, progress bar]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Confirmation Dialog — Delete modal pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Swipe Actions — Left swipe edit/delete]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy — Destructive button style]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Haptic Patterns — Delete: Impact Medium]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility — Delete button label and hint]
- [Source: _bmad-output/implementation-artifacts/2-3-edit-subscription-details.md — SwipeableSubscriptionCard, onDelete prop, Snackbar patterns, store patterns]
- [Source: src/features/subscriptions/services/subscriptionService.ts — Current service methods (create, update, get)]
- [Source: src/shared/stores/useSubscriptionStore.ts — Current store (fetch, add, update, clearError)]
- [Source: src/features/subscriptions/components/SwipeableSubscriptionCard.tsx — Delete button already rendered, onDelete prop defined]
- [Source: src/features/subscriptions/screens/SubscriptionsScreen.tsx — Current screen with edit flow, snackbar, FlatList]
- [Source: src/features/subscriptions/types/index.ts — Subscription, SubscriptionResult, AppError types]
- [Source: supabase/migrations/20260227000000_create_subscriptions.sql — Delete RLS policy exists]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
