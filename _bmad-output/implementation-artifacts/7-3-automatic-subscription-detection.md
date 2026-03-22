# Story 7.3: Automatic Subscription Detection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user with a connected bank account,
I want my subscriptions to be automatically detected from my transactions,
so that I don't have to manually enter every subscription.

## Acceptance Criteria

1. **AC1: Edge Function Fetches Recurring Transactions from Tink**
   - **Given** the user has an active bank connection with a stored refresh token
   - **When** detection is triggered (user-initiated from BankConnectionScreen)
   - **Then** a new Edge Function (`tink-detect-subscriptions`) refreshes the user's Tink token using the stored `tink_refresh_token`
   - **And** calls Tink's Data Enrichment API (`GET /enrichment/v1/recurring-transactions-groups`) with `enrichment.transactions:readonly` scope
   - **And** paginates through all results using `nextPageToken`
   - **And** maps Tink recurring groups to `DetectedSubscription` records

2. **AC2: `detected_subscriptions` Table Created and Populated**
   - **Given** the Edge Function receives recurring transaction groups from Tink
   - **When** the response is processed
   - **Then** each recurring group is stored in a new `detected_subscriptions` table with: `id`, `user_id`, `bank_connection_id`, `tink_group_id`, `merchant_name`, `amount`, `currency`, `frequency`, `confidence_score`, `status`, `first_seen`, `last_seen`
   - **And** `status` defaults to `"detected"` (pending user review in Story 7.4)
   - **And** results are NOT automatically added to the user's subscription list
   - **And** duplicate detection is prevented using `tink_group_id` + `user_id` uniqueness (upsert on re-scan)

3. **AC3: Confidence Score Calculated from Tink Data**
   - **Given** Tink returns recurring transaction groups with occurrence count and amount statistics
   - **When** confidence is calculated
   - **Then** groups with `occurrences.count >= 3` AND low `amount.standardDeviation` relative to `amount.mean` get high confidence (>80%)
   - **And** groups with `occurrences.count == 2` OR high variability get medium confidence (50-80%)
   - **And** the confidence score is stored as a decimal (0.0 to 1.0)

4. **AC4: Frequency Mapped from Tink Period Labels**
   - **Given** Tink provides `period.label` values (e.g., `"MONTHLY"`, `"WEEKLY"`, `"YEARLY"`)
   - **When** the Edge Function maps the data
   - **Then** `period.label` is mapped to SubTrack billing cycles: `MONTHLY` → `monthly`, `WEEKLY` → `weekly`, `YEARLY` → `yearly`, `QUARTERLY` → `quarterly`
   - **And** unrecognized periods default to `monthly` with a lower confidence score penalty

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

9. **AC9: Token Refresh Failure Handled**
   - **Given** the stored `tink_refresh_token` is invalid or expired
   - **When** the Edge Function attempts to refresh the token
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
    5. Refreshes user token using stored `tink_refresh_token`
    6. Calls Tink recurring-transactions-groups API
    7. Maps results to `detected_subscriptions` rows
    8. Upserts into database (on conflict `user_id, tink_group_id` → update amount, frequency, confidence, last_seen, status if still 'detected')
    9. Updates `bank_connections.last_synced_at`
    10. Returns `{ success: true, detectedCount: number, newCount: number }`
  - [x] 2.2: Create `supabase/functions/tink-detect-subscriptions/utils.ts` with:
    - `refreshUserToken(refreshToken, clientId, clientSecret)` — `POST /api/v1/oauth/token` with `grant_type=refresh_token`, `scope=enrichment.transactions:readonly`
    - `fetchRecurringGroups(accessToken)` — calls `GET /enrichment/v1/recurring-transactions-groups` with pagination
    - `mapTinkGroupToDetected(group, userId, connectionId)` — maps Tink response to DB row shape
    - `calculateConfidence(group)` — computes confidence score from occurrence count and amount variability
    - `mapPeriodToFrequency(periodLabel)` — maps Tink period labels to SubTrack billing cycles
    - `parseTinkAmount(amountObj)` — converts Tink `{unscaledValue, scale}` to decimal number
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

- [x] **Task 6: Update Tink Link Scope** (AC: #1)
  - [x] 6.1: In `src/features/bank/services/bankService.ts`, update the `scope` parameter in `buildTinkLinkUrl()`:
    - **From:** `'accounts:read,transactions:read'`
    - **To:** `'accounts:read,transactions:read,enrichment.transactions:readonly'`
  - [x] 6.2: **IMPORTANT:** This only affects NEW connections. Existing connections may not have the enrichment scope. The Edge Function should handle `403 Forbidden` from the enrichment API gracefully (return error asking user to reconnect with updated permissions).

- [x] **Task 7: Tests** (AC: #1–#9)
  - [x] 7.1: `supabase/functions/tink-detect-subscriptions/index.test.ts` — Deno tests: successful detection with mock Tink response, empty results, token refresh failure, inactive connection rejection, upsert behavior, pagination.
  - [x] 7.2: Update `src/shared/stores/useBankStore.test.ts` — test `detectSubscriptions` success/failure, `fetchDetectedSubscriptions`, detection with expired connection, that `detectedSubscriptions` is NOT persisted.
  - [x] 7.3: Update `src/features/bank/screens/BankConnectionScreen.test.tsx` — "Scan for Subscriptions" button visibility, disabled state for expired connections, loading state during detection, success snackbar, error state, last synced display.
  - [x] 7.4: Co-locate all Jest tests with source files. No `__tests__/` directories.

## Dev Notes

### CRITICAL: Read Before Implementation

**This is a Tink Data Enrichment API integration story. Per Epic 6 retro (Lesson 1):** Do pre-implementation research before writing code.

**Mandatory pre-implementation research:**
- Confirm Tink Data Enrichment API is enabled in Tink Console for the sandbox app
- Verify `enrichment.transactions:readonly` scope works with refresh token grant
- Check if Tink sandbox returns realistic recurring transaction group data (or only demo data)
- Test the `refresh_token` grant flow manually with the stored token format

### Tink Data Enrichment API — Key Discovery

**DO NOT build a custom subscription detection algorithm.** Tink provides a built-in **Data Enrichment API** that identifies recurring transaction groups automatically. This is the `GET /enrichment/v1/recurring-transactions-groups` endpoint.

**Why use Tink's enrichment instead of custom detection:**
- Tink has access to transaction categorization ML models trained on millions of transactions
- Handles edge cases (merchant name variations, amount changes, weekend adjustments)
- Provides structured data: name, period, amount statistics, occurrence count
- Prevents reinventing the wheel (BMAD anti-pattern #1)
- Higher accuracy than any custom regex/pattern matching we could build

### Tink Recurring Transaction Groups API — Confirmed Endpoint

**Endpoint:** `GET https://api.tink.com/enrichment/v1/recurring-transactions-groups`

**Authentication:** User access token with `enrichment.transactions:readonly` scope.

**Token refresh flow:**
```
POST https://api.tink.com/api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
refresh_token={stored_tink_refresh_token}
client_id={TINK_CLIENT_ID}
client_secret={TINK_CLIENT_SECRET}
scope=enrichment.transactions:readonly
```

**Response shape (recurring-transactions-groups):**
```typescript
interface TinkRecurringGroup {
  id: string;                          // UUID — maps to tink_group_id
  categoryId: string;
  name: string;                        // e.g., "Netflix"
  period: {
    label: string;                     // "MONTHLY" | "WEEKLY" | "YEARLY" | "QUARTERLY"
    duration: {
      mean: number;                    // Mean days between occurrences
      standardDeviation: number;
      minimum: number;
      maximum: number;
    };
  };
  amount: {
    mean: { unscaledValue: string; scale: string };
    standardDeviation: { unscaledValue: string; scale: string };
    median: { unscaledValue: string; scale: string };
    minimum: { unscaledValue: string; scale: string };
    maximum: { unscaledValue: string; scale: string };
    latest: { unscaledValue: string; scale: string };
    currencyCode: string;              // "EUR", "SEK", etc.
  };
  occurrences: {
    count: number;                     // Number of past occurrences found
    firstDate: string;                 // "2020-07-05"
    latestDate: string;                // "2020-09-05"
    dayOfMonth: {
      mean: number;
      median: number;
      minimum: number;
      maximum: number;
    };
  };
}

interface TinkRecurringGroupsResponse {
  recurringTransactionsGroups: TinkRecurringGroup[];
  nextPageToken?: string;
}
```

**Pagination:** If `nextPageToken` is present, append `?pageToken={token}` to fetch the next page. Continue until `nextPageToken` is absent or empty.

### Tink Amount Parsing

Tink amounts use `{unscaledValue, scale}` format. To convert to a decimal number:
```typescript
function parseTinkAmount(amount: { unscaledValue: string; scale: string }): number {
  const unscaled = parseInt(amount.unscaledValue, 10);
  const scale = parseInt(amount.scale, 10);
  return unscaled / Math.pow(10, scale);
}
// Example: { unscaledValue: "1300", scale: "2" } → 13.00
// Example: { unscaledValue: "100", scale: "1" } → 10.0
```

### Confidence Score Calculation

```typescript
function calculateConfidence(group: TinkRecurringGroup): number {
  let score = 0.5; // Base score

  // Occurrence count factor (more occurrences = higher confidence)
  if (group.occurrences.count >= 6) score += 0.3;
  else if (group.occurrences.count >= 3) score += 0.2;
  else if (group.occurrences.count === 2) score += 0.05;

  // Amount consistency factor (low std dev = higher confidence)
  const mean = parseTinkAmount(group.amount.mean);
  const stdDev = parseTinkAmount(group.amount.standardDeviation);
  if (mean > 0) {
    const cv = stdDev / mean; // Coefficient of variation
    if (cv < 0.05) score += 0.2;       // Very consistent
    else if (cv < 0.15) score += 0.1;  // Somewhat consistent
    else score -= 0.1;                   // High variability
  }

  return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100));
}
```

### Period Label to Frequency Mapping

```typescript
function mapPeriodToFrequency(label: string): 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  switch (label.toUpperCase()) {
    case 'WEEKLY': return 'weekly';
    case 'MONTHLY': return 'monthly';
    case 'QUARTERLY': return 'quarterly';
    case 'YEARLY': return 'yearly';
    default: return 'monthly'; // Safe fallback — most subscriptions are monthly
  }
}
```

### Token Refresh Pattern

**Different from Story 7.1 (authorization_code) and Story 7.2 (client_credentials).**

Story 7.3 uses `refresh_token` grant to get a **user-scoped** access token. This is needed because the enrichment API returns per-user data.

```typescript
export async function refreshUserToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; newRefreshToken?: string }> {
  const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'enrichment.transactions:readonly',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Tink token refresh failed: ${response.status}`, errorText);
    throw new Error(`TOKEN_REFRESH_FAILED:${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    // Tink may issue a new refresh token — store it if present
    newRefreshToken: data.refresh_token ?? undefined,
  };
}
```

**IMPORTANT:** If Tink returns a new `refresh_token` in the response, the Edge Function MUST update `bank_connections.tink_refresh_token` with the new value. Old refresh tokens may be invalidated (token rotation).

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

### Edge Function Architecture

```
Client: "Scan for Subscriptions" button press
  ↓
supabase.functions.invoke('tink-detect-subscriptions', { body: { connectionId } })
  ↓
Edge Function:
  1. Auth check (getUser)
  2. Load bank_connections row (verify ownership, status=active)
  3. Refresh user token (grant_type=refresh_token)
     → On failure: update connection status='expired', return 401
     → If new refresh_token received: update bank_connections.tink_refresh_token
  4. Fetch recurring-transactions-groups (paginate)
     → On 403: return error "enrichment scope not available, reconnect required"
  5. Map groups → detected_subscriptions rows
  6. Filter out already-actioned rows (status != 'detected')
  7. Upsert into detected_subscriptions
  8. Update bank_connections.last_synced_at
  9. Return { success: true, detectedCount, newCount }
```

### Scope Update Impact

Adding `enrichment.transactions:readonly` to the Tink Link scope:
- **New connections** will automatically request the enrichment scope during consent
- **Existing connections** (from Story 7.1) may NOT have this scope. The enrichment API will return `403 Forbidden`
- **Handling existing connections:** When the Edge Function gets a 403 from the enrichment API, it should return an error that tells the user to reconnect their bank. The UI should show: "Your bank connection needs updated permissions. Please reconnect to enable subscription detection."
- **This is expected for the first release** — users who connected before Story 7.3 will need to reconnect once

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

- **DO NOT** build a custom subscription detection algorithm from raw transactions — use Tink's Data Enrichment API (`recurring-transactions-groups`)
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
3. **`tink_refresh_token`** is stored in `bank_connections` table, accessible only via service role key (not returned to client).
4. **Co-located tests, Zustand pattern, premium gate** — all patterns established in Story 7.1.
5. **Error extraction pattern:** Use the same error detail extraction from Edge Function errors as in `useBankStore.initiateConnection()` (handling `error.context.json()`, `error.message` fallbacks).
6. **`useFocusEffect` pattern:** Use for fetching detected subscriptions on screen focus.
7. **Story 7.2 established:** `getClientCredentialsToken()` in `tink-providers/utils.ts`. Story 7.3 uses a DIFFERENT grant type (`refresh_token`) — do NOT reuse the client credentials helper. Create `refreshUserToken()` in `tink-detect-subscriptions/utils.ts`.

### Network Failure Handling

Per Epic 6 retro Lesson 2 — explicit failure paths:

| Scenario | Edge Function returns | User sees | Retry |
|----------|----------------------|-----------|-------|
| Tink enrichment API success | `200 { success, detectedCount, newCount }` | Snackbar: "X subscriptions detected!" | N/A |
| Tink enrichment API success, 0 results | `200 { success, detectedCount: 0 }` | "No recurring subscriptions detected yet." | Yes |
| Tink token refresh failed | `401 { error: "TOKEN_REFRESH_FAILED" }` | "Bank connection expired. Please reconnect." | Reconnect |
| Tink enrichment 403 (missing scope) | `403 { error: "ENRICHMENT_SCOPE_MISSING" }` | "Your bank connection needs updated permissions. Please reconnect." | Reconnect |
| Tink API down | `503 { error: "..." }` | "Couldn't scan transactions. Please try again later." | Yes |
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
- [Source: _bmad-output/implementation-artifacts/7-1-bank-account-connection-via-open-banking.md] — Tink auth patterns, refresh token storage, retry pattern
- [Source: Tink API — /enrichment/v1/recurring-transactions-groups] — Recurring subscription detection endpoint, response shape, pagination
- [Source: Tink API — /enrichment/v1/recurring-transactions] — Individual recurring transactions within groups
- [Source: Tink API — /api/v1/oauth/token] — Token refresh flow with grant_type=refresh_token
- [Source: _bmad-output/planning-artifacts/prd.md#NFR38] — Transaction sync frequency: daily or user-triggered
- [Source: _bmad-output/planning-artifacts/prd.md#NFR40] — Graceful degradation on bank API failure

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `supabase/migrations/20260322200000_create_detected_subscriptions.sql` with table schema, RLS (SELECT only for users), and `updated_at` auto-trigger following `bank_connections` pattern.
- Added `detected_subscriptions` Row/Insert/Update types to `src/shared/types/database.types.ts` manually (equivalent of `supabase gen types typescript`).
- Created `supabase/functions/tink-detect-subscriptions/utils.ts` with `parseTinkAmount`, `calculateConfidence`, `mapPeriodToFrequency`, `mapTinkGroupToDetected`, `refreshUserToken`, `fetchRecurringGroups` — all with full pagination support.
- Created `supabase/functions/tink-detect-subscriptions/index.ts` with full auth, active-connection validation, refresh-token flow with token rotation support, enrichment API call with 403/503 error handling, conditional upsert (excludes actioned rows), `last_synced_at` update.
- Added `DetectedSubscription`, `DetectedSubscriptionStatus`, `DetectionResult` types to `src/features/bank/types/index.ts`.
- Extended `useBankStore` with `detectedSubscriptions`, `isDetecting`, `isFetchingDetected`, `detectionError`, `lastDetectionResult` state + `detectSubscriptions` and `fetchDetectedSubscriptions` actions. Updated `partialize` to exclude transient detection data from AsyncStorage.
- Added "Scan for Subscriptions" button, detection loading state, success/failure snackbar, "Last scanned" timestamp, and "Reconnect required" fallback to `BankConnectionScreen.tsx`.
- Updated `bankService.ts` scope to include `enrichment.transactions:readonly` for new connections.
- 708 tests passing, 0 regressions.

### Change Log

- Date: 2026-03-22 — Story 7.3 implementation: automatic subscription detection via Tink Data Enrichment API
- Date: 2026-03-22 — Code review fixes: replaced `connections[0]` with `displayConnection`/`activeConnection` for safe display, added Retry action to detection error snackbar, removed unnecessary Content-Type header on GET request, updated File List with missing files

### File List

- `supabase/migrations/20260322200000_create_detected_subscriptions.sql` (new)
- `supabase/functions/tink-detect-subscriptions/index.ts` (new)
- `supabase/functions/tink-detect-subscriptions/utils.ts` (new)
- `supabase/functions/tink-detect-subscriptions/index.test.ts` (new)
- `src/features/bank/types/index.ts` (modified)
- `src/shared/types/database.types.ts` (modified)
- `src/shared/stores/useBankStore.ts` (modified)
- `src/shared/stores/useBankStore.test.ts` (modified)
- `src/features/bank/screens/BankConnectionScreen.tsx` (modified)
- `src/features/bank/screens/BankConnectionScreen.test.tsx` (modified)
- `src/features/bank/services/bankService.ts` (modified)
- `src/features/bank/screens/SupportedBanksScreen.test.tsx` (modified — type fix)
- `supabase/config.toml` (modified — config update)
