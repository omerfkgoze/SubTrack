# Epic 7 Preparation: Open Banking Aggregator Selection

**Date:** 2026-03-21
**Owner:** Charlie (Senior Dev) + Alice (Product Owner)
**Task:** Technical decision — Open Banking aggregator selection before Story 7.1

---

## Decision

**Use Tink.**

Do not use Salt Edge or Nordigen/GoCardless. Tink provides the best balance of EU coverage, developer experience, React Native SDK availability, sandbox quality, and Visa-backed reliability for SubTrack's needs.

---

## Options Evaluated

### Option A: Tink (Visa)

| Dimension                 | Assessment                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| EU bank coverage          | ✅ 6,000+ banks across 18 European markets — exceeds NFR37 (≥80% major EU banks)                                                   |
| PSD2 compliance           | ✅ Full PSD2 and non-PSD2 data access, regulated as AISP/PISP                                                                      |
| React Native SDK          | ✅ `react-native-tink-sdk` (npm) — wraps Tink Link SDK (Android 2.7.0, iOS 3.0.0), actively maintained                             |
| Expo compatibility        | ⚠️ Native module — requires `expo-dev-client`, not Expo Go compatible (same pattern as `react-native-iap` in Epic 6)               |
| Sandbox                   | ✅ Free sandbox with Demo Bank — simulated accounts, transactions, payment initiation. Multiple test users for different scenarios |
| Developer console         | ✅ Tink Console (console.tink.com) — free account, test data, product exploration                                                  |
| Data enrichment           | ✅ Transaction categorization, merchant identification out of the box                                                              |
| Pricing                   | ⚠️ Standard tier starts at €0.50/user/month for transactions. Free sandbox. Enterprise pricing custom                              |
| AIS (Account Information) | ✅ Full support — accounts, balances, transactions                                                                                 |
| PIS (Payment Initiation)  | ✅ Supported (not needed for Epic 7 but available for future)                                                                      |
| OAuth/SCA flow            | ✅ Tink Link handles full bank authentication flow including SCA                                                                   |
| Token management          | ✅ Automatic consent/token refresh management                                                                                      |
| Webhooks                  | ✅ Event-based notifications for connection status changes                                                                         |
| Backing                   | ✅ Acquired by Visa (2022) — strong financial stability                                                                            |

### Option B: Salt Edge

| Dimension          | Assessment                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| EU bank coverage   | ✅ 5,000+ banks globally, 1,585+ institutions tracked                                                                              |
| PSD2 compliance    | ✅ 100% PSD2 compliant                                                                                                             |
| React Native SDK   | ⚠️ No official SDK — community `react-native-salt-edge-connect` (unmaintained). Integration via WebView + Salt Edge Connect widget |
| Expo compatibility | ⚠️ WebView-based — works in Expo Go but UX is degraded (web widget in native app)                                                  |
| Sandbox            | ✅ Sandbox environment available                                                                                                   |
| Developer console  | ✅ Client dashboard available                                                                                                      |
| Data enrichment    | ⚠️ Basic categorization — less mature than Tink                                                                                    |
| Pricing            | ⚠️ Custom pricing only — no transparent pricing published. Usage-based                                                             |
| AIS                | ✅ Full support                                                                                                                    |
| PIS                | ✅ Supported                                                                                                                       |
| OAuth/SCA flow     | ✅ Connect widget handles authentication                                                                                           |
| Token management   | ✅ Reconnect API for expired connections                                                                                           |
| Webhooks           | ✅ Callback notifications                                                                                                          |
| Backing            | ✅ Established company, Finastra partner                                                                                           |

### Option C: Nordigen / GoCardless Bank Account Data

| Dimension          | Assessment                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| EU bank coverage   | ✅ 2,500+ banks across UK and Europe                                                                      |
| PSD2 compliance    | ✅ PSD2 compliant                                                                                         |
| React Native SDK   | ❌ No SDK — REST API only, must build all UI flows manually                                               |
| Expo compatibility | ✅ REST API works anywhere — but significant development effort for auth flows                            |
| Sandbox            | ⚠️ Limited sandbox — free tier allows 50 monthly connections                                              |
| Developer console  | ⚠️ Merged into GoCardless dashboard — less focused on AIS use case                                        |
| Data enrichment    | ❌ Raw transaction data only — no categorization                                                          |
| Pricing            | ✅ Free tier (50 connections/month). Paid tiers for higher volume                                         |
| AIS                | ✅ Full support                                                                                           |
| PIS                | ❌ Moved to GoCardless payments product (separate)                                                        |
| OAuth/SCA flow     | ❌ Must build redirect flow manually                                                                      |
| Token management   | ⚠️ Manual — requisition-based, 90-day consent expiry                                                      |
| Webhooks           | ❌ Polling-based — no event notifications                                                                 |
| Backing            | ⚠️ Acquired by GoCardless — AIS product future uncertain, no longer accepting new Nordigen-only customers |

---

## Comparison Matrix

| Criterion                | Weight   | Tink           | Salt Edge      | Nordigen/GC  |
| ------------------------ | -------- | -------------- | -------------- | ------------ |
| EU bank coverage (NFR37) | Critical | ✅ 6,000+      | ✅ 5,000+      | ⚠️ 2,500+    |
| React Native SDK         | High     | ✅ Official    | ⚠️ WebView     | ❌ None      |
| Sandbox quality          | High     | ✅ Excellent   | ✅ Good        | ⚠️ Limited   |
| PSD2 compliance          | Critical | ✅ Full        | ✅ Full        | ✅ Full      |
| Data enrichment          | Medium   | ✅ Built-in    | ⚠️ Basic       | ❌ None      |
| Pricing transparency     | Medium   | ⚠️ Tiered      | ❌ Custom only | ✅ Free tier |
| Long-term viability      | High     | ✅ Visa-backed | ✅ Stable      | ⚠️ Uncertain |
| Development effort       | High     | Low            | Medium         | High         |
| Webhook support          | Medium   | ✅ Yes         | ✅ Yes         | ❌ No        |

---

## Rationale

### Why Tink

1. **Tink Link native SDKs are production-grade** — Tink provides official native SDKs: `tink-link-android` and `tink-link-ios` (both maintained by Tink AB on GitHub). For React Native, integration is via WebView wrapping Tink Link, or a custom native module bridge. Note: `react-native-tink-sdk` on npm (by FinTecSystems) targets Tink Germany's XS2A API specifically — it is in beta, has 0 weekly downloads, and is **not** the general Tink Link SDK. **Pre-story action:** Validate the WebView integration path against `tink-link-android`/`tink-link-ios` before Story 7.1 begins.

2. **Tink Link handles the entire bank authentication flow** — OAuth redirects, SCA challenges, bank selection UI, error handling. This eliminates 2–3 stories worth of custom auth flow development. The React Native integration approach (WebView vs native bridge) must be confirmed at Story 7.1 start.

3. **6,000+ bank connections exceeds NFR37** — No risk of coverage gaps for EU markets. Salt Edge is comparable; Nordigen falls short at 2,500+.

4. **Data enrichment built-in** — Transaction categorization and merchant identification directly support Story 7.3 (Automatic Subscription Detection). Without this, we'd need to build our own categorization logic in Edge Functions.

5. **Visa backing** — Long-term platform viability is not a concern. Nordigen's future as a standalone AIS product is uncertain post-GoCardless acquisition.

6. **Sandbox with Demo Bank** — Free, comprehensive testing environment with multiple test scenarios. Critical for P3 (test strategy).

### Why Not Salt Edge

- No official React Native SDK — WebView integration degrades UX and adds maintenance burden
- Opaque pricing — cannot evaluate cost before sales conversation
- WebView-based auth flow means we lose native feel and must handle `window.postMessage` bridging

### Why Not Nordigen/GoCardless

- No SDK, no webhooks, no data enrichment — maximum development effort
- Platform future uncertain — GoCardless is de-prioritizing standalone AIS
- 2,500 banks vs Tink's 6,000 — coverage gap risk

---

## Expo Go Compatibility Note

**Tink Link integration requires native modules — it will NOT work in Expo Go.**

The exact React Native integration approach must be confirmed at Story 7.1 start. Two paths:

| Path | Approach | Expo Go | Production |
|---|---|---|---|
| **A: WebView** | Embed Tink Link URL in `react-native-webview`, handle deep link callback | ✅ Works | ✅ Works |
| **B: Native bridge** | Wrap `tink-link-android` / `tink-link-ios` in a custom Expo module | ❌ Requires dev client | ✅ Works |

Path A (WebView) is the lower-risk choice — same integration pattern as Salt Edge, no native module build needed. Path B gives better UX but requires bridging work upfront.

**Pre-story checklist answer:** "Does Tink require native modules? **Depends on path — verify before Story 7.1.**"
**Pre-story action:** Confirm integration path and create Metro mock if Path B is chosen.

---

## Dependencies to Install

Path A (WebView): `npx expo install react-native-webview` (already a common dependency)

Path B (native bridge): Custom Expo module wrapping Tink's native SDKs — evaluate effort at Story 7.1.

**Decision deferred to Story 7.1 spike.** Do not assume `react-native-tink-sdk` (npm) is the integration path.

---

## Tink Console Setup Steps

1. Create free account at [console.tink.com](https://console.tink.com)
2. Create new app: `SubTrack`
3. Configure redirect URI for OAuth callback (deep link: `subtrack://tink/callback`)
4. Select markets: Start with major EU markets (DE, FR, NL, ES, IT, SE, FI, BE, AT, IE)
5. Enable products: Account Check, Transactions
6. Copy credentials: `TINK_CLIENT_ID`, `TINK_CLIENT_SECRET`
7. Test with Demo Bank in sandbox mode
8. Store secrets in Supabase Edge Function environment variables (never in client)

---

## Cost Estimate (MVP Scale)

| Tier     | Users            | Cost                              |
| -------- | ---------------- | --------------------------------- |
| Sandbox  | Unlimited test   | Free                              |
| Standard | First ~100 users | ~€50/month (€0.50/user/month)     |
| Growth   | 500 users        | ~€250/month                       |
| Scale    | 1,000+ users     | Enterprise pricing (contact Tink) |

At MVP scale (< 500 premium users with bank connections), Tink cost is manageable. Bank connection is a premium-only feature, so the user base is already filtered.

---

## Revisit Trigger

Re-evaluate aggregator choice when **any** of the following:

- Tink pricing exceeds 5% of subscription revenue
- Tink drops React Native SDK support
- EU regulatory changes require multi-aggregator strategy
- Coverage gaps discovered in specific target markets

---

## Research Sources

- [Tink Official](https://tink.com/) — Platform overview, 6,000+ connections
- [Tink Pricing](https://tink.com/pricing/) — Standard tier from €0.50/user/month
- [Tink Docs — Demo Bank](https://docs.tink.com/entries/articles/demo-bank) — Sandbox testing
- [react-native-tink-sdk (npm)](https://socket.dev/npm/package/react-native-tink-sdk) — RN SDK package
- [Salt Edge Official](https://www.saltedge.com/) — 5,000+ banks globally
- [Salt Edge Docs](https://docs.saltedge.com/v6/) — API documentation
- [GoCardless Bank Account Data](https://developer.gocardless.com/bank-account-data/overview) — Nordigen successor
- [Open Banking Tracker — Tink](https://www.openbankingtracker.com/api-aggregators/tink) — 509+ tracked institutions
- [Open Banking Tracker — Salt Edge](https://www.openbankingtracker.com/api-aggregators/salt-edge) — 1,585+ tracked institutions

---

_Research conducted as Epic 6 retrospective preparation task (P1)_
