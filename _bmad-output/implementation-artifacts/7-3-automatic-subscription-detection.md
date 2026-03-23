# Story 7.3: Automatic Subscription Detection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user with a connected bank account,
I want my subscriptions to be automatically detected from my transactions,
so that I don't have to manually enter every subscription.

## Acceptance Criteria

1. **AC1: Edge Function Detects Recurring Subscriptions from Transactions**
   - **Given** the user has an active bank connection (permanent Tink user created via `tink-link-session`)
   - **When** detection is triggered (user-initiated from BankConnectionScreen)
   - **Then** the Edge Function (`tink-detect-subscriptions`) obtains a user access token via server-side authorization grant (no refresh_token needed)
   - **And** fetches transactions from Tink Search API (`POST /api/v1/search`) with `transactions:read` scope (last 6 months)
   - **And** runs custom recurring detection: groups by normalized description, analyzes interval regularity and amount consistency
   - **And** maps detected recurring groups to `DetectedSubscription` records
   - **Note:** ~~Originally designed to use Tink Data Enrichment API (`enrichment.transactions:readonly` scope). Pivoted to custom detection because the enrichment scope was not available in the Tink Console app and cannot be self-service enabled.~~

2. **AC2: `detected_subscriptions` Table Created and Populated**
   - **Given** the Edge Function receives recurring transaction groups from Tink
   - **When** the response is processed
   - **Then** each recurring group is stored in a new `detected_subscriptions` table with: `id`, `user_id`, `bank_connection_id`, `tink_group_id`, `merchant_name`, `amount`, `currency`, `frequency`, `confidence_score`, `status`, `first_seen`, `last_seen`
   - **And** `status` defaults to `"detected"` (pending user review in Story 7.4)
   - **And** results are NOT automatically added to the user's subscription list
   - **And** duplicate detection is prevented using `tink_group_id` + `user_id` uniqueness (upsert on re-scan)

3. **AC3: Confidence Score Calculated from Transaction Patterns**
   - **Given** custom detection groups transactions by normalized description
   - **When** confidence is calculated
   - **Then** base score of 0.5, +0.3 for 6+ occurrences, +0.2 for 3-5, +0.05 for 2
   - **And** amount consistency bonus: +0.2 for CV < 0.05, +0.1 for CV < 0.15, -0.1 for high variability
   - **And** the confidence score is stored as a decimal (0.0 to 1.0)

4. **AC4: Frequency Detected from Transaction Intervals**
   - **Given** custom detection calculates median interval in days between grouped transactions
   - **When** the interval is analyzed
   - **Then** intervals are mapped to frequencies: 5-10 days → `weekly`, 25-35 days → `monthly`, 80-100 days → `quarterly`, 340-400 days → `yearly`
   - **And** groups with unrecognizable intervals are excluded from results

5. **AC5: `last_synced_at` Updated on Bank Connection**
   - **Given** the detection Edge Function completes successfully
   - **When** results are stored
   - **Then** the `last_synced_at` field on the `bank_connections` row is updated to `now()`

6. **AC6: User Can Trigger Detection from BankConnectionScreen**
   - **Given** the user has an active bank connection on BankConnectionScreen
   - **When** they tap a "Scan for Subscriptions" button
   - **Then** the Edge Function is invoked
   - **And** a loading state is shown during scanning
   - **And** on success, a summary is displayed: "{count} subscriptions detected" with a link to the review screen (Story 7.4 — for now, just a snackbar message)
   - **And** on failure, a user-friendly error is shown with retry option

7. **AC7: No Recurring Subscriptions Found**
   - **Given** the detection runs but Tink returns zero recurring transaction groups
   - **When** the analysis completes
   - **Then** the user sees: "No recurring subscriptions detected yet. We'll keep checking as more transaction data becomes available."
   - **And** `last_synced_at` is still updated

8. **AC8: Expired or Error Bank Connection Handled**
   - **Given** the user's bank connection status is `expired` or `error`
   - **When** detection is attempted
   - **Then** the Edge Function returns an appropriate error (e.g., `"Bank connection expired. Please reconnect."`)
   - **And** the "Scan for Subscriptions" button is disabled or shows "Reconnect required"

9. **AC9: Authorization Grant Failure Handled**
   - **Given** the server-side authorization grant fails (e.g., Tink user no longer valid)
   - **When** the Edge Function attempts to obtain a user access token
   - **Then** the bank connection status is updated to `expired`
   - **And** the user is informed they need to reconnect their bank

## Tasks / Subtasks

- [x] **Task 1: Database — `detected_subscriptions` table** (AC: #2)
  - [x] 1.1: Create Supabase migration for `detected_subscriptions` table:
    ```sql
    CREATE TABLE detected_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
      tink_group_id TEXT NOT NULL,
      merchant_name TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      frequency TEXT NOT NULL DEFAULT 'monthly'
        CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
      confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.00
        CHECK (confidence_score >= 0 AND confidence_score <= 1),
      status TEXT NOT NULL DEFAULT 'detected'
        CHECK (status IN ('detected', 'approved', 'dismissed', 'matched')),
      first_seen DATE NOT NULL,
      last_seen DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, tink_group_id)
    );
    ```
  - [x] 1.2: Add RLS policies: users can only SELECT their own detected subscriptions (`auth.uid() = user_id`). INSERT/UPDATE/DELETE restricted to service role only (Edge Function writes).
  - [x] 1.3: Add `updated_at` auto-update trigger (same pattern as `bank_connections`).
  - [x] 1.4: Run `supabase gen types typescript` after migration to update `src/shared/services/database.types.ts`.

- [x] **Task 2: Edge Function — `tink-detect-subscriptions`** (AC: #1, #2, #3, #4, #5, #8, #9)
  - [x] 2.1: Create `supabase/functions/tink-detect-subscriptions/index.ts` — authenticated Edge Function that:
    1. Receives `{ connectionId: string }` in body
    2. Verifies user auth (same pattern as `tink-connect`)
    3. Loads the `bank_connections` row for the given `connectionId` + authenticated `user_id`
    4. Validates connection status is `active` (reject `expired`/`error`/`disconnected`)
    5. Obtains user access token via server-side authorization grant (no refresh_token needed)
    6. Fetches transactions from Tink Search API (last 6 months)
    7. Runs custom recurring detection on transactions
    8. Upserts into database (on conflict `user_id, tink_group_id` → update amount, frequency, confidence, last_seen, status if still 'detected')
    9. Updates `bank_connections.last_synced_at`
    10. Returns `{ success: true, detectedCount: number, newCount: number }`
  - [x] 2.2: Create `supabase/functions/tink-detect-subscriptions/utils.ts` with:
    - `getClientAccessToken(clientId, clientSecret)` — `POST /api/v1/oauth/token` with `grant_type=client_credentials`, `scope=authorization:grant`
    - `generateUserAccessToken(externalUserId, clientId, clientSecret)` — server-side authorization grant → token exchange (bypasses refresh_token)
    - `fetchTransactions(accessToken)` — `POST /api/v1/search` (last 6 months, outgoing transactions)
    - `detectRecurringSubscriptions(transactions, userId, connectionId)` — custom detection: groups by normalized description, median interval analysis, amount CV check, confidence scoring
    - Helper functions: `normalizeDescription`, `medianIntervalDays`, `intervalToFrequency`, `amountCV`, `calculateGroupConfidence`, `generateGroupId`
  - [x] 2.3: Deploy with `--no-verify-jwt` (same pattern as `tink-connect` — function has its own `getUser()` auth check).
  - [x] 2.4: On Tink API failure: return `503` with error message. On token refresh failure: update connection status to `expired`, return `401` with reconnect message.
  - [x] 2.5: Write Deno tests: successful detection, empty results, token refresh failure → connection expired, inactive connection rejected, upsert on re-scan, pagination handling.

- [x] **Task 3: Types** (AC: #1, #2)
  - [x] 3.1: Add to `src/features/bank/types/index.ts`:
    ```typescript
    export type DetectedSubscriptionStatus = 'detected' | 'approved' | 'dismissed' | 'matched';

    export interface DetectedSubscription {
      id: string;
      userId: string;
      bankConnectionId: string;
      tinkGroupId: string;
      merchantName: string;
      amount: number;
      currency: string;
      frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      confidenceScore: number;  // 0.0 - 1.0
      status: DetectedSubscriptionStatus;
      firstSeen: string;        // ISO date
      lastSeen: string;         // ISO date
    }

    export interface DetectionResult {
      success: boolean;
      detectedCount: number;
      newCount: number;
      error?: string;
    }
    ```

- [x] **Task 4: `useBankStore` — add detection state** (AC: #6, #7, #8)
  - [x] 4.1: Add to existing `useBankStore`:
    ```typescript
    // New state
    detectedSubscriptions: DetectedSubscription[];
    isDetecting: boolean;
    isFetchingDetected: boolean;
    detectionError: AppError | null;
    lastDetectionResult: DetectionResult | null;

    // New actions
    detectSubscriptions: (connectionId: string) => Promise<void>;
    fetchDetectedSubscriptions: () => Promise<void>;
    ```
  - [x] 4.2: `detectSubscriptions(connectionId)`: calls `tink-detect-subscriptions` Edge Function, stores result in `lastDetectionResult`, then calls `fetchDetectedSubscriptions()` on success. On token refresh failure (401 from Edge Function), update the local connection status to `expired`.
  - [x] 4.3: `fetchDetectedSubscriptions()`: reads from `detected_subscriptions` table via Supabase client (RLS-filtered by user_id), stores in `detectedSubscriptions`.
  - [x] 4.4: Do NOT persist `detectedSubscriptions` or `lastDetectionResult` to AsyncStorage — transient data that should be fetched fresh. Update `partialize` accordingly.
  - [x] 4.5: Add tests to `useBankStore.test.ts` for new state and actions.

- [x] **Task 5: BankConnectionScreen — "Scan for Subscriptions" UI** (AC: #6, #7, #8)
  - [x] 5.1: Add a "Scan for Subscriptions" `Button` (React Native Paper) to `BankConnectionScreen.tsx` — visible only when the user has at least one `active` bank connection.
  - [x] 5.2: Button disabled (with helper text) when connection status is `expired`/`error`/`disconnected`.
  - [x] 5.3: On press: call `detectSubscriptions(connectionId)` from `useBankStore`.
  - [x] 5.4: Show loading state: `ActivityIndicator` + "Scanning your transactions..." text while `isDetecting` is true.
  - [x] 5.5: On success: show `Snackbar` (React Native Paper) with `"{count} subscriptions detected!"` or `"No recurring subscriptions detected yet."` message.
  - [x] 5.6: On failure: show error message with "Retry" button.
  - [x] 5.7: If connection is expired and detection was attempted: show "Bank connection expired. Please reconnect." with reconnect button (triggers existing Tink Link flow from Story 7.1).
  - [x] 5.8: Show `last_synced_at` timestamp below the scan button: "Last scanned: {date}" or "Never scanned" if null.

- [x] **Task 6: Tink Link Permanent User Flow** (AC: #1)
  - [x] 6.1: Created `supabase/functions/tink-link-session/index.ts` — new Edge Function that creates a permanent Tink user and generates a delegated authorization code for Tink Link. This enables the server-side authorization grant flow used by `tink-detect-subscriptions`.
  - [x] 6.2: Updated `src/features/bank/services/bankService.ts` to accept optional `authorizationCode` param in Tink Link URL.
  - [x] 6.3: Updated `src/shared/stores/useBankStore.ts` with `createLinkSession` action that calls `tink-link-session`.
  - [x] 6.4: Updated `BankConnectionScreen.tsx` to call `createLinkSession` before opening Tink Link WebView, passing the delegated authorization code.
  - [x] 6.5: Updated `supabase/functions/tink-connect/index.ts` to attempt server-side authorization grant for refresh_token (graceful fallback).
  - [x] 6.6: ~~Original plan was to add `enrichment.transactions:readonly` scope. Not needed — custom detection uses `transactions:read` which is already in scope.~~

- [x] **Task 7: Tests** (AC: #1–#9)
  - [x] 7.1: `supabase/functions/tink-detect-subscriptions/index.test.ts` — Deno tests: successful detection with mock Tink response, empty results, token refresh failure, inactive connection rejection, upsert behavior, pagination.
  - [x] 7.2: Update `src/shared/stores/useBankStore.test.ts` — test `detectSubscriptions` success/failure, `fetchDetectedSubscriptions`, detection with expired connection, that `detectedSubscriptions` is NOT persisted.
  - [x] 7.3: Update `src/features/bank/screens/BankConnectionScreen.test.tsx` — "Scan for Subscriptions" button visibility, disabled state for expired connections, loading state during detection, success snackbar, error state, last synced display.
  - [x] 7.4: Co-locate all Jest tests with source files. No `__tests__/` directories.

## Dev Notes

### CRITICAL: Architecture Pivot — Custom Detection (2026-03-23)

**Original plan:** Use Tink Data Enrichment API (`GET /enrichment/v1/recurring-transactions-groups`) with `enrichment.transactions:readonly` scope and `refresh_token` grant.

**What happened:**
1. `tink_refresh_token` was always NULL — Tink app configuration doesn't support refresh tokens for the callback code exchange
2. Attempted server-side authorization grant to get refresh_token — also returned NULL
3. Pivoted to server-side authorization grant flow (no refresh_token needed, generates fresh user access token each time)
4. `enrichment.transactions:readonly` scope was NOT available in the Tink Console app — confirmed by checking the client scopes list
5. `transactions.recurring:read` scope also not available
6. **Final decision:** Implement custom recurring detection using `transactions:read` scope (which IS available)

### Actual Architecture — Server-Side Authorization Grant + Custom Detection

**Token flow (no refresh_token needed):**
```
1. client_credentials grant → client access token (scope: authorization:grant)
2. POST /api/v1/oauth/authorization-grant (with external_user_id) → authorization code
3. authorization_code grant (exchange code for user access token with transactions:read scope)
```

**Transaction fetch:**
```
POST /api/v1/search (with user access token)
- Fetches last 6 months of transactions
- Filters to outgoing (negative amount) transactions
```

**Custom recurring detection algorithm:**
1. Group outgoing transactions by normalized description (lowercase, strip trailing numbers/refs)
2. Calculate median interval in days between transactions in each group
3. Map interval to frequency: 5-10d → weekly, 25-35d → monthly, 80-100d → quarterly, 340-400d → yearly
4. Check amount consistency: coefficient of variation (CV) must be < 0.3
5. Calculate confidence score (base 0.5 + occurrence bonus + amount consistency bonus)
6. Generate stable group ID via hash of normalized description + currency

### Permanent Tink User Flow (tink-link-session)

New Edge Function created to enable continuous access:
```
Client: "Connect Bank Account" button press
  ↓
tink-link-session Edge Function:
  1. Auth check (getUser)
  2. client_credentials → client access token (scope: user:create,authorization:grant)
  3. POST /api/v1/user/create (JSON body, handles 409 = already exists)
  4. POST /api/v1/oauth/authorization-grant/delegate (actor_client_id for Tink Link)
  5. Return { authorizationCode: delegatedCode }
  ↓
Client opens Tink Link WebView with authorization_code parameter
  ↓
tink-connect Edge Function (existing, modified):
  1. Exchange callback code for tokens
  2. Attempt server-side authorization grant for refresh_token (graceful fallback)
  3. Store bank connection
```

### Upsert Strategy for Re-scans

Users may scan multiple times. Use upsert on `(user_id, tink_group_id)` to avoid duplicates:
```sql
INSERT INTO detected_subscriptions (user_id, bank_connection_id, tink_group_id, merchant_name, amount, currency, frequency, confidence_score, status, first_seen, last_seen)
VALUES (...)
ON CONFLICT (user_id, tink_group_id)
DO UPDATE SET
  amount = EXCLUDED.amount,
  currency = EXCLUDED.currency,
  frequency = EXCLUDED.frequency,
  confidence_score = EXCLUDED.confidence_score,
  last_seen = EXCLUDED.last_seen,
  updated_at = now()
WHERE detected_subscriptions.status = 'detected';
-- Only update if status is still 'detected' — don't overwrite user decisions (approved/dismissed/matched)
```

The Supabase client equivalent:
```typescript
const { data, error } = await supabaseAdmin
  .from('detected_subscriptions')
  .upsert(rows, {
    onConflict: 'user_id,tink_group_id',
    ignoreDuplicates: false,
  });
```

**Note:** The `WHERE status = 'detected'` filter for the upsert cannot be done via Supabase JS client upsert directly. Instead, use two steps:
1. Upsert all rows (this will update existing rows)
2. The Edge Function should filter out rows with status != 'detected' before upserting, OR use a raw SQL RPC call for the conditional upsert.

**Recommended approach:** Before upserting, query existing `detected_subscriptions` for the user where status != 'detected', collect their `tink_group_id` values, and exclude them from the upsert batch.

### Edge Function Architecture (Updated)

```
Client: "Scan for Subscriptions" button press
  ↓
supabase.functions.invoke('tink-detect-subscriptions', { body: { connectionId } })
  ↓
Edge Function:
  1. Auth check (getUser)
  2. Load bank_connections row (verify ownership, status=active)
  3. Server-side authorization grant → user access token
     → On failure: update connection status='expired', return 401
  4. Fetch transactions via POST /api/v1/search (last 6 months)
     → On failure: return 503
  5. Custom recurring detection → DetectedSubscriptionRow[]
  6. Filter out already-actioned rows (status != 'detected')
  7. Upsert into detected_subscriptions
  8. Update bank_connections.last_synced_at
  9. Return { success: true, detectedCount, newCount }
```

### BankConnectionScreen UI Updates

Add below the existing "Connected" status section:

```
[Connected: Bank Name]                    Status: Active
Last synced: March 22, 2026              [Refresh icon]

[ Scan for Subscriptions ]               ← New button
Last scanned: Never                      ← last_synced_at display

[ View Supported Banks ]
[ Disconnect ]
```

Use React Native Paper components:
- `Button` mode="contained" for "Scan for Subscriptions"
- `ActivityIndicator` + `Text` for loading state
- `Snackbar` for success/failure feedback
- `Caption` or `Text` variant="bodySmall" for "Last scanned" timestamp

### What NOT to Do

- ~~**DO NOT** build a custom subscription detection algorithm from raw transactions — use Tink's Data Enrichment API~~ → **REVERSED:** Enrichment API scope not available; custom detection implemented using `transactions:read`
- **DO NOT** auto-add detected subscriptions to the user's list — they go to `detected_subscriptions` with status `"detected"` for review (Story 7.4)
- **DO NOT** call the Tink API directly from the client — always proxy through Edge Function (secret protection, NFR17)
- **DO NOT** store the user access token anywhere — it's request-scoped, used only within the Edge Function invocation
- **DO NOT** persist `detectedSubscriptions` to AsyncStorage — transient data fetched from server
- **DO NOT** create a separate store — extend existing `useBankStore`
- **DO NOT** implement the review/approve UI — that is Story 7.4
- **DO NOT** implement matching with manual subscriptions — that is Story 7.5
- **DO NOT** use `react-native-tink-sdk` npm package — wrong library (see Story 7.1 notes)
- **DO NOT** modify the `subscriptions` table — detected subscriptions are a separate table until the user approves them

### Previous Story Intelligence (Story 7.1 & 7.2)

1. **Edge Function deployment:** Deploy with `--no-verify-jwt` flag. Function has its own `getUser()` auth check internally.
2. **`TINK_CLIENT_ID` and `TINK_CLIENT_SECRET`** are already configured in Supabase Edge Function secrets.
3. **`tink_refresh_token`** is stored in `bank_connections` table but may be NULL — the server-side authorization grant flow does not require it.
4. **Co-located tests, Zustand pattern, premium gate** — all patterns established in Story 7.1.
5. **Error extraction pattern:** Use the same error detail extraction from Edge Function errors as in `useBankStore.initiateConnection()` (handling `error.context.json()`, `error.message` fallbacks).
6. **`useFocusEffect` pattern:** Use for fetching detected subscriptions on screen focus.
7. **Story 7.3 uses server-side authorization grant** (`authorization-grant` with `external_user_id`) — different from Story 7.1 (authorization_code from Tink Link) and Story 7.2 (client_credentials only). The `generateUserAccessToken()` function in `tink-detect-subscriptions/utils.ts` handles this flow.

### Network Failure Handling

Per Epic 6 retro Lesson 2 — explicit failure paths:

| Scenario | Edge Function returns | User sees | Retry |
|----------|----------------------|-----------|-------|
| Detection success | `200 { success, detectedCount, newCount }` | Snackbar: "X subscriptions detected!" | N/A |
| Detection success, 0 results | `200 { success, detectedCount: 0 }` | "No recurring subscriptions detected yet." | Yes |
| Authorization grant failed | `401 { error: "TOKEN_REFRESH_FAILED" }` | "Bank connection expired. Please reconnect." | Reconnect |
| Transaction fetch failed | `503 { error: "TRANSACTION_FETCH_ERROR" }` | "Couldn't fetch transactions. Please try again later." | Yes |
| Connection not active | `400 { error: "CONNECTION_NOT_ACTIVE" }` | "Bank connection is not active." | Reconnect |
| Network error (device offline) | N/A (client-side catch) | "Network error. Please check your connection." | Yes |

### Testing Pattern

**Jest mocks:**
```typescript
// Mock supabase.functions.invoke for tink-detect-subscriptions
jest.mock('@shared/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    })),
  },
}));
```

**Deno Edge Function tests** — same pattern as `tink-connect` and `tink-providers` tests:
- Mock `fetch` for Tink API calls (token refresh + enrichment endpoint)
- Mock Supabase client for DB operations
- Test: successful detection, empty results, token refresh failure, 403 scope error, pagination, upsert logic

### Project Structure Notes

- All new files in `src/features/bank/` (existing feature folder)
- Edge Function follows `supabase/functions/{name}/` pattern
- `detected_subscriptions` table has RLS for SELECT by user, but INSERT/UPDATE/DELETE via service role only
- No new feature folders needed
- No new navigation screens (UI changes are on existing BankConnectionScreen)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture] — Zustand pattern, feature structure, error handling
- [Source: _bmad-output/implementation-artifacts/7-2-supported-banks-list.md] — Previous story patterns, Edge Function deployment
- [Source: _bmad-output/implementation-artifacts/7-1-bank-account-connection-via-open-banking.md] — Tink auth patterns, retry pattern
- [Source: Tink API — /api/v1/search] — Transaction search endpoint (used for fetching last 6 months)
- [Source: Tink API — /api/v1/oauth/authorization-grant] — Server-side authorization grant (used instead of refresh_token)
- [Source: Tink API — /api/v1/user/create] — Permanent Tink user creation (used by tink-link-session)
- [Source: Tink API — /api/v1/oauth/authorization-grant/delegate] — Delegated authorization code for Tink Link
- [Source: _bmad-output/planning-artifacts/prd.md#NFR38] — Transaction sync frequency: daily or user-triggered
- [Source: _bmad-output/planning-artifacts/prd.md#NFR40] — Graceful degradation on bank API failure

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `supabase/migrations/20260322200000_create_detected_subscriptions.sql` with table schema, RLS (SELECT only for users), and `updated_at` auto-trigger following `bank_connections` pattern.
- Added `detected_subscriptions` Row/Insert/Update types to `src/shared/types/database.types.ts` manually (equivalent of `supabase gen types typescript`).
- **[REWRITTEN 2026-03-23]** `supabase/functions/tink-detect-subscriptions/utils.ts` — removed enrichment API functions (`refreshUserToken`, `fetchRecurringGroups`, `mapTinkGroupToDetected`, `parseTinkAmount`, `calculateConfidence`, `mapPeriodToFrequency`). Replaced with: `getClientAccessToken`, `generateUserAccessToken` (server-side auth grant), `fetchTransactions` (Tink Search API), `detectRecurringSubscriptions` (custom detection with `normalizeDescription`, `medianIntervalDays`, `intervalToFrequency`, `amountCV`, `calculateGroupConfidence`, `generateGroupId`).
- **[REWRITTEN 2026-03-23]** `supabase/functions/tink-detect-subscriptions/index.ts` — removed refresh_token check and enrichment API flow. Now uses server-side authorization grant → fetch transactions → custom recurring detection → upsert.
- **[NEW 2026-03-23]** `supabase/functions/tink-link-session/index.ts` — creates permanent Tink user + generates delegated authorization code for Tink Link. Three Tink API calls: `getClientAccessToken` → `createOrGetTinkUser` (JSON body, handles 409) → `generateDelegatedCode` (actor_client_id delegation).
- **[MODIFIED 2026-03-23]** `supabase/functions/tink-connect/index.ts` — added server-side authorization grant attempt after callback code exchange to try to get refresh_token (graceful fallback if fails).
- **[MODIFIED 2026-03-23]** `supabase/functions/tink-connect/utils.ts` — added `getClientAccessToken`, `generateUserAuthorizationCode`, made `refresh_token` optional in `TinkTokenResponse`.
- **[MODIFIED 2026-03-23]** `src/features/bank/services/bankService.ts` — added optional `authorizationCode` param to `TinkLinkParams` and Tink Link URL builder.
- **[MODIFIED 2026-03-23]** `src/shared/stores/useBankStore.ts` — added `createLinkSession` action (calls `tink-link-session` edge function).
- **[MODIFIED 2026-03-23]** `src/features/bank/screens/BankConnectionScreen.tsx` — added `'preparing'` flow state, async `handleConsentConfirm` that calls `createLinkSession` before opening WebView with delegated code.
- **[MODIFIED 2026-03-23]** `supabase/config.toml` — added `[functions.tink-link-session]` with `verify_jwt = false`.
- Added `DetectedSubscription`, `DetectedSubscriptionStatus`, `DetectionResult` types to `src/features/bank/types/index.ts`.
- Extended `useBankStore` with `detectedSubscriptions`, `isDetecting`, `isFetchingDetected`, `detectionError`, `lastDetectionResult` state + `detectSubscriptions` and `fetchDetectedSubscriptions` actions. Updated `partialize` to exclude transient detection data from AsyncStorage.
- Added "Scan for Subscriptions" button, detection loading state, success/failure snackbar, "Last scanned" timestamp, and "Reconnect required" fallback to `BankConnectionScreen.tsx`.
- 708 tests passing, 0 regressions.

### Change Log

- Date: 2026-03-22 — Story 7.3 initial implementation: automatic subscription detection via Tink Data Enrichment API
- Date: 2026-03-22 — Code review fixes: replaced `connections[0]` with `displayConnection`/`activeConnection` for safe display, added Retry action to detection error snackbar, removed unnecessary Content-Type header on GET request, updated File List with missing files
- Date: 2026-03-23 — **Architecture pivot:** Tink Data Enrichment API (`enrichment.transactions:readonly`) not available in Tink Console. Implemented custom recurring detection using `transactions:read` scope + Tink Search API. Created `tink-link-session` edge function for permanent Tink user flow. Rewrote `tink-detect-subscriptions` (utils.ts + index.ts) to use server-side authorization grant instead of refresh_token. Modified `tink-connect` to attempt server-side auth grant for refresh_token. Updated BankConnectionScreen to call `createLinkSession` before opening Tink Link WebView.

### File List

- `supabase/migrations/20260322200000_create_detected_subscriptions.sql` (new)
- `supabase/functions/tink-detect-subscriptions/index.ts` (new → rewritten 2026-03-23)
- `supabase/functions/tink-detect-subscriptions/utils.ts` (new → rewritten 2026-03-23)
- `supabase/functions/tink-detect-subscriptions/index.test.ts` (new)
- `supabase/functions/tink-link-session/index.ts` (new — 2026-03-23)
- `supabase/functions/tink-connect/index.ts` (modified — 2026-03-23: server-side auth grant attempt)
- `supabase/functions/tink-connect/utils.ts` (modified — 2026-03-23: added getClientAccessToken, generateUserAuthorizationCode)
- `src/features/bank/types/index.ts` (modified)
- `src/shared/types/database.types.ts` (modified)
- `src/shared/stores/useBankStore.ts` (modified — 2026-03-23: added createLinkSession)
- `src/shared/stores/useBankStore.test.ts` (modified)
- `src/features/bank/screens/BankConnectionScreen.tsx` (modified — 2026-03-23: preparing state, createLinkSession flow)
- `src/features/bank/screens/BankConnectionScreen.test.tsx` (modified)
- `src/features/bank/services/bankService.ts` (modified — 2026-03-23: authorizationCode param)
- `src/features/bank/screens/SupportedBanksScreen.test.tsx` (modified — type fix)
- `supabase/config.toml` (modified — 2026-03-23: added tink-link-session config)
