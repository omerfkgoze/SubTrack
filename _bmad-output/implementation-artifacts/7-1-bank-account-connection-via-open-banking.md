# Story 7.1: Bank Account Connection via Open Banking

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a premium user,
I want to connect my bank account via Open Banking,
so that my subscriptions can be detected automatically from my transactions.

## Acceptance Criteria

1. **AC1: Bank Connection Screen Loads with Explanation**
   - **Given** the user navigates to Settings > Bank Connection
   - **When** the screen loads
   - **Then** an explanation of Open Banking is displayed: what it is, how it works, and security guarantees (SubTrack never sees bank credentials)
   - **And** a "Connect Bank Account" CTA is prominently shown
   - **And** the `bank_connections` table exists in Supabase with fields: `id`, `user_id`, `provider`, `bank_name`, `status`, `connected_at`, `consent_granted_at`, `consent_expires_at`, `last_synced_at`, `tink_credentials_id`

2. **AC2: GDPR Consent Screen Shown Before Tink Link**
   - **Given** the user taps "Connect Bank Account"
   - **When** the GDPR consent screen appears (before Tink Link opens)
   - **Then** the consent screen displays exactly what data will be accessed (accounts, last 90 days of transactions)
   - **And** clearly states what SubTrack will NOT do (no credentials, no payments, no third-party sharing, 30-day transaction retention)
   - **And** provides "Connect Bank Account" confirmation and "Cancel" options
   - **And** no part of the Tink OAuth flow has started until the user explicitly confirms

3. **AC3: Tink Link OAuth Flow Initiated**
   - **Given** the user confirms the GDPR consent screen
   - **When** the Tink Link flow starts
   - **Then** the PSD2-compliant Tink Link OAuth flow is initiated (WebView or native bridge — determined by spike in Task 1)
   - **And** the user can select their bank from Tink's bank list
   - **And** SCA (Strong Customer Authentication) is completed entirely within Tink Link — SubTrack never handles bank credentials

4. **AC4: Successful Connection Stored Securely**
   - **Given** the Tink OAuth flow completes successfully
   - **When** the app receives the authorization code callback via deep link (`subtrack://tink/callback`)
   - **Then** the Supabase Edge Function exchanges the authorization code for tokens (server-side only — client secret never in app)
   - **And** the connection record is stored in `bank_connections` with `status: 'active'`, `consent_granted_at: now()`, `consent_expires_at: now() + 180 days`
   - **And** Tink tokens are stored encrypted server-side and never logged (NFR17)
   - **And** a success message confirms the connection to the user

5. **AC5: Network Failure / Cancellation Handled Gracefully**
   - **Given** the OAuth flow fails or is cancelled by the user
   - **When** the app receives the error or cancellation callback
   - **Then** a user-friendly error message is shown with a retry option
   - **And** no partial data is stored in `bank_connections`
   - **And** the database remains clean (no orphan records)

6. **AC6: Network Failure During Token Exchange**
   - **Given** the Tink Link flow completes but the Edge Function cannot reach Tink API during token exchange
   - **When** the token exchange fails
   - **Then** no connection record is created
   - **And** the user sees: "Connection setup failed. Please try again."
   - **And** retrying initiates the full flow again (no partial state)

7. **AC7: Deep Link Callback Idempotency**
   - **Given** the Tink Link deep link callback arrives
   - **When** the Edge Function processes the authorization code
   - **Then** duplicate connection attempts for the same `tink_credentials_id` are rejected (idempotency check)
   - **And** the user is not shown duplicate connection entries

## Tasks / Subtasks

- [x] **Task 1: SPIKE — Confirm Tink Integration Path** (AC: #3)
  - [x] 1.1: Research whether `react-native-webview` (WebView path) or a custom native bridge is the correct Tink Link integration approach. See `docs/epic-7-prep-aggregator-decision.md#Expo-Go-Compatibility-Note` for the two paths.
  - [x] 1.2: **Path A (WebView — lower risk):** Verify `react-native-webview` is installed. If not: `npx expo install react-native-webview`. Embed Tink Link URL in WebView and handle deep link callback. Works in Expo Go.
  - [x] 1.3: **Path B (native bridge — better UX):** Custom Expo module wrapping `tink-link-android` / `tink-link-ios`. Requires `expo-dev-client`. If chosen: create Metro mock same pattern as `react-native-iap` mock in Epic 6 so Expo Go continues to work.
  - [x] 1.4: Document the chosen path in Dev Notes before proceeding. Default recommendation: **Path A (WebView)** unless native UX is clearly required.

- [x] **Task 2: Database — `bank_connections` table** (AC: #1, #4)
  - [x] 2.1: Create Supabase migration for `bank_connections` table with fields: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, `provider TEXT DEFAULT 'tink'`, `bank_name TEXT`, `status TEXT DEFAULT 'active'` (values: `active`, `expiring_soon`, `expired`, `error`, `disconnected`), `connected_at TIMESTAMPTZ DEFAULT now()`, `consent_granted_at TIMESTAMPTZ`, `consent_expires_at TIMESTAMPTZ`, `last_synced_at TIMESTAMPTZ`, `tink_credentials_id TEXT UNIQUE`
  - [x] 2.2: Add RLS policies: `SELECT`, `INSERT`, `UPDATE` filtered by `auth.uid() = user_id`. No direct `DELETE` — use Edge Function for clean disconnection.
  - [x] 2.3: Run `supabase gen types typescript` after migration to update generated types.

- [x] **Task 3: Environment & Tink credentials setup** (AC: #3, #4)
  - [x] 3.1: Verify Tink Console sandbox account is set up (per `docs/epic-7-prep-aggregator-decision.md#Tink-Console-Setup-Steps`). Check that `TINK_CLIENT_ID` and `TINK_CLIENT_SECRET` are stored in Supabase Edge Function environment variables (not in client app, not in `.env` files that reach the client bundle).
  - [x] 3.2: Verify deep link scheme `subtrack://tink/callback` is configured in `app.json` under `expo.scheme`. If missing, add it.
  - [x] 3.3: Verify `TINK_REDIRECT_URI` is configured in Tink Console matching the deep link.

- [x] **Task 4: Edge Function — token exchange** (AC: #4, #6, #7)
  - [x] 4.1: Create `supabase/functions/tink-connect/index.ts` — receives authorization code from client, exchanges for access + refresh tokens via Tink API (`POST /oauth/token`), stores connection record in `bank_connections`, returns success/error.
  - [x] 4.2: Implement idempotency: check if `tink_credentials_id` already exists before inserting. If exists, return existing connection instead of creating duplicate.
  - [x] 4.3: Tokens never returned to client — stored server-side only. Access tokens are not persisted (in-memory only, request-scoped). Refresh tokens stored in encrypted `bank_connections` column.
  - [x] 4.4: Scopes to request: `accounts:read` and `transactions:read` only (principle of least privilege per `docs/epic-7-prep-psd2-sca-overview.md#Data-Access-Scopes`).
  - [x] 4.5: On failure: return structured error, make no DB writes. Log error (without credentials) to Supabase logs.
  - [x] 4.6: Write Deno unit tests for the Edge Function (per Epic 6 retro decision — bank data Edge Functions are too complex for manual-only testing). Test: successful exchange, duplicate `tink_credentials_id` rejection, Tink API 5xx handling.

- [x] **Task 5: `useBankStore` Zustand store** (AC: #1, #4, #5)
  - [x] 5.1: Create `src/shared/stores/useBankStore.ts`. **Do NOT add bank state to `usePremiumStore`** — separate store per Epic 6 retro action P4/P5.
  - [x] 5.2: Store interface:
    ```typescript
    interface BankState {
      connections: BankConnection[];
      isConnecting: boolean;
      connectionError: AppError | null;
      fetchConnections: () => Promise<void>;
      initiateConnection: (authCode: string) => Promise<void>;
      clearConnectionError: () => void;
    }
    ```
  - [x] 5.3: Follow standard Zustand store pattern from architecture: state + actions in same store, async actions with try/catch, error managed in store, `isLoading` global per store.
  - [x] 5.4: `initiateConnection`: calls `tink-connect` Edge Function with authorization code, updates store state on success/failure.
  - [x] 5.5: Persist `connections` array to AsyncStorage (same pattern as `usePremiumStore` persistence).

- [x] **Task 6: Types** (AC: #1, #4)
  - [x] 6.1: Create `src/features/bank/types/index.ts` with:
    ```typescript
    export type BankConnectionStatus = 'active' | 'expiring_soon' | 'expired' | 'error' | 'disconnected';
    export interface BankConnection {
      id: string;
      userId: string;
      provider: 'tink';
      bankName: string;
      status: BankConnectionStatus;
      connectedAt: string; // ISO 8601
      consentGrantedAt: string; // ISO 8601
      consentExpiresAt: string; // ISO 8601 — consentGrantedAt + 180 days
      lastSyncedAt: string | null; // ISO 8601 | null for fresh connections
      tinkCredentialsId: string;
    }
    ```

- [x] **Task 7: Bank Connection Screen UI** (AC: #1, #2, #3, #4, #5)
  - [x] 7.1: Create `src/features/bank/screens/BankConnectionScreen.tsx`. Feature folder structure: `src/features/bank/screens/`, `src/features/bank/components/`, `src/features/bank/hooks/`, `src/features/bank/services/`, `src/features/bank/types/`, `src/features/bank/index.ts`.
  - [x] 7.2: Screen shows explanation of Open Banking with security guarantees. CTA: "Connect Bank Account".
  - [x] 7.3: On CTA tap: show GDPR consent dialog/modal (do NOT skip directly to Tink). Consent content per `docs/epic-7-prep-bank-privacy-compliance.md#In-App-Consent-Screen-Content`. Dialog has "Connect Bank Account" and "Cancel".
  - [x] 7.4: On consent confirm: initiate Tink Link flow (WebView or native bridge per Task 1 spike). Handle deep link callback.
  - [x] 7.5: On success: update store, show success snackbar "Bank account connected successfully", navigate back to Settings.
  - [x] 7.6: On failure/cancel: show error snackbar with retry option. Do NOT navigate away — keep user on the screen.
  - [x] 7.7: Use React Native Paper components (same as rest of app): `Surface`, `Button`, `Snackbar`, `ActivityIndicator`. `isConnecting` state → button disabled + spinner.

- [x] **Task 8: Settings navigation** (AC: #1)
  - [x] 8.1: Add "Bank Connection" entry to `SettingsScreen`. Navigates to `BankConnectionScreen`.
  - [x] 8.2: Add `BankConnection` route to `SettingsStack.tsx` (existing stack at `src/app/navigation/SettingsStack.tsx`).
  - [x] 8.3: Bank Connection is a **premium-only feature** — free users should see the entry with a lock icon; tapping navigates to PaywallScreen. Use same pattern as Story 6.5 SettingsScreen gating: `isPremium ? navigate('BankConnection') : navigate('Premium')`.

- [x] **Task 9: Tests** (AC: #1–#7)
  - [x] 9.1: `src/shared/stores/useBankStore.test.ts` — unit test store: initial state, `initiateConnection` success, `initiateConnection` failure (clears partial state, sets error), `fetchConnections` success/empty.
  - [x] 9.2: `src/features/bank/screens/BankConnectionScreen.test.tsx` — GDPR consent dialog appears before Tink Link, cancel keeps user on screen, success shows snackbar and navigates, error shows retry option, premium gate (free user sees lock / goes to Premium).
  - [x] 9.3: Deno Edge Function tests for `tink-connect` (see Task 4.6).
  - [x] 9.4: Co-locate all Jest tests with source files. No `__tests__/` directories.
  - [x] 9.5: Mock Tink SDK/WebView in tests — same Metro mock pattern used for `react-native-iap` in Epic 6.

## Dev Notes

### CRITICAL: Read Before Implementation

**This is a financial/external API story. Per Epic 6 retro (Lesson 1):** "We didn't know" is not valid for money-related flows. Do pre-implementation research with `context7` and `brave-search` before writing a single line of code.

**Mandatory pre-implementation research:**
- Confirm current Tink API v1 OAuth token exchange endpoint and parameters
- Verify `react-native-webview` version compatibility with Expo SDK 54
- If Path B (native bridge): verify `tink-link-android`/`tink-link-ios` SDK current versions

### Integration Architecture

**Tink is the AISP — SubTrack is NOT.** SubTrack never sees bank credentials. The full SCA flow happens inside Tink Link. SubTrack only receives an authorization code after successful bank authentication.

```
User taps "Connect" → GDPR consent → Tink Link opens → User selects bank →
SCA at bank (inside Tink) → Bank issues consent to Tink →
Deep link callback to SubTrack (authCode) → Edge Function exchanges code →
bank_connections record created → useBankStore updated → UI success
```

**Token architecture** (per `docs/epic-7-prep-psd2-sca-overview.md#OAuth-Token-Flow`):

| Token | Lifetime | Handling |
|-------|----------|----------|
| Authorization code | One-time use | Received via deep link, sent to Edge Function |
| Access token | 2 hours | In-memory in Edge Function only, never persisted |
| Refresh token | Tink-managed | Stored encrypted in `bank_connections`, server-side only |

**`TINK_CLIENT_SECRET` must NEVER appear in:**
- Client-side code
- `.env.development` / `.env.production` (these may be bundled)
- AsyncStorage
- Any log output

Only in Supabase Edge Function environment variables.

### Tink Integration Path Decision (Task 1 Spike)

**Path A — WebView (recommended starting point):**
- Embed Tink Link URL in `react-native-webview` (already a common dependency in Expo apps)
- Handle `subtrack://tink/callback` deep link when Tink redirects back
- Works in Expo Go — no Metro mock needed for WebView itself
- Lower implementation risk

**Path B — Native bridge:**
- Wrap `tink-link-android` (GitHub: tink-ab/tink-link-android) + `tink-link-ios` (GitHub: tink-ab/tink-link-ios) in a custom Expo module
- Requires `expo-dev-client` — Expo Go incompatible (same pattern as `react-native-iap` in Epic 6)
- If Path B: **create Metro mock immediately** (same pattern as `__mocks__/react-native-iap.js` — review that file for the pattern)
- Better native UX

**IMPORTANT:** Do NOT use `react-native-tink-sdk` (npm by FinTecSystems) — targets Tink Germany's XS2A API specifically, in beta, 0 weekly downloads. Not the general Tink Link SDK. See `docs/epic-7-prep-aggregator-decision.md#Rationale` for full explanation.

### Bank Connections Table Schema

```sql
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'tink',
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expiring_soon', 'expired', 'error', 'disconnected')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_granted_at TIMESTAMPTZ,
  consent_expires_at TIMESTAMPTZ,  -- consent_granted_at + 180 days
  last_synced_at TIMESTAMPTZ,
  tink_credentials_id TEXT UNIQUE,  -- idempotency key
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bank connections"
  ON bank_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank connections"
  ON bank_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank connections"
  ON bank_connections FOR UPDATE USING (auth.uid() = user_id);
```

**Note:** `detected_subscriptions` table is **NOT** created in Story 7.1 — that belongs to Story 7.3.

### Feature Module Structure

New feature folder to create:

```
src/features/bank/
├── components/
│   └── BankConsentDialog.tsx         # GDPR consent modal component
│   └── BankConsentDialog.test.tsx
├── screens/
│   └── BankConnectionScreen.tsx      # Main bank connection screen
│   └── BankConnectionScreen.test.tsx
├── services/
│   └── bankService.ts                # Calls Edge Functions, manages Tink Link
│   └── bankService.test.ts
├── types/
│   └── index.ts                      # BankConnection, BankConnectionStatus
└── index.ts                          # Public exports
```

New store:
```
src/shared/stores/useBankStore.ts
src/shared/stores/useBankStore.test.ts
```

New Edge Function:
```
supabase/functions/tink-connect/
├── index.ts
└── index.test.ts  (Deno test)
```

### useBankStore Pattern

Follow standard Zustand store pattern (architecture.md):

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleError } from '@shared/services/errorHandler';

interface BankState {
  connections: BankConnection[];
  isConnecting: boolean;
  connectionError: AppError | null;
  fetchConnections: () => Promise<void>;
  initiateConnection: (authCode: string) => Promise<void>;
  clearConnectionError: () => void;
}

export const useBankStore = create<BankState>()(
  persist(
    (set) => ({
      connections: [],
      isConnecting: false,
      connectionError: null,
      fetchConnections: async () => {
        set({ isConnecting: true, connectionError: null });
        try {
          // fetch from bank_connections via Supabase client
          set({ connections: data, isConnecting: false });
        } catch (err) {
          set({ connectionError: handleError(err), isConnecting: false });
        }
      },
      initiateConnection: async (authCode: string) => {
        set({ isConnecting: true, connectionError: null });
        try {
          // call tink-connect Edge Function
          // update connections on success
          set({ isConnecting: false });
        } catch (err) {
          set({ connectionError: handleError(err), isConnecting: false });
        }
      },
      clearConnectionError: () => set({ connectionError: null }),
    }),
    {
      name: 'bank-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ connections: state.connections }),
    }
  )
);
```

### GDPR Consent Screen Content (Required)

Per `docs/epic-7-prep-bank-privacy-compliance.md#In-App-Consent-Screen-Content`:

```
By connecting your bank account, you agree that SubTrack will:
✅ Access your account information (account name, balance)
✅ Access your transaction history (last 90 days)
✅ Analyze transactions to detect recurring subscriptions
✅ Store detected subscription data in your SubTrack account

SubTrack will NOT:
❌ Access your bank login credentials (handled securely by Tink)
❌ Make payments or transfers from your account
❌ Share your financial data with third parties
❌ Store raw transaction data longer than 30 days

You can disconnect your bank at any time in Settings.
```

This content is **legally required** — do not abbreviate, simplify, or combine with the OAuth flow.

### PSD2 Consent Duration

**180 days** — not 90 (updated EBA rules as of July 2023). Source: `docs/epic-7-prep-psd2-sca-overview.md#Consent-Duration-Rules`.

Calculate: `consent_expires_at = consent_granted_at + INTERVAL '180 days'`

Set this in the Edge Function at connection creation time (server-side). Story 7.9 will handle expiry notifications.

### Settings Navigation Integration

Existing navigation files:
- `src/app/navigation/SettingsStack.tsx` — add `BankConnection` route
- `src/features/settings/screens/SettingsScreen.tsx` — add entry row

Pattern for premium gate (same as Story 6.5):
```typescript
const isPremium = usePremiumStore((s) => s.isPremium);

// In SettingsScreen list:
{
  title: 'Bank Connection',
  icon: isPremium ? 'bank' : 'lock',
  onPress: () => isPremium
    ? navigation.navigate('BankConnection')
    : navigation.navigate('Premium'),
}
```

### Network Failure Handling — Explicit ACs

**Per Epic 6 retro Lesson 2:** Network/offline failure cases must be explicit ACs. AC5 and AC6 cover the failure paths.

Key rule: **if the OAuth flow starts and fails mid-way, the database must remain clean**. No orphan `bank_connections` records. The Edge Function must be transactional — either a complete connection is stored or nothing is stored.

### Deep Link Configuration

In `app.json`, the `scheme` field enables deep link handling. Verify:
```json
{
  "expo": {
    "scheme": "subtrack"
  }
}
```

The redirect URI registered in Tink Console must be: `subtrack://tink/callback`

Handle the callback in the bank connection screen using `expo-linking` (`Linking.addEventListener('url', ...)`) or React Navigation's deep link config.

### Testing Pattern

**Expo Go Metro mock** (for Tink SDK if Path B is chosen):

Follow exact pattern of `react-native-iap` mock from Epic 6. Look at:
- `metro.config.js` — resolver.extraNodeModules pattern
- `__mocks__/react-native-iap.js` — mock structure

Create equivalent for the Tink native module.

**Jest mocks for tests:**
```typescript
// Mock the bank service
jest.mock('@features/bank/services/bankService');

// Mock useBankStore
jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn(() => ({
    connections: [],
    isConnecting: false,
    connectionError: null,
    initiateConnection: jest.fn(),
    clearConnectionError: jest.fn(),
  })),
}));
```

**Deno Edge Function tests** — Per Epic 6 retro decision (bank data Edge Functions too complex for manual-only testing). Use Tink API response fixtures from Demo Bank shape. Run via `deno test` in CI alongside Jest.

### What NOT to Do

- **DO NOT** use `react-native-tink-sdk` (npm, FinTecSystems) — wrong library, targets German XS2A API
- **DO NOT** store `TINK_CLIENT_SECRET` in client code or `.env` files bundled with app
- **DO NOT** skip the GDPR consent screen and jump directly to Tink Link
- **DO NOT** add bank state to `usePremiumStore` — use new `useBankStore` (Epic 6 retro P5)
- **DO NOT** create the `detected_subscriptions` table in this story — Story 7.3
- **DO NOT** implement transaction fetching or subscription detection in this story — Story 7.3
- **DO NOT** implement the supported banks list UI in this story — Story 7.2
- **DO NOT** make the bank connection available to free users without premium gate

### Previous Story Intelligence (Epic 6.5)

From Story 6.5 dev notes and retro:

1. **Library native module compatibility check** (before any install): Does this library use native modules? Is it Expo Go compatible? Epic 6 retro added this as a mandatory checklist item. Answer for Tink: **depends on integration path** (see Task 1 spike).

2. **Network failure must be explicit** — AC5 and AC6 explicitly handle failure paths. Do NOT write the happy path only and leave failures for a later story.

3. **Zustand store pattern** — Follow exactly the same pattern as `usePremiumStore`. State + actions in same store, try/catch in async actions, error state in store, `isLoading` global per store.

4. **Co-located tests** — All test files next to source files. No `__tests__/` directories.

5. **Code review is non-negotiable for financial flows** — GOZE's standard. Every story with bank/payment data gets code review.

### Project Structure Notes

**New files to create:**

```
src/features/bank/components/BankConsentDialog.tsx
src/features/bank/components/BankConsentDialog.test.tsx
src/features/bank/screens/BankConnectionScreen.tsx
src/features/bank/screens/BankConnectionScreen.test.tsx
src/features/bank/services/bankService.ts
src/features/bank/services/bankService.test.ts
src/features/bank/types/index.ts
src/features/bank/index.ts
src/shared/stores/useBankStore.ts
src/shared/stores/useBankStore.test.ts
supabase/functions/tink-connect/index.ts
supabase/functions/tink-connect/index.test.ts
supabase/migrations/YYYYMMDDHHMMSS_create_bank_connections.sql
```

**Modified files:**
```
src/app/navigation/SettingsStack.tsx      — add BankConnection route
src/features/settings/screens/SettingsScreen.tsx — add Bank Connection entry
src/features/settings/screens/SettingsScreen.test.tsx — test premium gate
app.json                                  — verify scheme includes 'subtrack'
```

**Metro mock (if Path B):**
```
__mocks__/react-native-tink-sdk.js        — or equivalent
metro.config.js                           — update extraNodeModules if needed
```

### References

- [Source: docs/epic-7-prep-aggregator-decision.md] — Tink selection rationale, integration paths, Expo Go note
- [Source: docs/epic-7-prep-psd2-sca-overview.md] — OAuth flow, consent duration, SCA, token management
- [Source: docs/epic-7-prep-bank-integration-test-strategy.md] — Test scenarios, Tink Demo Bank, network failure matrix
- [Source: docs/epic-7-prep-bank-privacy-compliance.md] — GDPR consent screen content, App Store/Play Store requirements
- [Source: _bmad-output/implementation-artifacts/epic-6-retro-2026-03-21.md] — Lessons learned, action items for Epic 7
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture] — Zustand pattern, feature structure
- [Source: _bmad-output/implementation-artifacts/6-5-premium-entitlement-enforcement.md] — usePremiumStore pattern, SettingsScreen gating pattern

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

**2026-03-21 — Edge Function `tink-connect` returns non-2xx after Tink demo bank auth**

- **Symptom:** Tink Link WebView flow completes successfully (demo user authenticates), callback URL is intercepted correctly, auth code is parsed, but `supabase.functions.invoke('tink-connect')` returns `FunctionsHttpError` (non-2xx).
- **Client-side error:** `Edge Function returned a non-2xx status code` — the response body (`error.context`) comes through as empty `{}`, so the actual server-side error is not visible to the client.
- **Root cause (RESOLVED):** Multiple cascading issues discovered and fixed during 2026-03-22 debugging session:
  1. **Supabase gateway JWT rejection (401):** Default Edge Function deployment verifies JWT at gateway level before function code runs — no function logs appeared because code never executed. Fix: deploy with `--no-verify-jwt` flag; function has its own `getUser()` auth check internally.
  2. **Missing Supabase secrets:** `TINK_CLIENT_ID` and `TINK_CLIENT_SECRET` were not set in Edge Function secrets despite being configured elsewhere. Fix: `supabase secrets set TINK_CLIENT_ID=... TINK_CLIENT_SECRET=...`
  3. **Wrong Tink API endpoint:** `/api/v1/credentials/list` does not exist — correct endpoint is `/api/v1/credentials`.
  4. **Tink credentials endpoint scope (403):** Token scopes `accounts:read,transactions:read` do not grant access to `/api/v1/credentials`. Fix: removed `fetchCredentials()` call entirely — `credentialsId` is parsed from Tink Link callback URL query parameter instead.
  5. **iOS post-WebView network failure:** `FunctionsFetchError: Network request failed` when calling Edge Function immediately after WebView OAuth redirect on iOS. Fix: 500ms delay before Edge Function call + retry logic (2 retries, 1s interval) for transient `TypeError` network failures.
  6. **Security: `EXPO_PUBLIC_TINK_CLIENT_SECRET` in `.env`:** Client secret was exposed in `.env` with `EXPO_PUBLIC_` prefix, meaning it would be bundled into the app. Removed immediately.

### Implementation Plan

**Task 1 SPIKE Decision: Path A (WebView) chosen.**
- `react-native-webview` is fully compatible with Expo SDK 54
- WebView can embed Tink Link URL and intercept `subtrack://tink/callback` via `onShouldStartLoadWithRequest`
- Works in Expo Go — no Metro mock needed for WebView itself
- `expo-linking` provides `useURL()` hook and `Linking.addEventListener` for deep link handling when app is backgrounded
- Lower implementation risk vs native bridge (Path B)
- Path B (native bridge) rejected for MVP: requires `expo-dev-client`, higher complexity, no significant UX advantage for bank connection flow

### Completion Notes List

- Task 1 SPIKE: Path A (WebView) chosen for Tink Link integration — `react-native-webview` installed, Expo Go compatible, lower risk
- Task 2: Created `bank_connections` table migration with RLS policies (SELECT, INSERT, UPDATE) and auto-update trigger. Updated `database.types.ts` with bank_connections types.
- Task 3: Verified `scheme: "subtrack"` already configured in `app.json`. Deep link `subtrack://tink/callback` ready. Added `TINK_CLIENT_ID` to env config (client-safe — `TINK_CLIENT_SECRET` only in Edge Function env).
- Task 4: Created `tink-connect` Edge Function — exchanges authorization code for tokens via Tink API, implements idempotency check on `tink_credentials_id`, calculates 180-day consent expiry, tokens never returned to client. Deno tests written for token exchange, idempotency, error handling, and security.
- Task 5: Created `useBankStore` Zustand store — separate from `usePremiumStore` per Epic 6 retro. Follows standard pattern: state + actions, try/catch, error in store, AsyncStorage persistence via `partialize`.
- Task 6: Created `BankConnection` and `BankConnectionStatus` types in `src/features/bank/types/index.ts`.
- Task 7: Created `BankConnectionScreen` with: Open Banking explanation, GDPR consent dialog (legally required content), WebView Tink Link flow, `onShouldStartLoadWithRequest` to intercept callback, success/error handling with snackbar. Created `BankConsentDialog` component and `bankService` utility.
- Task 8: Added `BankConnection` route to `SettingsStack.tsx` and navigation types. Added "Bank Connection" entry to `SettingsScreen` with premium gate (lock icon for free users, navigates to Premium).
- Task 9: All tests passing — 49 suites, 668 tests, 0 regressions. New tests: useBankStore (10), BankConnectionScreen (9), BankConsentDialog (5), bankService (12), SettingsScreen bank gating (4). Total 40 new tests.

### Change Log

- 2026-03-21: Story 7.1 implemented — Bank Account Connection via Open Banking (Tink WebView integration)
- 2026-03-22: Debugging session — resolved 6 cascading issues preventing Edge Function from working (gateway JWT, missing secrets, wrong Tink endpoint, scope issue, iOS timing, security leak). Removed `fetchCredentials()` — `credentialsId` now parsed from callback URL. Added connected state UI to Settings and BankConnectionScreen.
- 2026-03-22: Bug fix — added `useFocusEffect` + `fetchConnections` to `BankConnectionScreen` and `SettingsScreen`. Root cause: Zustand persist middleware hydrates `connections` from AsyncStorage on app start; without a DB fetch on screen focus, stale connection state persisted even after DB record deletion. Fix ensures real DB state is always reflected when screens are visited.

### File List

**New files:**
- supabase/migrations/20260321300000_create_bank_connections.sql
- supabase/functions/tink-connect/index.ts
- supabase/functions/tink-connect/index.test.ts
- src/features/bank/types/index.ts
- src/features/bank/index.ts
- src/features/bank/services/bankService.ts
- src/features/bank/services/bankService.test.ts
- src/features/bank/components/BankConsentDialog.tsx
- src/features/bank/components/BankConsentDialog.test.tsx
- src/features/bank/screens/BankConnectionScreen.tsx
- src/features/bank/screens/BankConnectionScreen.test.tsx
- src/shared/stores/useBankStore.ts
- src/shared/stores/useBankStore.test.ts
- __mocks__/react-native-webview.js

**Modified files:**
- src/shared/types/database.types.ts (added bank_connections table types)
- src/config/env.ts (added TINK_CLIENT_ID)
- src/app/navigation/types.ts (added BankConnection route)
- src/app/navigation/SettingsStack.tsx (added BankConnection screen)
- src/features/settings/screens/SettingsScreen.tsx (added Bank Connection entry with premium gate)
- src/features/settings/screens/SettingsScreen.test.tsx (added bank connection premium gating tests)
- jest.config.js (added react-native-webview mock mapping, excluded supabase/functions from Jest)
- package.json (added react-native-webview dependency)
- package-lock.json (updated)
- .env (removed EXPO_PUBLIC_TINK_CLIENT_SECRET — security fix)
