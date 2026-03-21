# Epic 7 Preparation: Bank Integration Test Strategy

**Date:** 2026-03-21
**Owner:** Dana (QA Engineer)
**Task:** Document test plan — Tink sandbox, mock transactions, network failures, consent expiry, SCA simulation

---

## Decision

Test bank integration flows using **Tink Demo Bank** sandbox environment. No real bank credentials or financial data are used during testing.

**Three-layer testing approach:**
1. **Unit tests** (Jest) — Store logic, data transformation, subscription detection algorithms
2. **Integration tests** (Jest + mocks) — Edge Function logic, Tink API response handling
3. **Manual E2E tests** (Tink Demo Bank) — Full OAuth flow, SCA simulation, real SDK behavior

---

## Test Environments

| Layer | Environment | Tool |
|---|---|---|
| Unit & Integration | Local / CI | Jest 29 + React Native Testing Library |
| Tink SDK (Expo Go) | Development | Metro mock resolver (same pattern as `react-native-iap`) |
| Tink SDK (real) | Dev Client / EAS | `expo-dev-client` build with real `react-native-tink-sdk` |
| Tink API | Sandbox | Tink Console Demo Bank (console.tink.com) |
| Edge Functions | Local | Supabase CLI (`supabase functions serve`) |
| Edge Functions | Staging | Supabase staging project |

---

## Tink Demo Bank Setup

### Configuration

1. Create Tink Console account at [console.tink.com](https://console.tink.com)
2. Create app in sandbox mode
3. Demo Bank is automatically available — no additional setup needed
4. Demo Bank provides multiple test users, each representing different scenarios

### Demo Bank Test Users

| User | Scenario | Purpose |
|---|---|---|
| User 1 | Successful connection, full data | Happy path — accounts + transactions returned |
| User 2 | Multiple accounts | Test multi-account display and selection |
| User 3 | Connection timeout | Test timeout handling and retry |
| User 4 | Authentication failure | Test SCA failure path |
| User 5 | Limited transaction history | Test edge case with minimal data |

*Note: Exact test users may vary — verify in Tink Console documentation.*

---

## Test Scenarios by Story

### Story 7.1 — Bank Account Connection via Open Banking

#### 7.1.1 Happy Path — Successful Bank Connection

| Step | Expected Result |
|---|---|
| User taps "Connect Bank Account" | Tink Link SDK opens |
| User selects Demo Bank | Bank authentication screen appears |
| User enters Demo Bank credentials (User 1) | SCA simulation completes |
| Tink Link returns authorization code | App receives callback via deep link |
| Backend exchanges code for access token | Token stored in `bank_connections` table |
| App shows connected bank account | Account name, bank logo, connection status = `active` |
| `consent_expires_at` calculated | `now() + 180 days` stored |

#### 7.1.2 SCA Failure

| Step | Expected Result |
|---|---|
| User enters wrong Demo Bank credentials | Tink Link shows error |
| User cancels authentication | App returns to previous screen |
| No connection created | `bank_connections` table unchanged |
| Error message shown | "Bank connection failed. Please try again." |

#### 7.1.3 Network Failure During OAuth

| Step | Expected Result |
|---|---|
| Start Tink Link → kill network mid-flow | Tink Link handles gracefully (timeout) |
| App receives error callback | Error state shown to user |
| No partial connection created | Database clean — no orphan records |
| Network restored → retry | User can tap "Connect Bank" again |

#### 7.1.4 Deep Link Callback Failure

| Step | Expected Result |
|---|---|
| Tink Link completes but deep link fails | App handles missing/malformed callback |
| Retry mechanism | User prompted to retry connection |
| No duplicate connections | Idempotency check on `tink_credentials_id` |

### Story 7.3 — Automatic Subscription Detection

#### 7.3.1 Subscription Detection — Happy Path

| Step | Expected Result |
|---|---|
| Bank connected with transaction history | Edge Function fetches transactions via Tink API |
| Edge Function analyzes transactions | Recurring patterns detected (e.g., Netflix, Spotify) |
| Detected subscriptions stored | `detected_subscriptions` table populated |
| App shows detected items | Review screen lists detected subscriptions |

#### 7.3.2 No Recurring Transactions Found

| Step | Expected Result |
|---|---|
| Bank connected with non-recurring transactions | Edge Function finds no patterns |
| Empty detection result | App shows "No subscriptions detected" message |
| User not blocked | Can still add subscriptions manually |

#### 7.3.3 Edge Function Network Failure (Tink API unavailable)

| Step | Expected Result |
|---|---|
| Edge Function cannot reach Tink API | Error returned with appropriate status code |
| App handles gracefully | "Could not analyze transactions. Will retry later." |
| Retry mechanism | Automatic retry with exponential backoff |
| No data loss | Previously detected subscriptions preserved |

### Story 7.4 — Review & Approve Detected Subscriptions

#### 7.4.1 Approve Detected Subscription

| Step | Expected Result |
|---|---|
| User sees detected subscription list | Each item shows: name, amount, frequency, confidence |
| User taps "Approve" on an item | Item converted to regular subscription |
| Subscription appears in main list | Linked to bank connection as source |

#### 7.4.2 Dismiss Detected Subscription

| Step | Expected Result |
|---|---|
| User taps "Dismiss" on a false positive | Item removed from detected list |
| Item does not reappear | Dismissal stored to prevent re-detection |

### Story 7.5 — Match Detected with Manual Subscriptions

#### 7.5.1 Duplicate Detection

| Step | Expected Result |
|---|---|
| User has manual "Netflix" subscription | Detection finds bank "Netflix" transaction |
| Match suggested to user | "We found a match: Netflix (manual) ↔ Netflix (bank)" |
| User confirms match | Subscriptions linked, amount updated from bank data |
| No duplicate in list | Single entry with both sources |

### Story 7.7 — Bank Connection Status & Management

#### 7.7.1 Connection Healthy

| Step | Expected Result |
|---|---|
| User views bank connections | Status: "Connected" with green indicator |
| Last sync time shown | "Last synced: 2 hours ago" |
| Consent expiry shown | "Expires: 2026-09-18" |

#### 7.7.2 Connection Expired

| Step | Expected Result |
|---|---|
| 180 days since consent | Status changes to "Expired" |
| Data sync stops | No new transactions fetched |
| Reconnect prompt shown | "Your bank connection expired. Tap to reconnect." |
| User taps reconnect | Tink Link opens for re-authentication (SCA) |

#### 7.7.3 Connection Error (Bank API Issue)

| Step | Expected Result |
|---|---|
| Tink reports bank connectivity issue | Status: "Temporarily unavailable" |
| Automatic retry | Backend retries after interval |
| User notified if persistent | "Bank connection issue. We'll retry automatically." |
| Graceful degradation (Epic 6 lesson) | App functions normally, bank features show stale data |

### Story 7.8 — Manual Bank Data Refresh

#### 7.8.1 Pull to Refresh

| Step | Expected Result |
|---|---|
| User pulls down on bank-connected screen | Sync triggered |
| Loading indicator shown | Spinner during fetch |
| New transactions fetched | Detection re-runs on new data |
| "Last synced" updated | Timestamp reflects current time |

#### 7.8.2 Refresh During Rate Limit

| Step | Expected Result |
|---|---|
| User refreshes too frequently | Rate limit message shown |
| No API call made | Cached data displayed |
| Cooldown timer | "Try again in X minutes" |

### Story 7.9 — Bank Connection Expiry Notifications

#### 7.9.1 Expiry Warning Notification

| Step | Expected Result |
|---|---|
| 14 days before consent expiry | Push notification sent |
| User taps notification | Opens bank connection management screen |
| 7 days before expiry | Second, more urgent notification |

### Story 7.10 — Spending Reconciliation

#### 7.10.1 Tracked vs Actual Comparison

| Step | Expected Result |
|---|---|
| User has manual + bank-detected subscriptions | Reconciliation view shows comparison |
| Untracked bank charges highlighted | "Found 2 charges not in your subscriptions" |
| Total spending accuracy | Bank total vs tracked total shown |

---

## Mock Transaction Data Patterns

For subscription detection algorithm testing (unit tests), use these representative patterns:

### Recurring Subscription Patterns

```typescript
const mockRecurringTransactions = [
  // Monthly — exact amount, same day
  { description: "NETFLIX.COM", amount: -15.99, date: "2026-01-15", category: "ENTERTAINMENT" },
  { description: "NETFLIX.COM", amount: -15.99, date: "2026-02-15", category: "ENTERTAINMENT" },
  { description: "NETFLIX.COM", amount: -15.99, date: "2026-03-15", category: "ENTERTAINMENT" },

  // Monthly — slight date variation (±3 days)
  { description: "SPOTIFY AB", amount: -9.99, date: "2026-01-03", category: "ENTERTAINMENT" },
  { description: "SPOTIFY AB", amount: -9.99, date: "2026-02-05", category: "ENTERTAINMENT" },
  { description: "SPOTIFY AB", amount: -9.99, date: "2026-03-02", category: "ENTERTAINMENT" },

  // Annual subscription
  { description: "AMAZON PRIME", amount: -69.99, date: "2025-03-20", category: "SHOPPING" },
  { description: "AMAZON PRIME", amount: -69.99, date: "2026-03-20", category: "SHOPPING" },

  // Variable amount (usage-based — should NOT be detected as subscription)
  { description: "AWS SERVICES", amount: -45.23, date: "2026-01-01", category: "TECHNOLOGY" },
  { description: "AWS SERVICES", amount: -78.91, date: "2026-02-01", category: "TECHNOLOGY" },
  { description: "AWS SERVICES", amount: -52.10, date: "2026-03-01", category: "TECHNOLOGY" },
];
```

### Edge Cases for Detection Algorithm

| Case | Pattern | Expected Detection |
|---|---|---|
| Exact recurring | Same amount, same merchant, monthly | ✅ Detected |
| Date drift (±5 days) | Same amount, same merchant, ~monthly | ✅ Detected |
| Annual subscription | Same amount, same merchant, 12-month gap | ✅ Detected (if 2+ occurrences) |
| Variable amount | Same merchant, different amounts | ❌ Not detected (or flagged as "possible") |
| One-time purchase | Single occurrence | ❌ Not detected |
| Merchant name variation | "NETFLIX.COM" vs "NETFLIX INC" | ✅ Detected (fuzzy merchant matching) |
| Free trial → paid | $0.00 then $9.99 | ⚠️ Detected after first paid occurrence |
| Cancelled subscription | 3 months then stops | ⚠️ Detected but marked "possibly cancelled" |

---

## Network Failure Test Matrix

*Epic 6 lesson: Network/offline failure scenarios must be explicit test cases.*

| Scenario | Component | Expected Behavior |
|---|---|---|
| No internet during Tink Link | SDK | Tink Link shows "No connection" error |
| No internet during token exchange | Edge Function | Return error, no partial state saved |
| No internet during transaction fetch | Edge Function | Return cached data if available, error if not |
| Tink API 5xx during sync | Edge Function | Retry with exponential backoff, max 3 retries |
| Tink API 429 (rate limit) | Edge Function | Respect `Retry-After` header, queue for later |
| Supabase offline during token storage | Edge Function | Critical error — log, alert, do not proceed |
| Network restored after failure | App | Automatic retry on next app foreground |
| Airplane mode during refresh | App | "No connection" message, no crash |

---

## Consent Expiry Test Scenarios

| Scenario | How to Test | Expected Behavior |
|---|---|---|
| Fresh consent (day 1) | Create new Demo Bank connection | Status: `active`, 180 days until expiry |
| Approaching expiry (day 166) | Manually set `consent_expires_at` to 14 days from now | Push notification triggered |
| Expired consent (day 181) | Manually set `consent_expires_at` to yesterday | Status: `expired`, sync stops, reconnect prompt |
| Re-authentication | After expired, open Tink Link | New consent granted, timer resets to 180 days |
| Multiple connections, one expired | Two connections, expire one | Only expired shows warning, other continues |

---

## SCA Simulation Test Matrix

| SCA Method | Tink Demo Bank Behavior | SubTrack Handling |
|---|---|---|
| Username + password | Simulated in Demo Bank | Tink Link handles, SubTrack receives callback |
| SMS OTP | Demo Bank may simulate OTP step | Tink Link handles, no SubTrack code needed |
| Bank app redirect | Demo Bank simulates redirect flow | Deep link callback must work correctly |
| Biometric | Not simulated in Demo Bank | Tested on real bank connections only |
| SCA timeout | User waits too long at bank auth | Tink Link returns timeout error |
| SCA cancelled by user | User taps cancel at bank auth | Tink Link returns cancellation, app handles gracefully |

---

## Pre-Story Test Checklist (Per Bank Integration Story)

- [ ] Tink Console sandbox account accessible
- [ ] Demo Bank available and responding
- [ ] `expo-dev-client` build available for real SDK testing
- [ ] Metro mock configured for Expo Go development
- [ ] Edge Function running locally (`supabase functions serve`)
- [ ] `bank_connections` table exists with correct RLS policies
- [ ] Deep link (`subtrack://tink/callback`) configured and working
- [ ] Network failure scenario tested (airplane mode toggle)
- [ ] `context7` / `brave-search` research completed for any new library dependency

---

## Automated vs Manual Test Split

| Test Type | Automated (Jest) | Manual (Device) |
|---|---|---|
| Store logic (useBankStore) | ✅ | |
| Subscription detection algorithm | ✅ | |
| Edge Function data transformation | ✅ | |
| API error handling | ✅ | |
| Tink Link SDK flow | | ✅ |
| SCA simulation | | ✅ |
| Deep link callback | | ✅ |
| Push notification delivery | | ✅ |
| Pull-to-refresh UX | | ✅ |
| Consent expiry notification timing | ✅ (logic) | ✅ (delivery) |

---

## Edge Function Test Strategy (Revisit from Epic 6)

Epic 6 retro identified Edge Function test automation as a revisit item. For Epic 7:

| Approach | Decision |
|---|---|
| Deno test runner for Edge Functions | **Use for Epic 7** — bank data parsing is too complex for manual-only testing |
| Test scope | Unit tests for transaction parsing, subscription detection, token refresh logic |
| Mock Tink API responses | Create fixtures from Demo Bank response shapes |
| CI integration | Run Edge Function tests in GitHub Actions alongside Jest tests |

---

## Revisit Trigger

Expand test automation when **any** of the following:
- Subscription detection false positive rate exceeds 10% in production
- More than 3 bank-related bugs reach production
- CI/CD supports Detox or Maestro for E2E testing
- Team adds Deno test runner to CI pipeline

---

## Research Sources

- [Tink Docs — Demo Bank](https://docs.tink.com/entries/articles/demo-bank) — Sandbox bank for testing
- [Tink Docs — Test Account Check Scenarios](https://docs.tink.com/entries/articles/test-different-account-check-scenarios) — Test user scenarios
- [Tink Docs — Demo Bank and Payments](https://docs.tink.com/entries/articles/demo-bank-and-payments) — Payment testing
- [Tink Docs — Money Manager Testing](https://docs.tink.com/entries/articles/demo-banks-money-manager) — Transaction categorization testing

---

*Research conducted as Epic 6 retrospective preparation task (P3)*
