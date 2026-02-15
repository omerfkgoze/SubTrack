# Story 1.2: User Registration with Email

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new user,
I want to create an account using my email and password,
So that I can start tracking my subscriptions securely.

## Acceptance Criteria

1. **AC1 - Registration Form UI:** The registration screen displays a form with email input, password input, confirm password input, and a "Create Account" button, all using React Native Paper themed components matching SubTrack brand (primary: #6366F1).
2. **AC2 - Form Validation (Client-Side):** Form validation via `react-hook-form` + `zod` v4 enforces: valid email format, password minimum 8 characters with at least 1 uppercase, 1 lowercase, and 1 number, and confirm password must match password. Inline validation errors appear in real-time.
3. **AC3 - Supabase Auth Registration:** A new account is created via `supabase.auth.signUp()` with email and password, and the response is handled correctly (session or email confirmation required).
4. **AC4 - Supabase Client Setup:** The Supabase client is initialized in `shared/services/supabase.ts` using environment variables from `config/env.ts` with proper TypeScript typing.
5. **AC5 - Auth Store (Zustand):** A `useAuthStore` Zustand store is created in `shared/stores/useAuthStore.ts` following the architecture pattern (state + actions + error handling) with MMKV persistence for session data.
6. **AC6 - Duplicate Email Error:** When a user enters an already-registered email, a user-friendly error message is displayed: "This email is already registered."
7. **AC7 - Empty Field Validation:** Form validation prevents submission with clear error indicators when required fields are empty.
8. **AC8 - Password Requirements Display:** The password field shows clear guidance on requirements (min 8 chars, 1 uppercase, 1 lowercase, 1 number) and inline validation shows which requirements are not met.
9. **AC9 - Navigation After Registration:** Upon successful registration, the user is navigated to the main app screen (MainTabs) by updating the auth state in the AuthProvider/store.
10. **AC10 - Loading State:** A loading indicator is shown on the "Create Account" button during the registration API call, and the button is disabled to prevent duplicate submissions.
11. **AC11 - Network Error Handling:** If the registration fails due to a network error, a user-friendly message is displayed with a retry option ("No internet connection. Please try again.").
12. **AC12 - Navigation to Login:** A "Already have an account? Login" link navigates to the Login screen.

## Tasks / Subtasks

- [x] Task 1: Create Supabase client service (AC: #4)
  - [x] 1.1 Create `src/shared/services/supabase.ts` with typed Supabase client using `createClient()` from `@supabase/supabase-js`
  - [x] 1.2 Import `env.ts` for `SUPABASE_URL` and `SUPABASE_ANON_KEY`
  - [x] 1.3 Export typed client instance for use across the app
- [x] Task 2: Create auth types (AC: #4, #5)
  - [x] 2.1 Create `src/features/auth/types/index.ts` with `RegisterFormData`, `AuthError` interfaces
  - [x] 2.2 Define Zod v4 validation schemas for registration form in `src/features/auth/types/schemas.ts`
- [x] Task 3: Create auth service (AC: #3, #6, #11)
  - [x] 3.1 Create `src/features/auth/services/authService.ts` with `signUpWithEmail(email, password)` function
  - [x] 3.2 Handle Supabase auth errors and map to user-friendly messages (duplicate email, network error, etc.)
  - [x] 3.3 Return typed result with `{ user, session, error }` pattern
- [x] Task 4: Create useAuthStore Zustand store (AC: #5, #9)
  - [x] 4.1 Create `src/shared/stores/useAuthStore.ts` following the architecture Zustand pattern
  - [x] 4.2 Implement state: `user`, `session`, `isLoading`, `error`, `isAuthenticated`
  - [x] 4.3 Implement actions: `signUp`, `setSession`, `clearAuth`, `clearError`
  - [x] 4.4 Add MMKV persistence for session data using `zustand/middleware` persist
- [x] Task 5: Update AuthProvider to use Zustand store (AC: #9)
  - [x] 5.1 Update `src/app/providers/AuthProvider.tsx` to read from `useAuthStore` instead of local state
  - [x] 5.2 Add Supabase `onAuthStateChange` listener to sync auth state
  - [x] 5.3 Update `RootNavigator` to consume `isAuthenticated` from the store
- [x] Task 6: Implement RegisterScreen UI (AC: #1, #7, #8, #10, #12)
  - [x] 6.1 Replace placeholder `RegisterScreen.tsx` with full registration form
  - [x] 6.2 Use `react-hook-form` with `zodResolver` for form state and validation
  - [x] 6.3 Add email `TextInput` with email keyboard type and autoCapitalize="none"
  - [x] 6.4 Add password `TextInput` with secureTextEntry and toggle visibility icon
  - [x] 6.5 Add confirm password `TextInput` with match validation
  - [x] 6.6 Add password requirements helper text showing which rules pass/fail
  - [x] 6.7 Add "Create Account" `Button` with loading state
  - [x] 6.8 Add "Already have an account? Login" link at bottom
  - [x] 6.9 Handle keyboard avoidance with `KeyboardAvoidingView`
  - [x] 6.10 Ensure all touch targets are minimum 44x44pt
- [x] Task 7: Connect form to auth store and service (AC: #3, #6, #9, #10, #11)
  - [x] 7.1 Wire form submission to `useAuthStore.signUp()` action
  - [x] 7.2 Display inline errors from Supabase (duplicate email, network errors)
  - [x] 7.3 On success, auth state changes → navigation switches to MainTabs automatically
  - [x] 7.4 Handle loading/submitting states on the button
- [x] Task 8: Update feature exports (AC: all)
  - [x] 8.1 Update `src/features/auth/index.ts` to export RegisterScreen, auth types, and hooks
  - [x] 8.2 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`)

## Dev Notes

### Critical Technical Requirements

**Supabase Auth signUp API:**

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password-123',
});
// data.user - the created user object
// data.session - null if email confirmation required, session object if auto-login
// error.message - "User already registered" for duplicate emails
```

**IMPORTANT: Email Confirmation Behavior:**

- If Supabase project has email confirmation ENABLED: `data.session` will be `null` and user must confirm email first
- If Supabase project has email confirmation DISABLED: `data.session` will contain valid tokens and user is auto-logged in
- For MVP development, recommend DISABLING email confirmation in Supabase dashboard for faster iteration, enable it before production
- The code MUST handle both scenarios gracefully

**Zod v4 Schema (NOT v3 syntax):**

```typescript
import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least 1 number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

**CRITICAL: Zod v4 uses `z.email()` instead of `z.string().email()` for email validation.** Check the installed version and use appropriate API.

**react-hook-form + Zod v4 Integration:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../types/schemas';

const {
  control,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm({
  resolver: zodResolver(registerSchema),
  defaultValues: { email: '', password: '', confirmPassword: '' },
});
```

**Zustand Store Pattern (from Architecture):**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AppError | null;
  signUp: (email: string, password: string) => Promise<void>;
  setSession: (session: Session | null) => void;
  clearAuth: () => void;
  clearError: () => void;
}
```

**Error Mapping for User-Friendly Messages:**

```typescript
const mapAuthError = (error: AuthError): string => {
  switch (true) {
    case error.message.includes('already registered'):
      return 'This email is already registered.';
    case error.message.includes('invalid'):
      return 'Please check your email format.';
    case error.message.includes('network'):
    case error.status === 0:
      return 'No internet connection. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
};
```

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure:** All new files go under `src/features/auth/` or `src/shared/` following the established structure:

   ```
   features/auth/
   ├── components/         # Reusable auth UI (if needed)
   ├── screens/
   │   └── RegisterScreen.tsx  (replace placeholder)
   ├── hooks/
   ├── services/
   │   └── authService.ts
   ├── types/
   │   ├── index.ts
   │   └── schemas.ts
   └── index.ts
   ```

2. **Component Boundaries:**
   - RegisterScreen → uses auth service + useAuthStore
   - useAuthStore is in `shared/stores/` (cross-feature access needed)
   - Supabase client is in `shared/services/` (shared dependency)
   - Feature → Shared imports ONLY, no cross-feature imports

3. **Naming Conventions:**
   - Components: PascalCase (`RegisterScreen.tsx`)
   - Services: camelCase (`authService.ts`)
   - Hooks: camelCase with `use` prefix (`useAuthStore.ts`)
   - Types: PascalCase (`RegisterFormData`)
   - Schemas: camelCase (`registerSchema`)

4. **Import Aliases — REQUIRED:**

   ```typescript
   import { supabase } from '@shared/services/supabase';
   import { useAuthStore } from '@shared/stores/useAuthStore';
   import { theme } from '@config/theme';
   ```

5. **Error Handling Pattern:** Async actions inside Zustand store with try/catch, error state managed in store, user-friendly messages via `handleError` function.

### Library & Framework Requirements

**Exact Versions (from Story 1.1):**

| Package               | Version | Notes                                         |
| --------------------- | ------- | --------------------------------------------- |
| @supabase/supabase-js | ^2.95.3 | Latest v2, use `createClient()`               |
| react-hook-form       | ^7.71.1 | `useForm` with `Controller` for Paper inputs  |
| zod                   | ^4.3.6  | v4 API — `z.email()` not `z.string().email()` |
| @hookform/resolvers   | ^5.2.2  | Supports Zod v4                               |
| zustand               | ^5.0.11 | v5 with `persist` middleware                  |
| react-native-mmkv     | ^4.1.2  | For Zustand persistence                       |
| react-native-paper    | ^5.15.0 | TextInput, Button, HelperText, Text           |

**No new dependencies needed** — all packages were installed in Story 1.1.

### File Structure Requirements

**Files to CREATE:**

- `src/shared/services/supabase.ts` — Supabase client singleton
- `src/shared/stores/useAuthStore.ts` — Auth Zustand store
- `src/features/auth/services/authService.ts` — Auth API service
- `src/features/auth/types/index.ts` — Auth type definitions
- `src/features/auth/types/schemas.ts` — Zod validation schemas

**Files to MODIFY:**

- `src/features/auth/screens/RegisterScreen.tsx` — Replace placeholder with full form
- `src/app/providers/AuthProvider.tsx` — Integrate with Zustand store + Supabase listener
- `src/app/navigation/index.tsx` — Use `useAuthStore.isAuthenticated` instead of Context
- `src/features/auth/index.ts` — Update exports

**Files NOT to touch:**

- `src/app/navigation/AuthStack.tsx` — Already correct
- `src/app/navigation/types.ts` — Already correct
- `src/config/env.ts` — Already correct
- `src/config/theme.ts` — Already correct

### Testing Requirements

- Verify TypeScript compiles with zero errors: `npx tsc --noEmit`
- Verify ESLint passes: `npx eslint src/`
- **Manual smoke test:**
  1. App launches → shows Welcome screen
  2. Tap "Register" → shows registration form
  3. Submit empty form → validation errors appear
  4. Enter invalid email → inline error
  5. Enter weak password → requirement indicators show which rules fail
  6. Enter valid data → loading state on button → success → navigates to MainTabs
  7. Try duplicate email → "This email is already registered" error
- Co-located test files to be added: `RegisterScreen.test.tsx` (optional for MVP, recommended)

### Previous Story Intelligence (Story 1.1)

**Key Learnings from Story 1.1:**

- Expo SDK 54 with New Architecture enabled by default
- `react-native-reanimated` v4 requires `react-native-worklets` peer dep (already installed)
- ESLint 9 flat config (`eslint.config.js`), NOT `.eslintrc.js`
- `env.ts` was removed from `config/index.ts` barrel export to prevent crash when env vars not set — import `env` directly from `@config/env`
- React Navigation v7 (NOT v6) — dynamic API used for auth state management
- Provider hierarchy: SafeAreaProvider → GestureHandler → QueryProvider → ThemeProvider → AuthProvider → Navigation
- TypeScript strict mode enabled
- All placeholder screens exist and are functional

**Files Created in Story 1.1 That This Story Depends On:**

- `src/app/providers/AuthProvider.tsx` — Currently uses Context, needs upgrade to Zustand
- `src/app/navigation/index.tsx` — Takes `isAuthenticated` prop
- `src/features/auth/screens/RegisterScreen.tsx` — Placeholder to replace
- `src/config/env.ts` — Has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- `babel.config.js` — Has module-resolver configured for aliases

**Debug Log from Story 1.1:**

- TypeScript compilation failed initially due to react-native-paper source files — fixed by excluding `node_modules` in tsconfig
- ESLint 9 requires flat config format

### Git Intelligence

**Recent Commits (6 total):**

```
4836b4d keep docs file in history
26b1558 review 1-1 story status done
6b04f65 add script expo start with clearing cache
60842cd fix duplicate plugin issue and install babel
c4c5448 ready for review epic-1
4bf5b99 Initial commit: BMAD planning artifacts and project setup
```

**Patterns Established:**

- Commit messages are concise and descriptive
- Story review process includes code-review and status update
- Babel plugin order matters (worklets before reanimated)
- Cache clearing script added for development convenience

### Latest Technology Information (February 2026)

**Supabase Auth `signUp` API (verified):**

- `supabase.auth.signUp({ email, password })` — standard email/password signup
- Returns `{ data: { user, session }, error }`
- `error.message` = "User already registered" for duplicate emails
- `data.session` = null if email confirmation is required
- Supports `options.data` for custom user metadata

**Zod v4 Important Notes:**

- `z.email()` is a standalone validator in Zod v4 (verify actual API — may still be `z.string().email()` depending on exact version)
- `.refine()` works the same for cross-field validation
- `@hookform/resolvers` ^5.x is required for Zod v4 compatibility

### Project Context

- **Project:** SubTrack — Cross-platform subscription tracking mobile app
- **Domain:** Fintech-Lite, targeting European market (GDPR/PSD2 compliant)
- **Team:** Solo developer
- **Tech Stack:** Expo SDK 54 (React Native 0.81) + Supabase + TypeScript
- **Business Model:** Freemium (5 free subs → €2.99/month or €24.99/year premium)
- **This Story:** Epic 1 Story 2 — First user-facing feature, creates the registration flow
- **Dependencies:** Story 1.1 (done) — project foundation
- **Blocks:** Story 1.3 (Login), Story 1.4 (Biometric), Story 1.6 (Session Management)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: User Registration with Email]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/prd.md#User Management - FR1]
- [Source: _bmad-output/planning-artifacts/prd.md#Security - NFR7-NFR16]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: First-Time User Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation]
- [Source: _bmad-output/implementation-artifacts/1-1-project-initialization-core-infrastructure.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- MMKV v4 API change: `MMKV` is a type-only export. Use `createMMKV()` function instead of `new MMKV()`. Method `delete()` renamed to `remove()`.
- ESLint caught unused `err` variable in catch block — fixed with bare `catch {}`.

### Senior Developer Review (AI)

**Reviewer:** GOZE | **Date:** 2026-02-15 | **Model:** Claude Opus 4.6

**Issues Found:** 3 High, 4 Medium, 3 Low (10 total)

**Fixed (7):**
- [H1] Email confirmation scenario: Added `needsEmailConfirmation` state to store + confirmation UI in RegisterScreen
- [H2] Error type mismatch: Changed `error: string | null` → `error: AuthError | null` in useAuthStore, matching architecture pattern
- [H3] Story File List: Documented all 5 undocumented file changes (app.json, package.json, types.ts, MainTabs.tsx, QueryProvider.tsx)
- [M1] Retry option: Button text changes to "Try Again" on network errors
- [M2] Email trimming: Added `.trim()` to email before submission
- [M3] Hardcoded color: Replaced `#10B981` with `theme.colors.tertiary` via `useTheme()` hook

**Remaining (3 Low - acceptable for MVP):**
- [L1] Password toggle icons missing `accessibilityLabel` — FIXED as bonus
- [L2] No `testID` props on components (E2E testing convenience)
- [L3] Formatting-only changes mixed with story commits

**Build Verification:** TypeScript `--noEmit` PASS, ESLint PASS

### Completion Notes List

- Task 1: Created Supabase client with MMKV storage adapter for React Native compatibility (`createMMKV` API for v4).
- Task 2: Auth types (`RegisterFormData`, `AuthError`, `AuthResult`) and Zod v4 schema with `z.email()` and `.refine()` for password confirmation.
- Task 3: Auth service with `signUpWithEmail()` and user-friendly error mapping (duplicate email, network error, generic fallback).
- Task 4: Zustand v5 store with `persist` middleware and MMKV storage. State: `user`, `session`, `isAuthenticated`, `isLoading`, `error`. Actions: `signUp`, `setSession`, `setUser`, `clearAuth`, `clearError`.
- Task 5: AuthProvider refactored from Context to Zustand + Supabase `onAuthStateChange` listener. RootNavigator reads `isAuthenticated` directly from store. App.tsx simplified.
- Task 6: Full RegisterScreen with react-hook-form + zodResolver, email/password/confirmPassword fields, password visibility toggle, live password requirements indicator, loading state on button, "Already have an account? Login" link, KeyboardAvoidingView, 44pt min touch targets.
- Task 7: Form wired to `useAuthStore.signUp()`, auth errors displayed inline, navigation auto-switches on `isAuthenticated` change, loading state handled.
- Task 8: Feature exports updated in `src/features/auth/index.ts`. All imports verified with path aliases.

### Change Log

- 2026-02-15: Story 1.2 implementation complete — all 8 tasks and 30 subtasks done.
- 2026-02-15: Code review fixes — email confirmation handling, error type alignment with architecture, email trimming, theme color compliance, retry UX for network errors, accessibility labels.

### File List

**Created:**
- `src/shared/services/supabase.ts`
- `src/shared/stores/useAuthStore.ts`
- `src/features/auth/services/authService.ts`
- `src/features/auth/types/index.ts`
- `src/features/auth/types/schemas.ts`

**Modified:**
- `src/features/auth/screens/RegisterScreen.tsx`
- `src/app/providers/AuthProvider.tsx`
- `src/app/navigation/index.tsx`
- `src/app/App.tsx`
- `src/features/auth/index.ts`

**Modified (out-of-scope / formatting only — not part of story tasks):**
- `app.json` — Added iOS bundleIdentifier and Android package (EAS Build requirement)
- `package.json` — Changed `expo start --android/ios` to `expo run:android/ios`
- `src/app/navigation/types.ts` — Formatting only (auto-formatter)
- `src/app/navigation/MainTabs.tsx` — Formatting only (auto-formatter)
- `src/app/providers/QueryProvider.tsx` — Formatting only (auto-formatter)
