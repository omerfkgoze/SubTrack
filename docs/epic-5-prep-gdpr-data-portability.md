# Epic 5 Preparation: GDPR Data Portability Requirements for Story 5.6

**Date:** 2026-03-18
**Owner:** Alice (Product Owner)
**Task:** Review GDPR data portability requirements

---

## Applicable GDPR Articles

### Article 20 — Right to Data Portability

- Users can receive their personal data in a **structured, commonly used, machine-readable format**
- Applies when processing is based on consent or contract AND is automated (both true for SubTrack)
- **Format:** JSON and/or CSV (PDF alone does not satisfy the requirement)
- **Timeline:** Within **1 calendar month** of request (extendable by 2 months for complex requests)
- **Scope:** Only data the user **provided** — not derived/inferred data

### Article 17 — Right to Erasure ("Right to be Forgotten")

- All personal data must be erased **without undue delay** (1-month deadline)
- Verify identity before deletion (authenticated session is sufficient for in-app requests)
- **Exceptions:** Legal obligations, legal claims defense (unlikely for SubTrack)

### Article 15 — Right of Access

Must provide on request:
1. Confirmation of data processing
2. Purposes of processing
3. Categories of personal data
4. Recipients (Supabase, Expo push service)
5. Retention period
6. Rights to rectification, erasure, restriction, objection
7. Right to lodge complaint with supervisory authority

---

## SubTrack Data Inventory for Export/Deletion

| Data Category | Source Table | Export | Delete |
|---|---|---|---|
| Account info | `auth.users` | Email, created_at | Via `admin.deleteUser()` |
| Subscriptions | `subscriptions` | All columns | CASCADE from auth deletion |
| Reminder settings | `reminder_settings` | remind_days_before, is_enabled | CASCADE from auth deletion |
| Notification history | `notification_log` | sent_at, status, subscription ref | **⚠️ Must delete explicitly — no CASCADE FK** |
| Push tokens | `push_tokens` | token, platform, created_at | CASCADE from auth deletion |
| Local device data | AsyncStorage, SecureStore | N/A | Must clear on account deletion |

### Critical Gap: `notification_log`

The `notification_log` table **lacks `ON DELETE CASCADE`** from `auth.users`. Deletion logic must explicitly handle this table before deleting the auth user.

---

## Implementation Requirements

### Data Export

| Feature | Priority | Details |
|---|---|---|
| JSON export | **Must-have** | All 5 tables + account info via Supabase RPC |
| CSV export | Nice-to-have | Flat export of subscriptions table |
| File delivery | Must-have | `expo-file-system` + `expo-sharing` for save/share |

**Approach:**
1. Create Supabase RPC function `export_user_data` that joins all user tables → returns JSON
2. Client calls RPC, serializes, uses `expo-sharing` to let user save/share
3. Filename: `subtrack_data_export_YYYY-MM-DD.json`

### Account Deletion

| Step | Priority | Details |
|---|---|---|
| Server-side deletion | **Must-have** | Edge Function: delete `notification_log` → `admin.deleteUser()` (cascades rest) |
| Client-side cleanup | **Must-have** | Clear AsyncStorage, SecureStore, cached state |
| Confirmation UI | **Must-have** | Two-step: warning dialog → re-confirm (type "DELETE" or re-enter password) |
| Expo push token revocation | Should-have | Unregister token at Expo before server deletion |
| Grace period | Nice-to-have | "Scheduled for deletion in 14 days" |

---

## App Store / Play Store Requirements

### Apple (App Store Review Guideline 5.1.1(v))

- **Mandatory since June 2022:** Apps with account creation **must** allow in-app account deletion
- Must delete account **and** associated personal data
- Deletion process must be **discoverable and easy** (not buried in menus)
- Can offer grace/cooling-off period
- Can retain anonymized records, but account must not contain PII after deletion

### Google Play (Data Deletion Policy)

- **Enforced since May 2024:** Must provide:
  1. **In-app** account deletion
  2. **Web-based** deletion option (URL required)
- Must update **Data Safety form** in Play Console
- Users must be able to request deletion of specific data types
- **⚠️ SubTrack needs a web deletion page/form for Play Store compliance**

---

## Common Pitfalls to Avoid

1. **Forgetting local device data** — AsyncStorage/SecureStore must be cleared on deletion
2. **notification_log orphaning** — No CASCADE FK, must delete explicitly
3. **Backup retention** — Supabase PITR backups may contain user data; document retention period in privacy policy
4. **Push token leakage** — Orphaned tokens at Expo can still receive notifications; revoke before deletion
5. **No web deletion path** — Google Play requires a web URL for deletion requests
6. **Incomplete export** — Must include ALL tables (notification_log, push_tokens, reminder_settings — not just subscriptions)
7. **Missing third-party processors in privacy policy** — List Supabase, Expo push service
8. **No confirmation/receipt** — Send confirmation email or show confirmation screen after deletion

---

## Summary: Story 5.6 Deliverables

| Deliverable | Priority | Notes |
|---|---|---|
| Data Export (JSON) | Must-have | All user data via Supabase RPC |
| Data Export (CSV) | Nice-to-have | Subscriptions only |
| Account Deletion (server) | Must-have | Edge Function with explicit notification_log cleanup |
| Account Deletion (client) | Must-have | Clear local storage, sign out, navigate to welcome |
| Delete confirmation UI | Must-have | Two-step confirmation |
| Web deletion page | Must-have (Play Store) | Simple form for Google Play compliance |
| Privacy policy update | Must-have | Data categories, processors, retention periods |
| Push token revocation | Should-have | Unregister before server deletion |

---

*Research conducted as Epic 4 retrospective preparation task*
