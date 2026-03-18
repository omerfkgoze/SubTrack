# Epic 6 Preparation: App Store & Google Play IAP Guideline Review

**Date:** 2026-03-18
**Owner:** Alice (Product Owner) + Charlie (Senior Dev)
**Task:** Compliance checklist — IAP guidelines before Story 6.1

---

## Summary

Both App Store and Google Play mandate in-app purchase APIs for digital subscriptions. Violation results in rejection. Checklist below covers all relevant rules for SubTrack's freemium → premium subscription flow.

---

## Apple App Store — Relevant Guidelines

### Guideline 3.1.1 — In-App Purchase

| Rule | SubTrack Impact | Status |
|---|---|---|
| Digital goods and services must use IAP | Premium subscription is a digital good ✅ | Compliant by design |
| No directing users to external purchase paths | Cannot link to web checkout as an alternative | ⚠️ Must not add "Buy on website" CTA |
| No showing prices lower elsewhere | Cannot show a discount price available on the web | ⚠️ Must not compare web price |
| "Freemium" apps must clearly describe what is free vs. paid | Paywall screen must list free vs. premium features | ✅ Must implement |

### Guideline 3.1.2 — Subscriptions

| Rule | SubTrack Impact | Status |
|---|---|---|
| Must implement restore purchases | Users reinstalling app must recover subscription | ✅ Must implement Restore button |
| Subscription terms must be clearly disclosed before purchase | Price, duration, auto-renewal, cancellation policy shown on paywall | ✅ Must show on paywall screen |
| Free trials must disclose when billing starts | If free trial offered, must show "X days free, then $Y/mo" | ✅ Required if trial added |
| Cancellation instructions must be accessible | Link to App Store subscription management | ✅ Settings screen required |

### Guideline 5.1.1(v) — Account Deletion (Relevant)

Already implemented in Story 5.6. No additional action needed for Epic 6.

### Metadata / Screenshots

| Rule | SubTrack Impact |
|---|---|
| Screenshots must not show features unavailable in free tier | Paywall screenshots must accurately represent premium |
| App description must not be misleading about free content | "Free" in description must match actual free feature set |

---

## Google Play — Relevant Policies

### Payments Policy

| Rule | SubTrack Impact | Status |
|---|---|---|
| Must use Google Play Billing for in-app digital content | Premium subscription must go through Play Billing | ✅ Handled by RevenueCat |
| Cannot use alternate payment methods for digital goods | No Stripe, PayPal, or web checkout for premium | ⚠️ Must not add |
| Must not charge users for features available free elsewhere | Consistent pricing across platforms | ✅ Same price on both platforms |

### Subscription Policy

| Rule | SubTrack Impact | Status |
|---|---|---|
| Must clearly disclose subscription terms before purchase | Price, billing period, cancellation shown before purchase | ✅ Must implement |
| Must provide working restore/manage subscription flow | Link to Play Store subscription management | ✅ Must implement |
| Must honor subscription until period end after cancellation | Do not revoke access on cancellation — wait for period end | ✅ RevenueCat handles this |

### Data Safety Form (Play Console)

| Data Collected | Category | Action Required |
|---|---|---|
| Purchase history | Financial info | ✅ Declare in Data Safety section |
| Email address | Contact info | ✅ Already declared (Story 5.6) |

---

## Rejection Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Missing restore purchases button | 🔴 High — common rejection reason | Implement before submission |
| Subscription terms not disclosed on paywall | 🔴 High — guideline 3.1.2 | Add price + auto-renewal text to paywall |
| External payment CTA | 🔴 High — guideline 3.1.1 | Never add |
| Data Safety form not updated (Play) | 🟡 Medium — will trigger review | Update before Play submission |
| Screenshot shows premium features as free | 🟡 Medium — metadata policy | Review screenshots pre-submission |

---

## Paywall Screen — Required Copy Elements

The following text elements are **mandatory** on the paywall/subscription screen:

```
SubTrack Premium

[Feature list comparing free vs. premium]

$X.XX / month
Billed monthly. Auto-renews. Cancel anytime.

[Subscribe Button]

[Restore Purchases]  [Terms of Use]  [Privacy Policy]
```

For free trials:
```
Start your X-day free trial
Then $X.XX/month. Cancel anytime before trial ends to avoid charges.
```

---

## Pre-Submission Checklist

- [ ] Restore purchases button implemented and functional
- [ ] Subscription terms (price + auto-renewal) visible on paywall before purchase
- [ ] No external purchase CTAs in app
- [ ] Play Console Data Safety form updated (purchase history added)
- [ ] App Store screenshots reviewed (no misleading free/premium representation)
- [ ] Cancel subscription flow links to platform subscription management
- [ ] Cancellation does not revoke access before period end (verify in sandbox)

---

*Research conducted as Epic 5 retrospective preparation task*
