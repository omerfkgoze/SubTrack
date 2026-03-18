# Epic 6 Preparation: IAP Test Strategy

**Date:** 2026-03-18
**Owner:** Dana (QA Engineer)
**Task:** Document test plan — sandbox purchases, restore flow, network failures, receipt validation

---

## Decision

Test IAP flows using **Apple Sandbox + Google Play License Testing** environments, coordinated through the **RevenueCat sandbox mode**. No real charges are made during testing.

Manual test execution for Epic 6 stories (automated IAP testing is out of scope for MVP — see revisit trigger below).

---

## Test Environments

| Platform | Environment | How to Enable |
|---|---|---|
| iOS | Apple Sandbox | Use Sandbox Apple ID (created in App Store Connect → Users & Access → Sandbox Testers) |
| Android | Google Play License Testing | Add tester email in Play Console → Setup → License Testing |
| RevenueCat | Sandbox mode | SDK uses sandbox automatically when build is debug / sandbox receipt detected |

---

## Test Accounts Required

### Apple Sandbox Tester

1. Go to App Store Connect → Users & Access → Sandbox → Testers
2. Create a sandbox Apple ID (use a non-real email, e.g. `sandbox-subtrack-test@example.com`)
3. On device: Settings → App Store → Sandbox Account → sign in with sandbox ID
4. All purchases on device will be sandboxed (no real charges)

### Google Play License Tester

1. Go to Play Console → Setup → License Testing
2. Add tester Gmail accounts
3. Testers can make test purchases without being charged
4. Use `android.test.purchased` for static responses or real product IDs for dynamic testing

---

## Test Scenarios

### 1. Happy Path — New Subscription

| Step | Expected Result |
|---|---|
| Tap "Subscribe" on paywall | RevenueCat purchase sheet appears |
| Confirm purchase (sandbox) | Purchase completes, no real charge |
| App state updates | Premium entitlement active, premium UI unlocked |
| RevenueCat dashboard | Sandbox transaction visible |
| Supabase (if webhook configured) | `subscription_status` updated to `premium` |

### 2. Restore Purchases

| Step | Expected Result |
|---|---|
| Uninstall and reinstall app | User is not premium |
| Tap "Restore Purchases" | RevenueCat restores entitlements from store |
| Previously purchased subscription active | Premium UI unlocked without new purchase |
| Non-subscriber taps restore | Informational message: "No active subscription found" |

### 3. Subscription Cancellation Flow

| Step | Expected Result |
|---|---|
| Cancel subscription via platform settings | RevenueCat webhook (if configured) or next app open detects cancellation |
| Access until period end | User retains premium access until billing period ends |
| After period end | App downgrades to free tier gracefully |
| Free tier limits enforced | User cannot access premium features |

### 4. Network Failure During Purchase

| Step | Expected Result |
|---|---|
| Start purchase → kill network mid-flow | Purchase sheet handles gracefully (platform-level, not app-level) |
| App receives error | Error state shown, no partial charge |
| Network restored | User can retry purchase |
| Duplicate purchase prevention | RevenueCat prevents duplicate entitlement |

### 5. Already Subscribed — Second Purchase Attempt

| Step | Expected Result |
|---|---|
| Active subscriber taps "Subscribe" | RevenueCat detects active entitlement |
| App shows "You're already subscribed" or skips paywall | No duplicate purchase dialog |

### 6. Free Trial Flow (if implemented)

| Step | Expected Result |
|---|---|
| First-time user taps "Start Free Trial" | Trial starts, no charge shown on sandbox |
| Trial period passes (sandbox: accelerated to minutes) | Subscription auto-converts to paid |
| Cancel before trial ends | No charge, reverts to free tier |

### 7. Freemium Limit Enforcement

| Step | Expected Result |
|---|---|
| Free user tries to add 4th subscription (limit TBD) | Limit gate appears, paywall shown |
| Premium user adds subscriptions freely | No gate shown |
| Premium user downgrades | Limit enforcement re-activates at next limit check |

---

## Sandbox Timing Behavior

Apple Sandbox and Google Play accelerate subscription durations for testing:

| Real Duration | Sandbox Duration (Apple) |
|---|---|
| 1 week | 3 minutes |
| 1 month | 5 minutes |
| 2 months | 10 minutes |
| 3 months | 15 minutes |
| 6 months | 30 minutes |
| 1 year | 1 hour |

Use this to test renewal and cancellation flows without waiting real-world durations.

---

## RevenueCat Dashboard Verification

After each sandbox purchase, verify in RevenueCat dashboard:
- Transaction appears under Customers
- Entitlement `premium` is active
- Revenue correctly attributed to sandbox environment (not counted in real MRR)

---

## Pre-Story Test Checklist (Per IAP Story)

- [ ] Sandbox Apple ID available and signed in on test device
- [ ] Google Play license tester account configured
- [ ] RevenueCat sandbox mode confirmed (check dashboard — no real MRR impact)
- [ ] Happy path purchase works end-to-end
- [ ] Restore purchases works
- [ ] Network failure handled gracefully
- [ ] No duplicate purchase possible

---

## Revisit Trigger

Automate IAP testing when **any** of the following:
- IAP flows exceed 3 distinct purchase paths
- A sandbox test regression causes a production IAP issue
- Epic 7 introduces additional payment flows
- CI/CD pipeline supports Detox or Maestro for E2E testing

---

*Research conducted as Epic 5 retrospective preparation task*
