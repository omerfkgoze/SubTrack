# Story 1.6: Session Management & Logout

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a logged-in user,
I want to log out of my account and have my session managed securely,
so that my data stays protected.

## Acceptance Criteria

1. **AC1 - Manual Logout:** Given the user is logged in, when they tap "Log Out" in settings, then a confirmation dialog appears ("Are you sure you want to log out?"). Upon confirmation: `supabase.auth.signOut()` is called, biometric credentials are cleared from Keychain via `disableBiometric()`, the Zustand auth store is reset via `clearAuth()`, and the user is redirected to the login screen (AuthStack).

2. **AC2 - Inactivity Timeout (NFR10):** Given the user has been inactive for 30 minutes (app in background or no interaction), when they return to the app, then the app requires re-authentication. If biometric is enabled, the BiometricPromptScreen is shown. If biometric is not enabled, the user is signed out and redirected to the login screen with an inactivity timeout message: "Your session has expired due to inactivity. Please log in again."

3. **AC3 - Automatic Token Refresh:** Given the user's access token has expired (1h lifetime), when the app makes an API call, then the Supabase client automatically uses the refresh token to obtain a new access token (already configured with `autoRefreshToken: true`). No user action is needed. If the refresh token is also expired (7d lifetime), the user is signed out and redirected to the login screen.

4. **AC4 - Session Expired Handling:** Given the user's session has become invalid (refresh token expired, server-side revocation, or token refresh failure), when the `onAuthStateChange` fires a `SIGNED_OUT` event, then the auth store is cleared, biometric credentials are removed, and the user is redirected to the login screen with message: "Your session has expired. Please log in again."

5. **AC5 - User Info Display:** Given the user is on the settings screen, when they view the Account section, then their email address is displayed, along with the "Log Out" button.

6. **AC6 - Accessibility:** All interactive elements have `accessibilityLabel` and appropriate `accessibilityRole`. Touch targets are minimum 44x44pt. Dialog buttons are accessible. Timeout messages are announced to screen readers.

## Tasks / Subtasks

- [x] Task 1: Add signOut Service Method (AC: #1, #4)
  - [x] 1.1 Add `signOut(): Promise<{ error: AuthError | null }>` to `src/features/auth/services/authService.ts`
    - Calls `supabase.auth.signOut()`
    - Returns mapped error if signOut fails (network error etc.)
  - [x] 1.2 Reuse existing `mapAuthError`/`mapErrorCode` pattern for error mapping

- [x] Task 2: Add Logout and Session Management to useAuthStore (AC: #1, #2, #4)
  - [x] 2.1 Import `signOut as signOutService` from authService and `disableBiometric` from biometricService in `src/shared/stores/useAuthStore.ts`
  - [x] 2.2 Add `lastActiveTimestamp: number | null` state field (NOT persisted — transient, in-memory only)
  - [x] 2.3 Add `sessionExpiredMessage: string | null` state field (NOT persisted — transient UI state)
  - [x] 2.4 Add `logout(): Promise<void>` action:
    - `set({ isLoading: true, error: null })`
    - Call `signOutService()` (Supabase signOut)
    - Call `disableBiometricService()` (clear Keychain)
    - Call `clearAuth()` to reset all state
    - `set({ isLoading: false })`
    - On error: still call `clearAuth()` (force local cleanup even if network fails)
  - [x] 2.5 Add `handleSessionExpired(message: string): void` action:
    - Call `disableBiometricService()` (clear Keychain)
    - Call `clearAuth()` to reset all state
    - `set({ sessionExpiredMessage: message })`
  - [x] 2.6 Add `updateLastActive(): void` action — `set({ lastActiveTimestamp: Date.now() })`
  - [x] 2.7 Add `clearSessionExpiredMessage(): void` action — `set({ sessionExpiredMessage: null })`
  - [x] 2.8 Update `clearAuth()` to also set `lastActiveTimestamp: null, sessionExpiredMessage: null`
  - [x] 2.9 Add `lastActiveTimestamp`, `sessionExpiredMessage` to exclusion in `partialize` (do NOT persist)
  - [x] 2.10 Add `logout` and `handleSessionExpired` to AuthActions interface

- [x] Task 3: Implement Inactivity Timeout in RootNavigator (AC: #2)
  - [x] 3.1 In `src/app/navigation/index.tsx`, add inactivity timeout logic:
    - Import `useAuthStore` selectors for `lastActiveTimestamp`, `updateLastActive`, `handleSessionExpired`, `logout`
    - Define `INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000` (30 minutes)
  - [x] 3.2 Update the existing AppState listener:
    - On app going to `background`: record `lastActiveTimestamp` via `updateLastActive()`
    - On app coming to `active` from background: check if `Date.now() - lastActiveTimestamp > INACTIVITY_TIMEOUT_MS`
    - If timeout exceeded AND user is authenticated:
      - If biometric is enabled: only reset `isBiometricVerified` to false (existing behavior — biometric gate will show)
      - If biometric is NOT enabled: call `handleSessionExpired('Your session has expired due to inactivity. Please log in again.')` to sign out
  - [x] 3.3 Ensure the existing `setIsBiometricVerified(false)` on background still works for biometric users (short background transitions)

- [x] Task 4: Handle Session Expired Events in AuthProvider (AC: #4)
  - [x] 4.1 Update `src/app/providers/AuthProvider.tsx`:
    - Import `handleSessionExpired` from useAuthStore
    - In `onAuthStateChange` callback, add handling for `SIGNED_OUT` event:
      - When event is `SIGNED_OUT` and `isAuthenticated` was true (unexpected signout), call `handleSessionExpired('Your session has expired. Please log in again.')`
    - Keep existing behavior for other events (session sync)
  - [x] 4.2 IMPORTANT: Do NOT trigger `handleSessionExpired` for user-initiated logout (when `logout()` action already calls `clearAuth()` — use a flag or check `isAuthenticated` before processing `SIGNED_OUT`)

- [x] Task 5: Add Logout UI to Settings Screen (AC: #1, #5, #6)
  - [x] 5.1 Update `src/features/settings/screens/SettingsScreen.tsx`:
    - Import `user` from useAuthStore for email display
    - Import `logout` from useAuthStore
    - Import `sessionExpiredMessage`, `clearSessionExpiredMessage` from useAuthStore
  - [x] 5.2 Add "Account" section below existing "Security" section:
    - `List.Subheader` with "Account"
    - `List.Item` showing user's email (title: user email, left icon: "email-outline")
    - `List.Item` for "Log Out" button (title: "Log Out", left icon: "logout", `onPress` opens confirmation dialog)
    - Style: "Log Out" text uses `theme.colors.error` for visual prominence
  - [x] 5.3 Add logout confirmation dialog (using existing `Portal` + `Dialog` pattern):
    - Title: "Log Out"
    - Content: "Are you sure you want to log out?"
    - Actions: "Cancel" (dismiss) and "Log Out" (calls `logout()` action, uses `theme.colors.error`)
  - [x] 5.4 Show session expired message via Snackbar when `sessionExpiredMessage` is not null:
    - Display the message
    - On dismiss: call `clearSessionExpiredMessage()`
    - This handles the case where the user is redirected to login due to timeout/expiry and then logs back in — the message appears on the login screen instead (see Task 6)
  - [x] 5.5 Accessibility: all new items have `accessibilityLabel` and `accessibilityRole`, min 44x44pt touch targets

- [x] Task 6: Show Session Expired Message on Login Screen (AC: #2, #4)
  - [x] 6.1 Update `src/features/auth/screens/LoginScreen.tsx`:
    - Import `sessionExpiredMessage`, `clearSessionExpiredMessage` from useAuthStore
    - Add Snackbar component to display `sessionExpiredMessage` when not null
    - On dismiss or on successful login: call `clearSessionExpiredMessage()`
  - [x] 6.2 Snackbar should use default styling (informational, not error)

- [x] Task 7: Update Feature Exports and Verify (AC: all)
  - [x] 7.1 Update `src/features/auth/index.ts` to export new `signOut` service method
  - [x] 7.2 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`)
  - [x] 7.3 Run `npx tsc --noEmit` — zero errors
  - [x] 7.4 Run `npx eslint src/` — zero errors/warnings

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Fix race condition: logout() calls signOutService() before clearAuth(), causing AuthProvider to misidentify user-initiated logout as session expiry and briefly showing "session expired" message. Move clearAuth() or set isAuthenticated:false BEFORE signOutService() call. [src/shared/stores/useAuthStore.ts:264-274, src/app/providers/AuthProvider.tsx:19-25]
- [x] [AI-Review][HIGH] handleSessionExpired() calls async disableBiometricService() without await — biometric credential cleanup is fire-and-forget. Make action async and await the call, or add .catch() for error handling. [src/shared/stores/useAuthStore.ts:276-280]
- [x] [AI-Review][MEDIUM] signOut() return type inconsistency — returns custom inline type instead of AuthResult pattern used by all other authService functions. Align return type for consistent error handling. [src/features/auth/services/authService.ts:164]
- [x] [AI-Review][MEDIUM] Double execution: disableBiometricService() and clearAuth() called twice during logout (once by handleSessionExpired via AuthProvider, once by logout action itself). Side effect of HIGH race condition issue — fixing H1 resolves this. [src/shared/stores/useAuthStore.ts:264-274]
- [x] [AI-Review][LOW] AppState listener useEffect re-subscribes on every lastActiveTimestamp change. Use useAuthStore.getState().lastActiveTimestamp inside callback instead of reactive selector to avoid unnecessary teardown/rebuild. [src/app/navigation/index.tsx:89-121]
- [x] [AI-Review][LOW] Timeout Snackbar messages lack explicit accessibilityLiveRegion="polite" for screen reader announcement (AC6 requirement). Verify react-native-paper Snackbar default behavior or add explicit prop. [src/features/auth/screens/LoginScreen.tsx:146-152, src/features/settings/screens/SettingsScreen.tsx:177-183]
- [x] [AI-Review][LOW] Redundant setIsBiometricVerified(false) call in inactivity timeout handler — already called when app went to background. Harmless but unnecessary. [src/app/navigation/index.tsx:107]

#### Review 2 Follow-ups (AI)

- [x] [AI-Review-2][HIGH] updatePassword signout regression: updatePassword() calls supabase.auth.signOut() without first setting isAuthenticated:false, causing AuthProvider's new SIGNED_OUT handler to trigger handleSessionExpired with misleading "session expired" message after successful password update. Fixed by adding set({ isAuthenticated: false }) before signOut call. [src/shared/stores/useAuthStore.ts:161-165]
- [x] [AI-Review-2][MEDIUM] logout() sets isLoading:true alongside isAuthenticated:false, causing LoginScreen to mount with loading/disabled Login button until async signOut+biometric cleanup completes (~0.5-1s). Fixed by removing isLoading:true from logout action and removing redundant set({ isLoading: false }) after clearAuth(). [src/shared/stores/useAuthStore.ts:266-275]
- [ ] [AI-Review-2][LOW] SettingsScreen session expired Snackbar (lines 177-184) is dead code — session expiry sets isAuthenticated:false, unmounting SettingsScreen before Snackbar can render. [src/features/settings/screens/SettingsScreen.tsx:177-184]
- [ ] [AI-Review-2][LOW] clearAuth() resets biometryType:null — device-level capability, not user state. Causes brief label flash ("Biometric Login" instead of "Face ID"/"Fingerprint") until checkBiometricAvailability() re-runs. [src/shared/stores/useAuthStore.ts:305]
- [ ] [AI-Review-2][LOW] handleSessionExpired calls clearAuth() which sets sessionExpiredMessage:null, then immediately overrides with set({ sessionExpiredMessage: message }). Would be cleaner as single operation. [src/shared/stores/useAuthStore.ts:281-283]
- [ ] [AI-Review-2][LOW] Redundant set({ isLoading: false }) after clearAuth() in logout — already resolved as part of M1 fix.

## Dev Notes

### Critical Technical Requirements

**Supabase signOut API (CRITICAL — use correct scope):**

```typescript
import { supabase } from '@shared/services/supabase';

// Sign out from current device only (default, recommended for mobile)
const { error } = await supabase.auth.signOut();
// scope defaults to 'local' — clears local session only
// Does NOT invalidate refresh token on other devices

// Sign out from ALL devices (use only for security-critical scenarios)
const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
// Invalidates ALL refresh tokens server-side
```

**CRITICAL: Use `scope: 'local'` (default) for normal logout.** Global signout is unnecessary for a single-device mobile app and adds network dependency to the logout flow.

**CRITICAL: Logout MUST succeed even offline.** If `supabase.auth.signOut()` fails due to network error, the local state must still be cleared. The user must be able to log out regardless of network status. The server-side session will expire naturally (JWT has 1h access, 7d refresh lifetime).

**Inactivity Timeout Architecture:**

```typescript
// In RootNavigator — AppState listener
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (NFR10)

// When app goes to background:
updateLastActive(); // Stores Date.now() in Zustand (NOT persisted)

// When app returns to foreground:
const elapsed = Date.now() - lastActiveTimestamp;
if (elapsed > INACTIVITY_TIMEOUT_MS && isAuthenticated) {
  if (isBiometricEnabled) {
    // Biometric gate already shows — just reset verification
    setIsBiometricVerified(false);
  } else {
    // No biometric — force full re-login
    handleSessionExpired('Your session has expired due to inactivity. Please log in again.');
  }
}
```

**IMPORTANT: Why `lastActiveTimestamp` is NOT persisted:**
- We only care about time spent in background
- If the app is killed, Zustand rehydrates from AsyncStorage with `lastActiveTimestamp: null`
- On cold start, if Supabase session is still valid (JWT not expired), user proceeds normally
- If JWT has expired during app kill, Supabase `autoRefreshToken` will try to refresh on next API call — if refresh token also expired, `onAuthStateChange` fires `SIGNED_OUT` and the user is redirected to login

**Token Refresh Flow (already handled by Supabase client):**

```typescript
// In supabase.ts — already configured:
auth: {
  autoRefreshToken: true,  // ← Supabase handles access token refresh automatically
  persistSession: true,     // ← Session persisted to AsyncStorage
}
// Supabase client internally:
// 1. Before each API call, checks if access_token is expired
// 2. If expired, calls /token?grant_type=refresh_token with stored refresh_token
// 3. If refresh succeeds: updates session, fires TOKEN_REFRESHED event
// 4. If refresh fails (expired/revoked): fires SIGNED_OUT event
```

**IMPORTANT: Session Expired vs User-Initiated Logout:**

The `onAuthStateChange` in AuthProvider fires `SIGNED_OUT` for BOTH:
1. User-initiated logout (our `logout()` action calls `signOut()`)
2. Server-side session expiry (refresh token expired/revoked)

To distinguish: when `logout()` action is called, `clearAuth()` sets `isAuthenticated: false` BEFORE the `SIGNED_OUT` event fires. So in AuthProvider, check if `isAuthenticated` was already false when `SIGNED_OUT` fires — if so, it was user-initiated and no "session expired" message needed.

```typescript
// In AuthProvider.tsx — onAuthStateChange handler:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    const wasAuthenticated = useAuthStore.getState().isAuthenticated;
    if (wasAuthenticated) {
      // Unexpected signout — session expired or revoked
      handleSessionExpired('Your session has expired. Please log in again.');
    }
    // If !wasAuthenticated: user-initiated logout — already handled by logout() action
    return;
  }
  // Normal session sync
  setSession(session);
  setUser(session?.user ?? null);
});
```

**CRITICAL: Biometric Credential Cleanup on Logout:**

When the user logs out, biometric credentials stored in Keychain MUST be cleared. Otherwise, a different user could log in and the old user's biometric token would still be stored.

```typescript
// In logout() action:
await disableBiometricService(); // Clears Keychain credentials + biometric keys
clearAuth(); // Resets isBiometricEnabled to false in store
```

The `disableBiometric()` function from biometricService already handles:
- `rnBiometrics.deleteKeys()` — removes biometric key pair
- `Keychain.resetGenericPassword()` — clears stored refresh token

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure:** Logout is part of Settings/Auth cross-cutting concern. UI goes in settings, logic in auth:

   ```
   features/auth/
   ├── services/
   │   ├── authService.ts             (MODIFY — add signOut method)
   │   └── biometricService.ts        (existing — no changes, reuse disableBiometric)
   ├── screens/
   │   └── LoginScreen.tsx            (MODIFY — add session expired Snackbar)
   └── index.ts                       (MODIFY — export signOut)

   features/settings/
   └── screens/
       └── SettingsScreen.tsx          (MODIFY — add Account section + logout UI)

   shared/
   └── stores/
       └── useAuthStore.ts            (MODIFY — add logout, handleSessionExpired, inactivity tracking)

   app/
   ├── navigation/
   │   └── index.tsx                  (MODIFY — add inactivity timeout logic to AppState listener)
   └── providers/
       └── AuthProvider.tsx           (MODIFY — handle SIGNED_OUT event for session expiry)
   ```

2. **Component Boundaries:**
   - SettingsScreen → uses useAuthStore `logout` action
   - RootNavigator → handles inactivity timeout via AppState
   - AuthProvider → handles SIGNED_OUT events for unexpected session expiry
   - LoginScreen → shows session expired message via Snackbar
   - No cross-feature imports — communicate via Zustand stores

3. **Naming Conventions:**
   - Services: camelCase (`signOut`)
   - Store actions: camelCase (`logout`, `handleSessionExpired`, `updateLastActive`)
   - State fields: camelCase (`lastActiveTimestamp`, `sessionExpiredMessage`)
   - Types: PascalCase (existing `AuthError`)

4. **Import Aliases — REQUIRED:**
   ```typescript
   import { supabase } from '@shared/services/supabase';
   import { useAuthStore } from '@shared/stores/useAuthStore';
   import { signOut } from '@features/auth/services/authService';
   import { disableBiometric } from '@features/auth/services/biometricService';
   ```

5. **Error Handling Pattern:** Same as existing authService — async actions inside Zustand store with try/catch, error state managed in store, user-friendly messages via error mapping. Logout MUST succeed locally even on network failure.

6. **Store Pattern (Zustand v5 + persist + AsyncStorage):**
   ```typescript
   // Follow EXACT same pattern as existing actions:
   // set({ isLoading: true, error: null }) → call service → handle error/success → update state
   // CRITICAL: logout always clears auth even on error (force local cleanup)
   ```

### Library & Framework Requirements

**No new dependencies needed for this story.**

**Existing Dependencies Used:**

| Package                                    | Version  | Notes                                                |
| ------------------------------------------ | -------- | ---------------------------------------------------- |
| @supabase/supabase-js                      | ^2.95.3  | `signOut()` API for logout                           |
| react-native-paper                         | ^5.15.0  | List, Dialog, Portal, Button, Snackbar, HelperText   |
| zustand                                    | ^5.0.11  | State management — add logout/session actions        |
| @react-native-async-storage/async-storage  | 2.2.0    | Store persistence (existing)                         |
| react-native-biometrics                    | ^3.0.1   | Cleanup biometric keys on logout (existing)          |
| react-native-keychain                      | ^10.0.0  | Clear stored tokens on logout (existing)             |

**CRITICAL: No new packages to install. No MMKV references anywhere.** Project uses AsyncStorage for everything.

### File Structure Requirements

**Files to CREATE:**
- None — all changes are modifications to existing files

**Files to MODIFY:**
- `src/features/auth/services/authService.ts` — Add `signOut()` method
- `src/shared/stores/useAuthStore.ts` — Add `logout`, `handleSessionExpired`, `updateLastActive`, `clearSessionExpiredMessage`, `lastActiveTimestamp`, `sessionExpiredMessage`
- `src/app/navigation/index.tsx` — Add inactivity timeout logic to AppState listener
- `src/app/providers/AuthProvider.tsx` — Handle SIGNED_OUT event for session expiry
- `src/features/settings/screens/SettingsScreen.tsx` — Add Account section with email display and logout button
- `src/features/auth/screens/LoginScreen.tsx` — Add session expired Snackbar
- `src/features/auth/index.ts` — Export signOut

**Files NOT to touch:**
- `src/features/auth/services/biometricService.ts` — No changes needed (reuse existing `disableBiometric`)
- `src/features/auth/screens/WelcomeScreen.tsx` — No changes needed
- `src/features/auth/screens/RegisterScreen.tsx` — No changes needed
- `src/features/auth/screens/ForgotPasswordScreen.tsx` — No changes needed
- `src/features/auth/screens/ResetPasswordScreen.tsx` — No changes needed
- `src/features/auth/screens/BiometricPromptScreen.tsx` — No changes needed
- `src/shared/services/supabase.ts` — No changes needed (autoRefreshToken already configured)
- `src/shared/services/deepLinking.ts` — No changes needed
- `src/config/env.ts` — No changes needed
- `src/config/theme.ts` — No changes needed
- `src/app/navigation/AuthStack.tsx` — No changes needed
- `src/app/navigation/MainTabs.tsx` — No changes needed
- `src/app/navigation/SettingsStack.tsx` — No changes needed (SettingsHome already registered)
- `src/app/navigation/types.ts` — No changes needed (Account route exists but not needed for this story)
- `app.json` — No changes needed
- `package.json` — No new dependencies

### Testing Requirements

- Verify TypeScript compiles with zero errors: `npx tsc --noEmit`
- Verify ESLint passes: `npx eslint src/`
- **Manual Smoke Test:**
  1. App launches → Login → navigate to Settings → see Account section with user email
  2. Tap "Log Out" → confirmation dialog appears ("Are you sure you want to log out?")
  3. Tap "Cancel" → dialog dismisses, user stays on Settings
  4. Tap "Log Out" in dialog → loading briefly → redirected to Login screen (AuthStack)
  5. Verify: after logout, biometric toggle is reset (if was enabled)
  6. Verify: after logout, pressing back does not return to Settings (navigation state reset)
  7. Inactivity test: log in → send app to background → wait 30+ minutes → return → if biometric enabled, biometric prompt shown; if not, redirected to Login with inactivity message
  8. Short background: log in → background for 5 seconds → return → app resumes normally (no timeout)
  9. Token expiry simulation: log in → wait until access token expires (1h) → make an action → should auto-refresh silently
  10. Offline logout: enable airplane mode → tap Log Out → confirm → should still log out locally and redirect to Login
  11. Verify session expired Snackbar appears on Login screen after inactivity timeout
  12. Verify Snackbar dismisses on tap or after timeout

### Previous Story Intelligence (Story 1.5)

**Key Learnings from Story 1.5 (CRITICAL — Apply to this story):**

- **AsyncStorage (NOT MMKV):** Confirmed — project uses `@react-native-async-storage/async-storage` everywhere. Do NOT reference MMKV.
- **Zod v4 API:** Not needed for this story (no form validation).
- **ESLint:** Flat config format (`eslint.config.js`). Unused variables in catch blocks → use bare `catch {}`.
- **React Navigation v7 dynamic API:** Navigation works by checking state in RootNavigator — auth flow changes are state-driven (isAuthenticated), not imperative navigation.
- **Theme compliance:** Use `theme.colors.*` via `useTheme()` hook, not hardcoded hex values.
- **Accessibility:** Include `accessibilityLabel` on interactive elements. Min 44x44pt touch targets.
- **Store action pattern:** `set({ isLoading: true, error: null })` → call service → handle error/success → update state
- **clearAuth() pattern:** Already clears all auth state including `isBiometricEnabled: false`. Used by `updatePassword` flow after `supabase.auth.signOut()`.
- **Development build required for biometric testing** — biometric features need native code.
- **supabase.auth.signOut()** already used in Story 1.5 (`updatePassword` action) — same pattern applies here.
- **Critical review finding from 1.5:** After password update, AuthProvider's `onAuthStateChange` set `isAuthenticated=true` for recovery sessions, causing routing issues. Similar risk exists here: `SIGNED_OUT` event in AuthProvider must distinguish user-initiated vs server-side logout.

**Patterns to Reuse from Existing Code:**

- Auth store action pattern from signIn/signUp/updatePassword
- Error mapping pattern from authService (`mapAuthError`, `mapErrorCode`)
- Dialog/Portal pattern from SettingsScreen (biometric disable dialog)
- Snackbar pattern from SettingsScreen (biometric enable/disable messages)
- AppState listener from RootNavigator (background detection already exists)
- `disableBiometric()` from biometricService (Keychain + biometric key cleanup)
- `clearAuth()` from useAuthStore (full state reset)

### Git Intelligence

**Recent Commits (last 5):**

```
9d647ed story 1.5 done
fd4406b deloped 1.5
e16d47b story 1.5 review in-progress
a1c9bcd story 1.5 in review
ebad3c5 ready-for-dev 1.5
```

**Key Insights:**
- Commit messages follow pattern: "story X.Y [status]"
- Stories follow lifecycle: ready-for-dev → in-progress → review → done
- No session management or logout has been implemented in any previous story
- AppState listener in RootNavigator only resets biometric verification on background (no timeout logic)

**Code Patterns Established:**
- Feature-based modular structure strictly followed
- Auth errors mapped in service layer → stored in Zustand → displayed in screen
- Navigation is state-driven (conditional rendering in RootNavigator based on isAuthenticated)
- Dialog/Portal pattern used in SettingsScreen for confirmation dialogs
- Snackbar used for transient success/info messages
- react-native-paper components used throughout for Material Design 3 compliance

### Project Structure Notes

- No new files created — all changes are modifications to existing files
- Logout logic split between auth domain (service + store) and settings domain (UI)
- Inactivity tracking lives in RootNavigator (navigation concern) with store state
- Session expiry handling lives in AuthProvider (auth concern) with store state
- Path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`) used for all imports
- The inactivity timeout infrastructure created here will be reusable for future features (e.g., auto-lock for premium features)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Session Management & Logout]
- [Source: _bmad-output/planning-artifacts/prd.md#User Management - FR5]
- [Source: _bmad-output/planning-artifacts/prd.md#Security - NFR10, NFR13]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security - Session Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns - Authentication & Session Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/implementation-artifacts/1-5-password-reset-via-email.md]
- [Source: Supabase JS Client Docs - signOut, onAuthStateChange, autoRefreshToken]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- No debug issues encountered during implementation

### Completion Notes List

- Task 1: Added `signOut()` method to authService.ts using existing `mapAuthError`/`mapErrorCode` pattern. Returns mapped error on failure.
- Task 2: Added `logout`, `handleSessionExpired`, `updateLastActive`, `clearSessionExpiredMessage` actions to useAuthStore. Added `lastActiveTimestamp` and `sessionExpiredMessage` transient state fields (NOT persisted via partialize). Updated `clearAuth()` to reset new fields. Logout forces local cleanup even on network failure.
- Task 3: Added inactivity timeout logic (30min / NFR10) to RootNavigator's AppState listener. On background → records timestamp; on foreground → checks elapsed time. Biometric users get biometric gate; non-biometric users get signed out with message. Short background transitions work normally.
- Task 4: Updated AuthProvider's `onAuthStateChange` to distinguish user-initiated logout from server-side session expiry. Uses `isAuthenticated` check: if still true when `SIGNED_OUT` fires, it's unexpected (session expired); if false, logout action already handled it.
- Task 5: Added Account section to SettingsScreen with user email display and Log Out button (red, error color). Logout confirmation dialog with Cancel/Log Out actions. Session expired Snackbar for messages. All elements have accessibility labels.
- Task 6: Added session expired Snackbar to LoginScreen. Clears message on dismiss or successful login. Uses default (informational) styling.
- Task 7: Exported `signOut` from auth feature index. All imports use path aliases. TypeScript compiles with zero errors. ESLint passes with zero errors/warnings.
- ✅ Resolved review finding [HIGH]: Fixed race condition — logout() now sets isAuthenticated:false BEFORE signOutService() call, preventing AuthProvider from misidentifying user-initiated logout as session expiry.
- ✅ Resolved review finding [HIGH]: handleSessionExpired() now properly awaits disableBiometricService() with try/catch error handling instead of fire-and-forget.
- ✅ Resolved review finding [MEDIUM]: signOut() return type aligned to AuthResult pattern for consistency with all other authService functions.
- ✅ Resolved review finding [MEDIUM]: Double execution of disableBiometricService()/clearAuth() resolved — side effect of H1 race condition fix.
- ✅ Resolved review finding [LOW]: AppState listener useEffect no longer re-subscribes on lastActiveTimestamp changes — uses useAuthStore.getState() inside callback instead of reactive selectors.
- ✅ Resolved review finding [LOW]: Added accessibilityLiveRegion="polite" to session expired Snackbar components on both LoginScreen and SettingsScreen for AC6 compliance.
- ✅ Resolved review finding [LOW]: Removed redundant setIsBiometricVerified(false) in inactivity timeout handler — biometric gate already active from background transition.
- ✅ Resolved review 2 finding [HIGH]: updatePassword() signout regression — added set({ isAuthenticated: false }) before supabase.auth.signOut() to prevent misleading "session expired" message after password update.
- ✅ Resolved review 2 finding [MEDIUM]: Removed isLoading:true from logout() action — prevents LoginScreen from showing loading state after logout redirect. Also removed redundant set({ isLoading: false }).
- ℹ️ Noted review 2 findings [LOW]: SettingsScreen dead Snackbar, clearAuth biometryType reset, handleSessionExpired double-set. Harmless — deferred.

### Change Log

- 2026-02-26: Implemented Story 1.6 — Session Management & Logout (all 7 tasks, all 6 ACs)
- 2026-02-26: Code review completed — 2 HIGH, 3 MEDIUM, 3 LOW issues found. 8 action items added. Status → in-progress.
- 2026-02-26: Addressed code review findings — 7 of 7 items resolved (2 HIGH, 2 MEDIUM, 3 LOW).
- 2026-02-26: Code review 2 completed — 1 HIGH, 2 MEDIUM, 4 LOW issues found. Fixed 1 HIGH (updatePassword regression) and 1 MEDIUM (logout loading state leak). 4 LOW noted.

### File List

- `src/features/auth/services/authService.ts` (modified — added signOut method; review: aligned return type to AuthResult)
- `src/shared/stores/useAuthStore.ts` (modified — added logout, handleSessionExpired, updateLastActive, clearSessionExpiredMessage actions; lastActiveTimestamp, sessionExpiredMessage state; updated clearAuth; review: fixed race condition in logout, made handleSessionExpired async with await)
- `src/app/navigation/index.tsx` (modified — added inactivity timeout logic with INACTIVITY_TIMEOUT_MS constant; review: removed reactive selectors from AppState useEffect, use getState() instead; removed redundant setIsBiometricVerified)
- `src/app/providers/AuthProvider.tsx` (modified — added SIGNED_OUT event handling for session expiry)
- `src/features/settings/screens/SettingsScreen.tsx` (modified — added Account section with email display, logout button, confirmation dialog, session expired Snackbar; review: added accessibilityLiveRegion)
- `src/features/auth/screens/LoginScreen.tsx` (modified — added session expired Snackbar; review: added accessibilityLiveRegion)
- `src/features/auth/index.ts` (modified — exported signOut)
