# Epic 7 Preparation: PSD2 / SCA Technical Overview

**Date:** 2026-03-21
**Owner:** Charlie (Senior Dev)
**Task:** Technical research — PSD2 requirements, SCA flow, consent management before Story 7.1

---

## Summary

PSD2 (Payment Services Directive 2) is the EU regulation that enables Open Banking. SubTrack operates as an end-user application that uses Tink (a licensed AISP) to access bank data. SubTrack itself is **not** an AISP — Tink holds the license. This distinction significantly reduces SubTrack's regulatory burden.

---

## Key Concepts

### PSD2 Roles

| Role             | Entity                 | Responsibility                                      |
| ---------------- | ---------------------- | --------------------------------------------------- |
| ASPSP            | Banks (ING, N26, etc.) | Provide APIs for account access                     |
| AISP             | Tink (licensed)        | Aggregates bank data, handles regulatory compliance |
| TPP End-User App | SubTrack               | Consumes Tink API, displays data to user            |

### What SubTrack Must Handle

| Responsibility                            | Owner                       |
| ----------------------------------------- | --------------------------- |
| PSD2 licensing & regulatory compliance    | Tink                        |
| Bank API connectivity & SCA orchestration | Tink (via Tink Link SDK)    |
| User consent collection & storage         | SubTrack + Tink             |
| Data storage & GDPR compliance            | SubTrack                    |
| Token refresh & connection health         | Tink API + SubTrack backend |
| User-facing consent expiry notifications  | SubTrack                    |

---

## Strong Customer Authentication (SCA)

### What Is SCA

SCA requires **two or more** independent authentication factors from different categories:

| Category                                 | Example                       | SubTrack Context                          |
| ---------------------------------------- | ----------------------------- | ----------------------------------------- |
| **Knowledge** (something the user knows) | Password, PIN                 | Bank login credentials                    |
| **Possession** (something the user has)  | Mobile device, security token | User's phone (SMS OTP, push notification) |
| **Inherence** (something the user is)    | Fingerprint, face recognition | Bank app biometric                        |

### How SCA Works in SubTrack's Flow

```
User taps "Connect Bank" in SubTrack
        ↓
Tink Link SDK opens (native overlay)
        ↓
User selects bank from Tink's bank list
        ↓
Tink redirects to bank's authentication page
        ↓
User performs SCA at bank (password + SMS OTP / biometric)
        ↓
Bank issues consent to Tink
        ↓
Tink returns authorization code to SubTrack
        ↓
SubTrack backend exchanges code for access token
        ↓
SubTrack can now fetch accounts & transactions via Tink API
```

**Key point:** SubTrack never sees or handles bank credentials. Tink Link SDK manages the entire SCA flow. SubTrack receives only an authorization code after successful authentication.

### Dynamic Linking

PSD2 requires that each transaction approval is uniquely linked to a specific amount and recipient. This applies to **Payment Initiation (PIS)**, not Account Information (AIS). SubTrack uses AIS only — dynamic linking is **not applicable** to Epic 7.

---

## Consent Management

### Consent Lifecycle

```
Initial Consent (SCA required)
        ↓
Active Consent Period (up to 180 days)
        ↓
Consent Expiry Warning (SubTrack notification — Story 7.9)
        ↓
Re-authentication (SCA required again)
```

### Consent Duration Rules

| Rule                   | Detail                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| Initial authentication | Full SCA required — user authenticates at bank via Tink Link     |
| Consent validity       | **180 days** (updated from original 90-day rule as of July 2023) |
| Re-authentication      | After 180 days, user must perform SCA again via Tink Link        |
| Long-lived tokens      | Banks must issue tokens without expiry — Tink manages refresh    |
| Consent reconfirmation | AISP (Tink) responsible for confirming user still wants access   |

### SubTrack's Consent Tracking

SubTrack must track consent status in the `bank_connections` table:

| Field                 | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `consent_granted_at`  | Timestamp of initial/renewed SCA authentication  |
| `consent_expires_at`  | `consent_granted_at` + 180 days                  |
| `connection_status`   | `active` / `expiring_soon` / `expired` / `error` |
| `last_synced_at`      | Last successful data fetch                       |
| `tink_credentials_id` | Tink's credential identifier for this connection |

### Consent Expiry Handling

| Days Before Expiry | Action                                                                            |
| ------------------ | --------------------------------------------------------------------------------- |
| 14 days            | Push notification: "Your bank connection expires soon. Tap to renew." (Story 7.9) |
| 7 days             | Second notification with urgency                                                  |
| 0 days (expired)   | Mark connection as `expired`, stop data sync, show banner in app                  |
| User taps renew    | Open Tink Link SDK for re-authentication (SCA)                                    |

---

## OAuth Token Flow (Tink-Specific)

### Token Types

| Token              | Lifetime                | Purpose                                         |
| ------------------ | ----------------------- | ----------------------------------------------- |
| Authorization code | One-time use            | Exchanged for access token after Tink Link flow |
| Access token       | 7,200 seconds (2 hours) | Used to call Tink API (accounts, transactions)  |
| Refresh token      | Managed by Tink         | Used to get new access tokens without re-auth   |

### Token Flow Architecture

```
[SubTrack App]                    [SubTrack Backend]              [Tink API]
      |                                  |                            |
      |-- Tink Link completes ---------> |                            |
      |   (authorization code)           |                            |
      |                                  |-- POST /oauth/token -----> |
      |                                  |   (code + client_secret)   |
      |                                  |<-- access_token ---------- |
      |                                  |   (+ refresh_token)        |
      |                                  |                            |
      |                                  |-- GET /accounts ---------->|
      |                                  |   (Bearer access_token)    |
      |<-- account data --------------- |<-- account data ---------- |
      |                                  |                            |
      |                          [2 hours later...]                   |
      |                                  |                            |
      |                                  |-- POST /oauth/token -----> |
      |                                  |   (refresh_token)          |
      |                                  |<-- new access_token ------ |
```

### Critical Security Rules

| Rule                                   | Implementation                                      |
| -------------------------------------- | --------------------------------------------------- |
| `client_secret` never in client app    | Store in Supabase Edge Function env variables only  |
| Access tokens never stored permanently | In-memory only in Edge Function, request-scoped     |
| Refresh tokens encrypted at rest       | Store in `bank_connections` table, encrypted column |
| Token refresh server-side only         | Edge Function handles all Tink API calls            |
| Failed refresh = connection error      | Mark connection as `error`, notify user             |

---

## Data Access Scopes

### What SubTrack Needs

| Scope               | Purpose                   | Epic 7 Story |
| ------------------- | ------------------------- | ------------ |
| `accounts:read`     | List user's bank accounts | 7.1          |
| `transactions:read` | Fetch transaction history | 7.3          |

### What SubTrack Does NOT Need

| Scope            | Why Not                               |
| ---------------- | ------------------------------------- |
| `payments:write` | SubTrack does not initiate payments   |
| `accounts:write` | SubTrack does not modify accounts     |
| `user:create`    | Tink manages user creation internally |

**Principle of least privilege:** Request only `accounts:read` and `transactions:read`. This minimizes regulatory scope and user consent friction.

---

## Transaction Fetch Strategy

### Two Distinct Concepts

| Concept | Value | What It Controls |
| --- | --- | --- |
| **Fetch window** (initial) | 90 days | How much transaction history to backfill on first connection |
| **Consent duration** | 180 days | How long before the user must re-authenticate via SCA |

These are independent. A user can have 180-day consent but we only fetch 90 days of history. On subsequent syncs, we do **not** re-fetch 90 days — we fetch only new transactions since `last_synced_at`.

### Sync Modes

| Mode | Trigger | Transactions Fetched |
| --- | --- | --- |
| **Initial backfill** | First successful bank connection | Last 90 days |
| **Incremental sync** | Daily scheduled sync or manual refresh (Story 7.8) | From `last_synced_at` to now |
| **Reconnect after expiry** | User re-authenticates after 180-day expiry | From `last_synced_at` to now (no re-backfill) |

### Why 90 Days for Initial Backfill

- Subscription patterns need at least 2–3 recurrences to be detectable
- Monthly subscriptions: 3 cycles in 90 days — sufficient signal
- Annual subscriptions: may not appear — flagged as "possible annual" if only 1 occurrence
- Longer window increases Edge Function processing time with diminishing detection returns

### Edge Case: Gap Sync

If a connection was `error` or `expired` for an extended period and `last_synced_at` is >90 days ago:
- On reconnect, fetch from `last_synced_at` (not last 90 days) to preserve continuity
- If `last_synced_at` is NULL (fresh connection), always use 90-day backfill

---

## Data Retention Rules

### PSD2 Requirements

PSD2 does not mandate a specific retention period. Instead, it follows **data minimization** principles:

| Rule                       | Detail                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| Purpose limitation         | Data used only for the service explicitly requested by user         |
| No secondary use           | Cannot use bank data for marketing, analytics beyond stated purpose |
| Deletion on consent revoke | When user disconnects bank, delete all fetched transaction data     |
| No excessive storage       | Only store data needed for subscription detection                   |

### SubTrack Data Retention Policy

| Data Type                | Retention                  | Rationale                                               |
| ------------------------ | -------------------------- | ------------------------------------------------------- |
| Raw transactions         | **30 days** rolling window | Only needed for subscription detection pattern matching |
| Detected subscriptions   | Until user deletes         | Core app functionality                                  |
| Bank connection metadata | Until user disconnects     | Connection management                                   |
| Tink tokens              | Until expired/revoked      | API access                                              |

### On User Bank Disconnection

When user disconnects a bank connection:

1. Revoke Tink credentials (API call)
2. Delete all raw transaction data for that connection
3. Keep detected subscriptions (user has approved them as app data)
4. Mark connection as `disconnected`
5. Log deletion timestamp for audit

---

## PSD3 / PSR1 Forward Look

PSD3 and PSR1 (proposed June 2023, expected adoption 2025–2026) will bring:

| Change                       | Impact on SubTrack                                            |
| ---------------------------- | ------------------------------------------------------------- |
| SCA method inclusivity       | More auth options at banks — better UX, Tink handles this     |
| Clarified exemption criteria | Potentially fewer SCA prompts — handled by Tink               |
| Enhanced AISP requirements   | Tink's responsibility, not SubTrack's                         |
| Dashboard access for PSUs    | Users may get more control — no SubTrack code change expected |

**Action:** Monitor PSD3/PSR1 adoption timeline. No code changes needed until Tink updates their SDK/API.

---

## Implementation Checklist for Story 7.1

- [ ] Tink Console account created and configured
- [ ] OAuth redirect URI configured (deep link: `subtrack://tink/callback`)
- [ ] `TINK_CLIENT_ID` and `TINK_CLIENT_SECRET` stored in Supabase Edge Function env
- [ ] `bank_connections` table created with consent tracking fields
- [ ] Edge Function for token exchange (authorization code → access token)
- [ ] Edge Function for token refresh (refresh token → new access token)
- [ ] Tink Link SDK integrated with Metro mock for Expo Go
- [ ] Consent expiry calculation logic (granted_at + 180 days)
- [ ] Connection status state management in `useBankStore`

---

## Research Sources

- [Stripe — Strong Customer Authentication Guide](https://stripe.com/guides/strong-customer-authentication)
- [Wikipedia — Strong Customer Authentication](https://en.wikipedia.org/wiki/Strong_customer_authentication)
- [Projective Group — 180-Day Re-authentication Update](https://www.projectivegroup.com/psd2-alert-authentication-period-for-account-information-services-extended-to-180-days/)
- [Yapily — 90-Day Re-authentication Changes](https://www.yapily.com/blog/90-day-reauthentication-changes)
- [TrueLayer — 90-Day Rule Explained](https://truelayer.com/blog/compliance-and-regulation/explaining-changes-to-the-90-day-rule-for-open-banking-access/)
- [EDPB — Guidelines on PSD2 & GDPR Interplay](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202006_psd2_afterpublicconsultation_en.pdf)
- [Tink Docs — Access Token](https://docs.tink.com/entries/articles/get-access-token)
- [Tink Docs — Access Token via Tink Link](https://docs.tink.com/entries/articles/retrieve-access-token)
- [Corbado — PSD2 Authentication Requirements](https://www.corbado.com/blog/psd2-sca-requirements/psd2-authentication-requirements)
- [Noda — AIS vs PIS Guide 2026](https://noda.live/articles/ais-vs-pis-in-open-banking)

---

_Research conducted as Epic 6 retrospective preparation task (P2)_
