# Story 1.4: Biometric Authentication Setup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security-conscious user,
I want to log in using Face ID or Fingerprint,
So that I can access my app quickly and securely without typing my password.

## Acceptance Criteria

1. **AC1 - Biometric Enrollment (Enable):** Given the user is logged in and their device supports biometric authentication, when they navigate to Settings and enable the biometric login toggle, then biometric enrollment is completed via `react-native-biometrics` (`createKeys()`), auth tokens (refresh token) are stored in biometric-protected secure storage via `react-native-keychain` (`setGenericPassword` with `accessControl: BIOMETRY_ANY`), and the toggle reflects the enabled state. The biometric preference (`isBiometricEnabled`) is persisted to AsyncStorage via the auth store.

2. **AC2 - Biometric Login on App Open:** Given biometric login is enabled, when the user opens the app (and has a valid persisted session), then a biometric prompt is displayed (Face ID on iOS / Fingerprint on Android) via `ReactNativeBiometrics.simplePrompt()`. Upon successful verification, the stored refresh token is retrieved from Keychain, used to restore the Supabase session (`supabase.auth.setSession()`), and the user is logged in. Biometric data is never stored on the server (NFR12).

3. **AC3 - Biometric Failure Fallback:** Given biometric verification fails (wrong fingerprint, Face ID fail, user cancels, or sensor error), when the user cannot authenticate biometrically, then a fallback to email/password login is provided. The user sees a clear message: "Biometric authentication failed" with a "Use Password" button that navigates to the Login screen.

4. **AC4 - Disable Biometric:** Given the user wants to disable biometric login, when they toggle off biometric in Settings, then biometric authentication is disabled, stored credentials are removed from Keychain (`resetGenericPassword()`), biometric keys are deleted (`deleteKeys()`), the `isBiometricEnabled` flag is set to `false` in the auth store, and the app requires email/password for the next login.

5. **AC5 - Device Compatibility Check:** Given the user opens the biometric settings, when the device does not support biometric authentication (no hardware, no enrolled biometrics), then the toggle is disabled with a helper text: "Your device does not support biometric authentication" or "No biometrics enrolled on this device." The `isBiometricAvailable` flag in the auth store reflects the device capability.

6. **AC6 - Session Expiry with Biometric:** Given the user has biometric enabled but their refresh token has expired (after 7 days), when they attempt biometric login, then the biometric prompt still shows, but after Keychain retrieval the session restore fails. The user is shown: "Session expired. Please log in with your password." and redirected to the Login screen. The stored Keychain credentials are cleared.

7. **AC7 - Accessibility:** The biometric toggle has `accessibilityLabel="Enable biometric login"` and `accessibilityRole="switch"`. The biometric prompt text is clear: "Log in to SubTrack" with subtitle "Verify your identity". All touch targets are minimum 44x44pt.

## Tasks / Subtasks

- [x] Task 1: Install biometric dependencies (AC: #1, #2, #5)
  - [x] 1.1 Install `react-native-biometrics` via `npx expo install react-native-biometrics`
  - [x] 1.2 Install `react-native-keychain` via `npx expo install react-native-keychain`
  - [x] 1.3 Add `NSFaceIDUsageDescription` permission string to `app.json` plugins/infoPlist: "Log in to SubTrack securely with Face ID"
  - [x] 1.4 Verify both libraries are compatible with Expo SDK 54 (may need development build — NOT Expo Go)
  - [x] 1.5 Run `npx expo prebuild` if needed to generate native modules config

- [x] Task 2: Create biometric service (AC: #1, #2, #3, #4, #5, #6)
  - [x] 2.1 Create `src/features/auth/services/biometricService.ts`
  - [x] 2.2 Implement `checkBiometricAvailability(): Promise<BiometricCheckResult>` — calls `ReactNativeBiometrics.isSensorAvailable()`, returns `{ available: boolean, biometryType: 'FaceID' | 'TouchID' | 'Biometrics' | null }`
  - [x] 2.3 Implement `enrollBiometric(refreshToken: string): Promise<BiometricResult>` — calls `createKeys()`, stores refresh token in Keychain via `Keychain.setGenericPassword('biometric_token', refreshToken, { accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY, accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY })`
  - [x] 2.4 Implement `authenticateWithBiometric(): Promise<BiometricAuthResult>` — calls `simplePrompt({ promptMessage: 'Log in to SubTrack', cancelButtonText: 'Use Password' })`, on success retrieves token from Keychain, returns `{ success: boolean, refreshToken: string | null, error: BiometricError | null }`
  - [x] 2.5 Implement `disableBiometric(): Promise<void>` — calls `deleteKeys()`, calls `Keychain.resetGenericPassword()`, clears all biometric state
  - [x] 2.6 Implement `getStoredToken(): Promise<string | null>` — retrieves refresh token from Keychain without biometric prompt (for checking existence)
  - [x] 2.7 Map biometric errors to user-friendly messages: sensor not available → "Your device does not support biometric authentication", no biometrics enrolled → "No biometrics enrolled on this device", authentication failed → "Biometric authentication failed", user cancelled → null (silent)

- [x] Task 3: Add biometric types (AC: all)
  - [x] 3.1 Add biometric types to `src/features/auth/types/index.ts`: `BiometricCheckResult`, `BiometricResult`, `BiometricAuthResult`, `BiometricError`
  - [x] 3.2 Define `BiometricError` interface: `{ message: string, code: 'NOT_AVAILABLE' | 'NOT_ENROLLED' | 'AUTH_FAILED' | 'USER_CANCELLED' | 'SESSION_EXPIRED' | 'KEYCHAIN_ERROR' | 'UNKNOWN' }`

- [x] Task 4: Extend useAuthStore with biometric state (AC: #1, #2, #4, #5)
  - [x] 4.1 Add biometric state fields to `src/shared/stores/useAuthStore.ts`: `isBiometricAvailable: boolean`, `isBiometricEnabled: boolean`, `biometryType: string | null`
  - [x] 4.2 Add `checkBiometricAvailability(): Promise<void>` action — calls biometricService.checkBiometricAvailability(), updates store
  - [x] 4.3 Add `enableBiometric(): Promise<void>` action — calls biometricService.enrollBiometric(session.refresh_token), sets `isBiometricEnabled: true` on success
  - [x] 4.4 Add `disableBiometric(): Promise<void>` action — calls biometricService.disableBiometric(), sets `isBiometricEnabled: false`
  - [x] 4.5 Add `authenticateWithBiometric(): Promise<boolean>` action — calls biometricService.authenticateWithBiometric(), on success calls `supabase.auth.setSession()` with retrieved refresh token, returns success boolean
  - [x] 4.6 Persist `isBiometricEnabled` and `biometryType` in AsyncStorage partialize config (add to existing persisted fields)
  - [x] 4.7 Update `clearAuth()` to reset biometric state (`isBiometricEnabled: false`, `biometryType: null`) but NOT `isBiometricAvailable` (device capability doesn't change)

- [x] Task 5: Implement BiometricPromptScreen (AC: #2, #3, #6)
  - [x] 5.1 Create `src/features/auth/screens/BiometricPromptScreen.tsx`
  - [x] 5.2 Screen shows on app open when `isAuthenticated && isBiometricEnabled` — before MainTabs
  - [x] 5.3 Auto-trigger `authenticateWithBiometric()` on mount via `useEffect`
  - [x] 5.4 Show SubTrack logo + "Verifying your identity..." text during biometric prompt
  - [x] 5.5 On success: navigate to MainTabs (or let auth state handle it)
  - [x] 5.6 On failure: show "Biometric authentication failed" message with "Use Password" button and "Try Again" button
  - [x] 5.7 "Use Password" button: calls `clearAuth()` and navigates to Login screen
  - [x] 5.8 "Try Again" button: re-triggers biometric prompt
  - [x] 5.9 On session expired (AC6): show "Session expired. Please log in with your password." message, clear Keychain, redirect to Login

- [x] Task 6: Implement Settings biometric toggle (AC: #1, #4, #5, #7)
  - [x] 6.1 Update `src/features/settings/screens/SettingsScreen.tsx` — replace placeholder with actual settings UI
  - [x] 6.2 Add "Security" section with biometric toggle using `react-native-paper` `Switch` component
  - [x] 6.3 Toggle label shows biometry type: "Face ID" / "Fingerprint" / "Biometric Login" based on `biometryType` from store
  - [x] 6.4 Toggle is disabled when `isBiometricAvailable === false` with helper text explaining why
  - [x] 6.5 Toggle on: calls `enableBiometric()` from store, shows loading indicator during enrollment
  - [x] 6.6 Toggle off: shows confirmation dialog "Disable biometric login?", on confirm calls `disableBiometric()` from store
  - [x] 6.7 Show success Snackbar "Biometric login enabled" / "Biometric login disabled" after toggle action
  - [x] 6.8 Call `checkBiometricAvailability()` on screen mount to ensure latest device state
  - [x] 6.9 Add `accessibilityLabel` and `accessibilityRole="switch"` to toggle (AC7)
  - [x] 6.10 Ensure all elements have minimum 44x44pt touch targets

- [x] Task 7: Update navigation for biometric flow (AC: #2, #3)
  - [x] 7.1 Update `src/app/navigation/index.tsx` (RootNavigator) to handle biometric gate: when `isAuthenticated && isBiometricEnabled`, show BiometricPromptScreen before MainTabs
  - [x] 7.2 Add `isBiometricVerified: boolean` state (NOT persisted) to control biometric gate — resets to `false` on app restart via `AppState` listener
  - [x] 7.3 Navigation flow: `isAuthenticated === false` → AuthStack | `isAuthenticated && isBiometricEnabled && !isBiometricVerified` → BiometricPromptScreen | `isAuthenticated && (!isBiometricEnabled || isBiometricVerified)` → MainTabs
  - [x] 7.4 Add `BiometricPrompt` to navigation types if needed

- [x] Task 8: Update AuthProvider for biometric initialization (AC: #5)
  - [x] 8.1 In `src/app/providers/AuthProvider.tsx`, call `checkBiometricAvailability()` once on mount to populate `isBiometricAvailable` and `biometryType` in store
  - [x] 8.2 Ensure this runs AFTER auth state is initialized (after onAuthStateChange fires)

- [x] Task 9: Update feature exports and verify (AC: all)
  - [x] 9.1 Update `src/features/auth/index.ts` to export BiometricPromptScreen, biometric types, biometric service functions
  - [x] 9.2 Update `src/features/settings/index.ts` to export SettingsScreen
  - [x] 9.3 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`)
  - [x] 9.4 Run `npx tsc --noEmit` — zero errors
  - [x] 9.5 Run `npx eslint src/` — zero errors/warnings

## Dev Notes

### Critical Technical Requirements

**react-native-biometrics API (CRITICAL — use correct API):**

```typescript
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

// Check availability
const { available, biometryType } = await rnBiometrics.isSensorAvailable();
// biometryType: BiometryTypes.FaceID | BiometryTypes.TouchID | BiometryTypes.Biometrics

// Create keys (enrollment)
const { publicKey } = await rnBiometrics.createKeys();

// Simple prompt (authentication)
const { success, error } = await rnBiometrics.simplePrompt({
  promptMessage: 'Log in to SubTrack',
  cancelButtonText: 'Use Password',
});

// Delete keys (unenrollment)
const { keysDeleted } = await rnBiometrics.deleteKeys();
```

**react-native-keychain API (CRITICAL — store refresh token securely):**

```typescript
import * as Keychain from 'react-native-keychain';

// Store token with biometric protection
await Keychain.setGenericPassword(
  'biometric_token',           // username (key identifier)
  refreshToken,                // password (the actual token)
  {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    service: 'com.subtrack.biometric',
  }
);

// Retrieve token (may trigger biometric prompt on some devices)
const credentials = await Keychain.getGenericPassword({
  service: 'com.subtrack.biometric',
});
if (credentials) {
  const refreshToken = credentials.password;
}

// Clear stored credentials
await Keychain.resetGenericPassword({
  service: 'com.subtrack.biometric',
});
```

**IMPORTANT: Biometric Flow Architecture:**

The biometric login does NOT replace Supabase auth. The flow is:
1. User logs in with email/password (establishes Supabase session)
2. User enables biometric → refresh token stored in Keychain with biometric protection
3. On next app open → biometric prompt shown → on success → refresh token retrieved from Keychain → `supabase.auth.setSession({ refresh_token })` restores session
4. If refresh token expired → session restore fails → fallback to password login

**IMPORTANT: Expo Development Build Required:**

`react-native-biometrics` and `react-native-keychain` are native modules that do NOT work with Expo Go. A development build is required:
```bash
npx expo prebuild
npx expo run:ios    # or run:android
# OR use EAS Build:
eas build --profile development --platform ios
```

**IMPORTANT: iOS Permission (NSFaceIDUsageDescription):**

Must be added to `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSFaceIDUsageDescription": "Log in to SubTrack securely with Face ID"
      }
    }
  }
}
```

**IMPORTANT: Token Refresh Strategy:**

- Supabase refresh tokens have a 7-day expiry (configurable in Supabase Dashboard)
- When biometric retrieves an expired refresh token, `supabase.auth.setSession()` will fail
- Handle this gracefully: show "Session expired" message, clear Keychain, redirect to login
- On successful login after session expiry, re-store the new refresh token if biometric is still enabled

**IMPORTANT: AppState for Biometric Gate:**

The biometric gate (`isBiometricVerified`) must reset when the app goes to background and comes back:
```typescript
import { AppState } from 'react-native';

// In RootNavigator or a provider:
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active' && previousState === 'background') {
      // Reset biometric verification — user must re-authenticate
      setBiometricVerified(false);
    }
  });
  return () => subscription.remove();
}, []);
```

This aligns with NFR10 (session timeout on inactivity) — biometric re-verification on each app resume provides an extra security layer.

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure:** All biometric files within `src/features/auth/` (biometric is part of auth domain):

   ```
   features/auth/
   ├── components/          # (not needed for this story)
   ├── screens/
   │   ├── WelcomeScreen.tsx
   │   ├── LoginScreen.tsx
   │   ├── RegisterScreen.tsx
   │   └── BiometricPromptScreen.tsx  (NEW)
   ├── hooks/               # (not needed for this story)
   ├── services/
   │   ├── authService.ts    (existing — no changes)
   │   └── biometricService.ts  (NEW)
   ├── types/
   │   ├── index.ts          (MODIFY — add biometric types)
   │   └── schemas.ts        (existing — no changes)
   └── index.ts              (MODIFY — add exports)

   features/settings/
   ├── screens/
   │   └── SettingsScreen.tsx  (MODIFY — replace placeholder)
   └── index.ts               (MODIFY — add exports)
   ```

2. **Component Boundaries:**
   - BiometricPromptScreen → uses biometricService + useAuthStore
   - SettingsScreen → uses useAuthStore for biometric toggle state
   - useAuthStore is in `shared/stores/` (MODIFY — add biometric fields/actions)
   - biometricService is in `features/auth/services/` (NEW)
   - Feature → Shared imports ONLY, no cross-feature imports

3. **Naming Conventions:**
   - Components: PascalCase (`BiometricPromptScreen.tsx`)
   - Services: camelCase (`biometricService.ts`, `checkBiometricAvailability`)
   - Types: PascalCase (`BiometricCheckResult`, `BiometricAuthResult`)
   - Store actions: camelCase (`enableBiometric`, `authenticateWithBiometric`)

4. **Import Aliases — REQUIRED:**
   ```typescript
   import { supabase } from '@shared/services/supabase';
   import { useAuthStore } from '@shared/stores/useAuthStore';
   import type { AuthStackParamList } from '@app/navigation/types';
   import { checkBiometricAvailability, enrollBiometric } from '@features/auth/services/biometricService';
   ```

5. **Error Handling Pattern:** Async actions inside Zustand store with try/catch, error state managed in store, user-friendly messages via error mapping function in biometricService.

6. **Store Pattern (Zustand v5 + persist + AsyncStorage):**
   ```typescript
   // Follow EXACT same pattern as existing useAuthStore
   // Add biometric fields to state interface
   // Add biometric fields to persist partialize
   // Actions: set loading → call service → handle error/success → update state
   ```

### Library & Framework Requirements

**New Dependencies to Install:**

| Package                  | Version  | Notes                                                     |
| ------------------------ | -------- | --------------------------------------------------------- |
| react-native-biometrics  | latest   | Check Expo SDK 54 compatibility — may need config plugin  |
| react-native-keychain    | latest   | Check Expo SDK 54 compatibility — may need config plugin  |

**Existing Dependencies (NO changes needed):**

| Package               | Version  | Notes                                                         |
| --------------------- | -------- | ------------------------------------------------------------- |
| @supabase/supabase-js | ^2.95.3  | `setSession()` for restoring session from refresh token       |
| zustand               | ^5.0.11  | v5 with `persist` middleware + AsyncStorage                   |
| @react-native-async-storage/async-storage | 2.2.0 | Store persistence (replaced MMKV in latest commit)  |
| react-native-paper    | ^5.15.0  | Switch, List.Item, HelperText, Snackbar for Settings UI      |

**CRITICAL: MMKV was removed in latest commit (bcfa245).** The project now uses `@react-native-async-storage/async-storage` everywhere:
- Supabase client auth storage: AsyncStorage
- Zustand store persistence: AsyncStorage
- Do NOT reference MMKV anywhere

### File Structure Requirements

**Files to CREATE:**
- `src/features/auth/services/biometricService.ts` — Biometric enrollment, authentication, cleanup
- `src/features/auth/screens/BiometricPromptScreen.tsx` — Biometric gate screen on app open

**Files to MODIFY:**
- `src/features/auth/types/index.ts` — Add BiometricCheckResult, BiometricResult, BiometricAuthResult, BiometricError types
- `src/shared/stores/useAuthStore.ts` — Add biometric state fields (isBiometricAvailable, isBiometricEnabled, biometryType) and actions
- `src/features/settings/screens/SettingsScreen.tsx` — Replace placeholder with Security section containing biometric toggle
- `src/features/settings/index.ts` — Export SettingsScreen
- `src/features/auth/index.ts` — Export BiometricPromptScreen, biometric types, biometric service functions
- `src/app/navigation/index.tsx` — Add biometric gate logic (isBiometricVerified state)
- `src/app/providers/AuthProvider.tsx` — Add checkBiometricAvailability on mount
- `app.json` — Add NSFaceIDUsageDescription iOS permission
- `package.json` — New dependencies added via install commands

**Files NOT to touch:**
- `src/features/auth/services/authService.ts` — No changes needed
- `src/features/auth/screens/LoginScreen.tsx` — No changes needed
- `src/features/auth/screens/RegisterScreen.tsx` — No changes needed
- `src/features/auth/screens/WelcomeScreen.tsx` — No changes needed
- `src/features/auth/types/schemas.ts` — No changes needed
- `src/shared/services/supabase.ts` — No changes needed
- `src/config/env.ts` — No changes needed
- `src/config/theme.ts` — No changes needed
- `src/app/navigation/AuthStack.tsx` — No changes needed
- `src/app/navigation/MainTabs.tsx` — No changes needed

### Testing Requirements

- Verify TypeScript compiles with zero errors: `npx tsc --noEmit`
- Verify ESLint passes: `npx eslint src/`
- **IMPORTANT: Must test on physical device or simulator with biometric capability** — Expo Go will NOT work with native biometric modules
- **Manual smoke test:**
  1. App launches → if biometric disabled → normal login flow (unchanged from Story 1.3)
  2. Login with email/password → navigate to Settings → see biometric toggle
  3. If device has no biometrics → toggle disabled with helper text
  4. Enable biometric toggle → biometric enrollment succeeds → "Biometric login enabled" snackbar
  5. Close app completely → reopen → biometric prompt appears
  6. Successful biometric → enters MainTabs directly
  7. Failed biometric (cancel/wrong finger) → "Biometric authentication failed" + "Use Password" / "Try Again" buttons
  8. "Use Password" → redirects to Login screen
  9. "Try Again" → re-triggers biometric prompt
  10. Go to Settings → disable biometric → confirm dialog → biometric disabled
  11. Close and reopen → no biometric prompt → normal auto-login flow
  12. Test session expiry scenario: wait for refresh token expiry (or manually clear) → biometric prompt → retrieves expired token → "Session expired" message → redirect to Login

### Previous Story Intelligence (Story 1.3)

**Key Learnings from Story 1.3 (CRITICAL — Apply to this story):**

- **AsyncStorage (NOT MMKV):** Project switched from react-native-mmkv to @react-native-async-storage/async-storage in commit bcfa245. useAuthStore and supabase client both use AsyncStorage now.
- **Zod v4 API:** `z.email()` directly (NOT `z.string().email()`). Not directly needed for this story but good to know.
- **ESLint:** Flat config format (eslint.config.js). Unused variables in catch blocks → use bare `catch {}`.
- **React Navigation v7 dynamic API:** Navigation works by checking state in RootNavigator — no imperative navigation for auth flow changes.
- **Error type:** `AuthError` has `message: string` and optional `code?: string`. Reuse same pattern for `BiometricError`.
- **Theme compliance:** Use `theme.colors.*` via `useTheme()` hook, not hardcoded hex values.
- **Accessibility:** Include `accessibilityLabel` on interactive elements. Min 44x44pt touch targets.
- **Provider hierarchy:** SafeAreaProvider → GestureHandler → QueryProvider → ThemeProvider → AuthProvider → Navigation (do NOT change).
- **Code review fixes from 1.2/1.3:** error type alignment, email trimming, theme color compliance, retry UX for network errors.

**Patterns to Reuse from Existing Code:**

- Auth store action pattern: `set({ isLoading: true, error: null })` → call service → handle error/success → update state
- Error mapping pattern from authService (create similar for biometricService)
- `clearAuth()` pattern for cleanup
- Screen structure patterns from LoginScreen/RegisterScreen

### Git Intelligence

**Recent Commits (last 5):**

```
bcfa245 remove react-native-mmkv and install react-native-async-storage
b8eea4b project setup in new device
27397b2 Quick Update (v6.0.0-Beta.8 → v6.0.1)
202973b story 1.3 done
bae950a story 1.3 ready for review
```

**CRITICAL from latest commit (bcfa245):**
- Replaced `react-native-mmkv` with `@react-native-async-storage/async-storage`
- `src/shared/services/supabase.ts` changed to use AsyncStorage
- `src/shared/stores/useAuthStore.ts` changed to use AsyncStorage for persistence
- Architecture and epics docs updated to reflect the change

**Code Patterns Established:**
- Commit messages are concise and descriptive
- Auth errors mapped in service layer, stored in Zustand, displayed in screen
- Navigation is state-driven (not imperative)
- Feature-based modular structure strictly followed

### Project Structure Notes

- All new files follow the established `src/features/auth/` structure
- biometricService.ts goes in `services/` alongside authService.ts
- BiometricPromptScreen.tsx goes in `screens/` alongside Login/Register/Welcome
- Settings screen modification stays in `features/settings/`
- No cross-feature imports — communicate via Zustand stores
- Path aliases (`@features/*`, `@shared/*`, `@config/*`, `@app/*`) used for all imports

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Biometric Authentication Setup]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Post-Initialization Setup Required]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/prd.md#User Management - FR3, FR7]
- [Source: _bmad-output/planning-artifacts/prd.md#Security - NFR10, NFR12]
- [Source: _bmad-output/planning-artifacts/prd.md#Device Permissions - Biometric]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#App Access < 2 seconds]
- [Source: _bmad-output/implementation-artifacts/1-3-user-login-with-email-password.md]

## Change Log

- 2026-02-26: Story 1.4 implementation complete — biometric authentication (Face ID/Fingerprint) with enrollment, login gate, session expiry fallback, and settings toggle

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- TypeScript compilation: zero errors (`npx tsc --noEmit`)
- ESLint: zero errors/warnings (`npx eslint src/`)
- Dependencies installed: react-native-biometrics@3.0.1, react-native-keychain@10.0.0

### Completion Notes List

- **Task 1:** Installed react-native-biometrics and react-native-keychain via npx expo install. Added NSFaceIDUsageDescription to app.json iOS infoPlist. Both packages are compatible with Expo SDK 54 (require development build, not Expo Go).
- **Task 2:** Created biometricService.ts with 5 functions: checkBiometricAvailability, enrollBiometric, authenticateWithBiometric, disableBiometric, getStoredToken. Error mapping translates native errors to user-friendly messages with typed error codes. Uses dedicated Keychain service name (com.subtrack.biometric).
- **Task 3:** Added BiometricCheckResult, BiometricResult, BiometricAuthResult, BiometricError, and BiometricErrorCode types to auth types index.
- **Task 4:** Extended useAuthStore with isBiometricAvailable, isBiometricEnabled, biometryType state fields. Added checkBiometricAvailability, enableBiometric, disableBiometric, authenticateWithBiometric actions. authenticateWithBiometric retrieves refresh token from Keychain and restores Supabase session. clearAuth resets biometric state (except isBiometricAvailable). Persist config includes isBiometricEnabled and biometryType.
- **Task 5:** Created BiometricPromptScreen with auto-trigger on mount, "Verifying your identity..." loading state, error display with "Try Again" and "Use Password" buttons, and session expiry handling with dedicated message and password redirect.
- **Task 6:** Replaced SettingsScreen placeholder with full Security section. Biometric toggle shows device-appropriate label (Face ID/Fingerprint/Biometric Login), disabled state with explanation for unsupported devices, confirmation dialog for disabling, and Snackbar feedback. Accessibility labels and minimum 44pt touch targets applied.
- **Task 7:** Updated RootNavigator with biometric gate: BiometricPromptScreen renders before MainTabs when biometric is enabled and not yet verified. AppState listener resets verification on background, requiring re-authentication on app resume.
- **Task 8:** AuthProvider now calls checkBiometricAvailability on mount to populate device capability state.
- **Task 9:** Updated auth and settings feature exports. All imports use path aliases. TypeScript and ESLint pass with zero errors.

### File List

**New Files:**
- src/features/auth/services/biometricService.ts
- src/features/auth/screens/BiometricPromptScreen.tsx

**Modified Files:**
- src/features/auth/types/index.ts
- src/shared/stores/useAuthStore.ts
- src/features/settings/screens/SettingsScreen.tsx
- src/features/settings/index.ts
- src/features/auth/index.ts
- src/app/navigation/index.tsx
- src/app/providers/AuthProvider.tsx
- app.json
- package.json
- package-lock.json
