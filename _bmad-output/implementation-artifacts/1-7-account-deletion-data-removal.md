# Story 1.7: Account Deletion & Data Removal

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who wants to leave,
I want to delete my account and all associated data,
so that my personal information is completely removed per GDPR requirements.

## Acceptance Criteria

1. **AC1 - Delete Account Option:** Given the user is on the settings screen, when they view the Account section, then a "Delete Account" option is displayed below the "Log Out" button, styled in error/danger color to indicate destructive action.

2. **AC2 - Confirmation Dialog with Consequences:** Given the user taps "Delete Account", when the confirmation dialog appears, then it clearly explains the consequences: "This action is permanent and cannot be undone. All your data will be permanently deleted, including your account, subscriptions, settings, and notification preferences." The dialog provides "Cancel" and "Delete My Account" actions.

3. **AC3 - Identity Re-verification (Password):** Given the user confirms they want to delete, when the re-verification step is shown, then the user must enter their current password to proceed. If password verification fails, an error message is shown and deletion does not proceed.

4. **AC4 - Identity Re-verification (Biometric):** Given the user has biometric login enabled, when the re-verification step is shown, then an alternative "Verify with [Face ID/Fingerprint]" option is available alongside password entry. If biometric verification succeeds, deletion proceeds without password.

5. **AC5 - Server-Side Data Deletion:** Given the user successfully verifies their identity, when the deletion process executes, then a Supabase Edge Function is called that:
   - Verifies the user's JWT
   - Deletes ALL user data from database tables (future-proofed with extensible pattern)
   - Deletes the auth user via `supabase.auth.admin.deleteUser(userId)`
   - Returns success/failure status

6. **AC6 - Local Data Cleanup:** Given server-side deletion succeeds, when local cleanup executes, then:
   - All AsyncStorage data is cleared (`AsyncStorage.clear()`)
   - Biometric credentials are cleared from Keychain
   - All Zustand stores are reset
   - React Query cache is invalidated

7. **AC7 - Post-Deletion Navigation:** Given all data is cleaned up, when cleanup completes, then the user is redirected to the Welcome/Login screen (AuthStack). The navigation state is fully reset — pressing back does NOT return to any authenticated screen.

8. **AC8 - Cancellation:** Given the user taps "Delete Account" but cancels at any point (confirmation dialog or re-verification), when they dismiss or cancel, then no data is deleted and the user remains logged in on the Settings screen.

9. **AC9 - Error Handling:** Given the deletion process fails (network error, server error), when the error occurs, then a user-friendly error message is displayed, the user remains logged in, and no local data is cleared. The user can retry.

10. **AC10 - Accessibility:** All interactive elements have `accessibilityLabel` and appropriate `accessibilityRole`. Touch targets are minimum 44x44pt. Dialog buttons and text inputs are accessible. Error messages are announced to screen readers via `accessibilityLiveRegion="polite"`.

## Tasks / Subtasks

- [ ] Task 1: Create Supabase Edge Function for Account Deletion (AC: #5)
  - [ ] 1.1 Create `supabase/functions/delete-account/index.ts` Edge Function
    - Import `createClient` from `@supabase/supabase-js` (Deno/JSR import)
    - Accept POST requests only, reject other methods with 405
    - Extract JWT from `Authorization` header
    - Create admin Supabase client with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (auto-set env vars)
    - Create user Supabase client with `SUPABASE_URL` + `SUPABASE_ANON_KEY` + user's JWT
    - Call `supabaseUser.auth.getUser()` to verify JWT and extract `user.id`
    - If JWT invalid → return 401 `{ error: 'Unauthorized' }`
    - Delete user data from tables (currently no user data tables — add extensible comment for future epics)
    - Call `supabaseAdmin.auth.admin.deleteUser(user.id)` to delete auth user
    - If delete fails → return 500 `{ error: deleteError.message }`
    - On success → return 200 `{ success: true }`
    - Add CORS headers for Supabase client compatibility
  - [ ] 1.2 Test Edge Function locally with `supabase functions serve delete-account`

- [ ] Task 2: Add deleteAccount Service Method to authService (AC: #5, #9)
  - [ ] 2.1 Add `deleteAccount(): Promise<AuthResult>` to `src/features/auth/services/authService.ts`
    - Call `supabase.functions.invoke('delete-account', { method: 'POST' })`
    - The Supabase client automatically sends the user's JWT in the Authorization header
    - Map errors: network errors, server errors, unauthorized
    - Return `AuthResult` (consistent with all other authService methods)
  - [ ] 2.2 Add error mapping for Edge Function specific errors:
    - 401 → `{ message: 'Session expired. Please log in again.', code: 'AUTH_ERROR' }`
    - 500 → `{ message: 'Failed to delete account. Please try again.', code: 'DELETE_FAILED' }`
    - Network → existing `NETWORK_ERROR` pattern

- [ ] Task 3: Add deleteAccount Action to useAuthStore (AC: #3, #4, #5, #6, #7, #9)
  - [ ] 3.1 Import `deleteAccount as deleteAccountService` from authService in `src/shared/stores/useAuthStore.ts`
  - [ ] 3.2 Import `AsyncStorage` from `@react-native-async-storage/async-storage`
  - [ ] 3.3 Add `isDeleting: boolean` state field (NOT persisted — transient, distinguishes from isLoading)
  - [ ] 3.4 Add `deleteAccount(password: string): Promise<boolean>` action:
    - `set({ isDeleting: true, error: null })`
    - **Step 1 — Re-verify password:** Call `signInWithEmail(user.email, password)` to verify credentials
    - If signIn returns error → `set({ error: signInResult.error, isDeleting: false })`, return false
    - **Step 2 — Set isAuthenticated:false BEFORE deletion** (same pattern as logout — prevents AuthProvider from triggering "session expired" message when SIGNED_OUT event fires)
    - **Step 3 — Call Edge Function:** Call `deleteAccountService()`
    - If Edge Function returns error → restore `isAuthenticated: true`, `set({ error, isDeleting: false })`, return false
    - **Step 4 — Local cleanup:** `await disableBiometricService()` (clear Keychain), `await AsyncStorage.clear()` (clear ALL local data)
    - **Step 5 — Reset store:** `clearAuth()` + `set({ isDeleting: false })`
    - Return true
  - [ ] 3.5 Add `deleteAccountWithBiometric(): Promise<boolean>` action:
    - `set({ isDeleting: true, error: null })`
    - **Step 1 — Biometric verification:** Call `authenticateWithBiometricService()`
    - If biometric fails → `set({ error: { message: 'Biometric verification failed.', code: 'AUTH_FAILED' }, isDeleting: false })`, return false
    - **Steps 2-5:** Same as `deleteAccount` steps 2-5 (set isAuthenticated:false, call Edge Function, local cleanup, reset store)
    - Return true
  - [ ] 3.6 Add `isDeleting` to `AuthState` interface and `partialize` exclusion (do NOT persist)
  - [ ] 3.7 Add `deleteAccount` and `deleteAccountWithBiometric` to `AuthActions` interface
  - [ ] 3.8 Update `clearAuth()` to also reset `isDeleting: false`

- [ ] Task 4: Add Delete Account UI to SettingsScreen (AC: #1, #2, #3, #4, #8, #10)
  - [ ] 4.1 Update `src/features/settings/screens/SettingsScreen.tsx`:
    - Import `TextInput` from `react-native-paper`
    - Import `deleteAccount`, `deleteAccountWithBiometric`, `isDeleting` from useAuthStore
    - Import `isBiometricVerified` from useAuthStore (if needed to determine biometric availability for delete)
  - [ ] 4.2 Add local state:
    - `showDeleteDialog: boolean` (false) — controls confirmation dialog visibility
    - `showDeleteVerification: boolean` (false) — controls re-verification step visibility
    - `deletePassword: string` ('') — password input value
    - `deleteError: string` ('') — local error message for password field
  - [ ] 4.3 Add "Delete Account" `List.Item` to Account section (BELOW the "Log Out" item):
    - Title: "Delete Account"
    - titleStyle: `{ color: theme.colors.error }` (red/danger color)
    - Left icon: "delete-forever" with `color: theme.colors.error`
    - `onPress`: `() => setShowDeleteDialog(true)`
    - `disabled`: `isLoading || isDeleting`
    - `accessibilityLabel`: "Delete Account"
    - `accessibilityRole`: "button"
    - `style`: `styles.listItem`
  - [ ] 4.4 Add Step 1 confirmation dialog (inside existing `<Portal>`):
    - `visible`: `showDeleteDialog`
    - `onDismiss`: `() => setShowDeleteDialog(false)`
    - Title: "Delete Account"
    - Content: Warning text:
      "This action is permanent and cannot be undone.\n\nAll your data will be permanently deleted:\n• Your account and profile\n• All subscriptions and settings\n• All notification preferences"
    - Actions: "Cancel" → dismiss dialog, "Continue" → `setShowDeleteDialog(false); setShowDeleteVerification(true); setDeletePassword(''); setDeleteError('');`
  - [ ] 4.5 Add Step 2 re-verification dialog (inside existing `<Portal>`):
    - `visible`: `showDeleteVerification`
    - `onDismiss`: `() => { setShowDeleteVerification(false); setDeletePassword(''); setDeleteError(''); }`
    - `dismissable`: `!isDeleting` (prevent dismiss during deletion)
    - Title: "Verify Your Identity"
    - Content:
      - Text: "Enter your password to confirm account deletion."
      - `TextInput` for password (mode="outlined", secureTextEntry, label="Password", value=deletePassword, onChangeText, disabled=isDeleting, autoFocus=true)
      - If `deleteError`: `HelperText type="error"` showing error message
      - If `isBiometricEnabled && isBiometricAvailable`: Divider + "Or verify with [biometricLabel]" Button (mode="outlined", icon=biometric icon, onPress=handleDeleteWithBiometric, disabled=isDeleting)
    - Actions:
      - "Cancel" → dismiss, clear password/error
      - "Delete My Account" → `handleDeleteWithPassword()`, `textColor: theme.colors.error`, `disabled: isDeleting || !deletePassword.trim()`
  - [ ] 4.6 Add handler functions:
    - `handleDeleteWithPassword`: call `deleteAccount(deletePassword)`, if returns false → `setDeleteError(useAuthStore.getState().error?.message ?? 'Deletion failed.')`, if returns true → dialog auto-closes (user navigated away)
    - `handleDeleteWithBiometric`: call `deleteAccountWithBiometric()`, if returns false → `setDeleteError(useAuthStore.getState().error?.message ?? 'Verification failed.')`, if returns true → dialog auto-closes
  - [ ] 4.7 Accessibility: all new items and dialog elements have `accessibilityLabel`, `accessibilityRole`, min 44x44pt touch targets

- [ ] Task 5: Handle Post-Deletion in AuthProvider (AC: #7)
  - [ ] 5.1 Verify existing AuthProvider SIGNED_OUT handling works for deletion flow:
    - `deleteAccount` sets `isAuthenticated: false` BEFORE calling Edge Function
    - When `SIGNED_OUT` fires (from session invalidation after user deletion), AuthProvider checks `isAuthenticated` → already false → no "session expired" message
    - **No changes to AuthProvider should be needed** — verify this works correctly
  - [ ] 5.2 Verify RootNavigator redirects to AuthStack after `clearAuth()`:
    - `isAuthenticated: false` → RootNavigator shows AuthStack → user sees Login/Welcome screen
    - **No changes to navigation should be needed** — verify state-driven navigation works

- [ ] Task 6: Update Feature Exports and Verify (AC: all)
  - [ ] 6.1 Update `src/features/auth/index.ts` to export `deleteAccount` service method
  - [ ] 6.2 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`)
  - [ ] 6.3 Run `npx tsc --noEmit` — zero errors
  - [ ] 6.4 Run `npx eslint src/` — zero errors/warnings
  - [ ] 6.5 Test Edge Function deployment: `supabase functions deploy delete-account`

## Dev Notes

### Critical Technical Requirements

**Supabase Edge Function — Account Deletion (CRITICAL):**

`supabase.auth.admin.deleteUser()` requires the **service_role key** which MUST NEVER exist in client code. Therefore, account deletion MUST go through a Supabase Edge Function.

```typescript
// supabase/functions/delete-account/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get user's JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User client — verify JWT
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Admin client — delete user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // TODO: When data tables are created (Epic 2+), add deletion queries here:
    // await supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id)
    // await supabaseAdmin.from('reminder_settings').delete().eq('user_id', user.id)
    // await supabaseAdmin.from('user_settings').delete().eq('user_id', user.id)
    // Alternative: Use ON DELETE CASCADE foreign keys in migrations

    // Delete auth user (this is the final step — no recovery after this)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**CRITICAL: JWT Caveat After User Deletion:**
Deleting a user from `auth.users` does NOT automatically invalidate their JWT. The JWT remains technically valid until expiry (1h). However, since we clear all local data immediately after deletion, the user cannot make further API calls. Any subsequent API call with the old JWT will fail because the user no longer exists.

**CRITICAL: Password Re-Verification Flow:**

```typescript
// In useAuthStore deleteAccount action:
// Step 1: Re-verify password (creates new session — harmless since we delete right after)
const verifyResult = await signInWithEmail(user.email, password);
if (verifyResult.error) {
  set({ error: verifyResult.error, isDeleting: false });
  return false;
}

// Step 2: Set isAuthenticated:false BEFORE deletion
// Same pattern as logout — prevents AuthProvider's SIGNED_OUT handler
// from showing "session expired" message
set({ isAuthenticated: false });

// Step 3: Call Edge Function
const deleteResult = await deleteAccountService();
if (deleteResult.error) {
  // Restore auth state — deletion failed, user is still valid
  set({ isAuthenticated: true, error: deleteResult.error, isDeleting: false });
  return false;
}

// Step 4: Local cleanup — NUCLEAR: clear everything
await disableBiometricService(); // Keychain: biometric keys + stored tokens
await AsyncStorage.clear();       // ALL local data (stores, cache, everything)

// Step 5: Reset store (redundant after AsyncStorage.clear but ensures runtime state is clean)
clearAuth();
set({ isDeleting: false });
return true;
```

**CRITICAL: isDeleting vs isLoading distinction:**
Use a separate `isDeleting` boolean (NOT the existing `isLoading`) because:
1. `isLoading` is used by many UI elements (biometric toggle, logout button, etc.)
2. During deletion, we only want to disable the delete-related UI, not everything
3. The delete flow is longer and needs distinct loading/disabled state

**CRITICAL: Calling Edge Functions from Supabase Client:**

```typescript
// In authService.ts:
import { supabase } from '@shared/services/supabase';

export async function deleteAccount(): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });
    // supabase.functions.invoke automatically sends Authorization header with user's JWT

    if (error) {
      return {
        user: null, session: null,
        error: { message: 'Failed to delete account. Please try again.', code: 'DELETE_FAILED' },
      };
    }

    return { user: null, session: null, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null, session: null,
      error: {
        message: isNetwork ? 'No internet connection. Please try again.'
                           : 'Failed to delete account. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'DELETE_FAILED',
      },
    };
  }
}
```

**CRITICAL: AsyncStorage.clear() wipes ALL local data:**
- Zustand persisted auth store → reset
- Any React Query persisted cache → cleared
- All other AsyncStorage keys → cleared
- This is the most thorough approach for GDPR compliance
- After clear(), on next app launch everything starts fresh

**Biometric Re-Verification Alternative:**

```typescript
// If user has biometric enabled, they can verify via biometric instead of password
deleteAccountWithBiometric: async () => {
  set({ isDeleting: true, error: null });

  // Biometric auth verifies the user is the device owner
  const biometricResult = await authenticateWithBiometricService();
  if (!biometricResult.success) {
    set({ error: { message: 'Biometric verification failed.', code: 'AUTH_FAILED' }, isDeleting: false });
    return false;
  }

  // Same flow as password-verified deletion from step 2 onwards...
  set({ isAuthenticated: false });
  const deleteResult = await deleteAccountService();
  // ... rest same as deleteAccount
}
```

**Delete Account Dialog — Two-Step UX Flow:**

Step 1 (Confirmation): Explains consequences → "Continue" / "Cancel"
Step 2 (Verification): Password input + optional biometric → "Delete My Account" / "Cancel"

This two-step approach prevents accidental deletion while keeping the flow clear.

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure:** Account deletion spans auth service/store and settings UI:

   ```
   features/auth/
   ├── services/
   │   └── authService.ts             (MODIFY — add deleteAccount method)
   └── index.ts                       (MODIFY — export deleteAccount)

   features/settings/
   └── screens/
       └── SettingsScreen.tsx          (MODIFY — add Delete Account UI)

   shared/
   └── stores/
       └── useAuthStore.ts            (MODIFY — add deleteAccount, deleteAccountWithBiometric, isDeleting)

   supabase/
   └── functions/
       └── delete-account/
           └── index.ts               (CREATE — Edge Function for server-side deletion)
   ```

2. **Component Boundaries:**
   - SettingsScreen → uses useAuthStore `deleteAccount` and `deleteAccountWithBiometric` actions
   - AuthProvider → no changes needed (existing SIGNED_OUT handling works)
   - RootNavigator → no changes needed (state-driven navigation to AuthStack)
   - No cross-feature imports — communicate via Zustand stores

3. **Naming Conventions:**
   - Services: camelCase (`deleteAccount`)
   - Store actions: camelCase (`deleteAccount`, `deleteAccountWithBiometric`)
   - State fields: camelCase (`isDeleting`)
   - Edge Function: kebab-case directory (`delete-account`)
   - Types: PascalCase (existing `AuthResult`, `AuthError`)

4. **Import Aliases — REQUIRED:**
   ```typescript
   import { supabase } from '@shared/services/supabase';
   import { useAuthStore } from '@shared/stores/useAuthStore';
   import { deleteAccount } from '@features/auth/services/authService';
   import AsyncStorage from '@react-native-async-storage/async-storage';
   ```

5. **Error Handling Pattern:** Same as existing authService — async actions inside Zustand store with try/catch, error state managed in store, user-friendly messages. Account deletion MUST NOT clear local data on failure — only on confirmed server-side success.

6. **Store Pattern (Zustand v5 + persist + AsyncStorage):**
   ```typescript
   // Follow EXACT same pattern as existing actions:
   // set({ isDeleting: true, error: null }) → verify identity → call service → handle error/success → cleanup
   // CRITICAL: Only clear local data AFTER server-side deletion confirms success
   ```

### Library & Framework Requirements

**New Dependency: NONE for client code.**

**Existing Dependencies Used:**

| Package                                    | Version  | Notes                                                |
| ------------------------------------------ | -------- | ---------------------------------------------------- |
| @supabase/supabase-js                      | ^2.95.3  | `functions.invoke()` for Edge Function call          |
| react-native-paper                         | ^5.15.0  | List, Dialog, Portal, Button, TextInput, HelperText  |
| zustand                                    | ^5.0.11  | State management — add deleteAccount actions         |
| @react-native-async-storage/async-storage  | 2.2.0    | `AsyncStorage.clear()` for full local data wipe      |
| react-native-biometrics                    | ^3.0.1   | Biometric re-verification before deletion            |
| react-native-keychain                      | ^10.0.0  | Clear stored tokens on deletion (via disableBiometric)|

**Edge Function Dependency (Deno):**

| Package                | Source | Notes                                        |
| ---------------------- | ------ | -------------------------------------------- |
| @supabase/supabase-js  | JSR    | `jsr:@supabase/supabase-js@2` — admin client |

**CRITICAL: No new npm packages to install. The Edge Function uses Deno's JSR import, not npm.**

### File Structure Requirements

**Files to CREATE:**
- `supabase/functions/delete-account/index.ts` — Edge Function for server-side account deletion

**Files to MODIFY:**
- `src/features/auth/services/authService.ts` — Add `deleteAccount()` method
- `src/shared/stores/useAuthStore.ts` — Add `deleteAccount`, `deleteAccountWithBiometric` actions, `isDeleting` state
- `src/features/settings/screens/SettingsScreen.tsx` — Add Delete Account button + two-step dialog
- `src/features/auth/index.ts` — Export `deleteAccount`

**Files NOT to touch:**
- `src/app/providers/AuthProvider.tsx` — No changes needed (SIGNED_OUT handling works as-is)
- `src/app/navigation/index.tsx` — No changes needed (state-driven navigation works as-is)
- `src/app/navigation/AuthStack.tsx` — No changes needed
- `src/app/navigation/MainTabs.tsx` — No changes needed
- `src/app/navigation/SettingsStack.tsx` — No changes needed
- `src/app/navigation/types.ts` — No changes needed
- `src/features/auth/services/biometricService.ts` — No changes needed (reuse existing `disableBiometric`, `authenticateWithBiometric`)
- `src/shared/services/supabase.ts` — No changes needed
- `src/config/*` — No changes needed
- `package.json` — No new dependencies

### Testing Requirements

- Verify TypeScript compiles with zero errors: `npx tsc --noEmit`
- Verify ESLint passes: `npx eslint src/`
- Deploy Edge Function: `supabase functions deploy delete-account`
- **Manual Smoke Test:**
  1. App launches → Login → navigate to Settings → see Account section with "Delete Account" below "Log Out"
  2. Tap "Delete Account" → confirmation dialog appears explaining all data will be permanently deleted
  3. Tap "Cancel" → dialog dismisses, user stays on Settings, nothing deleted
  4. Tap "Delete Account" → "Continue" → verification dialog appears with password input
  5. Enter wrong password → error message "Invalid email or password." shown
  6. Enter correct password → "Delete My Account" → loading state → account deleted → redirected to Login/Welcome screen
  7. If biometric enabled: "Verify with Face ID/Fingerprint" option visible → tap → biometric prompt → success → deletion proceeds
  8. If biometric enabled: biometric fails → error message shown, user can retry or use password
  9. Verify: after deletion, app starts fresh — no persisted login state, no biometric credentials
  10. Verify: after deletion, trying to log in with deleted credentials fails (user does not exist)
  11. Network error test: enable airplane mode → attempt deletion → error "No internet connection" shown → user remains logged in
  12. Verify all dialog buttons have minimum 44x44pt touch targets
  13. Verify screen readers announce error messages (accessibilityLiveRegion)

### Previous Story Intelligence (Story 1.6)

**Key Learnings from Story 1.6 (CRITICAL — Apply to this story):**

- **Race condition prevention:** Set `isAuthenticated: false` BEFORE calling signOut/delete to prevent AuthProvider's SIGNED_OUT handler from showing "session expired" message. Same pattern applies to deleteAccount.
- **handleSessionExpired pattern:** After `isAuthenticated: false` is set, any SIGNED_OUT event from AuthProvider sees `!isAuthenticated` and skips the "session expired" message. This is exactly what we need for account deletion.
- **disableBiometricService() is async:** Must await it (Story 1.6 review finding). Apply same await pattern here.
- **logout forces local cleanup even on network failure:** For deleteAccount, this is DIFFERENT — do NOT clear local data if server-side deletion fails (user account still exists).
- **AsyncStorage (NOT MMKV):** Confirmed — use `@react-native-async-storage/async-storage` only.
- **ESLint flat config:** `eslint.config.js`. Unused variables in catch blocks → use bare `catch {}`.
- **Theme compliance:** Use `theme.colors.*` via `useTheme()` hook, not hardcoded hex values.
- **Dialog/Portal pattern:** Use existing `<Portal>` wrapper with `<Dialog>` — already established in SettingsScreen for logout and biometric disable.
- **Snackbar pattern:** Existing Snackbar in SettingsScreen for feedback messages.
- **Store action pattern:** `set({ isLoading/isDeleting: true, error: null })` → call service → handle error/success → update state.
- **Development build required:** Edge Function testing needs `supabase functions serve` for local development.
- **signInWithPassword for re-verification:** Already used in authService as `signInWithEmail`. Reuse this for password verification before deletion.
- **clearAuth() resets all state:** Including `isAuthenticated: false`, `user: null`, `session: null`. After `AsyncStorage.clear()`, this ensures clean runtime state even though persisted storage is already wiped.

**Patterns to Reuse from Existing Code:**

- Auth store action pattern from signIn/signUp/logout
- Error mapping pattern from authService (`mapAuthError`, `mapErrorCode`)
- Dialog/Portal pattern from SettingsScreen (logout dialog, biometric disable dialog)
- `disableBiometric()` from biometricService (Keychain + biometric key cleanup)
- `clearAuth()` from useAuthStore (full state reset)
- `signInWithEmail()` from authService (password re-verification)
- `authenticateWithBiometric()` from biometricService (biometric re-verification)
- `supabase.functions.invoke()` from Supabase JS client (Edge Function call)

### Git Intelligence

**Recent Commits (last 5):**

```
0a446b5 story 1.6 done
7319a72 in-progress after review story 1.6
35de5cb story 1.6 review
130dc84 in-progress 1.6
0019e7d story 1.6 review
```

**Key Insights:**
- Commit messages follow pattern: "story X.Y [status]"
- Stories follow lifecycle: ready-for-dev → in-progress → review → done
- Story 1.6 completed: session management, logout, inactivity timeout — all directly relevant to account deletion flow
- All auth patterns (store, service, provider) are mature and tested through 6 stories
- Biometric service established and reviewed across Stories 1.4, 1.5, 1.6

**Code Patterns Established:**
- Feature-based modular structure strictly followed
- Auth errors mapped in service layer → stored in Zustand → displayed in screen
- Navigation is state-driven (conditional rendering in RootNavigator based on isAuthenticated)
- Dialog/Portal pattern used in SettingsScreen for confirmation dialogs
- Zustand persist with AsyncStorage and partialize for selective persistence
- react-native-paper components used throughout for Material Design 3

### Project Structure Notes

- One new file created: `supabase/functions/delete-account/index.ts` (first Edge Function in the project)
- All other changes are modifications to existing files
- Account deletion is the first feature that requires a Supabase Edge Function — establishes the pattern for future Edge Functions (notifications, premium validation)
- The Edge Function pattern created here will be reused by Epic 4 (notifications) and Epic 6 (premium)
- Path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`) used for all client-side imports
- Edge Function uses Deno-style imports (JSR), not npm — different from client-side code

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Account Deletion & Data Removal]
- [Source: _bmad-output/planning-artifacts/prd.md#User Management - FR6]
- [Source: _bmad-output/planning-artifacts/prd.md#Security - NFR16 (GDPR data deletion within 30 days)]
- [Source: _bmad-output/planning-artifacts/prd.md#Data Handling Policies - Storage Limitation, Consent Withdrawal]
- [Source: _bmad-output/planning-artifacts/prd.md#Compliance & Regulatory - Right to Deletion]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns - Edge Functions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Delete confirmation]
- [Source: _bmad-output/implementation-artifacts/1-6-session-management-logout.md]
- [Source: Supabase Docs - auth.admin.deleteUser() requires service_role key]
- [Source: Supabase Docs - Deleting users does not auto-invalidate JWT]
- [Source: Supabase Docs - Cannot delete user if they own Storage objects]
- [Source: Supabase Docs - supabase.functions.invoke() for Edge Function calls]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
