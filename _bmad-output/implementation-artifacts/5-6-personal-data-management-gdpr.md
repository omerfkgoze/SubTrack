# Story 5.6: Personal Data Management (GDPR)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to view and manage my stored personal data,
So that I have transparency and control over my information per GDPR requirements.

## Acceptance Criteria

1. **AC1: Data Summary Display**
   - **Given** the user navigates to Settings > My Data
   - **When** the data management screen loads
   - **Then** a summary of stored personal data is displayed: email, account creation date, number of subscriptions, data storage location

2. **AC2: Detailed Data View**
   - **Given** the user wants to see all their data
   - **When** they tap "View My Data"
   - **Then** a detailed view shows all stored information: profile data, subscriptions list, notification settings, preferences

3. **AC3: Data Portability (Download My Data)**
   - **Given** the user wants to download their data (data portability)
   - **When** they tap "Download My Data"
   - **Then** a comprehensive JSON export of all personal data is generated and shared via the native share sheet

4. **AC4: Account Deletion Integration**
   - **Given** the user has already deleted their account (via Story 1.7)
   - **When** the deletion is processed
   - **Then** this screen is no longer accessible and all data has been removed

## Tasks / Subtasks

- [ ] Task 1: Create `MyDataScreen` component (AC: #1, #2)
  - [ ] 1.1: Create `src/features/settings/screens/MyDataScreen.tsx`
  - [ ] 1.2: Implement data summary section showing: email, account creation date (`user.created_at`), subscription count, storage location ("Supabase Cloud (EU)")
  - [ ] 1.3: Implement "View My Data" expandable section with detailed breakdown: profile data, full subscriptions list, notification settings (from `useNotificationStore`), calendar preferences (from `getUserSettings`)
  - [ ] 1.4: Implement "Download My Data" button triggering comprehensive JSON export
  - [ ] 1.5: Add loading state while fetching user data

- [ ] Task 2: Create `personalDataService.ts` for GDPR data export (AC: #3)
  - [ ] 2.1: Create `src/features/settings/services/personalDataService.ts`
  - [ ] 2.2: Implement `exportPersonalData(userId, email, createdAt, subscriptions, notificationSettings, calendarPreferences)` — builds comprehensive JSON with all user data categories
  - [ ] 2.3: Reuse the `expo-file-system/legacy` + `expo-sharing` pattern from `exportService.ts`
  - [ ] 2.4: File naming: `subtrack-my-data-YYYY-MM-DD.json`
  - [ ] 2.5: Add `checkConnectivity()` guard before data fetching (reuse from `networkCheck.ts`)

- [ ] Task 3: Register `MyData` route in navigation (AC: #1)
  - [ ] 3.1: Add `MyData: undefined` to `SettingsStackParamList` in `src/app/navigation/types.ts`
  - [ ] 3.2: Add `MyDataScreen` to `SettingsStack.tsx` with title "My Data"
  - [ ] 3.3: Add "My Data" list item in `SettingsScreen.tsx` under the existing "Data" section (below "Data Export")

- [ ] Task 4: Write tests (AC: all)
  - [ ] 4.1: `src/features/settings/screens/MyDataScreen.test.tsx` — renders summary (email, creation date, sub count, storage location), renders detailed view on "View My Data" tap, triggers download on "Download My Data" tap, shows loading state
  - [ ] 4.2: `src/features/settings/services/personalDataService.test.ts` — generates correct JSON structure with all data categories, writes file and calls Sharing.shareAsync, handles connectivity failure
  - [ ] 4.3: Wrap all component tests in `PaperProvider` (MANDATORY)

- [ ] Task 5: Validate (AC: all)
  - [ ] 5.1: `npx tsc --noEmit` — zero errors
  - [ ] 5.2: ESLint clean on changed files
  - [ ] 5.3: Full test suite passes (current baseline: 522 passing)

## Dev Notes

### CRITICAL: What Already Exists — DO NOT Rebuild

- **Account deletion** — fully implemented in Story 1.7 via `useAuthStore.deleteAccount()` which calls the `delete-account` Edge Function. AC4 is already satisfied — just ensure `MyDataScreen` is only accessible when the user is logged in (which the auth flow already enforces).
- **Subscription data export** — `exportService.ts` already exports subscriptions as JSON/CSV. The GDPR "Download My Data" export is DIFFERENT: it must include ALL personal data (profile, subscriptions, settings, preferences), not just subscriptions.
- **Share sheet pattern** — `expo-file-system/legacy` + `expo-sharing` already used in `exportService.ts`. Reuse this exact pattern.
- **Network connectivity check** — `checkConnectivity()` from `src/shared/services/networkCheck.ts` (Story 5.5). Use before fetching data.
- **User settings service** — `getUserSettings(userId)` in `src/features/settings/services/userSettingsService.ts` fetches calendar preferences.
- **Notification store** — `useNotificationStore` has notification settings state.
- **Auth store** — `useAuthStore` has `user` object with `email`, `id`, and Supabase `user.created_at`.

### Screen Layout Pattern

Follow existing `DataExportScreen` pattern:
- Use `ScrollView` with `List.Section` components (react-native-paper)
- Use `List.Item` for data rows
- Use `Button` mode="contained" for actions
- Use `Snackbar` for success/error feedback
- Use `ActivityIndicator` for loading states

### Data Summary Section (AC1)

Display as `List.Item` rows:
- Email: from `useAuthStore` → `user.email`
- Account created: from `useAuthStore` → `user.created_at` (format with `toLocaleDateString()`)
- Subscriptions: count from `useSubscriptionStore` → `subscriptions.length`
- Data stored in: "Supabase Cloud (EU)" (static string per architecture — Supabase is EU-hosted for GDPR)

### Detailed Data View (AC2)

Use expandable `List.Accordion` sections:
- **Profile Data**: email, user ID, creation date
- **Subscriptions**: render each subscription's name, price, billing cycle, status (reuse data from `useSubscriptionStore`)
- **Notification Settings**: reminder timing preferences, per-subscription settings
- **Calendar Preferences**: preferred calendar name/ID

### Download My Data JSON Structure (AC3)

```json
{
  "export_date": "2026-03-18T...",
  "user": {
    "email": "user@example.com",
    "id": "uuid",
    "created_at": "2026-01-15T..."
  },
  "subscriptions": [
    { "name": "Netflix", "price": 17.99, ... }
  ],
  "settings": {
    "preferred_calendar_id": "abc-123",
    "notification_preferences": { ... }
  }
}
```

Include ALL fields from subscriptions (not the filtered `EXPORT_FIELDS` from `exportService.ts` — GDPR requires ALL stored data including `id`, `user_id`, `created_at`, `updated_at`, `calendar_event_id`).

### Navigation Integration

In `SettingsScreen.tsx`, add below the existing "Data Export" `List.Item` (line ~268):

```typescript
<List.Item
  title="My Data"
  description="View and download your personal data"
  left={(props) => <List.Icon {...props} icon="shield-account" />}
  right={(props) => <List.Icon {...props} icon="chevron-right" />}
  onPress={() => navigation.navigate('MyData')}
  style={styles.listItem}
  accessibilityLabel="My Data"
  accessibilityRole="button"
/>
```

### Architecture Compliance

- Settings Stack pattern: `SettingsStack.tsx` registers screens, `types.ts` defines param types
- File location: `src/features/settings/screens/MyDataScreen.tsx` (follows existing pattern)
- Service location: `src/features/settings/services/personalDataService.ts`
- Import via `expo-file-system/legacy` (NOT `expo-file-system` directly — Story 5.4 learned this)

### Previous Story Intelligence (Story 5.5)

- `expo-file-system` v19 requires `/legacy` import path
- PaperProvider wrapper is MANDATORY for all component tests
- Test baseline: 522 passing tests (as of Story 5.5 code review completion)
- `checkConnectivity()` from `src/shared/services/networkCheck.ts` is reusable for pre-fetch guard
- Use `__esModule: true` + `default` pattern when mocking modules with default exports

### Project Structure Notes

- `MyDataScreen.tsx` → `src/features/settings/screens/` (matches DataExportScreen location)
- `personalDataService.ts` → `src/features/settings/services/` (matches exportService location)
- No new Supabase migrations needed — all data already exists in tables
- No new navigation stacks — just add screen to existing SettingsStack

### References

- [Source: epics.md#Story-5.6] — GDPR personal data management acceptance criteria
- [Source: prd.md#FR32] — User can view and manage their stored personal data (MVP)
- [Source: prd.md#NFR16] — GDPR data deletion within 30 days of request (P0)
- [Source: architecture.md#Security-Constraints] — GDPR full compliance (Europe target market)
- [Source: architecture.md#Settings-Stack] — Settings Stack: Notifications | Premium | DataExport | Account
- [Source: src/features/settings/screens/DataExportScreen.tsx] — Existing export screen pattern
- [Source: src/features/settings/services/exportService.ts] — Existing file export + share pattern
- [Source: src/shared/services/networkCheck.ts] — Connectivity check utility (Story 5.5)
- [Source: src/features/settings/screens/SettingsScreen.tsx] — Settings navigation and Data section
- [Source: 5-5-cloud-data-sync.md#Dev-Notes] — Previous story patterns and test baseline (522)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
