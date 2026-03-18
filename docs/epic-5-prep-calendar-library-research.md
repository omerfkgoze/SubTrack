# Epic 5 Preparation: Calendar Library Research

**Date:** 2026-03-18
**Owner:** Charlie (Senior Dev)
**Task:** Research `react-native-calendar-events` Expo compatibility

---

## Recommendation: Use `expo-calendar` Instead of `react-native-calendar-events`

### Why Not `react-native-calendar-events`

| Concern | Detail |
|---------|--------|
| **Last updated** | ~2020 (5+ years ago) — effectively abandoned |
| **Expo config plugin** | None — requires manual native configuration |
| **New Architecture** | No support — risk of breakage with SDK 54 + newArchEnabled |
| **Weekly downloads** | ~21,500 (declining) |
| **Verdict** | **Not recommended** |

### Why `expo-calendar`

| Advantage | Detail |
|-----------|--------|
| **Maintainer** | First-party Expo team, actively maintained |
| **Latest version** | 55.0.9 (updated March 2026) |
| **Expo SDK 54** | Fully supported |
| **New Architecture** | Supported |
| **Config plugin** | Built-in — auto-configures permissions |
| **Weekly downloads** | ~160,000 |
| **Dev client** | Required, but SubTrack already uses dev client (react-native-biometrics, react-native-keychain) |

### API Capabilities

`expo-calendar` is a superset of `react-native-calendar-events`:

- Get all device calendars
- Create, update, delete calendars
- Get, create, update, delete events
- Get, create, update, delete reminders (iOS)
- Get attendees for events
- Handle recurrence rules
- Request and check calendar permissions
- Launch system calendar UI for viewing/editing events

### Installation Steps

1. Install:
   ```bash
   npx expo install expo-calendar
   ```

2. Add config plugin to `app.json`:
   ```json
   {
     "plugins": [
       ["expo-calendar", {
         "calendarPermission": "SubTrack needs calendar access to add subscription renewal dates."
       }]
     ]
   }
   ```

3. Rebuild dev client:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   ```

4. Usage:
   ```typescript
   import * as Calendar from 'expo-calendar';

   const { status } = await Calendar.requestCalendarPermissionsAsync();
   if (status === 'granted') {
     const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
   }
   ```

### Known Gotchas

1. **iOS 17+ granular permissions** — Apple introduced full access vs write-only. `expo-calendar` handles this, but edge case: some users report `undetermined` status requiring a second call (GitHub #32768).
2. **Recurrence rules** — `dayOfTheWeek` can return `undefined` in some configurations (GitHub #35888).
3. **No Expo Go** — Requires dev client build (already our workflow).

### No-Permission Alternative

If SubTrack only needs to let users **add** events (not read/manage), `Calendar.createEventInCalendarAsync()` uses the system-provided calendar UI and requires **zero permissions** on both platforms. Worth considering for Story 5.1 to minimize friction.

### Note on `react-native-calendars` (Wix)

This is a **UI component library** (date pickers, agenda views) — pure JavaScript, no native calendar access. Separate concern from device calendar integration.

---

*Research conducted as Epic 4 retrospective preparation task*
