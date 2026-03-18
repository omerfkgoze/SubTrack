# Story 5.4: Export Subscription Data

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to export my subscription data as JSON or CSV,
So that I have a backup or can use the data elsewhere.

## Acceptance Criteria

1. **AC1: Data Export Screen Shows Format Options**
   - **Given** the user navigates to Settings > Data Export
   - **When** the export screen is displayed
   - **Then** two format options are available: JSON and CSV

2. **AC2: JSON Export with Share Sheet**
   - **Given** the user selects JSON export and taps "Export"
   - **When** the export is processed
   - **Then** all subscription data is serialized to a JSON file containing: `name`, `price`, `currency`, `billing_cycle`, `renewal_date`, `category`, `is_active`, `is_trial`, `trial_expiry_date`, `notes`
   - **And** the native share sheet is presented to save or share the file

3. **AC3: CSV Export with Share Sheet**
   - **Given** the user selects CSV export and taps "Export"
   - **When** the export is processed
   - **Then** all subscription data is exported as a CSV file with proper headers matching the JSON fields
   - **And** the native share sheet is presented to save or share the file

4. **AC4: Empty State When No Subscriptions**
   - **Given** the user has no subscriptions
   - **When** they attempt to export
   - **Then** a message is displayed: "No data to export. Add subscriptions first."
   - **And** the Export button is disabled or absent

## Tasks / Subtasks

- [x] Task 1: Install required dependencies (AC: #2, #3)
  - [x] 1.1: Install `expo-file-system` (`npx expo install expo-file-system`) — required for writing temp file before sharing
  - [x] 1.2: Install `expo-sharing` (`npx expo install expo-sharing`) — required for native share sheet with file

- [x] Task 2: Create `exportService.ts` in `src/features/settings/services/` (AC: #2, #3, #4)
  - [x] 2.1: Create `src/features/settings/services/exportService.ts`
  - [x] 2.2: Implement `exportToJSON(subscriptions: Subscription[]): Promise<void>` — serializes to JSON, writes temp file via `FileSystem.writeAsStringAsync`, shares via `Sharing.shareAsync`
  - [x] 2.3: Implement `exportToCSV(subscriptions: Subscription[]): Promise<void>` — serializes to CSV with headers, writes temp file, shares via `Sharing.shareAsync`
  - [x] 2.4: CSV headers must be: `name,price,currency,billing_cycle,renewal_date,category,is_active,is_trial,trial_expiry_date,notes`
  - [x] 2.5: JSON fields to include: `name`, `price`, `currency`, `billing_cycle`, `renewal_date`, `category`, `is_active`, `is_trial`, `trial_expiry_date`, `notes` (exclude internal fields: `id`, `user_id`, `created_at`, `updated_at`, `calendar_event_id`)
  - [x] 2.6: Filename format: `subtrack-export-YYYY-MM-DD.json` / `subtrack-export-YYYY-MM-DD.csv` (use current date)
  - [x] 2.7: Write temp file to `FileSystem.cacheDirectory + filename`
  - [x] 2.8: CSV values with commas or special characters must be quoted

- [x] Task 3: Create `DataExportScreen.tsx` in `src/features/settings/screens/` (AC: #1, #2, #3, #4)
  - [x] 3.1: Create `src/features/settings/screens/DataExportScreen.tsx`
  - [x] 3.2: Use `useSubscriptionStore` to get `subscriptions` and `fetchSubscriptions` — call `fetchSubscriptions` in `useEffect` if subscriptions not loaded
  - [x] 3.3: Render two option cards/radio: "JSON" and "CSV" with descriptions
  - [x] 3.4: Render "Export" button (primary, contained) — disabled when no subscriptions or while exporting
  - [x] 3.5: Render empty state message when `subscriptions.length === 0`: "No data to export. Add subscriptions first."
  - [x] 3.6: Show loading indicator (`isExporting` state) during export to prevent double-tap
  - [x] 3.7: On success: show Snackbar "Export complete" (3s auto-dismiss)
  - [x] 3.8: On error: show Snackbar "Export failed. Please try again." (5s, error color)
  - [x] 3.9: Use `useTheme()` from `react-native-paper` for consistent styling

- [x] Task 4: Register `DataExportScreen` in `SettingsStack` and add navigation entry in `SettingsScreen` (AC: #1)
  - [x] 4.1: In `src/app/navigation/SettingsStack.tsx`, import `DataExportScreen` from `@features/settings/screens/DataExportScreen` and add `<Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Data Export' }} />`
  - [x] 4.2: In `src/features/settings/screens/SettingsScreen.tsx`, add a `List.Item` for "Data Export" with appropriate icon (`database-export` or `export`) and `onPress={() => navigation.navigate('DataExport')}` — place it in the Data/Account section (between Calendar and Account items)

- [x] Task 5: Write tests (AC: all)
  - [x] 5.1: `src/features/settings/services/exportService.test.ts` — test `exportToJSON`: calls `FileSystem.writeAsStringAsync` with correct JSON content and correct filename pattern
  - [x] 5.2: `src/features/settings/services/exportService.test.ts` — test `exportToJSON`: JSON output includes all required fields and excludes internal fields
  - [x] 5.3: `src/features/settings/services/exportService.test.ts` — test `exportToCSV`: CSV output has correct headers and correct row values
  - [x] 5.4: `src/features/settings/services/exportService.test.ts` — test `exportToCSV`: values with commas are properly quoted
  - [x] 5.5: `src/features/settings/services/exportService.test.ts` — test both functions: call `Sharing.shareAsync` after writing file
  - [x] 5.6: `src/features/settings/screens/DataExportScreen.test.tsx` — renders format selection (JSON/CSV options visible)
  - [x] 5.7: `src/features/settings/screens/DataExportScreen.test.tsx` — empty state: shows message when no subscriptions, Export button disabled
  - [x] 5.8: `src/features/settings/screens/DataExportScreen.test.tsx` — JSON selected: tapping Export calls `exportToJSON`
  - [x] 5.9: `src/features/settings/screens/DataExportScreen.test.tsx` — CSV selected: tapping Export calls `exportToCSV`
  - [x] 5.10: `src/features/settings/screens/DataExportScreen.test.tsx` — shows loading state during export (button disabled while `isExporting`)
  - [x] 5.11: `src/features/settings/screens/DataExportScreen.test.tsx` — on export error: shows error snackbar
  - [x] 5.12: `src/features/settings/screens/DataExportScreen.test.tsx` — on export success: shows success snackbar

- [x] Task 6: Validate (AC: all)
  - [x] 6.1: `npx tsc --noEmit` — zero errors
  - [x] 6.2: ESLint clean on changed files
  - [x] 6.3: Full test suite passes (current baseline: 492 passing)

## Dev Notes

### CRITICAL: Install `expo-file-system` and `expo-sharing` — NOT Installed Yet

These packages are required for writing temp files and presenting the native share sheet for actual files. They are NOT currently installed in the project.

```bash
npx expo install expo-file-system expo-sharing
```

This will install the Expo SDK 54-compatible versions automatically (expected: `expo-file-system ~18.0.x`, `expo-sharing ~12.0.x`).

**Do NOT use React Native's built-in `Share` API** — it shares text/URLs, not files. The epics require a file to be shared (not inline text content).

### `exportService.ts` Implementation Pattern

```typescript
// src/features/settings/services/exportService.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Subscription } from '@features/subscriptions/types';

const EXPORT_FIELDS = ['name', 'price', 'currency', 'billing_cycle', 'renewal_date',
  'category', 'is_active', 'is_trial', 'trial_expiry_date', 'notes'] as const;

function getFilename(ext: 'json' | 'csv'): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `subtrack-export-${date}.${ext}`;
}

export async function exportToJSON(subscriptions: Subscription[]): Promise<void> {
  const data = subscriptions.map((sub) =>
    Object.fromEntries(EXPORT_FIELDS.map((f) => [f, sub[f] ?? null]))
  );
  const content = JSON.stringify(data, null, 2);
  const filename = getFilename('json');
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Subscriptions' });
}

export async function exportToCSV(subscriptions: Subscription[]): Promise<void> {
  const headers = EXPORT_FIELDS.join(',');
  const rows = subscriptions.map((sub) =>
    EXPORT_FIELDS.map((f) => {
      const val = sub[f] ?? '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  const content = [headers, ...rows].join('\n');
  const filename = getFilename('csv');
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Subscriptions' });
}
```

### `DataExportScreen.tsx` Implementation Pattern

```typescript
// src/features/settings/screens/DataExportScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, RadioButton, Button, Snackbar, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { exportToJSON, exportToCSV } from '@features/settings/services/exportService';

type ExportFormat = 'json' | 'csv';

export function DataExportScreen() {
  const theme = useTheme();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const fetchSubscriptions = useSubscriptionStore((s) => s.fetchSubscriptions);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; isError: boolean }>({
    visible: false, message: '', isError: false,
  });

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleExport = useCallback(async () => {
    if (subscriptions.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      if (format === 'json') {
        await exportToJSON(subscriptions);
      } else {
        await exportToCSV(subscriptions);
      }
      setSnackbar({ visible: true, message: 'Export complete', isError: false });
    } catch {
      setSnackbar({ visible: true, message: 'Export failed. Please try again.', isError: true });
    } finally {
      setIsExporting(false);
    }
  }, [subscriptions, format, isExporting]);

  const isEmpty = subscriptions.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Format selection */}
      <RadioButton.Group onValueChange={(v) => setFormat(v as ExportFormat)} value={format}>
        <RadioButton.Item label="JSON" value="json" />
        <RadioButton.Item label="CSV" value="csv" />
      </RadioButton.Group>

      {isEmpty ? (
        <Text style={styles.emptyText}>No data to export. Add subscriptions first.</Text>
      ) : (
        <Button
          mode="contained"
          onPress={handleExport}
          disabled={isExporting || isEmpty}
          loading={isExporting}
        >
          Export
        </Button>
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        duration={snackbar.isError ? 5000 : 3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}
```

### `SettingsStack.tsx` Change

**File:** `src/app/navigation/SettingsStack.tsx`

Add `DataExportScreen` import and screen:
```typescript
import { DataExportScreen } from '@features/settings/screens/DataExportScreen';
// ...
<Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Data Export' }} />
```

`DataExport` route is **already defined** in `SettingsStackParamList` in `src/app/navigation/types.ts` — no type changes needed.

### `SettingsScreen.tsx` Change

**File:** `src/features/settings/screens/SettingsScreen.tsx`

Add a List.Item for Data Export navigation (place between calendar and account/logout sections):
```typescript
<List.Item
  title="Data Export"
  description="Export your subscriptions as JSON or CSV"
  left={(props) => <List.Icon {...props} icon="database-export" />}
  right={(props) => <List.Icon {...props} icon="chevron-right" />}
  onPress={() => navigation.navigate('DataExport')}
/>
```

### JSON Fields to Export (and NOT to export)

**Include** (per AC2 and epics):
- `name`, `price`, `currency`, `billing_cycle`, `renewal_date`, `category`, `is_active`, `is_trial`, `trial_expiry_date`, `notes`

**Exclude** (internal/implementation details not useful to user):
- `id`, `user_id`, `created_at`, `updated_at`, `calendar_event_id`

### `Subscription` Type Reference

The `Subscription` type is `Database['public']['Tables']['subscriptions']['Row']` (from `@shared/types/database.types`). All the fields listed above are present on this type. Use `sub[fieldName] ?? null` for null safety.

### Testing Strategy: Mock `expo-file-system` and `expo-sharing`

In tests, mock both expo modules:

```typescript
jest.mock('expo-file-system', () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));
```

Mock `@shared/stores/useSubscriptionStore` for screen tests (same pattern as other screen tests):
```typescript
jest.mock('@shared/stores/useSubscriptionStore');
const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;
```

**Always wrap DataExportScreen tests in PaperProvider** (required for react-native-paper components):
```typescript
import { PaperProvider } from 'react-native-paper';
const renderWithProvider = (ui: React.ReactElement) =>
  render(<PaperProvider>{ui}</PaperProvider>);
```

**Testing baseline:** 492 tests passing (as of Story 5.3 code review). All new tests must pass on top of that.

### Previous Story Intelligence (Story 5.3)

**Key learnings from 5.3:**
- `CalendarCleanupDialog` follows Portal > Dialog from react-native-paper — for any dialogs in this story use same pattern
- Store tests mock `calendarService` and `userSettingsService` to avoid Supabase env var requirement — similarly mock `expo-file-system` and `expo-sharing` in export service tests
- PaperProvider wrapper is MANDATORY for all component/screen tests
- Fire-and-forget pattern with `.catch(() => {})` for non-blocking side effects
- `SubscriptionDetailScreen.test.tsx` and `SubscriptionsScreen.test.tsx` have established mocking patterns for `useSubscriptionStore` — follow same approach for `DataExportScreen.test.tsx`
- TypeScript `npx tsc --noEmit` must be zero errors — check that `expo-file-system` and `expo-sharing` have TypeScript types (they do, bundled with the packages)
- ESLint must be clean on all changed files

**Baseline test count:** 492 passing (includes 5.3 code-review additions: 4 extra tests for error cases in SubscriptionDetailScreen and SubscriptionsScreen).

### Cross-Story Context

- **Story 5.5 (Cloud Data Sync):** Exports in 5.4 read from the local `useSubscriptionStore.subscriptions` which is already synced via Supabase. No special handling needed — if subscriptions are loaded in store, they are current.
- **Story 5.6 (GDPR):** That story adds "Download My Data" (comprehensive personal data export). Story 5.4's `exportService.ts` functions can potentially be reused in 5.6, but do NOT pre-engineer for it — keep 5.4 focused on its own requirements.
- **Story 6.1 (Freemium):** May gate export behind Premium. Do NOT add Premium gates in this story; implement clean export first.

### Project Structure Notes

- New `DataExportScreen.tsx` belongs in `src/features/settings/screens/` (matches architecture.md feature mapping for FR30-FR32 → `features/settings`)
- New `exportService.ts` belongs in `src/features/settings/services/` (service layer for settings feature)
- `SettingsStack.tsx` is in `src/app/navigation/` — import `DataExportScreen` using `@features/settings/screens/DataExportScreen` alias
- No new Supabase migrations or schema changes needed — exports read from existing subscription data via store
- No new columns or tables required

### References

- [Source: epics.md#Story-5.4] — Acceptance criteria for export (JSON/CSV + share sheet + empty state)
- [Source: architecture.md#Feature-Mapping] — FR30-FR32 → features/settings → DataExportScreen.tsx
- [Source: architecture.md#Project-Structure] — File placement and import alias conventions
- [Source: src/app/navigation/types.ts#SettingsStackParamList] — `DataExport: undefined` already defined
- [Source: src/app/navigation/SettingsStack.tsx] — Where to register DataExportScreen
- [Source: src/features/settings/screens/SettingsScreen.tsx:226] — Pattern for navigation.navigate() in List.Item
- [Source: src/shared/stores/useSubscriptionStore.ts] — `subscriptions` state and `fetchSubscriptions` action
- [Source: src/features/subscriptions/types/index.ts] — `Subscription` type definition
- [Source: 5-3-calendar-event-cleanup-on-subscription-delete.md#Dev-Notes] — PaperProvider, mocking, testing patterns
- [Source: ux-design-specification.md#Empty-States] — Empty state UX: guide forward, no blame

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- expo-file-system v19 changed its API; legacy functions (`cacheDirectory`, `writeAsStringAsync`, `EncodingType`) must be imported from `expo-file-system/legacy` instead of the main export.

### Completion Notes List

- Installed expo-file-system (~19.0.21) and expo-sharing (~14.0.8) via `npx expo install`.
- Created `exportService.ts` using `expo-file-system/legacy` import for legacy API compatibility with the v19 package.
- Created `DataExportScreen.tsx` with RadioButton format selector, export button with loading state, empty state message, and Snackbar feedback.
- Registered `DataExport` screen in `SettingsStack.tsx`; added "Data Export" `List.Item` in a new "Data" section in `SettingsScreen.tsx` between Calendar and Account sections.
- All 14 new tests pass; full suite 506/506 passing. TypeScript and ESLint clean.

### File List

- `package.json` (modified — added expo-file-system, expo-sharing)
- `package-lock.json` (modified — lockfile updated)
- `src/features/settings/services/exportService.ts` (created)
- `src/features/settings/services/exportService.test.ts` (created)
- `src/features/settings/screens/DataExportScreen.tsx` (created)
- `src/features/settings/screens/DataExportScreen.test.tsx` (created)
- `src/app/navigation/SettingsStack.tsx` (modified — added DataExportScreen registration)
- `src/features/settings/screens/SettingsScreen.tsx` (modified — added Data Export List.Item)

## Change Log

- 2026-03-18: Story 5.4 implemented — added JSON/CSV export feature with native share sheet, DataExportScreen, exportService, navigation registration, and full test suite (14 new tests; total 506 passing).
