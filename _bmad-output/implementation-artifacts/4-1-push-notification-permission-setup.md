# Story 4.1: Push Notification Permission & Setup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to be guided through enabling push notifications with a clear value proposition,
so that I understand why notifications are critical and grant permission willingly.

## Acceptance Criteria

1. **AC1: Pre-Permission Value Screen**
   - **Given** the user has just registered or has not yet granted notification permission
   - **When** the notification permission flow is triggered
   - **Then** a pre-permission screen displays:
     - Value proposition: "Never miss a renewal again"
     - Social proof: "Users save €47/month on average"
     - Explanation: "We'll remind you 3 days before each renewal"
   - **And** after the user understands the value, the native OS permission dialog is presented

2. **AC2: Permission Granted — Token Registration**
   - **Given** the user grants notification permission
   - **When** the permission is accepted
   - **Then** the device push token is obtained via Expo Push Notifications (`expo-notifications`)
   - **And** the token is stored in Supabase `push_tokens` table (user_id, token, platform, created_at)
   - **And** a success confirmation is displayed

3. **AC3: Permission Denied — Graceful Degradation**
   - **Given** the user denies notification permission
   - **When** they dismiss the native dialog
   - **Then** a persistent but non-intrusive banner is shown explaining notifications are disabled
   - **And** the app continues to function but with reduced value
   - **And** a "Turn on notifications" option remains accessible in settings

4. **AC4: Notification Store State Management**
   - **Given** the app needs to track notification permission status
   - **When** the notification module initializes
   - **Then** `useNotificationStore` manages: permission status, push token, and loading/error states
   - **And** permission status is checked on every app foreground event

## Tasks / Subtasks

- [x] Task 1: Install `expo-notifications` and `expo-device` dependencies (AC: #2)
  - [x] 1.1: `npx expo install expo-notifications expo-device expo-constants`
  - [x] 1.2: Configure `app.json` — add `"plugins": ["expo-notifications"]` and Android notification icon/color
  - [x] 1.3: Verify installation with `npx tsc --noEmit`

- [x] Task 2: Create Supabase `push_tokens` migration (AC: #2)
  - [x] 2.1: Create migration file `supabase/migrations/YYYYMMDDHHMMSS_create_push_tokens.sql`
  - [x] 2.2: Table: `push_tokens` with columns: id (UUID PK), user_id (FK → auth.users ON DELETE CASCADE), token (TEXT NOT NULL), platform (TEXT NOT NULL CHECK IN ('ios', 'android')), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ)
  - [x] 2.3: Add UNIQUE constraint on (user_id, token) to prevent duplicates
  - [x] 2.4: Enable RLS + create policies (SELECT/INSERT/UPDATE/DELETE for own tokens)
  - [x] 2.5: Add `update_updated_at` trigger (reuse existing function)
  - [x] 2.6: Add index on `user_id`
  - [x] 2.7: Run `npx supabase db push` to apply migration

- [x] Task 3: Create `notificationService.ts` (AC: #1, #2, #3)
  - [x] 3.1: `registerForPushNotificationsAsync()` — check device, request permission, get ExpoPushToken
  - [x] 3.2: `savePushToken(userId, token, platform)` — upsert token to Supabase `push_tokens`
  - [x] 3.3: `getPermissionStatus()` — check current notification permission status
  - [x] 3.4: `openNotificationSettings()` — open device notification settings (Linking)
  - [x] 3.5: Write unit tests for service functions

- [x] Task 4: Create `useNotificationStore` (AC: #4)
  - [x] 4.1: State: permissionStatus, expoPushToken, isLoading, error
  - [x] 4.2: Actions: requestPermission, checkPermission, registerToken
  - [x] 4.3: Persist permissionStatus to AsyncStorage
  - [x] 4.4: Write store tests

- [x] Task 5: Create `NotificationPermissionScreen` (AC: #1, #2, #3)
  - [x] 5.1: Pre-permission UI — value proposition, social proof, explanation
  - [x] 5.2: "Enable Notifications" primary button → triggers OS permission dialog
  - [x] 5.3: "Maybe Later" secondary link → skips with warning
  - [x] 5.4: Success state → confirmation with checkmark
  - [x] 5.5: Write component tests

- [x] Task 6: Create `NotificationStatusBanner` component (AC: #3)
  - [x] 6.1: Persistent banner for disabled notification state — red/amber background
  - [x] 6.2: "Turn On" CTA button → opens device settings
  - [x] 6.3: Render in HomeScreen when notifications are disabled
  - [x] 6.4: Write component tests

- [x] Task 7: Integration and testing (AC: all)
  - [x] 7.1: Wire NotificationPermissionScreen into navigation (after registration or from settings)
  - [x] 7.2: Add permission check on app foreground (AppState listener)
  - [x] 7.3: `npx tsc --noEmit` — zero errors
  - [x] 7.4: `npx eslint src/features/notifications/` — zero errors
  - [x] 7.5: Full test suite green (baseline: 259+ tests)

## Dev Notes

### NEW Dependencies Required

This is the first story requiring new npm packages since Epic 1. Install with Expo:

```bash
npx expo install expo-notifications expo-device expo-constants
```

- **`expo-notifications`** — Push notification permissions, token registration, notification handling
- **`expo-device`** — Device check (push notifications require physical device)
- **`expo-constants`** — Access EAS projectId for token registration

**CRITICAL:** These packages are already in the architecture spec. Do NOT substitute with `@react-native-firebase/messaging` or `notifee` — the architecture specifies Expo Push API for MVP (not FCM/APNs directly). The architecture doc mentions `@react-native-firebase/messaging` + `notifee` in the post-initialization list, but the Push Notification Architecture diagram clearly shows **Expo Push API** as the delivery mechanism. Use `expo-notifications` which handles both platforms through Expo's unified push service.

### app.json Configuration Required

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6750A4"
        }
      ]
    ]
  }
}
```

**Note:** The notification icon is required for Android. Use the app's primary color (`#6750A4` — Material Design 3 primary from theme). If no custom notification icon asset exists yet, this can be deferred — Expo uses a default icon.

### Supabase `push_tokens` Table Design

```sql
CREATE TABLE push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate tokens per user
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_token_unique UNIQUE (user_id, token);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use subquery pattern — same as subscriptions table)
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Reuse existing trigger function
CREATE TRIGGER set_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for queries by user
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
```

**Design decisions:**

- `ON DELETE CASCADE` — when user deletes account, tokens are auto-cleaned (aligns with Story 1.7 account deletion)
- UNIQUE(user_id, token) — user can have multiple devices (multiple tokens) but same token shouldn't be duplicated
- `platform` column — needed by Expo Push API for correct routing
- Reuses `update_updated_at_column()` trigger function created in subscriptions migration
- RLS pattern identical to `subscriptions` table — `(select auth.uid()) = user_id` subquery for performance [Source: architecture.md#RLS-Policies]

### notificationService.ts

Location: `src/features/notifications/services/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@shared/services/supabase';

// Must be called at app startup (before any notification interaction)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications require a physical device
    return null;
  }

  // Android: create notification channel (required for Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('renewal-reminders', {
      name: 'Renewal Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    throw new Error('EAS Project ID not found');
  }

  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData; // Format: "ExponentPushToken[xxxxxx]"
}

export async function savePushToken(
  userId: string,
  token: string,
  platform: string,
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform }, { onConflict: 'user_id,token' });
  if (error) throw error;
}

export async function getPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
  if (error) throw error;
}
```

**Key patterns:**

- `upsert` with `onConflict` — handles token refresh without duplicates
- `setNotificationHandler` must be called at module level (top of service file) — this is an Expo requirement
- Android notification channel `'renewal-reminders'` with HIGH importance — ensures notifications are visible
- `getExpoPushTokenAsync` requires EAS `projectId` — this comes from `app.json` via `expo-constants`
- Token format is `"ExponentPushToken[xxxxxx]"` — store the full string, Expo Push API expects this format

### useNotificationStore

Location: `src/shared/stores/useNotificationStore.ts`

```typescript
interface NotificationState {
  // State
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  expoPushToken: string | null;
  isLoading: boolean;
  error: AppError | null;

  // Actions
  requestPermission: () => Promise<void>;
  checkPermission: () => Promise<void>;
  registerToken: () => Promise<void>;
  clearError: () => void;
}
```

**Store rules (same as all Zustand stores):**

- State and Actions in same store
- Async actions with try/catch inside store
- Error state managed via `AppError` interface
- Persist `permissionStatus` to AsyncStorage (but NOT token — token should be fetched fresh)
- Loading state is global per store, not per-action

### NotificationPermissionScreen

Location: `src/features/notifications/screens/NotificationPermissionScreen.tsx`

```
┌─────────────────────────────────────┐
│                                     │
│          🔔 (Bell Icon)            │
│                                     │
│     Never miss a renewal again      │  ← titleLarge, bold
│                                     │
│  Users save €47/month on average    │  ← bodyLarge, secondary color
│                                     │
│  We'll remind you 3 days before     │
│  each renewal so you can decide     │  ← bodyMedium, onSurfaceVariant
│  whether to keep or cancel.         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Enable Notifications  🔔  │    │  ← Primary Button (contained)
│  └─────────────────────────────┘    │
│                                     │
│         Maybe Later                  │  ← TextButton, subtle
│                                     │
└─────────────────────────────────────┘
```

**Design principles from UX spec:**

- "Notification Permission Flow (Critical Path)" — user MUST understand value before OS prompt [Source: ux-design-specification.md#Critical-Permissions]
- No dark patterns — "Maybe Later" must be clearly available, no manipulation
- No fear-mongering — "Calm, informative reminders" not anxiety-based messaging [Source: ux-design-specification.md#Anti-Patterns]
- Trust through transparency [Source: ux-design-specification.md#Design-Principles]

### NotificationStatusBanner

Location: `src/features/notifications/components/NotificationStatusBanner.tsx`

```
Disabled state:
┌─────────────────────────────────────────────┐
│  🔴  Notifications are off!                 │
│      Reminders can't reach you. [Turn On]   │  ← Red banner (#EF4444)
└─────────────────────────────────────────────┘
```

**UX Reference:**

- NotificationStatusBadge disabled state: Red (#EF4444), "Notifications off" + CTA [Source: ux-design-specification.md#NotificationStatusBadge]
- "No Blame" pattern: "Notifications are off" NOT "You turned off notifications" [Source: ux-design-specification.md#Error-Recovery]
- Banner variant of NotificationStatusBadge (variant='banner') [Source: ux-design-specification.md#NotificationStatusBadge]
- Persistent but non-intrusive — visible at top of HomeScreen, dismissable per-session but returns next session

### Navigation Integration

The permission screen should be accessible from two entry points:

1. **Post-registration flow** — after email verification, before the main app (onboarding)
2. **Settings screen** — "Notification Settings" option, always accessible

For this story, wire it as a **standalone screen in SettingsStack** (or a modal). The onboarding integration can be deferred or handled if onboarding flow already exists.

Check existing navigation files:

- `src/app/navigation/SettingsStack.tsx` — add NotificationPermissionScreen
- `src/app/navigation/types.ts` — add route type

### AppState Foreground Check

When user returns to app from device settings (after potentially toggling notifications), re-check permission:

```typescript
import { AppState } from 'react-native';

// In a useEffect or app-level hook:
const subscription = AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') {
    useNotificationStore.getState().checkPermission();
  }
});
```

This ensures the banner updates immediately when user toggles notifications in device settings.

### Testing Strategy

**Physical device required** for actual token registration — all tests MUST mock `expo-notifications`, `expo-device`, and `expo-constants`.

```typescript
// Mock setup for notification tests
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4, MAX: 5 },
}));

jest.mock('expo-device', () => ({
  isDevice: true, // Default to physical device
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  easConfig: { projectId: 'test-project-id' },
}));
```

**Test file locations:**

- `src/features/notifications/services/notificationService.test.ts`
- `src/shared/stores/useNotificationStore.test.ts`
- `src/features/notifications/screens/NotificationPermissionScreen.test.tsx`
- `src/features/notifications/components/NotificationStatusBanner.test.tsx`

**Required test coverage:**

- Service: permission request (granted/denied), token registration, token save to Supabase, non-device detection
- Store: state initialization, permission request flow, error handling, persist/rehydrate
- NotificationPermissionScreen: renders value proposition, "Enable" triggers permission flow, "Maybe Later" navigates away, success state after grant, denied state after denial
- NotificationStatusBanner: renders red banner when disabled, "Turn On" CTA works, not rendered when enabled

**Test patterns (MUST follow):**

- Wrap all component renders in `<PaperProvider>`
- Mock: `@react-native-async-storage/async-storage`, `@shared/services/supabase`, `@react-navigation/native`, `expo-notifications`, `expo-device`, `expo-constants`
- Use `getAllByText` when same text may appear in multiple components
- `jest-expo@55 + Jest 29.7.0 + react-test-renderer@19.1.0` (pinned)
- Date mocking: use relative dates or `Date.now()` mock — NO hard-coded future dates [Source: epic-3-retro Action Item #2]

### Epic 3 Retro Action Items (MUST apply)

**#1 Gesture Accessibility:** Add `accessibilityLabel` on all interactive elements. Banner "Turn On" button: `"Turn on notifications"`. Permission screen "Enable" button: `"Enable push notifications"`.

**#2 Non-null assertion ban:** NEVER use `!` operator. Use `??` for defaults:

- `(Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId)`
- `(token ?? null)`

**#3 Test gotchas:** PaperProvider wrapper, `getAllByText` for duplicates, pinned versions.

**#4 Date mocking standard (NEW from Epic 3 retro):** Use relative dates or mock `Date.now()` — no hard-coded future dates that will break when tests run later.

### Architecture Compliance

- Feature module: `src/features/notifications/`
- Shared store: `src/shared/stores/useNotificationStore.ts`
- Service: `src/features/notifications/services/notificationService.ts`
- Supabase migration: `supabase/migrations/YYYYMMDDHHMMSS_create_push_tokens.sql`
- Component naming: PascalCase (`NotificationPermissionScreen.tsx`, `NotificationStatusBanner.tsx`)
- Functional components with TypeScript interfaces
- React Native Paper components (Surface, Text, Button, Banner, Icon)
- Zustand store pattern: state + actions in same store, try/catch in async actions
- Database: snake_case tables/columns, UUID primary keys, `(select auth.uid())` in RLS policies
- Cross-feature import: notification store via `@shared/stores/useNotificationStore`

### Project Structure Notes

- `src/features/notifications/` already exists with `.gitkeep` placeholder files — replace with actual implementations
- `src/shared/stores/useNotificationStore.ts` — new file alongside existing `useAuthStore.ts` and `useSubscriptionStore.ts`
- `supabase/migrations/` — second migration file after `20260227000000_create_subscriptions.sql`
- No conflicts or variances with unified project structure detected

### Previous Story Intelligence (Epic 3.4)

- 259 tests passing as of last story
- TSC zero errors, ESLint zero errors baseline maintained
- HomeScreen currently renders: SpendingHero, CategoryBreakdown, SavingsIndicator, UpcomingRenewals
- NotificationStatusBanner should be integrated at the TOP of HomeScreen (above SpendingHero) when notifications are disabled
- Store pattern established: import from `@shared/stores/`, use selectors for state access

### Git Intelligence

Recent commits show consistent patterns:

- Story files updated to "ready-for-dev" → "in-progress" → "review" → "done"
- Commits are focused and descriptive
- No force pushes or destructive operations

### Files to Create

- `src/features/notifications/services/notificationService.ts`
- `src/features/notifications/services/notificationService.test.ts`
- `src/features/notifications/screens/NotificationPermissionScreen.tsx`
- `src/features/notifications/screens/NotificationPermissionScreen.test.tsx`
- `src/features/notifications/components/NotificationStatusBanner.tsx`
- `src/features/notifications/components/NotificationStatusBanner.test.tsx`
- `src/shared/stores/useNotificationStore.ts`
- `src/shared/stores/useNotificationStore.test.ts`
- `supabase/migrations/YYYYMMDDHHMMSS_create_push_tokens.sql`

### Files to Modify

- `package.json` (new dependencies: expo-notifications, expo-device, expo-constants)
- `app.json` (add expo-notifications plugin config)
- `src/features/notifications/index.ts` (replace empty placeholder with exports)
- `src/app/navigation/SettingsStack.tsx` (add NotificationPermissionScreen route)
- `src/app/navigation/types.ts` (add route type)
- `src/features/dashboard/screens/HomeScreen.tsx` (integrate NotificationStatusBanner)
- `src/features/dashboard/screens/HomeScreen.test.tsx` (add banner integration tests)

### References

- [Source: epics.md#Story-4.1] — Acceptance criteria and user story
- [Source: architecture.md#Push-Notification-Architecture] — pg_cron → Edge Function → Expo Push API pipeline
- [Source: architecture.md#Zustand-Stores] — useNotificationStore specification
- [Source: architecture.md#Feature-Module-Structure] — notifications feature structure
- [Source: architecture.md#Database-Naming-Conventions] — snake_case tables, UUID PKs, RLS pattern
- [Source: ux-design-specification.md#NotificationStatusBadge] — Enabled/Disabled/Partial states with colors
- [Source: ux-design-specification.md#Critical-Permissions] — Notification permission is gateway to all value
- [Source: ux-design-specification.md#Anti-Patterns] — No dark patterns, no fear-mongering
- [Source: ux-design-specification.md#Error-Recovery] — "No Blame" pattern for disabled state
- [Source: prd.md#Push-Notification-Strategy] — Notification types and priorities
- [Source: epic-3-retro-2026-03-15.md#Action-Items] — Date mocking, pluralization
- [Source: epic-3-retro-2026-03-15.md#Epic-4-Preparation] — Research tasks via context7 + Supabase MCP
- [Source: 3-4-upcoming-renewals-overview.md] — Previous story patterns, test baseline (259 tests)
- [Source: supabase/migrations/20260227000000_create_subscriptions.sql] — Existing migration pattern, RLS policies, update_updated_at_column() trigger function
- [Source: context7/expo-notifications] — Latest Expo Push Notifications API: getExpoPushTokenAsync requires projectId, setNotificationHandler at module level, Android channel required
- [Source: context7/supabase] — RLS policy pattern: `(select auth.uid()) = user_id`, ON DELETE CASCADE for foreign keys

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Service test: fixed expo-device mock (used getter pattern for isDevice toggle)
- Service test: fixed Linking mock (used jest.spyOn instead of direct property assignment)

### Completion Notes List

- Installed expo-notifications, expo-device, expo-constants via npx expo install
- Configured app.json with expo-notifications plugin (color: #6750A4)
- Created push_tokens Supabase migration with RLS, UNIQUE constraint, trigger, index — applied via db push
- Built notificationService.ts with registerForPushNotifications, savePushToken, getPermissionStatus, openNotificationSettings, removePushToken (12 tests)
- Built useNotificationStore with Zustand persist middleware (permissionStatus persisted to AsyncStorage) (14 tests)
- Built NotificationPermissionScreen with pre-permission value proposition, enable/skip buttons, success state (13 tests)
- Built NotificationStatusBanner with red (#EF4444) banner, "Turn On" CTA, conditional rendering (7 tests)
- Integrated NotificationPermissionScreen into SettingsStack navigation
- Added AppState foreground permission re-check in RootNavigator
- Integrated NotificationStatusBanner at top of HomeScreen
- Updated notifications feature index.ts with all exports
- All Epic 3 retro action items applied: accessibilityLabels, no non-null assertions, PaperProvider in tests
- TSC: zero errors, ESLint: zero errors
- Full test suite: 305 tests passing (46 new, up from 259 baseline), 21 suites, zero failures

### File List

**New files:**
- `src/features/notifications/services/notificationService.ts`
- `src/features/notifications/services/notificationService.test.ts`
- `src/features/notifications/screens/NotificationPermissionScreen.tsx`
- `src/features/notifications/screens/NotificationPermissionScreen.test.tsx`
- `src/features/notifications/components/NotificationStatusBanner.tsx`
- `src/features/notifications/components/NotificationStatusBanner.test.tsx`
- `src/shared/stores/useNotificationStore.ts`
- `src/shared/stores/useNotificationStore.test.ts`
- `supabase/migrations/20260315000000_create_push_tokens.sql`

**Modified files:**
- `package.json` (added expo-notifications, expo-device, expo-constants dependencies)
- `package-lock.json` (dependency lock updates)
- `app.json` (added expo-notifications plugin config)
- `src/features/notifications/index.ts` (replaced placeholder with feature exports)
- `src/app/navigation/SettingsStack.tsx` (added Notifications screen route)
- `src/app/navigation/index.tsx` (added foreground permission check)
- `src/features/dashboard/screens/HomeScreen.tsx` (integrated NotificationStatusBanner)
- `src/features/dashboard/screens/HomeScreen.test.tsx` (added NotificationStatusBanner integration tests)
- `src/features/settings/screens/SettingsScreen.tsx` (added Notifications section with navigation to NotificationPermissionScreen)

### Change Log

- 2026-03-15: Story 4.1 implementation complete — push notification permission setup with pre-permission screen, notification service, Zustand store, status banner, Supabase migration, and navigation integration. 46 new tests added (305 total).
