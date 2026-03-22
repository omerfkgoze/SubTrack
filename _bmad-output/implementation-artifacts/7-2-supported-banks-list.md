# Story 7.2: Supported Banks List

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see which banks are supported before attempting to connect,
so that I know if my bank works with SubTrack.

## Acceptance Criteria

1. **AC1: "View Supported Banks" Entry Point on BankConnectionScreen**
   - **Given** the user is on the BankConnectionScreen (Settings > Bank Connection)
   - **When** the screen loads
   - **Then** a "View Supported Banks" button/link is visible below the "Connect Bank Account" CTA
   - **And** tapping it navigates to a new SupportedBanksScreen

2. **AC2: Supported Banks List Fetched from Tink API**
   - **Given** the user navigates to the SupportedBanksScreen
   - **When** the screen loads
   - **Then** a list of supported banks is displayed, fetched from the Tink API via a new Edge Function (`tink-providers`)
   - **And** each bank entry shows: bank display name, bank icon/logo (from Tink CDN), and country/market
   - **And** a loading spinner is shown while the list is being fetched
   - **And** the list is sorted with popular banks first (`popular: true`, lower `rank` value), then alphabetically

3. **AC3: Search/Filter Banks in Real-Time**
   - **Given** the supported banks list is displayed
   - **When** the user types in the search field
   - **Then** results are filtered in real-time by bank display name (case-insensitive substring match)
   - **And** filtering happens client-side on the already-fetched list (no additional API calls)
   - **And** if no results match, the message "Your bank isn't supported yet. You can continue using manual entry." is shown

4. **AC4: Market Filter**
   - **Given** the supported banks list is displayed
   - **When** the user selects a market/country filter (e.g., dropdown or chip selector)
   - **Then** the list is filtered to show only banks from the selected market
   - **And** a default market can be pre-selected based on user locale or left as "All Markets"

5. **AC5: Navigate to Connect Flow from Bank List**
   - **Given** the user finds their bank in the supported banks list
   - **When** they tap on a bank entry
   - **Then** they are navigated back to BankConnectionScreen and the Tink Link flow is initiated (same flow as Story 7.1)
   - **And** no duplicate GDPR consent is required if they already consented in this session

6. **AC6: Network Failure Handled Gracefully**
   - **Given** the user navigates to the SupportedBanksScreen
   - **When** the Edge Function call to fetch providers fails (network error or Tink API error)
   - **Then** a user-friendly error message is shown: "Couldn't load supported banks. Please check your connection and try again."
   - **And** a "Retry" button is available
   - **And** the user can navigate back without being stuck

7. **AC7: Edge Function Caches Provider List**
   - **Given** the Tink providers API returns data
   - **When** the Edge Function processes the response
   - **Then** the response is cached server-side (in-memory or Supabase table) for 24 hours to avoid hitting Tink rate limits
   - **And** subsequent requests within the cache window return cached data
   - **And** cache miss triggers a fresh Tink API call

## Tasks / Subtasks

- [ ] **Task 1: Edge Function — `tink-providers`** (AC: #2, #7)
  - [ ] 1.1: Create `supabase/functions/tink-providers/index.ts` — authenticated Edge Function that fetches provider list from Tink API (`GET https://api.tink.com/providers/{market}`) using client credentials grant. Requires `TINK_CLIENT_ID` and `TINK_CLIENT_SECRET` (already configured in Edge Function env from Story 7.1).
  - [ ] 1.2: Accept optional `market` query parameter. If omitted, fetch providers without market filter (or iterate over key EU markets).
  - [ ] 1.3: Filter response to only include providers with `capability: CHECKING_ACCOUNTS` (accounts:read scope — what SubTrack actually uses). Exclude providers with `status: DISABLED`.
  - [ ] 1.4: Map Tink provider response to a lean `SupportedBank` shape for the client: `{ id, displayName, market, iconUrl, popular, rank }`. Strip unnecessary fields (fields, passwordHelpText, pisCapabilities, etc.) to minimize payload.
  - [ ] 1.5: Implement server-side caching: store the mapped provider list in a `provider_cache` Supabase table (`market TEXT, data JSONB, cached_at TIMESTAMPTZ`, unique on `market`) with 24-hour TTL. On request: check cache age → if fresh, return cached → if stale or missing, fetch from Tink, upsert cache, return fresh data.
  - [ ] 1.6: Tink client credentials token: `POST https://api.tink.com/api/v1/oauth/token` with `grant_type=client_credentials`, `client_id`, `client_secret`, `scope=providers:read`. This is an app-level token (no user context needed). Reuse `exchangeAuthorizationCode` pattern from `tink-connect/utils.ts` but with different grant type.
  - [ ] 1.7: On Tink API failure: return cached data if available (even if stale), otherwise return `503` with error message.
  - [ ] 1.8: Deploy with `--no-verify-jwt` (same pattern as `tink-connect` — function has its own `getUser()` auth check).
  - [ ] 1.9: Write Deno tests: successful fetch, cache hit, cache miss, Tink API failure with stale cache fallback, Tink API failure with no cache.

- [ ] **Task 2: Database — `provider_cache` table** (AC: #7)
  - [ ] 2.1: Create Supabase migration for `provider_cache` table: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `market TEXT NOT NULL UNIQUE`, `data JSONB NOT NULL`, `cached_at TIMESTAMPTZ NOT NULL DEFAULT now()`. No RLS needed — Edge Function accesses via service role key.
  - [ ] 2.2: Run `supabase gen types typescript` after migration.

- [ ] **Task 3: Types** (AC: #2)
  - [ ] 3.1: Add to `src/features/bank/types/index.ts`:
    ```typescript
    export interface SupportedBank {
      id: string;               // Tink financialInstitutionId
      displayName: string;      // Tink displayName
      market: string;           // ISO 3166-1 alpha-2 (e.g., "SE", "DE")
      iconUrl: string | null;   // Tink images.icon CDN URL
      popular: boolean;         // Tink popular flag
      rank: number;             // Tink rank (lower = more prominent)
    }
    ```

- [ ] **Task 4: `useBankStore` — add provider list state** (AC: #2, #6)
  - [ ] 4.1: Add to existing `useBankStore`:
    ```typescript
    // New state
    supportedBanks: SupportedBank[];
    isFetchingBanks: boolean;
    fetchBanksError: AppError | null;

    // New action
    fetchSupportedBanks: (market?: string) => Promise<void>;
    ```
  - [ ] 4.2: `fetchSupportedBanks`: calls `tink-providers` Edge Function, stores result in `supportedBanks`. On error: sets `fetchBanksError`.
  - [ ] 4.3: Do NOT persist `supportedBanks` to AsyncStorage — this is transient cached data. Update `partialize` to exclude it.
  - [ ] 4.4: Add tests to `useBankStore.test.ts` for new state and action.

- [ ] **Task 5: SupportedBanksScreen UI** (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 5.1: Create `src/features/bank/screens/SupportedBanksScreen.tsx`.
  - [ ] 5.2: Top section: `Searchbar` (React Native Paper) for real-time text filtering.
  - [ ] 5.3: Optional: Market filter chips below search bar using `Chip` component (React Native Paper). Pre-populate with common EU markets. Default: "All".
  - [ ] 5.4: Bank list: `FlatList` with `BankListItem` component. Each item shows: bank icon (Tink CDN `iconUrl` via `Avatar.Image`, fallback to `Avatar.Icon` with `bank` icon if no image), display name, market badge. Sort: popular first (lower rank), then alphabetical.
  - [ ] 5.5: Empty state when search has no results: "Your bank isn't supported yet. You can continue using manual entry."
  - [ ] 5.6: Loading state: `ActivityIndicator` centered.
  - [ ] 5.7: Error state: error message + "Retry" button.
  - [ ] 5.8: On bank item tap: navigate back to BankConnectionScreen with a route param indicating the user wants to proceed with connection. BankConnectionScreen should auto-show consent dialog (skip the info state and go directly to consent — the user already expressed intent).
  - [ ] 5.9: Use React Native Paper components consistent with rest of app: `Surface`, `Searchbar`, `List.Item`, `Chip`, `Avatar.Image`, `Avatar.Icon`, `ActivityIndicator`, `Button`, `Text`.

- [ ] **Task 6: BankListItem component** (AC: #2)
  - [ ] 6.1: Create `src/features/bank/components/BankListItem.tsx`. Renders a single bank entry using `List.Item` with `Avatar.Image` left (bank icon) and market chip right.
  - [ ] 6.2: Handle image load failure gracefully — fallback to `Avatar.Icon` with `bank` MaterialCommunityIcons icon.
  - [ ] 6.3: Write co-located test.

- [ ] **Task 7: Navigation** (AC: #1, #5)
  - [ ] 7.1: Add `SupportedBanks` route to `SettingsStack.tsx` (under existing `BankConnection` route).
  - [ ] 7.2: Update `src/app/navigation/types.ts` — add `SupportedBanks` to `SettingsStackParamList` and add optional `autoConnect` param to `BankConnection` route.
  - [ ] 7.3: Add "View Supported Banks" button on `BankConnectionScreen` — navigates to `SupportedBanks`.
  - [ ] 7.4: Handle `autoConnect` route param in `BankConnectionScreen` — if true, skip info state and show consent dialog immediately.

- [ ] **Task 8: Tests** (AC: #1–#7)
  - [ ] 8.1: `src/features/bank/screens/SupportedBanksScreen.test.tsx` — renders loading, renders bank list, search filters in real-time, empty search shows fallback message, error shows retry, tap bank navigates back.
  - [ ] 8.2: `src/features/bank/components/BankListItem.test.tsx` — renders bank name and icon, handles missing icon gracefully.
  - [ ] 8.3: Update `useBankStore.test.ts` — test `fetchSupportedBanks` success, failure, and that `supportedBanks` is NOT persisted.
  - [ ] 8.4: Update `BankConnectionScreen.test.tsx` — "View Supported Banks" button navigates correctly, `autoConnect` param triggers consent dialog.
  - [ ] 8.5: Deno Edge Function tests for `tink-providers` (Task 1.9).
  - [ ] 8.6: Co-locate all Jest tests with source files. No `__tests__/` directories.

## Dev Notes

### CRITICAL: Read Before Implementation

**This is an external API integration story. Per Epic 6 retro (Lesson 1):** Do pre-implementation research before writing code.

**Mandatory pre-implementation research:**
- Confirm current Tink providers API endpoint and response shape via `context7` or `brave-search`
- Verify client credentials grant for `providers:read` scope works in Tink sandbox
- Check if Tink sandbox returns realistic provider data (Demo Bank only? Or full list?)

### Tink Providers API — Confirmed Endpoint

**Endpoint:** `GET https://api.tink.com/providers/{market}`

**Authentication:** Client credentials token (app-level, no user context):
```
POST https://api.tink.com/api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id={TINK_CLIENT_ID}
client_secret={TINK_CLIENT_SECRET}
scope=providers:read
```

**Key query parameters:**
- `capability=CHECKING_ACCOUNTS` — filter to banks that support account data (what SubTrack uses)
- `includeTestProviders=false` — exclude test providers in production

**Provider response shape (relevant fields):**
```typescript
interface TinkProvider {
  name: string;                    // Internal ID: "se-bink-thirdpartyapp"
  displayName: string;             // Human-readable: "Bink"
  financialInstitutionId: string;  // UUID
  financialInstitutionName: string;
  market: string;                  // "SE"
  status: string;                  // "ENABLED" | "DISABLED" | "TEMPORARY_DISABLED"
  images: {
    icon: string;                  // CDN URL for bank logo
    banner: string;                // CDN URL for banner
  };
  capabilities: string[];          // ["CHECKING_ACCOUNTS", ...]
  popular: boolean;
  rank: number;                    // Lower = more prominent
  accessType: string;              // "OPEN_BANKING"
  type: string;                    // "BANK" | "CREDIT_UNION" | etc.
}
```

**Map to lean client shape:**
```typescript
// Only send what the client needs:
{
  id: provider.financialInstitutionId,
  displayName: provider.displayName,
  market: provider.market,
  iconUrl: provider.images?.icon ?? null,
  popular: provider.popular ?? false,
  rank: provider.rank ?? 999,
}
```

**Supported markets endpoint:** `GET https://api.tink.com/api/v1/providers/markets` — returns `{ markets: ["SE", "NO", "DK", ...] }`. Use to populate market filter chips.

**IMPORTANT:** The `transactional` and `loginHeaderColour` fields are deprecated and will be removed from April 30, 2026. Do NOT use them.

### Caching Strategy

Tink provider lists change infrequently (new bank integrations are rare). A 24-hour server-side cache is appropriate.

**Cache table approach** (preferred over in-memory because Edge Functions are stateless):
```sql
CREATE TABLE provider_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No RLS — accessed only by Edge Functions via service role key
```

**Cache logic in Edge Function:**
1. Check `provider_cache` for market where `cached_at > now() - interval '24 hours'`
2. If fresh cache exists → return `data` directly
3. If stale/missing → fetch from Tink API → upsert into `provider_cache` → return
4. If Tink API fails AND stale cache exists → return stale cache (better than error)
5. If Tink API fails AND no cache → return 503

### Client Credentials Grant vs User Token

Story 7.1 used `authorization_code` grant (user-specific token for bank data access). Story 7.2 uses `client_credentials` grant (app-level token for reading the provider list — no user context needed).

**Do NOT reuse the user's Tink access token from Story 7.1.** The providers list is public/app-level data. Create a separate client credentials token with `scope=providers:read`.

Add to `tink-providers/utils.ts` (or reuse shared utils):
```typescript
export async function getClientCredentialsToken(
  clientId: string,
  clientSecret: string,
  scope: string,
): Promise<string> {
  const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope,
    }),
  });
  if (!response.ok) throw new Error(`Tink auth failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}
```

### Feature Module Updates

**Modified files:**
```
src/features/bank/types/index.ts          — add SupportedBank type
src/shared/stores/useBankStore.ts          — add supportedBanks state/action
src/shared/stores/useBankStore.test.ts     — add provider list tests
src/features/bank/screens/BankConnectionScreen.tsx — add "View Supported Banks" button, handle autoConnect param
src/features/bank/screens/BankConnectionScreen.test.tsx — update tests
src/app/navigation/SettingsStack.tsx       — add SupportedBanks route
src/app/navigation/types.ts               — add SupportedBanks route type, update BankConnection params
```

**New files:**
```
supabase/migrations/YYYYMMDDHHMMSS_create_provider_cache.sql
supabase/functions/tink-providers/index.ts
supabase/functions/tink-providers/utils.ts
supabase/functions/tink-providers/index.test.ts
src/features/bank/screens/SupportedBanksScreen.tsx
src/features/bank/screens/SupportedBanksScreen.test.tsx
src/features/bank/components/BankListItem.tsx
src/features/bank/components/BankListItem.test.tsx
```

### useBankStore Updates

Add to existing store interface (do NOT create a separate store — this is bank-related state):

```typescript
// Add to BankState
supportedBanks: SupportedBank[];
isFetchingBanks: boolean;
fetchBanksError: AppError | null;

// Add to BankActions
fetchSupportedBanks: (market?: string) => Promise<void>;
```

```typescript
// Implementation
fetchSupportedBanks: async (market?: string) => {
  set({ isFetchingBanks: true, fetchBanksError: null });
  try {
    const { data, error } = await supabase.functions.invoke('tink-providers', {
      body: { market },
    });
    if (error) throw error;
    set({ supportedBanks: data.providers ?? [], isFetchingBanks: false });
  } catch (err) {
    set({
      fetchBanksError: handleError(err),
      isFetchingBanks: false,
    });
  }
},
```

**CRITICAL: Do NOT persist `supportedBanks` to AsyncStorage.** Update `partialize`:
```typescript
partialize: (state) => ({ connections: state.connections }),
// supportedBanks is intentionally excluded — transient cached data
```

### UI Component Patterns

**BankListItem — using React Native Paper `List.Item`:**
```typescript
<List.Item
  title={bank.displayName}
  description={bank.market}
  left={() => bank.iconUrl ? (
    <Avatar.Image size={40} source={{ uri: bank.iconUrl }} />
  ) : (
    <Avatar.Icon size={40} icon="bank" />
  )}
  onPress={() => onBankSelect(bank)}
/>
```

**Searchbar — React Native Paper:**
```typescript
<Searchbar
  placeholder="Search banks..."
  value={searchQuery}
  onChangeText={setSearchQuery}
/>
```

**Market filter chips:**
```typescript
const MARKETS = [
  { code: 'ALL', label: 'All' },
  { code: 'SE', label: '🇸🇪 Sweden' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'GB', label: '🇬🇧 UK' },
  { code: 'FR', label: '🇫🇷 France' },
  // ... other EU markets
];

{MARKETS.map(m => (
  <Chip
    key={m.code}
    selected={selectedMarket === m.code}
    onPress={() => setSelectedMarket(m.code)}
  >
    {m.label}
  </Chip>
))}
```

### Sorting Logic

```typescript
const sortBanks = (banks: SupportedBank[]): SupportedBank[] => {
  return [...banks].sort((a, b) => {
    // Popular banks first
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    // Then by rank (lower = better)
    if (a.rank !== b.rank) return a.rank - b.rank;
    // Then alphabetical
    return a.displayName.localeCompare(b.displayName);
  });
};
```

### Navigation Flow

```
BankConnectionScreen → "View Supported Banks" → SupportedBanksScreen
                                                       ↓ (tap bank)
BankConnectionScreen ← navigate back with autoConnect=true
                                                       ↓
                                              GDPR consent dialog
                                                       ↓
                                              Tink Link WebView
```

### What NOT to Do

- **DO NOT** fetch providers list on BankConnectionScreen load — only when user navigates to SupportedBanksScreen (avoid unnecessary API calls)
- **DO NOT** store provider list in AsyncStorage — it's cached server-side, no need for double caching
- **DO NOT** use the deprecated `transactional` or `loginHeaderColour` fields from Tink API (removed April 2026)
- **DO NOT** call Tink API directly from the client — always proxy through Edge Function (secret protection)
- **DO NOT** use `react-native-tink-sdk` npm package — wrong library (see Story 7.1 notes)
- **DO NOT** implement bank connection logic in this story — reuse Story 7.1's existing Tink Link WebView flow
- **DO NOT** create a separate store for providers — extend existing `useBankStore`

### Previous Story Intelligence (Story 7.1)

From Story 7.1 dev notes and change log:

1. **Edge Function deployment:** Deploy with `--no-verify-jwt` flag — Supabase gateway otherwise rejects the request before function code runs. Function should have its own `getUser()` auth check internally.

2. **`TINK_CLIENT_ID` and `TINK_CLIENT_SECRET`** are already configured in Supabase Edge Function secrets. No new env setup needed.

3. **iOS post-WebView network issue:** Story 7.1 discovered that iOS sometimes fails network calls immediately after WebView redirect. This is less relevant for Story 7.2 (no WebView involved in fetching the bank list), but keep the retry pattern in mind.

4. **Existing `tink-connect/utils.ts`:** Contains `exchangeAuthorizationCode()` and `buildConsentDates()`. The client credentials grant for Story 7.2 is a different flow — create `tink-providers/utils.ts` with `getClientCredentialsToken()` rather than modifying the existing utils.

5. **Co-located tests, Zustand pattern, premium gate** — all patterns established in Story 7.1, follow the same approach.

6. **`useFocusEffect` pattern:** Story 7.1 learned that screen data must be refetched on focus (not just on mount) because Zustand persist can show stale data. For SupportedBanksScreen, this is less critical (providers don't change per-session), but still use `useFocusEffect` for the initial fetch to ensure fresh data when navigating to the screen.

### Network Failure Handling

Per Epic 6 retro Lesson 2 — explicit failure paths:

| Scenario | User sees | Retry available |
|----------|-----------|-----------------|
| Tink API down, no cache | "Couldn't load supported banks. Please check your connection and try again." | Yes |
| Tink API down, stale cache exists | Normal bank list (from stale cache) | N/A |
| Network error (device offline) | "Couldn't load supported banks. Please check your connection and try again." | Yes |
| Empty provider list returned | "No banks found for this market." | Change market filter |

### Testing Pattern

**Jest mocks:**
```typescript
// Mock supabase.functions.invoke for tink-providers
jest.mock('@shared/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    })),
  },
}));
```

**Deno Edge Function tests** — same pattern as `tink-connect` tests. Test: successful provider fetch with client credentials, cache hit, cache miss with Tink fetch, Tink failure with stale cache fallback, Tink failure with no cache.

### Project Structure Notes

- Alignment with unified project structure: all new files in `src/features/bank/` (existing feature folder from Story 7.1)
- No new feature folders created
- Edge Function follows `supabase/functions/{name}/` pattern (same as `tink-connect`)
- `provider_cache` table has no RLS (Edge Function-only access via service role)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture] — Zustand pattern, feature structure, React Native Paper components
- [Source: _bmad-output/implementation-artifacts/7-1-bank-account-connection-via-open-banking.md] — Tink integration patterns, Edge Function deployment, useBankStore pattern
- [Source: _bmad-output/implementation-artifacts/epic-6-retro-2026-03-21.md] — Lessons learned (pre-research, failure ACs, library validation)
- [Source: docs/epic-7-prep-aggregator-decision.md] — Tink selection rationale
- [Source: Tink API docs — providers endpoint] — `GET /providers/{market}`, client credentials grant, provider response shape
- [Source: Tink API docs — providers/markets endpoint] — Supported markets list

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
