# Story 1.5: Password Reset via Email

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who forgot their password,
I want to reset my password via email,
so that I can regain access to my account.

## Acceptance Criteria

1. **AC1 - Request Password Reset:** Given the user is on the login screen, when they tap "Forgot Password?" and enter their registered email on the ForgotPasswordScreen, then a password reset email is sent via `supabase.auth.resetPasswordForEmail(email, { redirectTo })`, and a confirmation message is displayed: "Check your email for reset instructions." The user sees a "Back to Login" button to return to the Login screen.

2. **AC2 - No Email Enumeration:** Given the user enters an email that does not exist in the system, when they request a password reset, then the same confirmation message is displayed ("Check your email for reset instructions") — no indication is given whether the email exists or not (security best practice, prevents email enumeration attacks).

3. **AC3 - Deep Link Handling:** Given the user receives the password reset email and taps the reset link, when Supabase Auth validates the recovery token and redirects to the app via deep link (`subtrack://reset-password`), then the app opens, extracts the session tokens from the URL, establishes a recovery session via `supabase.auth.setSession()`, and navigates the user to the ResetPasswordScreen.

4. **AC4 - Set New Password:** Given the user is on the ResetPasswordScreen with a valid recovery session, when they enter a new password (meeting the same validation rules as registration: min 8 chars, 1 uppercase, 1 lowercase, 1 number) and confirm it, then `supabase.auth.updateUser({ password: newPassword })` is called, the password is updated successfully, a success message is shown ("Password updated successfully!"), and the user is redirected to the Login screen to log in with their new password.

5. **AC5 - Invalid/Expired Reset Link:** Given the user taps a password reset link that has expired or is invalid, when the app receives the deep link but session establishment fails, then the user sees an error message: "This reset link has expired or is invalid. Please request a new one." with a button to navigate to the ForgotPasswordScreen to request a new reset email.

6. **AC6 - Form Validation:** Given the user is entering a new password on ResetPasswordScreen, when the password does not meet the minimum requirements (8+ chars, 1 uppercase, 1 lowercase, 1 number), then real-time validation feedback is shown (same PasswordRequirements component from RegisterScreen), and the submit button remains disabled until all requirements are met. The confirm password field must match the password field.

7. **AC7 - Accessibility:** All interactive elements have `accessibilityLabel` and appropriate `accessibilityRole`. Touch targets are minimum 44x44pt. Form inputs have clear labels. Error messages are announced to screen readers.

## Tasks / Subtasks

- [x] Task 1: Configure Deep Linking for Expo (AC: #3, #5)
  - [x] 1.1 Add `"scheme": "subtrack"` to `app.json` under the `expo` key
  - [x] 1.2 Install `expo-linking` via `npx expo install expo-linking`
  - [x] 1.3 Add Supabase redirect URL configuration: In Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, add `subtrack://reset-password` (document this as a manual setup step in Dev Notes)
  - [x] 1.4 Create `src/shared/services/deepLinking.ts` utility with:
    - `getResetPasswordRedirectUrl()` function that returns the deep link URL for password reset (`subtrack://reset-password`)
    - `parseSupabaseDeepLink(url: string): DeepLinkResult` function that extracts tokens and type from incoming Supabase redirect URLs
  - [x] 1.5 Update `src/app/navigation/index.tsx` (RootNavigator) to handle incoming deep links:
    - Import `Linking` from `expo-linking`
    - Add `useEffect` that listens for incoming URLs via `Linking.addEventListener('url', handler)`
    - Also check initial URL on mount via `Linking.getInitialURL()`
    - When a `subtrack://reset-password` URL is received with token params, parse tokens and attempt session establishment
    - On `PASSWORD_RECOVERY` event from `onAuthStateChange`, set a `pendingPasswordReset: boolean` state to trigger navigation to ResetPasswordScreen

- [x] Task 2: Add Password Reset Service Methods (AC: #1, #2, #4, #5)
  - [x] 2.1 Add `requestPasswordReset(email: string): Promise<AuthResult>` to `src/features/auth/services/authService.ts`:
    - Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: getResetPasswordRedirectUrl() })`
    - Returns `{ user: null, session: null, error: null }` on success (always succeeds regardless of email existence — Supabase does not reveal if email exists)
    - Maps errors using existing `mapAuthError()` pattern for network/rate-limit errors
  - [x] 2.2 Add `updatePassword(newPassword: string): Promise<AuthResult>` to `src/features/auth/services/authService.ts`:
    - Calls `supabase.auth.updateUser({ password: newPassword })`
    - Returns `{ user, session: null, error: null }` on success
    - Maps errors for invalid password, session expired, etc.
  - [x] 2.3 Add `setSessionFromTokens(accessToken: string, refreshToken: string): Promise<AuthResult>` to `src/features/auth/services/authService.ts`:
    - Calls `supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })`
    - Used for establishing session from deep link tokens during password recovery
    - Returns `{ user, session, error }` result

- [x] Task 3: Add Password Reset Types (AC: all)
  - [x] 3.1 Add `ResetPasswordFormData` type to `src/features/auth/types/index.ts`: `{ password: string; confirmPassword: string }`
  - [x] 3.2 Add `ForgotPasswordFormData` type to `src/features/auth/types/index.ts`: `{ email: string }`
  - [x] 3.3 Add `DeepLinkResult` type to `src/shared/types/` or `src/features/auth/types/index.ts`: `{ type: 'recovery' | 'unknown'; accessToken?: string; refreshToken?: string }`
  - [x] 3.4 Add Zod schemas to `src/features/auth/types/schemas.ts`:
    - `forgotPasswordSchema`: `{ email: z.email() }` (same email validation as login)
    - `resetPasswordSchema`: `{ password: <same rules as registerSchema>, confirmPassword: <must match password> }` — reuse the password validation logic from `registerSchema`

- [x] Task 4: Extend useAuthStore with Password Reset State (AC: #1, #4, #5)
  - [x] 4.1 Add state fields to `src/shared/stores/useAuthStore.ts`:
    - `isResetEmailSent: boolean` (tracks if the reset email was sent successfully)
    - `pendingPasswordReset: boolean` (set to true when a PASSWORD_RECOVERY deep link is received, triggers navigation)
  - [x] 4.2 Add `requestPasswordReset(email: string): Promise<void>` action:
    - `set({ isLoading: true, error: null, isResetEmailSent: false })`
    - Calls `authService.requestPasswordReset(email)`
    - On success: `set({ isLoading: false, isResetEmailSent: true })`
    - On error: `set({ isLoading: false, error })` (only for network/rate-limit errors)
  - [x] 4.3 Add `updatePassword(newPassword: string): Promise<boolean>` action:
    - `set({ isLoading: true, error: null })`
    - Calls `authService.updatePassword(newPassword)`
    - On success: `set({ isLoading: false, pendingPasswordReset: false })`, return `true`
    - On error: `set({ isLoading: false, error })`, return `false`
  - [x] 4.4 Add `setPendingPasswordReset(pending: boolean): void` action — simple setter for navigation trigger
  - [x] 4.5 Add `clearResetState(): void` action — resets `isResetEmailSent: false`, `pendingPasswordReset: false`, `error: null`
  - [x] 4.6 Do NOT persist `isResetEmailSent` or `pendingPasswordReset` — these are transient UI states (add to exclusion in `partialize`)

- [x] Task 5: Create ForgotPasswordScreen (AC: #1, #2, #7)
  - [x] 5.1 Create `src/features/auth/screens/ForgotPasswordScreen.tsx`
  - [x] 5.2 UI Layout:
    - Screen title: "Reset Password"
    - Descriptive text: "Enter your email address and we'll send you a link to reset your password."
    - Email input (TextInput from react-native-paper) with email keyboard type
    - "Send Reset Link" button (Button from react-native-paper) — disabled when email is empty or invalid, shows loading state
    - "Back to Login" text button below
  - [x] 5.3 Use `react-hook-form` + Zod (`forgotPasswordSchema`) for email validation
  - [x] 5.4 On submit: call `requestPasswordReset(email.trim().toLowerCase())` from useAuthStore
  - [x] 5.5 After successful submission (`isResetEmailSent === true`): show a confirmation view (same screen, different state):
    - Icon: email/checkmark icon
    - Title: "Check Your Email"
    - Text: "We've sent password reset instructions to {email}. If you don't see it, check your spam folder."
    - "Back to Login" button
    - "Didn't receive it? Send again" text button (with 60-second cooldown timer to prevent spam)
  - [x] 5.6 Error display: show Supabase errors (rate limit, network error) via HelperText below the form
  - [x] 5.7 Accessibility: all inputs have accessibilityLabel, button has accessibilityRole, min 44x44pt touch targets
  - [x] 5.8 Use theme colors via `useTheme()` — no hardcoded hex values

- [x] Task 6: Create ResetPasswordScreen (AC: #4, #5, #6, #7)
  - [x] 6.1 Create `src/features/auth/screens/ResetPasswordScreen.tsx`
  - [x] 6.2 UI Layout:
    - Screen title: "Create New Password"
    - New password input with show/hide toggle
    - Confirm password input with show/hide toggle
    - PasswordRequirements component (REUSE from RegisterScreen — if not already extracted as shared component, extract it first)
    - "Update Password" button — disabled until all validation passes
  - [x] 6.3 Use `react-hook-form` + Zod (`resetPasswordSchema`) for password validation
  - [x] 6.4 On submit: call `updatePassword(newPassword)` from useAuthStore
  - [x] 6.5 On success: show success message ("Password updated successfully!") via Snackbar or Alert, then navigate to Login screen after brief delay (2 seconds)
  - [x] 6.6 On error: show error message (session expired, network error, etc.) with option to request new reset link
  - [x] 6.7 If session is invalid/expired when screen opens: immediately show error state (AC5) — "This reset link has expired or is invalid." with "Request New Link" button that navigates to ForgotPasswordScreen
  - [x] 6.8 Accessibility: all inputs have accessibilityLabel, min 44x44pt touch targets
  - [x] 6.9 Use theme colors via `useTheme()`

- [x] Task 7: Update Navigation for Password Reset Flow (AC: #1, #3, #5)
  - [x] 7.1 Add `ForgotPassword` and `ResetPassword` routes to `src/app/navigation/types.ts` in `AuthStackParamList`
  - [x] 7.2 Add both screens to `src/app/navigation/AuthStack.tsx`
  - [x] 7.3 Update `src/app/navigation/index.tsx` (RootNavigator):
    - Add deep link URL listener for `subtrack://reset-password`
    - On receiving recovery deep link: parse tokens → call `setSessionFromTokens()` → on success set `pendingPasswordReset: true` → navigate to ResetPassword screen in AuthStack
    - Listen for `PASSWORD_RECOVERY` event in `onAuthStateChange` as a secondary detection method
  - [x] 7.4 Handle navigation to ResetPasswordScreen when `pendingPasswordReset` becomes true
  - [x] 7.5 Update LoginScreen: change "Forgot Password?" button from `Alert.alert('Coming Soon', ...)` to `navigation.navigate('ForgotPassword')`

- [x] Task 8: Update Feature Exports and Verify (AC: all)
  - [x] 8.1 Update `src/features/auth/index.ts` to export ForgotPasswordScreen, ResetPasswordScreen, new types, new schemas
  - [x] 8.2 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`)
  - [x] 8.3 Run `npx tsc --noEmit` — zero errors
  - [x] 8.4 Run `npx eslint src/` — zero errors/warnings

## Dev Notes

### Critical Technical Requirements

**Supabase Password Reset API (CRITICAL — use correct API):**

```typescript
import { supabase } from '@shared/services/supabase';

// Step 1: Request password reset email
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: 'subtrack://reset-password',
  }
);
// NOTE: This ALWAYS returns success even if email doesn't exist (no enumeration)
// Only returns error for network/rate-limit issues

// Step 2: Handle deep link — extract tokens from URL and set session
// URL format: subtrack://reset-password#access_token=xxx&refresh_token=xxx&type=recovery
const { data, error } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
});

// Step 3: Update password (while recovery session is active)
const { data, error } = await supabase.auth.updateUser({
  password: 'new-secure-password',
});

// Alternative: Listen for PASSWORD_RECOVERY event
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    // User has a valid recovery session — show password update form
  }
});
```

**CRITICAL: Deep Link Flow for React Native:**

The password reset flow in React Native with Supabase works as follows:

1. App calls `resetPasswordForEmail(email, { redirectTo: 'subtrack://reset-password' })`
2. User receives email with a link pointing to Supabase Auth server
3. User taps link → browser opens → Supabase validates the recovery token
4. Supabase redirects to `subtrack://reset-password#access_token=...&refresh_token=...&type=recovery`
5. The OS opens the app via the deep link (because `scheme: "subtrack"` is configured)
6. App listens for incoming URL via `expo-linking`
7. App parses the URL fragment to extract `access_token`, `refresh_token`, and `type`
8. App calls `supabase.auth.setSession({ access_token, refresh_token })` to establish recovery session
9. App detects `type === 'recovery'` and navigates to ResetPasswordScreen
10. User enters new password → `supabase.auth.updateUser({ password })` → success

**CRITICAL: Supabase Dashboard Configuration (Manual Step):**

Before testing, the following must be configured in the Supabase Dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Add `subtrack://reset-password` to **Redirect URLs**
3. This allows Supabase to redirect back to the app after token validation

**IMPORTANT: expo-linking API:**

```typescript
import * as Linking from 'expo-linking';

// Listen for incoming URLs while app is open
const subscription = Linking.addEventListener('url', ({ url }) => {
  handleDeepLink(url);
});

// Get the URL that opened the app (if app was cold-started via deep link)
const initialUrl = await Linking.getInitialURL();
if (initialUrl) {
  handleDeepLink(initialUrl);
}

// Parse URL
const { hostname, path, queryParams } = Linking.parse(url);
// For hash fragments, you'll need to manually parse them:
// subtrack://reset-password#access_token=xxx&refresh_token=xxx&type=recovery
// The hash fragment comes after # and needs manual parsing
```

**IMPORTANT: Hash Fragment Parsing:**

Supabase sends tokens as URL hash fragments (after `#`), not query parameters (after `?`). Standard URL parsers may not handle this correctly. You need to manually parse the fragment:

```typescript
function parseSupabaseFragment(url: string): Record<string, string> {
  const fragmentIndex = url.indexOf('#');
  if (fragmentIndex === -1) return {};

  const fragment = url.substring(fragmentIndex + 1);
  const params: Record<string, string> = {};

  fragment.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });

  return params;
}

// Usage:
// url = "subtrack://reset-password#access_token=xxx&refresh_token=yyy&type=recovery"
// result = { access_token: "xxx", refresh_token: "yyy", type: "recovery" }
```

**IMPORTANT: Password Validation Reuse:**

The password validation rules MUST be identical to registration (Story 1.2):
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

Reuse the password validation from `registerSchema` in `schemas.ts`. If the PasswordRequirements visual component is currently embedded in RegisterScreen, extract it to a shared component (`src/features/auth/components/PasswordRequirements.tsx`) so both screens can use it.

**IMPORTANT: Resend Cooldown:**

To prevent abuse of the password reset endpoint, implement a 60-second cooldown timer on the "Send again" button on ForgotPasswordScreen. Use local state with `useRef` for the timer — this doesn't need to be in the store.

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure:** All password reset files within `src/features/auth/` (password reset is part of auth domain):

   ```
   features/auth/
   ├── components/
   │   └── PasswordRequirements.tsx  (EXTRACT from RegisterScreen if not already shared)
   ├── screens/
   │   ├── WelcomeScreen.tsx          (existing — no changes)
   │   ├── LoginScreen.tsx            (MODIFY — navigate to ForgotPassword)
   │   ├── RegisterScreen.tsx         (MODIFY only if extracting PasswordRequirements)
   │   ├── BiometricPromptScreen.tsx  (existing — no changes)
   │   ├── ForgotPasswordScreen.tsx   (NEW)
   │   └── ResetPasswordScreen.tsx    (NEW)
   ├── services/
   │   ├── authService.ts             (MODIFY — add requestPasswordReset, updatePassword, setSessionFromTokens)
   │   └── biometricService.ts        (existing — no changes)
   ├── types/
   │   ├── index.ts                   (MODIFY — add ForgotPasswordFormData, ResetPasswordFormData, DeepLinkResult)
   │   └── schemas.ts                 (MODIFY — add forgotPasswordSchema, resetPasswordSchema)
   └── index.ts                       (MODIFY — add exports)

   shared/
   ├── services/
   │   ├── supabase.ts                (existing — no changes)
   │   └── deepLinking.ts             (NEW — deep link URL helper + parser)
   └── stores/
       └── useAuthStore.ts            (MODIFY — add password reset state/actions)

   app/
   └── navigation/
       ├── index.tsx                  (MODIFY — add deep link listener)
       ├── AuthStack.tsx              (MODIFY — add ForgotPassword, ResetPassword routes)
       └── types.ts                   (MODIFY — add route types)
   ```

2. **Component Boundaries:**
   - ForgotPasswordScreen → uses useAuthStore `requestPasswordReset` action
   - ResetPasswordScreen → uses useAuthStore `updatePassword` action
   - RootNavigator → handles deep link URL → calls authService for session setup
   - No cross-feature imports — communicate via Zustand stores

3. **Naming Conventions:**
   - Components: PascalCase (`ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`)
   - Services: camelCase (`requestPasswordReset`, `updatePassword`)
   - Types: PascalCase (`ForgotPasswordFormData`, `ResetPasswordFormData`)
   - Store actions: camelCase (`requestPasswordReset`, `updatePassword`)

4. **Import Aliases — REQUIRED:**
   ```typescript
   import { supabase } from '@shared/services/supabase';
   import { useAuthStore } from '@shared/stores/useAuthStore';
   import { getResetPasswordRedirectUrl, parseSupabaseDeepLink } from '@shared/services/deepLinking';
   import type { AuthStackParamList } from '@app/navigation/types';
   ```

5. **Error Handling Pattern:** Same as existing authService — async actions inside Zustand store with try/catch, error state managed in store, user-friendly messages via error mapping.

6. **Store Pattern (Zustand v5 + persist + AsyncStorage):**
   ```typescript
   // Follow EXACT same pattern as existing useAuthStore actions:
   // set({ isLoading: true, error: null }) → call service → handle error/success → update state
   ```

### Library & Framework Requirements

**New Dependencies to Install:**

| Package       | Version | Install Command                  | Notes                                    |
| ------------- | ------- | -------------------------------- | ---------------------------------------- |
| expo-linking  | latest  | `npx expo install expo-linking`  | Deep link handling for password reset    |

**Existing Dependencies (NO changes needed):**

| Package                                    | Version  | Notes                                    |
| ------------------------------------------ | -------- | ---------------------------------------- |
| @supabase/supabase-js                      | ^2.95.3  | `resetPasswordForEmail`, `updateUser`    |
| react-hook-form                            | ^7.71.1  | Form handling for both screens           |
| zod                                        | ^4.3.6   | Validation schemas                       |
| react-native-paper                         | ^5.15.0  | TextInput, Button, HelperText, Snackbar  |
| zustand                                    | ^5.0.11  | State management                         |
| @react-native-async-storage/async-storage  | 2.2.0    | Store persistence                        |

**CRITICAL: No MMKV references anywhere.** Project uses AsyncStorage for everything (since commit bcfa245).

### File Structure Requirements

**Files to CREATE:**
- `src/features/auth/screens/ForgotPasswordScreen.tsx` — Email entry for password reset request
- `src/features/auth/screens/ResetPasswordScreen.tsx` — New password entry after deep link
- `src/shared/services/deepLinking.ts` — Deep link URL builder + parser utilities
- `src/features/auth/components/PasswordRequirements.tsx` — EXTRACT from RegisterScreen (if currently embedded)

**Files to MODIFY:**
- `app.json` — Add `"scheme": "subtrack"` for deep linking
- `src/features/auth/services/authService.ts` — Add `requestPasswordReset`, `updatePassword`, `setSessionFromTokens`
- `src/features/auth/types/index.ts` — Add `ForgotPasswordFormData`, `ResetPasswordFormData`, `DeepLinkResult`
- `src/features/auth/types/schemas.ts` — Add `forgotPasswordSchema`, `resetPasswordSchema`
- `src/shared/stores/useAuthStore.ts` — Add password reset state fields and actions
- `src/app/navigation/types.ts` — Add `ForgotPassword` and `ResetPassword` to AuthStackParamList
- `src/app/navigation/AuthStack.tsx` — Register ForgotPassword and ResetPassword screens
- `src/app/navigation/index.tsx` — Add deep link listener and PASSWORD_RECOVERY event handler
- `src/features/auth/screens/LoginScreen.tsx` — Change "Forgot Password?" from Alert to navigation
- `src/features/auth/screens/RegisterScreen.tsx` — Extract PasswordRequirements to shared component (if needed)
- `src/features/auth/index.ts` — Add new exports
- `package.json` — New dependency added via install

**Files NOT to touch:**
- `src/features/auth/services/biometricService.ts` — No changes needed
- `src/features/auth/screens/WelcomeScreen.tsx` — No changes needed
- `src/features/auth/screens/BiometricPromptScreen.tsx` — No changes needed
- `src/shared/services/supabase.ts` — No changes needed (detectSessionInUrl: false is correct)
- `src/config/env.ts` — No changes needed
- `src/config/theme.ts` — No changes needed
- `src/app/navigation/MainTabs.tsx` — No changes needed
- `src/features/settings/` — No changes needed
- `src/app/providers/AuthProvider.tsx` — No changes needed

### Testing Requirements

- Verify TypeScript compiles with zero errors: `npx tsc --noEmit`
- Verify ESLint passes: `npx eslint src/`
- **IMPORTANT: Deep link testing requires a development build (not Expo Go)** — deep linking with custom schemes requires native code
- **Manual Setup Required:** Add `subtrack://reset-password` to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
- **Manual Smoke Test:**
  1. App launches → Login screen → "Forgot Password?" link visible
  2. Tap "Forgot Password?" → navigates to ForgotPasswordScreen
  3. Enter valid email → tap "Send Reset Link" → loading state → confirmation view with "Check Your Email" message
  4. Enter invalid email format → validation error shown inline
  5. Enter non-existent email → same confirmation message (no enumeration)
  6. "Back to Login" navigates back to Login screen
  7. Check email inbox → reset email received from Supabase
  8. Tap reset link in email → browser opens → Supabase validates → redirects to app via deep link
  9. App opens ResetPasswordScreen → enter new password → password requirements shown
  10. Enter password not meeting requirements → validation feedback, submit disabled
  11. Enter valid password + confirmation → tap "Update Password" → success message
  12. Redirected to Login screen → log in with new password → success
  13. Test expired/invalid link → error message with "Request New Link" option
  14. Test "Send again" cooldown on ForgotPasswordScreen → button disabled for 60 seconds after send

### Previous Story Intelligence (Story 1.4)

**Key Learnings from Story 1.4 (CRITICAL — Apply to this story):**

- **AsyncStorage (NOT MMKV):** Confirmed — project uses `@react-native-async-storage/async-storage` everywhere. Do NOT reference MMKV.
- **Zod v4 API:** Use `z.email()` directly (NOT `z.string().email()`). Apply same pattern for `forgotPasswordSchema`.
- **ESLint:** Flat config format (`eslint.config.js`). Unused variables in catch blocks → use bare `catch {}`.
- **React Navigation v7 dynamic API:** Navigation works by checking state in RootNavigator — auth flow changes are state-driven, not imperative.
- **Error type:** `AuthError` has `message: string` and optional `code?: string`. Reuse same pattern for password reset errors.
- **Theme compliance:** Use `theme.colors.*` via `useTheme()` hook, not hardcoded hex values.
- **Accessibility:** Include `accessibilityLabel` on interactive elements. Min 44x44pt touch targets.
- **Store action pattern:** `set({ isLoading: true, error: null })` → call service → handle error/success → update state
- **Biometric gate:** The navigation already handles biometric verification before showing MainTabs. Password reset operates entirely within AuthStack (unauthenticated flow), so biometric gate is NOT involved.
- **Development build required:** Previous story required dev build for native modules. This story also needs dev build for deep linking.

**Patterns to Reuse from Existing Code:**

- Auth store action pattern from signIn/signUp
- Error mapping pattern from authService (`mapAuthError`, `mapErrorCode`)
- Form structure pattern from LoginScreen/RegisterScreen (react-hook-form + Zod + react-native-paper)
- PasswordRequirements component from RegisterScreen (extract if needed)
- Screen layout pattern with theme colors
- `clearAuth()` / `clearError()` pattern for state cleanup

### Git Intelligence

**Recent Commits (last 5):**

```
57cc71f story 1.4 done
0b4affd story 1.4 in review
a36fbe9 ready-for-dev 1.4
bcfa245 remove react-native-mmkv and install react-native-async-storage
b8eea4b project setup in new device
```

**Key Insights:**
- Commit messages are concise and descriptive (follow this pattern)
- Stories follow a clear lifecycle: ready-for-dev → in-progress → review → done
- AsyncStorage migration in bcfa245 is the most recent significant infrastructure change
- No deep linking or URL scheme has been set up in any previous story

**Code Patterns Established:**
- Feature-based modular structure strictly followed
- Auth errors mapped in service layer → stored in Zustand → displayed in screen
- Navigation is state-driven (conditional rendering in RootNavigator)
- Form validation via react-hook-form + Zod with inline error display
- react-native-paper components used throughout for Material Design 3 compliance

### Project Structure Notes

- ForgotPasswordScreen and ResetPasswordScreen go in `features/auth/screens/` alongside existing auth screens
- deepLinking.ts goes in `shared/services/` as it's a cross-cutting utility that may be reused by other features
- No cross-feature imports — password reset is entirely within the auth domain + shared services
- Path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`) used for all imports
- The deep link setup in this story (app.json scheme + expo-linking) creates infrastructure that will be reusable for other features (e.g., email confirmation deep links, future OAuth flows)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Password Reset via Email]
- [Source: _bmad-output/planning-artifacts/prd.md#User Management - FR4]
- [Source: _bmad-output/planning-artifacts/prd.md#Security - NFR10, NFR11, NFR15]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/implementation-artifacts/1-4-biometric-authentication-setup.md]
- [Source: Supabase Docs - Password Reset API (resetPasswordForEmail, updateUser)]
- [Source: Supabase Docs - Native Mobile Deep Linking]
- [Source: Expo Docs - expo-linking for deep link handling]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- TypeScript compilation: zero errors (`npx tsc --noEmit`)
- ESLint check: zero errors/warnings (`npx eslint src/`)

### Completion Notes List

- Implemented complete password reset flow via email using Supabase Auth API
- Created deep linking infrastructure with `subtrack://` custom scheme in app.json
- Installed `expo-linking` for deep link URL handling
- Created `deepLinking.ts` service with URL fragment parser for Supabase recovery tokens
- Added 3 new service methods: `requestPasswordReset`, `updatePassword`, `setSessionFromTokens`
- Added types: `ForgotPasswordFormData`, `ResetPasswordFormData`, `DeepLinkResult`
- Added Zod schemas: `forgotPasswordSchema`, `resetPasswordSchema` (reuses shared `passwordValidation`)
- Extended `useAuthStore` with `isResetEmailSent`, `pendingPasswordReset` state and 4 new actions
- Transient state (`isResetEmailSent`, `pendingPasswordReset`) correctly excluded from persist
- Created `ForgotPasswordScreen` with email form, confirmation view, and 60-second resend cooldown
- Created `ResetPasswordScreen` with password form, PasswordRequirements, success snackbar, and expired link handling
- Extracted `PasswordRequirements` component from `RegisterScreen` to shared component
- Updated `RootNavigator` with deep link listener (expo-linking) and `PASSWORD_RECOVERY` auth state change listener
- Updated `LoginScreen` "Forgot Password?" from `Alert.alert` placeholder to `navigation.navigate('ForgotPassword')`
- All screens use `useTheme()` colors, `accessibilityLabel`, `accessibilityRole`, and 44x44pt min touch targets
- No email enumeration: same confirmation message shown regardless of email existence (AC2)

### File List

**New Files:**
- `src/shared/services/deepLinking.ts` — Deep link URL builder + Supabase fragment parser
- `src/features/auth/screens/ForgotPasswordScreen.tsx` — Password reset email request screen
- `src/features/auth/screens/ResetPasswordScreen.tsx` — New password entry screen after deep link
- `src/features/auth/components/PasswordRequirements.tsx` — Extracted shared password validation UI

**Modified Files:**
- `app.json` — Added `"scheme": "subtrack"` for deep linking
- `package.json` — Added `expo-linking` dependency
- `src/features/auth/services/authService.ts` — Added `requestPasswordReset`, `updatePassword`, `setSessionFromTokens`
- `src/features/auth/types/index.ts` — Added `ForgotPasswordFormData`, `ResetPasswordFormData`, `DeepLinkResult`
- `src/features/auth/types/schemas.ts` — Added `forgotPasswordSchema`, `resetPasswordSchema`, extracted shared `passwordValidation`
- `src/shared/stores/useAuthStore.ts` — Added password reset state fields and actions
- `src/app/navigation/types.ts` — Added `ForgotPassword` and `ResetPassword` to `AuthStackParamList`
- `src/app/navigation/AuthStack.tsx` — Registered ForgotPassword and ResetPassword screens
- `src/app/navigation/index.tsx` — Added deep link listener and PASSWORD_RECOVERY event handler
- `src/features/auth/screens/LoginScreen.tsx` — Changed "Forgot Password?" from Alert to navigation
- `src/features/auth/screens/RegisterScreen.tsx` — Replaced inline PasswordRequirements with shared component import
- `src/features/auth/index.ts` — Added new screen, component, service, type, and schema exports

## Change Log

- 2026-02-26: Implemented Story 1.5 — Password Reset via Email. Full password reset flow with deep linking, ForgotPasswordScreen, ResetPasswordScreen, Supabase Auth integration, and extracted shared PasswordRequirements component.
