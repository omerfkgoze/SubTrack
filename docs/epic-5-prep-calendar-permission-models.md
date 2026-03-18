# Epic 5 Preparation: iOS/Android Calendar Permission Models

**Date:** 2026-03-18
**Owner:** Dana (QA Engineer)
**Task:** Document iOS/Android calendar permission models

---

## iOS Permissions

### Info.plist Keys

| Key | Purpose | iOS Version |
|-----|---------|-------------|
| `NSCalendarsUsageDescription` | Legacy full access. Deprecated on iOS 17+. | iOS 10–16 |
| `NSCalendarsFullAccessUsageDescription` | Read + write access to all calendar events. | iOS 17+ |
| `NSCalendarsWriteOnlyAccessUsageDescription` | Write-only — app can create events but cannot read existing ones. | iOS 17+ |

### Permission Flow (iOS 17+)

1. System shows dialog with usage description string
2. User can grant **Full Access**, **Write-Only Access**, or **Deny**
3. Once denied → cannot re-prompt → user must go to Settings > Privacy & Security > Calendars
4. **One chance only** — pre-permission screen is critical

### System UI Bypass (iOS 17+)

`EKEventEditViewController` (exposed as `Calendar.createEventInCalendarAsync` in expo-calendar) allows adding events **without any permission** — the user interacts with a system sheet and the app never sees other calendar data.

---

## Android Permissions

### Manifest Permissions

```xml
<uses-permission android:name="android.permission.READ_CALENDAR" />
<uses-permission android:name="android.permission.WRITE_CALENDAR" />
```

Both are **dangerous permissions** (runtime approval required, Android 6.0+).

### Permission Flow

1. Call runtime permission request → system shows dialog
2. User can **Allow** or **Deny**
3. If denied twice or "Don't ask again" checked → system dialog no longer appears → must redirect to Settings
4. Android 8.0+: each permission in the `CALENDAR` group must be requested individually

### Android 13+ (API 33)

Calendar permissions (`READ_CALENDAR`, `WRITE_CALENDAR`) were **not changed** in Android 13. Changes affected storage and notification permissions only.

### System UI Bypass

Calendar Intent allows creating events without permissions (same concept as iOS).

---

## Key Differences Affecting UX

| Aspect | iOS | Android |
|--------|-----|---------|
| **Prompts** | One chance. Denied = Settings only. | Multiple chances until "Don't ask again". |
| **Granularity (iOS 17+)** | Full access / write-only / none | Read and write separate but binary |
| **Write-only option** | Yes (iOS 17+) | No native write-only |
| **System UI bypass** | Yes, no permission needed | Yes, via Intent |
| **Pre-permission importance** | **Critical** — only 1 system prompt | Recommended but less critical |
| **Settings redirect** | `Linking.openSettings()` → app settings | `Linking.openSettings()` → app info page |

---

## Expo-Specific Configuration

### Permission APIs (expo-calendar)

```typescript
import * as Calendar from 'expo-calendar';

// Check current status
const { status } = await Calendar.getCalendarPermissionsAsync();

// Request permission
const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
```

### app.json Configuration

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCalendarsFullAccessUsageDescription": "SubTrack needs calendar access to create and manage subscription renewal reminders.",
        "NSCalendarsWriteOnlyAccessUsageDescription": "SubTrack needs calendar access to add subscription renewal dates to your calendar."
      }
    },
    "android": {
      "permissions": ["READ_CALENDAR", "WRITE_CALENDAR"]
    },
    "plugins": [
      "expo-calendar"
    ]
  }
}
```

> **Note:** `expo-calendar` config plugin auto-injects Android permissions. Explicit `android.permissions` is a safe fallback.

---

## Best Practices for SubTrack

### Pre-Permission Screen (Recommended)

Show a custom in-app explanation **before** triggering the OS dialog:
- Increases grant rate
- On iOS: avoids wasting the single OS prompt if user would decline
- Pattern already established in SubTrack for push notifications (Story 4.1)

### Handling Denial

```typescript
const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();

if (status === 'granted') {
  // Proceed with calendar access
} else if (!canAskAgain) {
  // Show "Open Settings" button with Linking.openSettings()
} else {
  // Show explanation, allow retry later
}
```

### Recommendation for Story 5.1

If SubTrack only needs to **add** renewal events to the calendar (not read/list/manage), use `Calendar.createEventInCalendarAsync()` — the system-provided UI that requires **zero permissions** on both platforms. This provides:
- Best user trust (system UI)
- Zero permission friction
- Simplest implementation

Only request full calendar access if Stories 5.2 (Calendar Selection) or 5.3 (Event Cleanup) require programmatic read/write.

---

*Research conducted as Epic 4 retrospective preparation task*
