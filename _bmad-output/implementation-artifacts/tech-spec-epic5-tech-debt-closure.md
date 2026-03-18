---
title: 'Epic 5 Technical Debt Closure'
slug: 'epic5-tech-debt-closure'
created: '2026-03-18'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  [
    'TypeScript',
    'React Native',
    'Expo',
    'Supabase',
    'React Native Paper',
    'Zustand',
    'Jest',
    'react-test-renderer',
  ]
files_to_modify:
  [
    'src/config/theme.ts',
    'src/features/auth/screens/LoginScreen.tsx',
    'src/features/auth/screens/RegisterScreen.tsx',
    'src/features/auth/screens/BiometricPromptScreen.tsx',
    'src/features/auth/screens/WelcomeScreen.tsx',
    'src/features/subscriptions/components/SubscriptionCard.test.tsx',
    'src/features/settings/screens/MyDataScreen.test.tsx',
    'src/features/settings/screens/DataExportScreen.test.tsx',
    'src/shared/stores/useAuthStore.ts',
    'src/shared/stores/useSubscriptionStore.ts',
    'src/shared/stores/useNotificationStore.ts',
  ]
code_patterns:
  [
    'StyleSheet.create() in React Native screens',
    'MD3LightTheme extension pattern',
    'Zustand store with typed State+Actions interfaces',
  ]
test_patterns:
  [
    'Jest + react-test-renderer',
    'mockImplementation for Zustand selectors',
    'ReactTestInstance for RN tree traversal',
  ]
---

# Tech-Spec: Epic 5 Technical Debt Closure

**Created:** 2026-03-18

## Overview

### Problem Statement

4 LOW-priority technical debt items have been carried forward across multiple epics and must be resolved before Epic 6 kickoff. These items were deferred with "LOW" labels but the retro explicitly moved them to "must close before Epic 6" status. Epic 6 involves real money (IAP), so codebase health is non-negotiable.

### Solution

1. Move hardcoded opacity values in 4 auth screens to the theme system via a named `opacityValues` export in `theme.ts`
2. Replace 8 `any` type annotations in test files with proper TypeScript types (export store types, use `ReactTestInstance`)
3. Add a FK constraint from `notification_log.subscription_id` → `subscriptions.id` via new migration with `ON DELETE CASCADE`
4. Document a conscious MVP decision to keep manual curl testing for Edge Functions

### Scope

**In Scope:**

- `src/config/theme.ts` — add `opacityValues` named export
- `src/features/auth/screens/LoginScreen.tsx` — replace `opacity: 0.6` with `opacityValues.muted`
- `src/features/auth/screens/RegisterScreen.tsx` — replace `opacity: 0.6` with `opacityValues.muted`
- `src/features/auth/screens/BiometricPromptScreen.tsx` — replace `opacity: 0.6` with `opacityValues.muted`
- `src/features/auth/screens/WelcomeScreen.tsx` — replace `opacity: 0.7` with `opacityValues.mutedLarge`
- `src/shared/stores/useAuthStore.ts` — export `AuthStore` type
- `src/shared/stores/useSubscriptionStore.ts` — export `SubscriptionStore` type
- `src/shared/stores/useNotificationStore.ts` — export `NotificationStore` type
- `src/features/subscriptions/components/SubscriptionCard.test.tsx` — fix 4 `any` usages with `ReactTestInstance`
- `src/features/settings/screens/MyDataScreen.test.tsx` — fix 3 `any` usages with store types
- `src/features/settings/screens/DataExportScreen.test.tsx` — fix 1 `any` usage with store type
- `supabase/migrations/20260318200000_add_notification_log_subscription_fk.sql` — new migration
- `docs/edge-function-test-strategy-decision.md` — decision document

**Out of Scope:**

- Epic 6 IAP/RevenueCat preparation tasks
- Any new feature development
- Deno test runner setup for Edge Functions
- Other non-retro-listed debt items

## Context for Development

### Codebase Patterns

- Theme is at `src/config/theme.ts`, extends `MD3LightTheme` from react-native-paper. Currently only defines `colors` under the MD3Theme shape. Opacity constants do not exist yet.
- Auth screens use `StyleSheet.create()` inline. 3 screens have `opacity: 0.6` on subtitle style, WelcomeScreen has `opacity: 0.7` on subtitle.
- Zustand stores define `interface XState`, `interface XActions`, `type XStore = XState & XActions` — but these types are NOT currently exported. Only the `useXStore` hook is exported.
- Test files mock Zustand stores with `mockUseXStore.mockImplementation((selector: (state: any) => unknown) => selector(mockState))` pattern — the `any` is on the selector state parameter.
- `SubscriptionCard.test.tsx` uses recursive tree traversal helpers typed as `(node: any)` and `(child: any)` — these should be `ReactTestInstance | null` and `ReactTestInstance | string` respectively.
- `notification_log` table: `subscription_id UUID NOT NULL` — no FK constraint to `subscriptions` table. The Edge Function queries `notification_log` joined with subscriptions via a two-step workaround.
- Migration naming convention: `YYYYMMDDHHMMSS_description.sql`. Last migration: `20260318100000_create_user_settings.sql`.

### Files to Reference

| File                                                              | Purpose                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/config/theme.ts`                                             | Add `opacityValues` export here                                                 |
| `src/features/auth/screens/LoginScreen.tsx`                       | `opacity: 0.6` in `subtitle` StyleSheet entry                                   |
| `src/features/auth/screens/RegisterScreen.tsx`                    | `opacity: 0.6` in `subtitle` StyleSheet entry                                   |
| `src/features/auth/screens/BiometricPromptScreen.tsx`             | `opacity: 0.6` in `subtitle` StyleSheet entry                                   |
| `src/features/auth/screens/WelcomeScreen.tsx`                     | `opacity: 0.7` in `subtitle` StyleSheet entry                                   |
| `src/shared/stores/useAuthStore.ts`                               | `type AuthStore = AuthState & AuthActions` at line 62 — add export              |
| `src/shared/stores/useSubscriptionStore.ts`                       | `type SubscriptionStore = SubscriptionState & SubscriptionActions` — add export |
| `src/shared/stores/useNotificationStore.ts`                       | `type NotificationStore = NotificationState & NotificationActions` — add export |
| `src/features/subscriptions/components/SubscriptionCard.test.tsx` | 4× `any` at lines 112, 122, 212, 220                                            |
| `src/features/settings/screens/MyDataScreen.test.tsx`             | 3× `any` at lines 75, 79, 83                                                    |
| `src/features/settings/screens/DataExportScreen.test.tsx`         | 1× `any` at line 70                                                             |
| `supabase/migrations/20260315100000_create_reminder_settings.sql` | Original `notification_log` table — no FK exists here                           |

### Technical Decisions

**1. Opacity in theme (DECIDED):**

- Add `export const opacityValues = { muted: 0.6, mutedLarge: 0.7 }` directly to `src/config/theme.ts` as a named export alongside `theme`.
- Auth screens import `opacityValues` and use `opacityValues.muted` (Login, Register, Biometric) and `opacityValues.mutedLarge` (Welcome).
- No MD3Theme type extension needed — this is a plain exported constant.

**2. `any` fix — Zustand mocks (DECIDED):**

- Export `AuthStore`, `SubscriptionStore`, `NotificationStore` types from their respective store files.
- Test files replace `(state: any)` with the proper store type.

**3. `any` fix — tree traversal (DECIDED):**

- Import `ReactTestInstance` from `react-test-renderer`.
- `(node: any)` → `(node: ReactTestInstance | null)`, `(child: any)` → `(child: ReactTestInstance | string)`.

**4. FK migration (DECIDED):**

- New file: `supabase/migrations/20260318200000_add_notification_log_subscription_fk.sql`
- `ON DELETE CASCADE` — orphaned log entries have no value without their subscription.

**5. Edge Function test strategy (DECIDED — MVP pragmatic):**

- Keep manual curl testing. No Deno test runner.
- Document decision with rationale and revisit trigger (Epic 7+ / post-MVP).

## Implementation Plan

### Tasks

**Group A: Theme System (must complete before auth screen edits)**

- [x] Task 1: Add `opacityValues` export to theme
  - File: `src/config/theme.ts`
  - Action: After the existing `export const theme` declaration, add:
    ```ts
    export const opacityValues = {
      muted: 0.6,
      mutedLarge: 0.7,
    } as const;
    ```

**Group B: Auth Screen Opacity (depends on Task 1)**

- [x] Task 2: Fix `LoginScreen` opacity
  - File: `src/features/auth/screens/LoginScreen.tsx`
  - Action: Add `opacityValues` to import from `@app/config/theme` (or `../../../config/theme` — check existing import path). Replace `opacity: 0.6` in `subtitle` style with `opacity: opacityValues.muted`.

- [x] Task 3: Fix `RegisterScreen` opacity
  - File: `src/features/auth/screens/RegisterScreen.tsx`
  - Action: Same import addition. Replace `opacity: 0.6` in `subtitle` style with `opacity: opacityValues.muted`.

- [x] Task 4: Fix `BiometricPromptScreen` opacity
  - File: `src/features/auth/screens/BiometricPromptScreen.tsx`
  - Action: Same import addition. Replace `opacity: 0.6` in `subtitle` style with `opacity: opacityValues.muted`.

- [x] Task 5: Fix `WelcomeScreen` opacity
  - File: `src/features/auth/screens/WelcomeScreen.tsx`
  - Action: Add `opacityValues` import. Replace `opacity: 0.7` in `subtitle` style with `opacity: opacityValues.mutedLarge`.

**Group C: Export Store Types (must complete before test file edits)**

- [x] Task 6: Export `AuthStore` type
  - File: `src/shared/stores/useAuthStore.ts`
  - Action: Change `type AuthStore = AuthState & AuthActions;` to `export type AuthStore = AuthState & AuthActions;`

- [x] Task 7: Export `SubscriptionStore` type
  - File: `src/shared/stores/useSubscriptionStore.ts`
  - Action: Change `type SubscriptionStore = SubscriptionState & SubscriptionActions;` to `export type SubscriptionStore = SubscriptionState & SubscriptionActions;`

- [x] Task 8: Export `NotificationStore` type
  - File: `src/shared/stores/useNotificationStore.ts`
  - Action: Change `type NotificationStore = NotificationState & NotificationActions;` to `export type NotificationStore = NotificationState & NotificationActions;`

**Group D: Fix `any` in Test Files (depends on Tasks 6-8)**

- [x] Task 9: Fix `any` types in `SubscriptionCard.test.tsx`
  - File: `src/features/subscriptions/components/SubscriptionCard.test.tsx`
  - Action:
    1. Add import: `import type { ReactTestInstance } from 'react-test-renderer';`
    2. Line 112: `(node: any)` → `(node: ReactTestInstance | null)`
    3. Line 122: `(child: any)` → `(child: ReactTestInstance | string)`
    4. Line 212: `(node: any)` → `(node: ReactTestInstance | null)`
    5. Line 220: `(child: any)` → `(child: ReactTestInstance | string)`
    6. Remove `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments above each fixed line.
  - Notes: `ReactTestInstance` is already a dev dependency via `react-test-renderer` — no new package needed.

- [x] Task 10: Fix `any` types in `MyDataScreen.test.tsx`
  - File: `src/features/settings/screens/MyDataScreen.test.tsx`
  - Action:
    1. Add imports: `import type { SubscriptionStore } from '@shared/stores/useSubscriptionStore';`, `import type { AuthStore } from '@shared/stores/useAuthStore';`, `import type { NotificationStore } from '@shared/stores/useNotificationStore';`
    2. Line 75: `(state: any)` → `(state: SubscriptionStore)`
    3. Line 79: `(state: any)` → `(state: AuthStore)`
    4. Line 83: `(state: any)` → `(state: NotificationStore)`
    5. Remove the 3× `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments.

- [x] Task 11: Fix `any` type in `DataExportScreen.test.tsx`
  - File: `src/features/settings/screens/DataExportScreen.test.tsx`
  - Action:
    1. Add import: `import type { SubscriptionStore } from '@shared/stores/useSubscriptionStore';`
    2. Line 70: `(state: any)` → `(state: SubscriptionStore)`
    3. Remove the `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment.

**Group E: Database Migration**

- [x] Task 12: Add FK constraint to `notification_log`
  - File: `supabase/migrations/20260318200000_add_notification_log_subscription_fk.sql` (NEW FILE)
  - Action: Create migration with content:

    ```sql
    -- Migration: Add FK constraint from notification_log.subscription_id to subscriptions.id
    -- Rationale: notification_log entries are meaningless without their parent subscription.
    -- ON DELETE CASCADE removes log entries when a subscription is deleted.

    ALTER TABLE notification_log
      ADD CONSTRAINT notification_log_subscription_id_fkey
      FOREIGN KEY (subscription_id)
      REFERENCES subscriptions(id)
      ON DELETE CASCADE;
    ```

  - Notes: `deleteSubscription` in the app already calls cascade-aware logic. The Edge Function `delete-account` explicitly deletes `notification_log` rows before account deletion, which will still work (rows already deleted by then or harmlessly no-op).

**Group F: Decision Document**

- [x] Task 13: Create Edge Function test strategy decision document
  - File: `docs/edge-function-test-strategy-decision.md` (NEW FILE)
  - Action: Create document with:
    - **Decision:** Keep manual curl testing via `supabase/dev-scripts/` for MVP
    - **Rationale:** Deno-compatible test runner setup (e.g., `deno test`) requires non-trivial CI configuration and mock Supabase client setup. For 2 Edge Functions at MVP scale, manual dev-script testing provides sufficient coverage with zero setup cost.
    - **Current coverage:** `supabase/dev-scripts/` contains 6 scripts covering: check state, prepare test data, trigger edge function, inspect results, cleanup, setup notification types.
    - **Revisit trigger:** When Edge Functions exceed 3, or when a production incident is traced to untested Edge Function logic, or at Epic 7 planning.
    - **Status:** Consciously deferred — not forgotten.

### Acceptance Criteria

- [x] AC 1: Given the theme file is loaded, when `opacityValues` is imported, then `opacityValues.muted === 0.6` and `opacityValues.mutedLarge === 0.7` are accessible as typed constants.

- [x] AC 2: Given the 4 auth screens, when TypeScript compiles, then no hardcoded numeric `opacity` values exist in `StyleSheet.create()` calls — all reference `opacityValues.muted` or `opacityValues.mutedLarge`.

- [x] AC 3: Given `AuthStore`, `SubscriptionStore`, `NotificationStore` types, when imported in test files, then TypeScript strict mode compiles without errors on the selector mock patterns.

- [x] AC 4: Given the test files, when TypeScript strict mode is run (`tsc --noEmit`), then zero `@typescript-eslint/no-explicit-any` suppressions remain in `SubscriptionCard.test.tsx`, `MyDataScreen.test.tsx`, and `DataExportScreen.test.tsx`.

- [x] AC 5: Given the new migration is applied, when `notification_log.subscription_id` references a non-existent subscription UUID, then PostgreSQL raises a FK violation error.

- [x] AC 6: Given a subscription is deleted, when `ON DELETE CASCADE` is triggered, then all `notification_log` rows with that `subscription_id` are automatically removed.

- [x] AC 7: Given the edge function decision document exists, when reviewed, then it contains: decision (keep manual), rationale, current coverage description, and revisit trigger criteria.

- [x] AC 8: Given the full test suite, when `yarn test` (or equivalent) is run after all changes, then all 534+ tests pass with zero regressions.

## Review Notes

- Adversarial review completed
- Findings: 7 total, 1 fixed, 6 skipped (noise/undecided/out-of-scope)
- Resolution approach: auto-fix
- F2 fixed: migration'a orphaned satır temizliği için pre-flight DELETE eklendi

## Additional Context

### Dependencies

- No new npm/yarn packages required.
- `react-test-renderer` types already installed as dev dependency.
- Migration requires Supabase CLI for local apply (`supabase db push` or `supabase migration up`).
- The `_bmad-output/implementation-artifacts/` directory already exists.

### Testing Strategy

- **After Tasks 1-5 (opacity):** Run `yarn test` — no visual change expected, tests should be green. Optionally open auth screens in simulator to verify no visual regression.
- **After Tasks 6-11 (TypeScript `any`):** Run `tsc --noEmit` to confirm zero type errors. Run `yarn test` to confirm all 534+ tests pass.
- **After Task 12 (migration):** Apply migration locally via `supabase db push`. Verify FK exists: `\d notification_log` in psql. Test manually: attempt INSERT with a non-existent `subscription_id` — expect FK violation. Test CASCADE: DELETE a subscription, confirm `notification_log` rows for that subscription are removed.
- **After Task 13 (decision doc):** Review document for completeness — no automated test.

### Notes

- **Risk — `ReactTestInstance` type compatibility:** `node.children` on `ReactTestInstance` returns `ReactTestInstance[] | string[] | null`. The traversal helper checks `typeof child === 'object'` before recursing, so runtime is unaffected. TypeScript may require a type guard or cast on children iteration — adjust if compiler rejects.
- **Risk — import path for store types:** Test files use `@shared/stores/...` path alias. Confirm this alias resolves correctly in test environment (it should, existing store imports already use it).
- **Risk — migration on existing data:** If local dev DB has `notification_log` rows with orphaned `subscription_id` values (from manual testing), the migration will fail. Run `DELETE FROM notification_log WHERE subscription_id NOT IN (SELECT id FROM subscriptions);` before applying if needed.
- **Future:** Once Epic 6 premium features are shipped, revisit Edge Function test automation — payment-related server logic warrants higher test coverage confidence.
