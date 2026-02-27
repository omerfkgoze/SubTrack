# Story 2.1: Add New Subscription

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to add a new subscription with name, price, billing cycle, and renewal date,
so that I can start tracking my spending.

## Acceptance Criteria

1. **AC1 - Subscriptions Table & RLS:** Given Story 2.1 is the first subscription story, when the database migration runs, then a `subscriptions` table is created in Supabase with columns: `id` (UUID, PK), `user_id` (UUID, FK → auth.users ON DELETE CASCADE, NOT NULL), `name` (TEXT, NOT NULL), `price` (DECIMAL(10,2), NOT NULL), `currency` (TEXT, DEFAULT 'EUR'), `billing_cycle` (TEXT, NOT NULL — 'monthly'|'yearly'|'quarterly'|'weekly'), `renewal_date` (DATE, NOT NULL), `is_trial` (BOOLEAN, DEFAULT false), `trial_expiry_date` (DATE, nullable), `category` (TEXT, nullable), `is_active` (BOOLEAN, DEFAULT true), `notes` (TEXT, nullable), `created_at` (TIMESTAMPTZ, DEFAULT now()), `updated_at` (TIMESTAMPTZ, DEFAULT now()). RLS is enabled with four policies (SELECT, INSERT, UPDATE, DELETE) scoped to `(select auth.uid()) = user_id`. An `updated_at` trigger auto-updates on row modification.

2. **AC2 - Add Subscription Form:** Given the user taps the "Add" tab in bottom navigation, when the AddSubscriptionScreen loads, then a form is displayed with: subscription name (TextInput, required), price (TextInput numeric, required, € currency prefix), billing cycle (SegmentedButtons: Monthly/Yearly/Quarterly/Weekly, default Monthly), and next renewal date (date picker, required). Optional fields: category (CategoryChip selector), trial toggle (Switch), notes (TextInput multiline). Form uses `react-hook-form` with `zodResolver` for validation.

3. **AC3 - Smart Name Suggestions:** Given the user starts typing a subscription name, when they have typed 2+ characters, then a dropdown shows matching suggestions from a predefined popular services list (Netflix, Spotify, Disney+, YouTube Premium, iCloud, Google One, Adobe, Canva, etc.). Selecting a suggestion auto-fills the name field.

4. **AC4 - Form Validation:** Given the user leaves required fields empty (name, price, billing cycle, renewal date) or enters invalid data (negative price, price = 0), when they attempt to submit, then inline error messages appear below each invalid field via react-hook-form + zod validation. The submit button remains disabled while any validation error exists.

5. **AC5 - Successful Submission:** Given the user fills in all required fields with valid data, when they tap "Save Subscription", then: the subscription is saved to Supabase `subscriptions` table with the authenticated user's ID, a loading indicator shows during the API call, on success the user is navigated back to the Subscriptions tab, and the new subscription will appear in the list.

6. **AC6 - First Subscription Celebration:** Given this is the user's first subscription ever (subscription count was 0 before), when the subscription is saved successfully, then a brief confetti celebration animation plays (Lottie, ~2 seconds, auto-dismiss) before navigating back.

7. **AC7 - Zustand Store:** Given the subscription is created, when the store is updated, then `useSubscriptionStore` manages the subscription list, loading states, and error states following the established Zustand + persist + AsyncStorage pattern from `useAuthStore`.

8. **AC8 - Error Handling:** Given a network error or server error occurs during submission, when the save fails, then a user-friendly error message is displayed (Snackbar), the form retains all entered data, and the user can retry.

9. **AC9 - Accessibility:** All form elements have `accessibilityLabel` and appropriate `accessibilityRole`. Touch targets are minimum 44x44pt. Error messages are announced to screen readers via `accessibilityLiveRegion="polite"`. The date picker is keyboard-navigable.

10. **AC10 - Generated Types:** Given the migration creates the `subscriptions` table, when types are generated, then TypeScript types are auto-generated from the Supabase schema using `supabase gen types typescript` and placed in `src/shared/types/database.types.ts` for type-safe queries throughout the app.

## Tasks / Subtasks

- [x] Task 1: Create Supabase Migration for `subscriptions` Table (AC: #1, #10)
  - [x] 1.1 Create migration file `supabase/migrations/YYYYMMDDHHMMSS_create_subscriptions.sql`
    - CREATE TABLE `subscriptions` with all columns per AC1
    - All columns use snake_case per architecture naming conventions
    - `user_id` references `auth.users(id)` with `ON DELETE CASCADE`
    - `billing_cycle` as TEXT (not enum) for flexibility — validate in application layer
    - `currency` defaults to `'EUR'` (Europe target market)
  - [x] 1.2 Enable RLS and create four policies:
    - SELECT: `(select auth.uid()) = user_id` — wrap in subquery for performance
    - INSERT: `(select auth.uid()) = user_id` — WITH CHECK
    - UPDATE: `(select auth.uid()) = user_id` — USING
    - DELETE: `(select auth.uid()) = user_id` — USING
  - [x] 1.3 Create `updated_at` trigger function and trigger:
    - `CREATE OR REPLACE FUNCTION update_updated_at_column()` → sets `NEW.updated_at = now()`
    - `CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions`
  - [x] 1.4 Apply migration locally: `npx supabase db reset`
  - [x] 1.5 Generate TypeScript types: `npx supabase gen types typescript --local > src/shared/types/database.types.ts`
  - [x] 1.6 Update `delete-account` Edge Function to delete subscriptions before user deletion:
    - Add `await supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id)` before `auth.admin.deleteUser()`
    - Note: ON DELETE CASCADE handles this at DB level, but explicit deletion is defense-in-depth

- [x] Task 2: Create Subscription Types and Zod Schemas (AC: #2, #4)
  - [x] 2.1 Create `src/features/subscriptions/types/index.ts`:
    - `BillingCycle` type: `'monthly' | 'yearly' | 'quarterly' | 'weekly'`
    - `Subscription` interface matching database schema (use generated types as base)
    - `CreateSubscriptionDTO` — fields for creating: name, price, currency, billing_cycle, renewal_date, is_trial?, trial_expiry_date?, category?, notes?
  - [x] 2.2 Create `src/features/subscriptions/types/schemas.ts`:
    - `createSubscriptionSchema` using zod v4:
      - `name`: z.string().min(1, 'Subscription name is required').max(100)
      - `price`: z.number().positive('Price must be greater than 0')  — or z.string() → z.coerce.number() for TextInput compatibility
      - `billing_cycle`: z.enum(['monthly', 'yearly', 'quarterly', 'weekly'])
      - `renewal_date`: z.string().min(1, 'Renewal date is required') — ISO date string
      - `is_trial`: z.boolean().optional().default(false)
      - `trial_expiry_date`: z.string().optional() — required if is_trial is true (refine)
      - `category`: z.string().optional()
      - `notes`: z.string().optional()

- [x] Task 3: Create Subscription Service (AC: #5, #8)
  - [x] 3.1 Create `src/features/subscriptions/services/subscriptionService.ts`:
    - Import `supabase` from `@shared/services/supabase`
    - Define `SubscriptionResult` interface: `{ data: Subscription | null; error: AppError | null }`
    - Define `SubscriptionListResult`: `{ data: Subscription[]; error: AppError | null }`
  - [x] 3.2 Implement `createSubscription(dto: CreateSubscriptionDTO): Promise<SubscriptionResult>`:
    - Get current user from supabase auth: `supabase.auth.getUser()`
    - Insert into `subscriptions` table with `user_id` from auth
    - Map errors: network, auth expired, constraint violations
    - Return typed result
  - [x] 3.3 Implement `getSubscriptions(): Promise<SubscriptionListResult>`:
    - Query `supabase.from('subscriptions').select('*').order('renewal_date', { ascending: true })`
    - RLS automatically filters by user_id
    - Map errors consistently
  - [x] 3.4 Implement `getSubscriptionCount(): Promise<number>`:
    - `supabase.from('subscriptions').select('id', { count: 'exact', head: true })`
    - Used to determine if first subscription (for celebration animation)

- [x] Task 4: Create useSubscriptionStore (Zustand) (AC: #7)
  - [x] 4.1 Create `src/shared/stores/useSubscriptionStore.ts`:
    - Follow EXACT same pattern as `useAuthStore`:
      - `create<SubscriptionStore>()(persist(...))`
      - `createJSONStorage(() => AsyncStorage)`
      - Separate `SubscriptionState` + `SubscriptionActions` interfaces
    - State: `subscriptions: Subscription[]`, `isLoading: boolean`, `isSubmitting: boolean`, `error: AppError | null`
    - Actions: `fetchSubscriptions()`, `addSubscription(dto)`, `clearError()`
    - Persist: `subscriptions` array only (not loading/error states)
    - Store name: `'subscription-store'`
  - [x] 4.2 Implement `fetchSubscriptions()`:
    - `set({ isLoading: true, error: null })`
    - Call `getSubscriptions()` from service
    - Handle error/success per store pattern
  - [x] 4.3 Implement `addSubscription(dto: CreateSubscriptionDTO): Promise<boolean>`:
    - `set({ isSubmitting: true, error: null })`
    - Call `createSubscription(dto)` from service
    - On success: add to local subscriptions array, `set({ isSubmitting: false })`
    - On error: `set({ error, isSubmitting: false })`, return false
    - Return true on success
  - [x] 4.4 Export store from `src/shared/stores/` — do NOT create a separate feature store, follow established pattern

- [x] Task 5: Create Popular Services Suggestion Data (AC: #3)
  - [x] 5.1 Create `src/config/popularServices.ts`:
    - Array of `{ name: string; defaultCategory?: string }` for popular subscription services
    - Include: Netflix, Spotify, Disney+, YouTube Premium, Apple Music, iCloud, Google One, Adobe Creative Cloud, Canva Pro, Amazon Prime, HBO Max, Hulu, Paramount+, Crunchyroll, Xbox Game Pass, PlayStation Plus, Nintendo Switch Online, Dropbox, Microsoft 365, LinkedIn Premium, Headspace, Calm, Strava, Duolingo, ChatGPT Plus, GitHub Copilot, Notion, Figma, Slack, Zoom
    - Export `searchPopularServices(query: string): PopularService[]` — fuzzy match by name prefix
  - [x] 5.2 Export from `src/config/index.ts`

- [x] Task 6: Install date-fns Dependency (AC: #2)
  - [x] 6.1 Run `npx expo install date-fns`
  - [x] 6.2 Verify installation in package.json

- [x] Task 7: Add Confetti Lottie Animation Asset (AC: #6)
  - [x] 7.1 Download a confetti celebration Lottie JSON animation from LottieFiles (free license)
  - [x] 7.2 Save to `assets/animations/confetti.json`
  - [x] 7.3 Verify animation renders with `lottie-react-native` (already installed ~7.3.1)

- [x] Task 8: Implement AddSubscriptionScreen (AC: #2, #3, #4, #5, #6, #8, #9)
  - [x] 8.1 Rewrite `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` (currently placeholder):
    - Import: `useForm, Controller` from `react-hook-form`, `zodResolver` from `@hookform/resolvers/zod`
    - Import: `TextInput, Button, HelperText, Switch, SegmentedButtons, Snackbar` from `react-native-paper`
    - Import: `createSubscriptionSchema` from `@features/subscriptions/types/schemas`
    - Import: `useSubscriptionStore` from `@shared/stores/useSubscriptionStore`
    - Import: `SUBSCRIPTION_CATEGORIES` from `@config/categories`
    - Import: `searchPopularServices` from `@config/popularServices`
    - Import: `useNavigation` from `@react-navigation/native`
  - [x] 8.2 Implement form with `useForm<CreateSubscriptionFormData>`:
    - `resolver: zodResolver(createSubscriptionSchema)`
    - `defaultValues: { billing_cycle: 'monthly', is_trial: false, currency: 'EUR' }`
    - Use `Controller` for each React Native input (NOT register — RN has no refs)
  - [x] 8.3 Name field with suggestions:
    - TextInput with `onChangeText` updating search query
    - Show `FlatList` dropdown when suggestions exist and field is focused
    - `searchPopularServices(query)` for filtering
    - Tap suggestion → fill name + auto-select category if `defaultCategory` exists
  - [x] 8.4 Price field:
    - TextInput with `keyboardType="decimal-pad"`
    - Left affix: `<TextInput.Affix text="€" />`
    - Parse string to number for zod validation (use `z.coerce.number()` or manual transform)
  - [x] 8.5 Billing cycle selector:
    - `SegmentedButtons` with 4 options: Monthly, Yearly, Quarterly, Weekly
    - Wrapped in `Controller`
  - [x] 8.6 Renewal date picker:
    - Use `DatePickerInput` from `react-native-paper-dates` or a custom date picker approach
    - **Alternative:** TextInput with `onFocus` opening a date selection modal
    - Display formatted date using `date-fns` format()
    - Store as ISO date string
  - [x] 8.7 Category selection:
    - Horizontal ScrollView of `Chip` components from react-native-paper
    - Map from `SUBSCRIPTION_CATEGORIES` config
    - Optional — no validation error if not selected, defaults to null
  - [x] 8.8 Trial toggle:
    - `Switch` component — when ON, reveal `trial_expiry_date` field
    - Use `watch('is_trial')` from react-hook-form to conditionally render
  - [x] 8.9 Notes field (optional):
    - TextInput multiline, mode="outlined"
  - [x] 8.10 Submit handler:
    - `handleSubmit(onSubmit)` from react-hook-form
    - Call `addSubscription(data)` from store
    - On success: check subscription count — if was 0, show celebration overlay
    - Navigate back to Subscriptions tab after success (or after celebration)
    - On error: Snackbar with error message
  - [x] 8.11 Loading states:
    - Submit button: `loading={isSubmitting}`, `disabled={isSubmitting}`
    - Form inputs: `disabled={isSubmitting}`
  - [x] 8.12 Accessibility:
    - All inputs: `accessibilityLabel`, `accessibilityRole`
    - Error messages: `accessibilityLiveRegion="polite"`
    - Touch targets: minimum 44x44pt

- [x] Task 9: Create CelebrationOverlay Component (AC: #6)
  - [x] 9.1 Create `src/shared/components/CelebrationOverlay.tsx`:
    - Props: `visible: boolean`, `onDismiss: () => void`, `message?: string`
    - Full-screen overlay with semi-transparent background
    - Lottie confetti animation: `require('../../../../assets/animations/confetti.json')`
    - Message text below animation (default: "Great start!")
    - Auto-dismiss after 2.5 seconds OR tap to dismiss
    - Use `react-native-reanimated` for fade in/out
  - [x] 9.2 Export from `src/shared/components/`

- [x] Task 10: Update Navigation and Feature Exports (AC: all)
  - [x] 10.1 Verify `MainTabs.tsx` already has "Add" tab pointing to `AddSubscriptionScreen` — no changes needed
  - [x] 10.2 Update `src/features/subscriptions/index.ts`:
    - Export `AddSubscriptionScreen`
    - Export subscription types
    - Export subscription service functions
  - [x] 10.3 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`)
  - [x] 10.4 Run `npx tsc --noEmit` — zero errors
  - [x] 10.5 Run `npx eslint src/` — zero errors/warnings
  - [x] 10.6 Apply Supabase migration to remote: `npx supabase db push` (if deploying)

## Dev Notes

### Critical Technical Requirements

**Supabase Migration — subscriptions Table (CRITICAL):**

This is the FIRST database table in the project. The migration establishes patterns that ALL future tables MUST follow.

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_subscriptions.sql

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly', 'weekly')),
  renewal_date DATE NOT NULL,
  is_trial BOOLEAN DEFAULT false,
  trial_expiry_date DATE,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use (select auth.uid()) subquery for performance)
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON subscriptions FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_renewal_date ON subscriptions(renewal_date);
```

**CRITICAL: RLS Performance — (select auth.uid()) subquery pattern:**
Wrapping `auth.uid()` in a `(select ...)` subquery causes Postgres to cache the value per-statement instead of re-evaluating per row. This is a documented Supabase best practice.

**CRITICAL: ON DELETE CASCADE on user_id:**
When a user is deleted (via the delete-account Edge Function from Story 1.7), all their subscriptions are automatically deleted at the database level. However, the Edge Function should ALSO explicitly delete subscriptions as defense-in-depth.

**CRITICAL: react-hook-form Controller Pattern for React Native:**

React Native TextInput has no DOM refs, so RHF's `register` does NOT work. You MUST use `Controller`:

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { control, handleSubmit, formState: { errors }, watch } = useForm<CreateSubscriptionFormData>({
  resolver: zodResolver(createSubscriptionSchema),
  defaultValues: {
    billing_cycle: 'monthly',
    is_trial: false,
    currency: 'EUR',
  },
});

// Each field uses Controller:
<Controller
  control={control}
  name="name"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput
      label="Subscription Name"
      mode="outlined"
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      error={!!errors.name}
      accessibilityLabel="Subscription name"
    />
  )}
/>
{errors.name && (
  <HelperText type="error" accessibilityLiveRegion="polite">
    {errors.name.message}
  </HelperText>
)}
```

**CRITICAL: Price Input — String to Number Conversion:**

TextInput always returns strings. Two approaches:
1. Use `z.coerce.number()` in zod schema — converts string to number automatically
2. Parse manually before submission

Recommended approach for price field:
```typescript
// In schema:
price: z.coerce.number().positive('Price must be greater than 0'),

// In TextInput:
<Controller
  control={control}
  name="price"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput
      label="Price"
      mode="outlined"
      keyboardType="decimal-pad"
      left={<TextInput.Affix text="€" />}
      value={value ? String(value) : ''}
      onChangeText={(text) => onChange(text)}
      onBlur={onBlur}
      error={!!errors.price}
    />
  )}
/>
```

**CRITICAL: Date Picker Approach:**

`react-native-paper-dates` is NOT in the project dependencies. Options:
1. **Simple approach (recommended):** Use a TextInput that opens a custom date modal with React Native's DateTimePicker from `@react-native-community/datetimepicker` (part of Expo)
2. **Install react-native-paper-dates:** `npx expo install react-native-paper-dates` — integrates with react-native-paper theme
3. **Manual date input:** TextInput with date format validation (worst UX)

Recommended: Install `react-native-paper-dates` for seamless Paper theme integration. Check Expo compatibility first with `npx expo install`.

**CRITICAL: Zustand Store Pattern (MUST follow useAuthStore exactly):**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionState {
  subscriptions: Subscription[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: AppError | null;
}

interface SubscriptionActions {
  fetchSubscriptions: () => Promise<void>;
  addSubscription: (dto: CreateSubscriptionDTO) => Promise<boolean>;
  clearError: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      // State
      subscriptions: [],
      isLoading: false,
      isSubmitting: false,
      error: null,

      // Actions
      fetchSubscriptions: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await getSubscriptions();
          if (result.error) throw result.error;
          set({ subscriptions: result.data, isLoading: false });
        } catch (err) {
          set({ error: handleError(err), isLoading: false });
        }
      },

      addSubscription: async (dto) => {
        set({ isSubmitting: true, error: null });
        try {
          const result = await createSubscription(dto);
          if (result.error) throw result.error;
          // Add to local array (optimistic-like update)
          set((state) => ({
            subscriptions: [...state.subscriptions, result.data!],
            isSubmitting: false,
          }));
          return true;
        } catch (err) {
          set({ error: handleError(err), isSubmitting: false });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subscriptions: state.subscriptions,
      }),
    },
  ),
);
```

**CRITICAL: CelebrationOverlay — First Subscription Detection:**

```typescript
// In AddSubscriptionScreen submit handler:
const previousCount = useSubscriptionStore.getState().subscriptions.length;
const success = await addSubscription(formData);

if (success) {
  if (previousCount === 0) {
    // Show celebration overlay
    setShowCelebration(true);
    // Navigate after celebration dismisses
  } else {
    // Navigate directly
    navigation.goBack();
  }
}
```

**CRITICAL: Update delete-account Edge Function:**

Story 1.7 left a TODO comment in `supabase/functions/delete-account/index.ts`:
```typescript
// TODO: When data tables are created (Epic 2+), add deletion queries here:
// await supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id)
```
This MUST be uncommented/implemented as part of this story.

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure (extend existing):**

   ```
   features/subscriptions/
   ├── components/
   │   └── (future: SubscriptionCard.tsx — Story 2.2)
   ├── hooks/
   │   └── .gitkeep
   ├── screens/
   │   ├── AddSubscriptionScreen.tsx    (REWRITE — replace placeholder)
   │   └── SubscriptionsScreen.tsx      (NO CHANGE — Story 2.2)
   ├── services/
   │   └── subscriptionService.ts       (CREATE)
   ├── types/
   │   ├── index.ts                     (CREATE)
   │   └── schemas.ts                   (CREATE)
   └── index.ts                         (MODIFY — add exports)

   shared/
   ├── components/
   │   └── CelebrationOverlay.tsx       (CREATE)
   ├── stores/
   │   ├── useAuthStore.ts              (NO CHANGE)
   │   └── useSubscriptionStore.ts      (CREATE)
   └── types/
       └── database.types.ts            (CREATE — auto-generated)

   config/
   ├── categories.ts                    (NO CHANGE — already exists)
   ├── popularServices.ts               (CREATE)
   └── index.ts                         (MODIFY — export popularServices)

   supabase/
   ├── migrations/
   │   └── YYYYMMDDHHMMSS_create_subscriptions.sql  (CREATE)
   └── functions/
       └── delete-account/
           └── index.ts                 (MODIFY — uncomment subscription deletion)

   assets/
   └── animations/
       └── confetti.json                (CREATE — Lottie animation file)
   ```

2. **Component Boundaries:**
   - AddSubscriptionScreen → uses useSubscriptionStore for state
   - CelebrationOverlay → shared component, used by subscription and future features
   - subscriptionService → only talks to Supabase client
   - No direct imports between features — use stores for cross-feature data

3. **Naming Conventions:**
   - Database: snake_case (`billing_cycle`, `user_id`, `renewal_date`, `is_trial`)
   - TypeScript: PascalCase types/interfaces (`Subscription`, `CreateSubscriptionDTO`)
   - Functions: camelCase (`createSubscription`, `getSubscriptions`)
   - Components: PascalCase files (`AddSubscriptionScreen.tsx`, `CelebrationOverlay.tsx`)
   - Store: camelCase with `use` prefix (`useSubscriptionStore`)
   - Config: camelCase files (`popularServices.ts`)
   - Migration: timestamp_snake_case (`YYYYMMDDHHMMSS_create_subscriptions.sql`)

4. **Import Aliases — REQUIRED:**
   ```typescript
   import { supabase } from '@shared/services/supabase';
   import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
   import { SUBSCRIPTION_CATEGORIES } from '@config/categories';
   import { searchPopularServices } from '@config/popularServices';
   import { Subscription, CreateSubscriptionDTO } from '@features/subscriptions/types';
   import { createSubscriptionSchema } from '@features/subscriptions/types/schemas';
   ```

5. **Error Handling Pattern:** Same as authService — async actions inside Zustand store with try/catch, error state managed in store, user-friendly messages.

   ```typescript
   interface AppError {
     code: string;    // 'NETWORK_ERROR', 'DB_ERROR', 'AUTH_ERROR'
     message: string; // User-friendly message
   }
   ```

6. **Store Pattern (Zustand v5 + persist + AsyncStorage):**
   - Follow EXACT same structure as `useAuthStore`
   - Separate state and action interfaces
   - Use `partialize` to persist only `subscriptions` array
   - Transient states (`isLoading`, `isSubmitting`, `error`) NOT persisted

### Library & Framework Requirements

**New Dependency to Install:**

| Package    | Version | Installation Command        | Notes                          |
| ---------- | ------- | --------------------------- | ------------------------------ |
| date-fns   | ^4.1.0  | `npx expo install date-fns` | Date formatting & calculation  |

**Consider Installing (for date picker):**

| Package               | Version | Installation Command                      | Notes                         |
| --------------------- | ------- | ----------------------------------------- | ----------------------------- |
| react-native-paper-dates | latest | `npx expo install react-native-paper-dates` | Paper-themed date picker      |

**Existing Dependencies Used:**

| Package                                    | Version   | Notes                                           |
| ------------------------------------------ | --------- | ----------------------------------------------- |
| react-hook-form                            | ^7.71.1   | Form state management — use Controller pattern  |
| @hookform/resolvers                        | ^5.2.2    | Zod resolver for react-hook-form                |
| zod                                        | ^4.3.6    | Schema validation — z.coerce.number() for price |
| react-native-paper                         | ^5.15.0   | TextInput, Button, Chip, SegmentedButtons, etc. |
| @supabase/supabase-js                      | ^2.95.3   | Database operations, auth, RLS                  |
| zustand                                    | ^5.0.11   | State management — subscription store           |
| @react-native-async-storage/async-storage  | 2.2.0     | Zustand persist storage                         |
| lottie-react-native                        | ~7.3.1    | Confetti celebration animation                  |
| react-native-reanimated                    | ~4.1.1    | Animation support for celebration overlay        |
| @tanstack/react-query                      | ^5.90.21  | Available but NOT used for this story (Zustand handles state) |

**CRITICAL: @expo/vector-icons (Ionicons Bug):**
Expo SDK 54 has a known bug where Ionicons render as `[?]`. Use `MaterialCommunityIcons` from `@expo/vector-icons` instead. The project already uses `react-native-paper`'s `Icon` component which uses MaterialCommunityIcons internally — stick with this.

### File Structure Requirements

**Files to CREATE:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_subscriptions.sql` — First database migration
- `src/features/subscriptions/types/index.ts` — Subscription types and DTOs
- `src/features/subscriptions/types/schemas.ts` — Zod validation schemas
- `src/features/subscriptions/services/subscriptionService.ts` — Supabase CRUD operations
- `src/shared/stores/useSubscriptionStore.ts` — Zustand subscription store
- `src/shared/types/database.types.ts` — Auto-generated Supabase types
- `src/config/popularServices.ts` — Popular subscription service names
- `src/shared/components/CelebrationOverlay.tsx` — Lottie confetti overlay
- `assets/animations/confetti.json` — Lottie animation file

**Files to MODIFY:**
- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` — REWRITE (replace placeholder)
- `src/features/subscriptions/index.ts` — Add exports
- `src/config/index.ts` — Export popularServices
- `supabase/functions/delete-account/index.ts` — Uncomment subscription deletion TODO

**Files NOT to touch:**
- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — Story 2.2 scope
- `src/shared/stores/useAuthStore.ts` — No changes needed
- `src/app/navigation/MainTabs.tsx` — Already has "Add" tab
- `src/app/navigation/*.tsx` — No navigation changes needed
- `src/app/providers/*.tsx` — No provider changes needed
- `src/features/auth/*` — No auth changes needed
- `src/config/categories.ts` — Already exists with correct data
- `src/config/theme.ts` — No changes needed
- `package.json` — Only changes from `npx expo install date-fns`

### Testing Requirements

- Apply migration locally: `npx supabase db reset`
- Generate types: `npx supabase gen types typescript --local > src/shared/types/database.types.ts`
- Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
- Verify ESLint passes: `npx eslint src/` — zero errors/warnings
- **Manual Smoke Test:**
  1. App launches → Login → navigate to "Add" tab → full form displayed with name, price, billing cycle (Monthly default), renewal date
  2. Type "Net" in name field → "Netflix" suggestion appears → tap → name fills
  3. Leave name empty → tap Save → error "Subscription name is required" shown inline
  4. Enter negative price → error "Price must be greater than 0"
  5. Fill all required fields: Name="Netflix", Price="17.99", Cycle=Monthly, Date=next month
  6. Tap "Save Subscription" → loading spinner on button → success
  7. **First subscription:** confetti animation plays for ~2 seconds → auto-navigates to Subscriptions tab
  8. Go back to Add tab → add second subscription → no confetti, direct navigation
  9. Select category chip (Entertainment) → category highlighted, saved with subscription
  10. Toggle "This is a trial" → trial expiry date field appears → fill and save
  11. Add notes → save → notes preserved
  12. Network error test: enable airplane mode → attempt save → snackbar "No internet connection" → form data preserved → disable airplane mode → retry → success
  13. Verify delete account still works: Settings → Delete Account → flow completes → subscriptions deleted (ON DELETE CASCADE + explicit deletion)
  14. Verify accessibility: all form inputs have labels, errors announced to screen readers, touch targets ≥ 44x44pt

### Previous Story Intelligence (Epic 1)

**Key Learnings from Epic 1 (CRITICAL — Apply to this story):**

- **Zustand persist pattern:** Use `partialize` to exclude transient states. Store name must be unique string. Follow `useAuthStore` exactly.
- **isSubmitting vs isLoading distinction:** Use `isSubmitting` for form submission (disables only submit button), `isLoading` for initial data fetch (shows full screen spinner). Same rationale as `isDeleting` in Story 1.7.
- **Error handling in stores:** `set({ isSubmitting: true, error: null })` → call service → handle error → update state. User-friendly messages, not raw errors.
- **AsyncStorage (NOT MMKV):** Confirmed — use `@react-native-async-storage/async-storage` only.
- **ESLint flat config:** `eslint.config.js`. Unused variables in catch blocks → use bare `catch {}`.
- **Theme compliance:** Use `theme.colors.*` via `useTheme()` hook, not hardcoded hex values.
- **Path aliases REQUIRED:** `@features/*`, `@shared/*`, `@config/*`, `@app/*` — defined in both `tsconfig.json` and `babel.config.js`.
- **Edge Function pattern:** Established in Story 1.7 with `delete-account`. Deno-style imports for Edge Functions, npm-style for client code.
- **Dialog/Portal pattern:** Use `<Portal>` wrapper from react-native-paper for overlays — established in SettingsScreen.
- **Snackbar pattern:** Existing pattern in SettingsScreen for user feedback messages.
- **supabase.functions.invoke():** Automatically sends Authorization header with user's JWT.
- **Development build required:** For testing with local Supabase: `supabase start`, `supabase db reset`, `supabase functions serve`.
- **TypeScript strict mode:** Enabled. All props must be typed. No `any` types.
- **Auth state checking:** For subscription operations, ensure user is authenticated. Supabase RLS handles this at DB level, but check `auth.getUser()` in service layer for early error detection.

**Patterns to Reuse from Existing Code:**

- Zustand store pattern from `useAuthStore` (create + persist + partialize)
- Error handling pattern from `authService` (try/catch, typed results)
- Form structure from auth screens (zod + react-hook-form + Controller)
- Snackbar feedback from SettingsScreen
- Component styling via `useTheme()` hook
- Accessibility patterns from all auth screens (labels, roles, live regions)

### Git Intelligence

**Recent Commits (last 5):**

```
d322c01 fix: account delete issue
a6f61e5 story 1.7 done
61c4dad story 1.7 in review
3462dcb story 1.7 ready-for-dev
0a446b5 story 1.6 done
```

**Key Insights:**
- Epic 1 complete (all 7 stories done). This is the FIRST story of Epic 2.
- Account deletion Edge Function has TODO for subscription table deletion — must update
- All auth patterns mature and tested through 7 stories
- Project structure follows feature-based architecture consistently
- No existing Supabase migrations — this will be the FIRST migration file

### Latest Technical Information

**Library Versions (verified Feb 2026):**

| Library | Installed | Latest | Action |
|---|---|---|---|
| react-hook-form | ^7.71.1 | 7.71.2 | Security patch — auto-resolves via caret |
| zod | ^4.3.6 | 4.3.6 | Current |
| @hookform/resolvers | ^5.2.2 | 5.2.2 | Current — full Zod v4 support |
| @supabase/supabase-js | ^2.95.3 | 2.97.0 | Auto-resolves via caret |
| lottie-react-native | ~7.3.1 | 7.3.6 | Auto-resolves via tilde |
| date-fns | NOT INSTALLED | 4.1.0 | **Must install: `npx expo install date-fns`** |

**Critical Technical Notes:**
- **react-hook-form + React 19:** Works fine without React Compiler. Use `Controller` pattern (not `register`) for React Native.
- **Zod v4 + @hookform/resolvers v5:** Full compatibility confirmed. Import `zodResolver` from `@hookform/resolvers/zod`.
- **Supabase RLS:** Use `(select auth.uid()) = user_id` subquery pattern for performance optimization.
- **Lottie confetti:** Use pre-made JSON from LottieFiles — no additional dependencies needed.
- **@expo/vector-icons Ionicons bug:** Avoid Ionicons in Expo SDK 54. Use MaterialCommunityIcons.
- **date-fns v4:** Tree-shakeable, TypeScript native, works with Hermes engine.
- **react-native-gesture-handler:** Stay on Expo-pinned `~2.28.0`. `ReanimatedSwipeable` available (for future stories).

### Project Structure Notes

- This is the FIRST database table and migration in the project — establishes patterns for all future tables
- The `useSubscriptionStore` is the SECOND Zustand store (after `useAuthStore`) — must follow identical pattern
- `CelebrationOverlay` component goes in `shared/components/` as it will be reused (cancellation celebrations, milestones)
- `popularServices.ts` goes in `config/` as it's static configuration data, not a feature-specific service
- `database.types.ts` goes in `shared/types/` as it's used across all features
- Subscription feature structure already scaffolded with directories and `.gitkeep` files — replace `.gitkeep` files with actual implementations

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2: Subscription Tracking Core — Story 2.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Subscription Management — FR8]
- [Source: _bmad-output/planning-artifacts/prd.md#Product Scope — Manual subscription entry]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Supabase, Database-first]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — RLS, JWT]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Feature-based modular, Zustand]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Structure, Communication]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Add Subscription < 60 seconds, 3 steps max]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Category Color System — 8 categories]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CelebrationOverlay — Confetti for first subscription]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Components — TextInput, SegmentedButtons, Chip]
- [Source: _bmad-output/implementation-artifacts/1-7-account-deletion-data-removal.md — Edge Function pattern, Zustand pattern]
- [Source: src/config/categories.ts — Existing 8 category definitions with colors and icons]
- [Source: src/shared/stores/useAuthStore.ts — Zustand persist pattern reference]
- [Source: src/features/auth/services/authService.ts — Error handling pattern reference]
- [Source: Supabase Docs — RLS performance best practices: (select auth.uid()) subquery]
- [Source: react-hook-form Docs — Controller pattern for React Native]
- [Source: LottieFiles — Free confetti animations for celebration overlay]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Zod v4 `z.coerce.number()` produces `unknown` input type causing react-hook-form Resolver type mismatch. Fixed by using `z.number()` and manually parsing string→number in Controller's `onChangeText`.
- Zod v4 `z.boolean().default(false)` produces `boolean | undefined` input type causing Resolver mismatch. Fixed by using `z.boolean()` without `.default()` and setting default in form's `defaultValues`.
- `supabase gen types typescript --local` outputs "Connecting to db 5432" to stdout. Fixed by removing the first line from generated database.types.ts.
- Installed `react-native-paper-dates` for date picker integration with Paper theme (DatePickerInput with calendar modal).

### Completion Notes List

- All 10 tasks and subtasks implemented and verified
- Migration applied locally via `npx supabase db reset` — subscriptions table created with RLS policies
- TypeScript types auto-generated from Supabase schema (database.types.ts)
- Delete-account Edge Function updated with explicit subscription deletion (defense-in-depth)
- Form uses react-hook-form + zodResolver + Controller pattern consistent with auth screens
- Smart name suggestions with prefix search on 30 popular services
- CelebrationOverlay with Lottie animation, auto-dismiss after 2.5s, Portal-based overlay
- Zustand store follows exact same pattern as useAuthStore (persist + partialize)
- All accessibility requirements met (labels, roles, liveRegion, 44pt touch targets)
- `npx tsc --noEmit` — zero errors
- `npx eslint src/` — zero errors/warnings

### File List

**Created:**
- `supabase/migrations/20260227000000_create_subscriptions.sql` — First database migration (subscriptions table, RLS, trigger, indexes)
- `src/shared/types/database.types.ts` — Auto-generated Supabase TypeScript types
- `src/features/subscriptions/types/index.ts` — Subscription types, DTOs, AppError
- `src/features/subscriptions/types/schemas.ts` — Zod validation schema for create subscription form
- `src/features/subscriptions/services/subscriptionService.ts` — Supabase CRUD operations (create, list, count)
- `src/shared/stores/useSubscriptionStore.ts` — Zustand subscription store (persist + AsyncStorage)
- `src/config/popularServices.ts` — Popular subscription services data with prefix search
- `src/shared/components/CelebrationOverlay.tsx` — Lottie confetti overlay component
- `assets/animations/confetti.json` — Lottie confetti animation asset

**Modified:**
- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` — Full form implementation (replaced placeholder)
- `src/features/subscriptions/index.ts` — Added barrel exports for screens, types, services
- `src/config/index.ts` — Added searchPopularServices export
- `supabase/functions/delete-account/index.ts` — Uncommented subscription deletion (defense-in-depth)
- `package.json` — Added date-fns ^4.1.0, react-native-paper-dates dependencies

### Change Log

- 2026-02-27: Story 2.1 implementation complete — Add New Subscription feature with full form, database migration, Zustand store, name suggestions, celebration overlay, and accessibility support
