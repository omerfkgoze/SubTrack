# Epic 6 Preparation: RevenueCat vs. Direct StoreKit / Google Play Billing Decision

**Date:** 2026-03-18
**Owner:** Charlie (Senior Dev)
**Task:** Technical decision — IAP library selection before Story 6.1

---

## Decision

**Use RevenueCat.**

Do not implement StoreKit (iOS) or Google Play Billing (Android) directly.

---

## Options Evaluated

### Option A: RevenueCat SDK

| Dimension | Assessment |
|---|---|
| Cross-platform | ✅ Single SDK for iOS + Android |
| Receipt validation | ✅ Server-side validation handled by RevenueCat — no custom server needed |
| Sandbox support | ✅ Built-in sandbox/production environment switching |
| React Native | ✅ Official `react-native-purchases` package, Expo-compatible |
| Analytics | ✅ Revenue dashboard, churn, MRR, trial conversion out of the box |
| Edge cases | ✅ Family Sharing, proration, billing retry, grace periods — handled |
| Webhooks | ✅ Webhook events for subscription state changes (integrate with Supabase) |
| Cost | ⚠️ Free up to $2.5k MRR, then 1% of revenue |
| Vendor lock-in | ⚠️ Moderate — entitlements tied to RevenueCat dashboard |

### Option B: Direct StoreKit 2 (iOS) + Google Play Billing Library (Android)

| Dimension | Assessment |
|---|---|
| Cross-platform | ❌ Two separate implementations required |
| Receipt validation | ❌ Must build server-side validation (App Store Server API + Google Play Developer API) |
| Sandbox support | ⚠️ Manual — separate sandbox accounts, no unified view |
| React Native | ⚠️ expo-iap or react-native-iap (community-maintained, fragmented) |
| Analytics | ❌ None — must build or integrate third-party |
| Edge cases | ❌ Must handle manually: retries, grace periods, proration |
| Webhooks | ❌ Must set up App Store Server Notifications + Google Play RTDN separately |
| Cost | ✅ Free (platform fees only) |
| Vendor lock-in | ✅ None |

---

## Rationale

At MVP scale with a two-platform target (iOS + Android), direct billing library integration requires maintaining two payment code paths plus a server-side receipt validation service. RevenueCat eliminates all three with a single SDK and a hosted backend.

The 1% revenue fee above $2.5k MRR is an acceptable cost given:
1. **MVP risk reduction** — payment flows are the highest-risk area of Epic 6; proven infrastructure reduces that risk materially
2. **Development velocity** — direct implementation would add 2–3 story points of non-product complexity per IAP story
3. **Revisit trigger** — if revenue exceeds $10k MRR, re-evaluate cost vs. build

RevenueCat is the standard choice for React Native / Expo indie apps at this stage.

---

## Dependencies to Install

```bash
npx expo install react-native-purchases
```

**Package:** `react-native-purchases`
**Version at decision time:** ^8.x (Expo SDK 52 compatible)
**Managed workflow:** Supported — no ejection required

---

## RevenueCat Dashboard Setup Steps

1. Create account at [rev.cat](https://www.revenuecat.com)
2. Create new project: `SubTrack`
3. Add iOS app → link App Store Connect App
4. Add Android app → link Google Play Console App
5. Configure Products (match App Store Connect / Play Console product IDs)
6. Create Entitlements: `premium` (maps to all premium products)
7. Create Offerings: `default` (contains premium monthly + annual packages)
8. Copy API keys: `REVENUECAT_IOS_API_KEY`, `REVENUECAT_ANDROID_API_KEY`

---

## Revisit Trigger

Re-evaluate direct billing integration when **any** of the following:
- Monthly revenue consistently exceeds $10k MRR (RevenueCat fee becomes significant)
- RevenueCat introduces breaking pricing changes
- Expo drops managed workflow support for `react-native-purchases`

---

*Research conducted as Epic 5 retrospective preparation task*
