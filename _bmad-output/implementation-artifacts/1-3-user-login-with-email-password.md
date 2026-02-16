# Story 1.3: User Login with Email & Password

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a returning user,
I want to log in with my email and password,
So that I can access my subscription data.

## Acceptance Criteria

1. **AC1 - Login Form UI:** The login screen displays a form with email input, password input (with visibility toggle), and a "Login" button, all using React Native Paper themed components matching SubTrack brand (primary: #6366F1). The layout mirrors the RegisterScreen's visual structure for consistency.
2. **AC2 - Form Validation (Client-Side):** Form validation via `react-hook-form` + `zod` v4 enforces: valid email format and non-empty password. Inline validation errors appear before submission.
3. **AC3 - Supabase Auth Login:** The user is authenticated via `supabase.auth.signInWithPassword()` with email and password. JWT tokens (1h access / 7d refresh) are obtained and stored via the existing `useAuthStore` + MMKV persistence.
4. **AC4 - Successful Login Navigation:** Upon successful authentication, the auth state updates in `useAuthStore` (`isAuthenticated: true`), and the `RootNavigator` automatically switches from AuthStack to MainTabs.
5. **AC5 - Invalid Credentials Error:** When the user enters incorrect email or password, a generic error message is displayed: "Invalid email or password." No information is leaked about which field is wrong.
6. **AC6 - Account Lockout (5 Failed Attempts):** After 5 consecutive failed login attempts, the account is temporarily locked for 15 minutes (NFR11). The user is informed: "Too many failed attempts. Please try again in 15 minutes." This is enforced by Supabase Auth rate limiting.
7. **AC7 - Auto-Login (Persisted Session):** When the user opens the app with a valid persisted session (JWT not expired), they are automatically logged in without entering credentials. The `useAuthStore` MMKV persistence handles this via the existing `AuthProvider` + `onAuthStateChange` listener.
8. **AC8 - Loading State:** A loading indicator is shown on the "Login" button during the authentication API call, and the button is disabled to prevent duplicate submissions.
9. **AC9 - Network Error Handling:** If the login fails due to a network error, a user-friendly message is displayed: "No internet connection. Please try again." The button text changes to "Try Again" on network errors.
10. **AC10 - Navigation Links:** A "Don't have an account? Register" link navigates to the Register screen. A "Forgot Password?" link is visible (navigates to a placeholder or shows a message — full implementation in Story 1.5).
11. **AC11 - Keyboard Handling:** The form uses `KeyboardAvoidingView` for iOS and proper keyboard handling, with `keyboardShouldPersistTaps="handled"` on the ScrollView.
12. **AC12 - Accessibility:** All interactive elements have minimum 44x44pt touch targets. Password toggle has `accessibilityLabel`. Form inputs have proper labels.

## Tasks / Subtasks

- [x] Task 1: Add login Zod schema and types (AC: #2)
  - [x] 1.1 Add `loginSchema` to `src/features/auth/types/schemas.ts` with email (z.email) and password (z.string().min(1)) validation
  - [x] 1.2 Add `LoginFormData` type to `src/features/auth/types/index.ts`
- [x] Task 2: Add signIn service function (AC: #3, #5, #6, #9)
  - [x] 2.1 Add `signInWithEmail(email, password)` function to `src/features/auth/services/authService.ts`
  - [x] 2.2 Use `supabase.auth.signInWithPassword({ email, password })` for authentication
  - [x] 2.3 Map Supabase auth errors to user-friendly messages: "Invalid login credentials" → "Invalid email or password.", rate limit → "Too many failed attempts. Please try again in 15 minutes.", network error → "No internet connection. Please try again."
  - [x] 2.4 Return typed `AuthResult` with `{ user, session, error }` pattern (reuse existing interface)
- [x] Task 3: Add signIn action to useAuthStore (AC: #3, #4, #7)
  - [x] 3.1 Add `signIn: (email: string, password: string) => Promise<void>` action to `src/shared/stores/useAuthStore.ts`
  - [x] 3.2 Follow the exact same pattern as existing `signUp` action: set loading → call service → handle error/success → update state
  - [x] 3.3 On success: set `user`, `session`, `isAuthenticated: true`, `isLoading: false`
  - [x] 3.4 On error: set `error` with mapped message, `isLoading: false`
- [x] Task 4: Implement LoginScreen UI (AC: #1, #2, #8, #10, #11, #12)
  - [x] 4.1 Replace placeholder `LoginScreen.tsx` with full login form matching RegisterScreen visual structure
  - [x] 4.2 Use `react-hook-form` with `zodResolver(loginSchema)` for form state and validation
  - [x] 4.3 Add email `TextInput` with `mode="outlined"`, `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`
  - [x] 4.4 Add password `TextInput` with `secureTextEntry` and visibility toggle icon with `accessibilityLabel`
  - [x] 4.5 Add "Login" `Button` with loading state (`loading={isLoading}`, `disabled={isLoading}`)
  - [x] 4.6 Add "Don't have an account? Register" link navigating to Register screen
  - [x] 4.7 Add "Forgot Password?" link (navigates to Welcome or shows info toast — placeholder for Story 1.5)
  - [x] 4.8 Wrap in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` and `ScrollView` with `keyboardShouldPersistTaps="handled"`
  - [x] 4.9 Ensure all touch targets are minimum 44x44pt (`minHeight: 44` / `minHeight: 48` for primary button)
- [x] Task 5: Connect LoginScreen to auth store (AC: #3, #4, #5, #6, #8, #9)
  - [x] 5.1 Wire form submission to `useAuthStore.signIn()` action with `email.trim()` before passing
  - [x] 5.2 Display auth errors from store using `HelperText` component (same pattern as RegisterScreen)
  - [x] 5.3 Show "Try Again" button text on network errors (same pattern as RegisterScreen)
  - [x] 5.4 On success, auth state changes → navigation switches to MainTabs automatically (no manual navigation needed)
  - [x] 5.5 Call `clearError()` before each submission attempt
- [x] Task 6: Update feature exports (AC: all)
  - [x] 6.1 Update `src/features/auth/index.ts` to export `LoginScreen`, `loginSchema`, `LoginFormData`, `signInWithEmail`
  - [x] 6.2 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`)

## Dev Notes

### Critical Technical Requirements

**Supabase Auth signInWithPassword API:**

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password-123',
});
// data.user - the authenticated user object
// data.session - contains access_token (1h) and refresh_token (7d)
// error.message - "Invalid login credentials" for wrong email/password
```

**IMPORTANT: Supabase Auth Error Messages for Login:**

- Wrong email or password: `"Invalid login credentials"` — map to "Invalid email or password."
- Rate limited (too many attempts): `"Request rate limit reached"` or similar — map to "Too many failed attempts. Please try again in 15 minutes."
- Email not confirmed: `"Email not confirmed"` — map to "Please confirm your email before logging in."
- Network errors: `error.status === 0` or fetch errors — map to "No internet connection. Please try again."
- **CRITICAL: Supabase does NOT reveal whether the email exists or not** — this is secure by default for login. However, the error mapping should still be generic.

**IMPORTANT: Account Lockout (NFR11):**

- Supabase Auth has built-in rate limiting. By default, it limits to ~10 requests per second per IP and per user.
- For the 5-attempt lockout (NFR11), this may need to be configured in Supabase Dashboard > Auth > Rate Limits, or handled via a custom Edge Function in a future story.
- For MVP, rely on Supabase's built-in rate limiting and display the rate limit error message when it occurs.
- DO NOT implement client-side attempt counting — this is insecure and easily bypassed.

**Login Zod Schema (simpler than register — no confirm password):**

```typescript
export const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

**react-hook-form Integration (same pattern as RegisterScreen):**

```typescript
const {
  control,
  handleSubmit,
  formState: { errors },
} = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});
```

**Auth Store signIn Action Pattern (mirror signUp):**

```typescript
signIn: async (email: string, password: string) => {
  set({ isLoading: true, error: null });

  const result = await signInWithEmail(email, password);

  if (result.error) {
    set({ isLoading: false, error: result.error });
    return;
  }

  set({
    user: result.user,
    session: result.session,
    isAuthenticated: result.session !== null,
    isLoading: false,
    error: null,
  });
},
```

**CRITICAL: Auto-Login Flow (Already Implemented):**

- `AuthProvider.tsx` already has `onAuthStateChange` listener
- `useAuthStore` already persists `user`, `session`, `isAuthenticated` to MMKV
- When app starts, if MMKV has a valid session, `isAuthenticated` is `true` from persist
- Supabase's `onAuthStateChange` fires with the restored session, confirming it
- If the persisted JWT is expired, Supabase automatically tries to refresh using the refresh token
- If refresh fails (refresh token expired after 7 days), `onAuthStateChange` fires with `null` session → user is redirected to login
- **NO additional code needed for auto-login** — the existing infrastructure handles it

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure:** All new/modified files stay within `src/features/auth/` or `src/shared/` following the established structure from Story 1.2:

   ```
   features/auth/
   ├── components/         # (not needed for this story)
   ├── screens/
   │   └── LoginScreen.tsx  (replace placeholder)
   ├── hooks/              # (not needed for this story)
   ├── services/
   │   └── authService.ts  (add signInWithEmail)
   ├── types/
   │   ├── index.ts        (add LoginFormData)
   │   └── schemas.ts      (add loginSchema)
   └── index.ts            (update exports)
   ```

2. **Component Boundaries:**
   - LoginScreen → uses auth service + useAuthStore (same as RegisterScreen)
   - useAuthStore is in `shared/stores/` (already exists, just add signIn action)
   - Supabase client is in `shared/services/` (already exists, no changes)
   - Feature → Shared imports ONLY, no cross-feature imports

3. **Naming Conventions:**
   - Components: PascalCase (`LoginScreen.tsx`)
   - Services: camelCase (`signInWithEmail`)
   - Hooks: camelCase with `use` prefix
   - Types: PascalCase (`LoginFormData`)
   - Schemas: camelCase (`loginSchema`)

4. **Import Aliases — REQUIRED:**

   ```typescript
   import { supabase } from '@shared/services/supabase';
   import { useAuthStore } from '@shared/stores/useAuthStore';
   import type { AuthStackParamList } from '@app/navigation/types';
   ```

5. **Error Handling Pattern:** Async actions inside Zustand store with try/catch, error state managed in store, user-friendly messages via error mapping function in authService.

### Library & Framework Requirements

**Exact Versions (from Story 1.1, verified in Story 1.2):**

| Package               | Version | Notes                                         |
| --------------------- | ------- | --------------------------------------------- |
| @supabase/supabase-js | ^2.95.3 | `signInWithPassword()` for email login        |
| react-hook-form       | ^7.71.1 | `useForm` with `Controller` for Paper inputs  |
| zod                   | ^4.3.6  | v4 API — `z.email()` not `z.string().email()` |
| @hookform/resolvers   | ^5.2.2  | Supports Zod v4                               |
| zustand               | ^5.0.11 | v5 with `persist` middleware                  |
| react-native-mmkv     | ^4.1.2  | `createMMKV()` API (NOT `new MMKV()`)         |
| react-native-paper    | ^5.15.0 | TextInput, Button, HelperText, Text           |

**No new dependencies needed** — all packages were installed in Story 1.1 and verified in Story 1.2.

### File Structure Requirements

**Files to MODIFY (no new files needed):**

- `src/features/auth/screens/LoginScreen.tsx` — Replace placeholder with full login form
- `src/features/auth/services/authService.ts` — Add `signInWithEmail()` function
- `src/features/auth/types/schemas.ts` — Add `loginSchema`
- `src/features/auth/types/index.ts` — Add `LoginFormData` type
- `src/shared/stores/useAuthStore.ts` — Add `signIn` action
- `src/features/auth/index.ts` — Update exports

**Files NOT to touch:**

- `src/shared/services/supabase.ts` — Already correct
- `src/app/providers/AuthProvider.tsx` — Already has onAuthStateChange listener
- `src/app/navigation/index.tsx` — Already reads isAuthenticated from store
- `src/app/navigation/AuthStack.tsx` — Already has Login screen registered
- `src/app/navigation/types.ts` — Already has Login in AuthStackParamList
- `src/config/env.ts` — Already correct
- `src/config/theme.ts` — Already correct
- `src/features/auth/screens/RegisterScreen.tsx` — Do NOT modify

### Testing Requirements

- Verify TypeScript compiles with zero errors: `npx tsc --noEmit`
- Verify ESLint passes: `npx eslint src/`
- **Manual smoke test:**
  1. App launches → shows Welcome screen
  2. Tap "Login" → shows login form with email and password fields
  3. Submit empty form → validation errors appear ("Please enter a valid email", "Password is required")
  4. Enter invalid email → inline error
  5. Enter wrong credentials → "Invalid email or password" error displayed
  6. Enter valid credentials → loading state on button → success → navigates to MainTabs
  7. Close app and reopen → auto-login (directly to MainTabs, no login form)
  8. Test "Don't have an account? Register" link → navigates to Register screen
  9. Test "Forgot Password?" link → placeholder behavior (info message or navigation)
  10. Network disconnected → login attempt → "No internet connection. Please try again." with "Try Again" button text

### Previous Story Intelligence (Story 1.2)

**Key Learnings from Story 1.2 (CRITICAL — Apply to this story):**

- **MMKV v4 API:** Use `createMMKV()` function, NOT `new MMKV()`. Method `delete()` renamed to `remove()`. Already correct in useAuthStore.
- **Zod v4 API:** `z.email()` is used directly (NOT `z.string().email()`). Already established in registerSchema.
- **ESLint:** Flat config format (eslint.config.js). Unused variables in catch blocks → use bare `catch {}`.
- **React Navigation v7:** Dynamic API for auth state. Navigation works by checking `isAuthenticated` in RootNavigator — no manual navigation on login success.
- **Email trimming:** Always `.trim()` email before passing to Supabase auth.
- **Error type:** `AuthError` has `message: string` and optional `code?: string`. Store uses `error: AuthError | null`.
- **Theme compliance:** Use `theme.colors.tertiary` via `useTheme()` hook, not hardcoded hex values for success colors.
- **Password toggle:** Include `accessibilityLabel` on TextInput.Icon for password visibility toggle.
- **Button content height:** Primary buttons use `minHeight: 48`, text links use `minHeight: 44`.
- **Code review fixes applied in 1.2:** Email confirmation handling, error type alignment, email trimming, theme color compliance, retry UX for network errors, accessibility labels.
- **Provider hierarchy:** SafeAreaProvider → GestureHandler → QueryProvider → ThemeProvider → AuthProvider → Navigation (do NOT change).

**Patterns to Reuse Directly from RegisterScreen.tsx:**

- `KeyboardAvoidingView` + `ScrollView` wrapper pattern
- `Controller` + `TextInput` + `HelperText` pattern for each form field
- Password visibility toggle with `TextInput.Icon` and `accessibilityLabel`
- Auth error display using `HelperText type="error"`
- Loading state on button (`loading={isLoading}`, `disabled={isLoading}`)
- Network error detection and "Try Again" button text
- `clearError()` before submission
- Style structure (flex, container, title, subtitle, input, button, etc.)

### Git Intelligence

**Recent Commits (last 3):**

```
5504144 story 1.2 done
6dcaf58 1.2 ready for review
bd7ef41 created story 1-2
```

**Files Modified in Story 1.2 (relevant context):**

- `src/features/auth/screens/RegisterScreen.tsx` — Full registration form (reference for LoginScreen)
- `src/features/auth/services/authService.ts` — Has `signUpWithEmail()` and `mapAuthError()` (extend with signIn)
- `src/shared/stores/useAuthStore.ts` — Has `signUp` action (add `signIn` with same pattern)
- `src/features/auth/types/schemas.ts` — Has `registerSchema` (add `loginSchema`)
- `src/features/auth/types/index.ts` — Has `RegisterFormData` (add `LoginFormData`)
- `src/app/providers/AuthProvider.tsx` — Refactored to use Zustand + onAuthStateChange
- `src/app/navigation/index.tsx` — Uses `isAuthenticated` from store

**Code Patterns Established:**
- Commit messages are concise and descriptive
- Forms use react-hook-form + zod + Controller pattern
- Auth errors are mapped in authService, stored in Zustand, displayed in screen
- Navigation is state-driven (not imperative)

### Project Context

- **Project:** SubTrack — Cross-platform subscription tracking mobile app
- **Domain:** Fintech-Lite, targeting European market (GDPR/PSD2 compliant)
- **Team:** Solo developer
- **Tech Stack:** Expo SDK 54 (React Native 0.81) + Supabase + TypeScript
- **Business Model:** Freemium (5 free subs → €2.99/month or €24.99/year premium)
- **This Story:** Epic 1 Story 3 — Login functionality, enables returning users to access their data
- **Dependencies:** Story 1.1 (done) — project foundation, Story 1.2 (done) — registration and auth infrastructure
- **Blocks:** Story 1.4 (Biometric Auth), Story 1.5 (Password Reset), Story 1.6 (Session Management)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: User Login with Email & Password]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/prd.md#User Management - FR2]
- [Source: _bmad-output/planning-artifacts/prd.md#Security - NFR10, NFR11, NFR13]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#App Access < 2 seconds]
- [Source: _bmad-output/implementation-artifacts/1-2-user-registration-with-email.md]

## Change Log

- 2026-02-16: Implemented login functionality — login schema, signIn service with error mapping, signIn store action, full LoginScreen UI with form validation, and updated feature exports.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. TypeScript and ESLint passed on first attempt.

### Completion Notes List

- Task 1: Added `loginSchema` (z.email + z.string().min(1)) and `LoginFormData` type to auth types.
- Task 2: Added `signInWithEmail()` to authService.ts using `supabase.auth.signInWithPassword()`. Extended `mapAuthError()` with login-specific error mappings: invalid credentials, email not confirmed, rate limiting, and network errors.
- Task 3: Added `signIn` action to useAuthStore mirroring the `signUp` pattern — set loading, call service, handle error/success, update auth state.
- Task 4: Replaced placeholder LoginScreen with full login form matching RegisterScreen visual structure. Includes email input, password input with visibility toggle (with accessibilityLabel), Login button with loading state, "Forgot Password?" link (placeholder navigating to Welcome), "Don't have an account? Register" link, KeyboardAvoidingView + ScrollView with keyboardShouldPersistTaps="handled", and 44/48pt minimum touch targets.
- Task 5: Connected LoginScreen to auth store — form submission wired to signIn with email.trim(), auth errors displayed via HelperText, "Try Again" button text on network errors, clearError() called before each submission, navigation handled automatically via isAuthenticated state.
- Task 6: Updated feature exports — LoginScreen, signInWithEmail, LoginFormData, loginSchema all exported from auth index. All imports verified to use path aliases.
- Auto-login (AC7) requires no additional code — existing AuthProvider + MMKV persistence + onAuthStateChange handles it.

### File List

- `src/features/auth/types/schemas.ts` — Modified: Added loginSchema and LoginSchemaType
- `src/features/auth/types/index.ts` — Modified: Added LoginFormData interface
- `src/features/auth/services/authService.ts` — Modified: Added signInWithEmail() function and extended mapAuthError() with login-specific error mappings
- `src/shared/stores/useAuthStore.ts` — Modified: Added signIn action and signInWithEmail import
- `src/features/auth/screens/LoginScreen.tsx` — Modified: Replaced placeholder with full login form
- `src/features/auth/index.ts` — Modified: Added LoginScreen, signInWithEmail, LoginFormData, loginSchema exports
