# Story 7.9: Bank Connection Expiry Notifications

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to be notified when my bank connection expires or fails,
so that I can reconnect and maintain automatic detection.

## Acceptance Criteria

### AC1: Push Notification When Connection Expiring Soon (7 Days)
- **Given** the user's bank connection `consentExpiresAt` is within 7 days
- **When** the daily `calculate-reminders` Edge Function runs (9:00 AM UTC via pg_cron)
- **Then** a push notification is sent: "Your [Bank Name] connection expires in [X] days. Reconnect to keep auto-detection active."
- **And** the notification is logged in `notification_log` with `notification_type = 'bank_expiry'`
- **And** duplicate notifications for the same connection+date are prevented

### AC2: Push Notification When Connection Has Expired
- **Given** the bank connection's `consentExpiresAt` date has passed
- **When** the daily `calculate-reminders` Edge Function runs
- **Then** a push notification is sent: "Your [Bank Name] connection has expired. Reconnect now."
- **And** the connection status is updated to `'expired'` in the database if not already

### AC3: In-App Banner on Dashboard for Expired/Expiring Connections
- **Given** the user has a bank connection with status `'expiring_soon'` or `'expired'`
- **When** they view the HomeScreen (Dashboard)
- **Then** an amber banner is shown for `'expiring_soon'`: "Your [Bank Name] connection expires soon. Reconnect to keep auto-detection."
- **And** a red banner is shown for `'expired'`: "Your [Bank Name] connection has expired. Reconnect now."
- **And** the banner has a "Reconnect" action button navigating to BankConnectionStatusScreen

### AC4: Push Notification on Sync Error
- **Given** the bank connection fails unexpectedly during sync
- **When** a sync error occurs (connection status becomes `'error'`)
- **Then** a push notification is sent: "There's an issue with your [Bank Name] connection. Check your bank connection settings."
- **And** the connection status is updated to `'error'`

### AC5: Notification History Integration
- **Given** bank connection expiry/error notifications are sent
- **When** the user views their notification history
- **Then** bank connection notifications appear in the history list alongside renewal and trial_expiry notifications

## Tasks / Subtasks

- [x] Task 1: Database migration — extend `notification_log` for bank expiry notifications (AC: 1, 2, 4, 5)
  - [x] 1.1 Create migration: ALTER `notification_log.notification_type` CHECK constraint to include `'bank_expiry'`
  - [x] 1.2 Add nullable `bank_connection_id UUID` column to `notification_log` (for bank notifications, `subscription_id` is NULL)
  - [x] 1.3 Add unique constraint: `(bank_connection_id, renewal_date, notification_type)` for deduplication
  - [x] 1.4 Create RPC function `get_bank_expiry_candidates(check_date DATE)` — returns connections expiring within 7 days or already expired, joining with `push_tokens` for user's tokens

- [x] Task 2: Extend `calculate-reminders` Edge Function (AC: 1, 2, 4)
  - [x] 2.1 Add `BankExpiryCandidate` interface: `{ bank_connection_id, bank_name, consent_expires_at, user_id, days_until_expiry, status }`
  - [x] 2.2 Add `formatBankExpiryNotification(candidate)` function with messages per AC1/AC2/AC4
  - [x] 2.3 Add Section 3: "Process BANK CONNECTION EXPIRY notifications" following the exact renewal/trial pattern
  - [x] 2.4 Call `get_bank_expiry_candidates` RPC, deduplicate via `notification_log`, send via `sendPushNotification`, log results
  - [x] 2.5 For expired connections: also update `bank_connections.status = 'expired'` if currently `'active'` or `'expiring_soon'`
  - [x] 2.6 For error connections: query `bank_connections WHERE status = 'error'` and send AC4 notifications
  - [x] 2.7 Add `bankExpiry` to the response summary object

- [x] Task 3: Create `BankConnectionExpiryBanner` component (AC: 3)
  - [x] 3.1 Create `src/features/bank/components/BankConnectionExpiryBanner.tsx`
  - [x] 3.2 Read `connections` from `useBankStore` — find first connection with status `'expiring_soon'` or `'expired'`
  - [x] 3.3 Render React Native Paper `Banner` (same pattern as `NotificationStatusBanner`):
    - Amber (`#F59E0B`) background for `'expiring_soon'`, red (`#EF4444`) for `'expired'`
    - Icon: `"bank-off"` or `"bank-alert"` (Material Community Icons)
    - Action: `{ label: 'Reconnect', onPress: navigateToBankConnectionStatus }`
  - [x] 3.4 Return `null` if no expiring/expired connections
  - [x] 3.5 Export from `src/features/bank/components/index.ts` (if barrel exists) or import directly

- [x] Task 4: Add banner to HomeScreen (AC: 3)
  - [x] 4.1 Import `BankConnectionExpiryBanner` in `HomeScreen.tsx`
  - [x] 4.2 Place immediately after `<NotificationStatusBanner />` (line 42)
  - [x] 4.3 Ensure `useBankStore` connections are loaded (add `useFocusEffect` to fetch connections on focus if not already)

- [x] Task 5: Update Notification History for bank_expiry type (AC: 5)
  - [x] 5.1 Update `NotificationHistoryItem` interface in `notificationHistoryService.ts`: add `'bank_expiry'` to `notification_type` union
  - [x] 5.2 Update notification history fetch query to include `bank_expiry` type
  - [x] 5.3 Update notification history display to show bank name instead of subscription name for `bank_expiry` entries

- [x] Task 6: Tests (AC: all)
  - [x] 6.1 Unit test for `BankConnectionExpiryBanner`: renders amber for expiring_soon, red for expired, null for active, Reconnect action navigates
  - [x] 6.2 Update `HomeScreen.test.tsx`: verify banner renders when expired connection exists
  - [x] 6.3 Test `get_bank_expiry_candidates` RPC logic (integration or mock)
  - [x] 6.4 Test edge function bank expiry section: notification sent, deduplication works, status updated

## Dev Notes

### Existing Code to Reuse — DO NOT Reinvent
- **`calculate-reminders` Edge Function** (`supabase/functions/calculate-reminders/index.ts`): Already processes renewals and trial_expiry. Add a third section for bank_expiry following the EXACT same pattern (RPC → dedup check → send → log).
- **`sendPushNotification()`** in the edge function: Already handles retries, Expo API, receipt tracking. Reuse directly — pass `bank_connection_id` as the data identifier.
- **`NotificationStatusBanner`** (`src/features/notifications/components/NotificationStatusBanner.tsx`): Follow the exact same React Native Paper `Banner` pattern for the new `BankConnectionExpiryBanner`.
- **`NetworkBanner`** (`src/shared/components/feedback/NetworkBanner.tsx`): Another Banner pattern reference.
- **`ConnectionStatusCard`** (`src/features/bank/components/ConnectionStatusCard.tsx`): Already has `getDaysUntilExpiry()` helper and status-based color mapping (`expiring_soon` → tertiary/amber, `expired` → error/red).
- **`useBankStore`** (`src/shared/stores/useBankStore.ts`): Already has `connections` state, `fetchConnections()` action. Use these to read connection status for the banner.
- **`notification_log` table**: Already has `notification_type` column with unique constraint pattern. Extend the CHECK constraint.
- **`get_trial_expiry_candidates` RPC** (`supabase/migrations/20260317000000_add_trial_expiry_notifications.sql`): Follow the exact same RPC pattern for `get_bank_expiry_candidates`.
- **Deduplication pattern**: `notification_log` uses `(subscription_id, renewal_date, notification_type)` unique constraint with upsert. For bank expiry, use `(bank_connection_id, renewal_date, notification_type)`.

### Architecture Patterns to Follow
- **Edge Function pipeline**: pg_cron (9:00 AM UTC daily) → Edge Function → RPC candidates → dedup → Expo Push API → log. Do NOT create a separate cron job — extend the existing `calculate-reminders` function.
- **Banner component**: React Native Paper `Banner` with `visible`, `actions`, `icon`, `style` props. Conditional rendering (return null if not applicable).
- **Store reads**: Use Zustand selectors `useBankStore((s) => s.connections)`. Do NOT create new store actions for reading — just read existing state.
- **Database**: snake_case for DB columns, camelCase for TypeScript. Use `SECURITY DEFINER` for RPC functions.
- **Tests**: Co-located `*.test.tsx` files, Jest + React Native Testing Library.

### Key Implementation Details

**Migration — extend notification_log:**
```sql
-- 1. Widen notification_type CHECK
ALTER TABLE notification_log DROP CONSTRAINT notification_log_notification_type_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_notification_type_check
  CHECK (notification_type IN ('renewal', 'trial_expiry', 'bank_expiry'));

-- 2. Add bank_connection_id (nullable — NULL for subscription notifications)
ALTER TABLE notification_log ADD COLUMN bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL;

-- 3. Unique constraint for bank expiry dedup
ALTER TABLE notification_log ADD CONSTRAINT notification_log_bank_date_type_unique
  UNIQUE (bank_connection_id, renewal_date, notification_type);
```

**RPC function — get_bank_expiry_candidates:**
```sql
CREATE OR REPLACE FUNCTION get_bank_expiry_candidates(check_date DATE)
RETURNS TABLE (
  bank_connection_id UUID,
  bank_name TEXT,
  consent_expires_at DATE,
  user_id UUID,
  days_until_expiry INTEGER,
  connection_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id AS bank_connection_id,
    bc.bank_name,
    bc.consent_expires_at::DATE,
    bc.user_id,
    (bc.consent_expires_at::DATE - check_date)::INTEGER AS days_until_expiry,
    bc.status AS connection_status
  FROM bank_connections bc
  WHERE bc.status IN ('active', 'expiring_soon')
    AND (bc.consent_expires_at::DATE - check_date) BETWEEN -30 AND 7;
    -- -30 to catch recently expired (up to 30 days), 7 for approaching expiry
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Edge Function — formatBankExpiryNotification:**
```typescript
interface BankExpiryCandidate {
  bank_connection_id: string
  bank_name: string
  consent_expires_at: string
  user_id: string
  days_until_expiry: number
  connection_status: string
}

function formatBankExpiryNotification(candidate: BankExpiryCandidate) {
  const { bank_name, days_until_expiry } = candidate

  if (days_until_expiry <= 0) {
    return {
      title: `🔗 Your ${bank_name} connection has expired`,
      body: 'Reconnect now to keep auto-detection active.',
    }
  }
  return {
    title: `🔗 Your ${bank_name} connection expires in ${days_until_expiry} day${days_until_expiry === 1 ? '' : 's'}`,
    body: 'Reconnect to keep auto-detection active.',
  }
}
```

**Edge Function — Section 3 pattern (in Deno.serve handler, after trial expiry section):**
```typescript
// ========================================
// 3. Process BANK CONNECTION EXPIRY notifications
// ========================================
const { data: bankCandidates, error: bankError } = await supabase.rpc(
  'get_bank_expiry_candidates',
  { check_date: today }
)
if (bankError) throw bankError

let bankSent = 0, bankSkipped = 0, bankFailed = 0

for (const candidate of (bankCandidates ?? []) as BankExpiryCandidate[]) {
  // Deduplication
  const { data: existing } = await supabase
    .from('notification_log')
    .select('id, status')
    .eq('bank_connection_id', candidate.bank_connection_id)
    .eq('renewal_date', today)  // one notification per day per connection
    .eq('notification_type', 'bank_expiry')
    .maybeSingle()

  if (existing?.status === 'sent') { bankSkipped++; continue }

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', candidate.user_id)

  if (!tokens || tokens.length === 0) { bankSkipped++; continue }

  const { title, body } = formatBankExpiryNotification(candidate)

  const result = await sendPushNotification(tokens, title, body, candidate.bank_connection_id, expoAccessToken)

  await supabase.from('notification_log').upsert(
    {
      user_id: candidate.user_id,
      bank_connection_id: candidate.bank_connection_id,
      renewal_date: today,
      notification_type: 'bank_expiry',
      status: result.success ? 'sent' : 'failed',
      expo_receipt_id: result.expoReceiptId,
      error_message: result.success ? null : result.lastError,
    },
    { onConflict: 'bank_connection_id,renewal_date,notification_type' }
  )

  // Update connection status if expired
  if (candidate.days_until_expiry <= 0 && candidate.connection_status !== 'expired') {
    await supabase
      .from('bank_connections')
      .update({ status: 'expired' })
      .eq('id', candidate.bank_connection_id)
  }

  if (result.success) bankSent++
  else bankFailed++
}
```

**BankConnectionExpiryBanner component:**
```typescript
// src/features/bank/components/BankConnectionExpiryBanner.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Banner, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useBankStore } from '@shared/stores/useBankStore';

export function BankConnectionExpiryBanner() {
  const navigation = useNavigation();
  const connections = useBankStore((s) => s.connections);

  const alertConnection = connections.find(
    (c) => c.status === 'expiring_soon' || c.status === 'expired'
  );

  if (!alertConnection) return null;

  const isExpired = alertConnection.status === 'expired';
  const bgColor = isExpired ? '#EF4444' : '#F59E0B';
  const message = isExpired
    ? `Your ${alertConnection.bankName} connection has expired. Reconnect now.`
    : `Your ${alertConnection.bankName} connection expires soon. Reconnect to keep auto-detection.`;

  return (
    <Banner
      visible
      actions={[{
        label: 'Reconnect',
        onPress: () => navigation.navigate('BankConnectionStatus' as never),
      }]}
      icon="bank-off"
      style={[styles.banner, { backgroundColor: bgColor }]}
      theme={{ colors: { onSurface: '#FFFFFF', primary: '#FFFFFF' } }}
    >
      {message}
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: 0 },
});
```

**HomeScreen integration (after line 42):**
```typescript
import { BankConnectionExpiryBanner } from '@features/bank/components/BankConnectionExpiryBanner';
// ...
<NotificationStatusBanner />
<BankConnectionExpiryBanner />
```

**Error notification (AC4) — add to Edge Function Section 3:**
```typescript
// 3b. Process BANK CONNECTION ERROR notifications
const { data: errorConnections } = await supabase
  .from('bank_connections')
  .select('id, bank_name, user_id, status')
  .eq('status', 'error')

for (const conn of (errorConnections ?? [])) {
  // Dedup: one error notification per day per connection
  const { data: existing } = await supabase
    .from('notification_log')
    .select('id, status')
    .eq('bank_connection_id', conn.id)
    .eq('renewal_date', today)
    .eq('notification_type', 'bank_expiry')
    .maybeSingle()

  if (existing?.status === 'sent') { bankSkipped++; continue }

  const { data: tokens } = await supabase
    .from('push_tokens').select('token').eq('user_id', conn.user_id)

  if (!tokens || tokens.length === 0) { bankSkipped++; continue }

  const title = `⚠️ Issue with your ${conn.bank_name} connection`
  const body = 'Check your bank connection settings.'

  const result = await sendPushNotification(tokens, title, body, conn.id, expoAccessToken)

  await supabase.from('notification_log').upsert(
    {
      user_id: conn.user_id,
      bank_connection_id: conn.id,
      renewal_date: today,
      notification_type: 'bank_expiry',
      status: result.success ? 'sent' : 'failed',
      expo_receipt_id: result.expoReceiptId,
      error_message: result.success ? null : result.lastError,
    },
    { onConflict: 'bank_connection_id,renewal_date,notification_type' }
  )

  if (result.success) bankSent++
  else bankFailed++
}
```

### Notification History Integration (AC5)
- `notificationHistoryService.ts` has `NotificationHistoryItem` with `notification_type: 'renewal' | 'trial_expiry'` — add `'bank_expiry'` to the union.
- The fetch query selects from `notification_log` joined with `subscriptions` for names. For `bank_expiry` rows, `subscription_id` is NULL, so LEFT JOIN and use `bank_connections.bank_name` instead.
- Update the query to LEFT JOIN `bank_connections` on `bank_connection_id` and use `COALESCE(s.name, bc.bank_name)` for the display name.

### Previous Story (7.8) Learnings
- **Clear error state on action start** — apply to any new store actions.
- **Demo mode**: Check `env.DEMO_BANK_MODE`, use `mockDelay()`, update local state only. The banner should work in demo mode too — read from `useBankStore.connections` which includes mock connections.
- **Fire-and-forget Supabase updates** — the edge function status update on expired connections is fire-and-forget within the loop.
- **`isRefreshing` / `isDetecting`** patterns are established — do NOT modify these.
- **`MOCK_CONNECTION`** in `mockBankData.ts` has `status: 'active'` by default. For testing the banner in demo mode, consider adding a way to simulate expiring_soon/expired status (or just test with real connections).

### Cross-Store Communication
- `HomeScreen` reads from `useBankStore` (connections) for the banner — import `useBankStore`.
- No cross-store writes needed. Banner is read-only.
- `HomeScreen` may need to call `fetchConnections()` on focus to ensure connections are fresh. Check if `useFocusEffect` with `fetchConnections` is already present; if not, add it.

### File Structure
```
supabase/migrations/
├── YYYYMMDD_add_bank_expiry_notifications.sql   ← CREATE (migration: extend notification_log, create RPC)
supabase/functions/calculate-reminders/
├── index.ts                                      ← MODIFY (add Section 3: bank expiry notifications)
src/features/bank/components/
├── BankConnectionExpiryBanner.tsx                ← CREATE (in-app banner component)
├── BankConnectionExpiryBanner.test.tsx           ← CREATE (banner tests)
src/features/dashboard/screens/
├── HomeScreen.tsx                                ← MODIFY (add BankConnectionExpiryBanner)
├── HomeScreen.test.tsx                           ← MODIFY (add banner rendering tests)
src/features/notifications/services/
├── notificationHistoryService.ts                 ← MODIFY (add bank_expiry type support)
```

### UX Notes
- **Banner placement**: After `NotificationStatusBanner` on HomeScreen — both banners can show simultaneously (notifications off + bank expired).
- **Banner colors**: Amber (`#F59E0B`) for expiring_soon, Red (`#EF4444`) for expired — matches existing UX spec.
- **Banner icon**: `"bank-off"` (Material Community Icons, available in react-native-paper).
- **Banner action**: Single "Reconnect" button navigating to `BankConnectionStatusScreen` where the user can reconnect.
- **Push notification timing**: Daily at 9:00 AM UTC (existing pg_cron schedule) — notifications start 7 days before expiry.
- **No new notification channel**: Bank expiry notifications use the existing `renewal-reminders` Android channel (HIGH importance).

### Project Structure Notes
- New banner component follows existing `features/bank/components/` location pattern.
- Migration follows existing naming: `YYYYMMDD_add_bank_expiry_notifications.sql`.
- Edge function extension is in-place — no new function needed.
- Notification history service modification is minimal — type union + query JOIN.

### References
- [Source: epics.md — Epic 7, Story 7.9 (lines 1368-1389)]
- [Source: architecture.md — Push Notification Pipeline (lines 325-337), Zustand Store Pattern (lines 466-539)]
- [Source: ux-design-specification.md — Banner variants, amber/red color scheme]
- [Source: calculate-reminders/index.ts — Existing renewal + trial_expiry notification pattern]
- [Source: 20260317000000_add_trial_expiry_notifications.sql — Migration + RPC pattern for extending notification_log]
- [Source: NotificationStatusBanner.tsx — Banner component pattern]
- [Source: ConnectionStatusCard.tsx — Status colors, getDaysUntilExpiry helper]
- [Source: 7-8-manual-bank-data-refresh.md — Previous story learnings]
- [Source: bank/types/index.ts — BankConnectionStatus, BankConnection interface]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- DB migration: extended `notification_log` CHECK constraint for `bank_expiry`, added nullable `bank_connection_id` FK column, added unique constraint `(bank_connection_id, renewal_date, notification_type)`, created `get_bank_expiry_candidates(check_date DATE)` RPC function.
- Edge function: added `BankExpiryCandidate` interface, `formatBankExpiryNotification()` helper, Section 3 for expiry notifications (RPC → dedup → send → log → status update), Section 3b for error connections, `bankExpiry` added to summary object.
- `BankConnectionExpiryBanner` component: amber for `expiring_soon`, red for `expired`, null for active/disconnected, Reconnect navigates to BankConnectionStatus.
- HomeScreen: imported banner + `useFocusEffect` with `fetchConnections()` on focus.
- `notificationHistoryService`: added `bank_expiry` to type union, updated query to fetch `bank_connection_id`, added separate bank_connections lookup, COALESCE display name logic.
- Tests: 16 new tests added (7 banner unit tests, 3 HomeScreen integration, 1 notificationHistoryService existing, 16 bank expiry edge function logic tests). All 951 tests pass.
- Code review fix: Added `active` → `expiring_soon` status transition in edge function Section 3 (when `days_until_expiry > 0` and connection is `active`) — without this, AC3 amber banner would never display.
- Code review fix: Updated `sendPushNotification` to accept optional `dataKey` param; bank notifications now send `data: { bank_connection_id: ... }` instead of the semantically wrong `data: { subscription_id: bankUUID }`.
- 2 new tests added for `expiring_soon` status update coverage.

### File List

- supabase/migrations/20260326000000_add_bank_expiry_notifications.sql (created)
- supabase/functions/calculate-reminders/index.ts (modified)
- src/features/bank/components/BankConnectionExpiryBanner.tsx (created)
- src/features/bank/components/BankConnectionExpiryBanner.test.tsx (created)
- src/features/dashboard/screens/HomeScreen.tsx (modified)
- src/features/dashboard/screens/HomeScreen.test.tsx (modified)
- src/features/notifications/services/notificationHistoryService.ts (modified)
- src/features/notifications/services/bankExpiryNotifications.test.ts (created)
