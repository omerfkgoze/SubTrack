# Epic 6 Preparation: RevenueCat Sandbox Environment Setup

**Date:** 2026-03-18
**Owner:** Charlie (Senior Dev)
**Task:** End-to-end sandbox setup — RevenueCat configured, test purchase working before Story 6.1

---

## Goal

Before Story 6.1 begins, a sandbox purchase must complete successfully end-to-end:
`App → RevenueCat SDK → Store (Sandbox) → Entitlement Active`

This setup guide must be completed in full. Story 6.1 cannot begin until the ✅ at the bottom is reached.

---

## Step 1: App Store Connect Setup (iOS)

### 1.1 Create Subscription Product

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Apps → SubTrack
2. Navigate to: Monetization → In-App Purchases → Manage
3. Click **+** → Auto-Renewable Subscription
4. Create a Subscription Group: `SubTrack Premium`
5. Add products:

| Product ID | Display Name | Duration | Price |
|---|---|---|---|
| `com.subtrack.premium.monthly` | SubTrack Premium Monthly | 1 Month | $X.XX |
| `com.subtrack.premium.annual` | SubTrack Premium Annual | 1 Year | $X.XX |

6. Set pricing: App Store Connect → Pricing and Availability → set per-territory price
7. Add localization (at minimum: English)
8. Submit for review (products need App Review approval — plan 24–48h lead time)

### 1.2 Create Sandbox Tester

1. App Store Connect → Users & Access → Sandbox → Testers → **+**
2. Create: `sandbox-tester@subtrack.test` (any non-real email)
3. Save credentials securely — needed on physical device

---

## Step 2: Google Play Console Setup (Android)

### 2.1 Create Subscription Product

1. Go to [Google Play Console](https://play.google.com/console) → SubTrack → Monetize → Subscriptions
2. Create subscription:

| Product ID | Name | Billing Period |
|---|---|---|
| `com.subtrack.premium.monthly` | SubTrack Premium Monthly | Monthly |
| `com.subtrack.premium.annual` | SubTrack Premium Annual | Yearly |

3. Set pricing per region
4. Activate subscriptions (must be activated before testing)

### 2.2 Configure License Tester

1. Play Console → Setup → License Testing
2. Add test Gmail: `your-test-email@gmail.com`
3. Set response: `RESPOND_NORMALLY`

---

## Step 3: RevenueCat Dashboard Setup

### 3.1 Create Project

1. Go to [app.revenuecat.com](https://app.revenuecat.com)
2. Create Project: `SubTrack`
3. Add iOS App:
   - App name: `SubTrack`
   - Bundle ID: `com.subtrack.app` (match `app.json`)
   - App Store Connect API Key: generate at App Store Connect → Users & Access → Integrations → App Store Connect API
4. Add Android App:
   - Package name: `com.subtrack.app`
   - Google Play Service Credentials: JSON key from Google Play Console → Setup → API access → Create service account

### 3.2 Configure Products

1. RevenueCat Dashboard → Products → **+**
2. Add iOS products:
   - `com.subtrack.premium.monthly`
   - `com.subtrack.premium.annual`
3. Add Android products (same IDs)

### 3.3 Create Entitlements

1. Dashboard → Entitlements → **+**
2. Name: `premium`
3. Attach all products to this entitlement

### 3.4 Create Offerings

1. Dashboard → Offerings → **+**
2. Name: `default`
3. Create packages:
   - `$rc_monthly` → attach monthly product
   - `$rc_annual` → attach annual product
4. Set `default` as current offering

### 3.5 Copy API Keys

From Dashboard → Project Settings → API Keys:

| Key | Variable Name |
|---|---|
| iOS public key | `REVENUECAT_IOS_API_KEY` |
| Android public key | `REVENUECAT_ANDROID_API_KEY` |

Store in `.env` and `app.config.js` (never commit raw keys — use `EXPO_PUBLIC_` prefix convention).

---

## Step 4: SDK Integration (app code)

```bash
npx expo install react-native-purchases
```

Initialize in app entry point (e.g., `App.tsx` or root layout):

```typescript
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

Purchases.setLogLevel(LOG_LEVEL.DEBUG); // remove in production
Purchases.configure({
  apiKey: Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY,
});
```

---

## Step 5: End-to-End Sandbox Verification

### iOS Verification

1. Sign into sandbox tester account on device: Settings → App Store → Sandbox Account
2. Build and run app in debug mode on physical device (simulator cannot make purchases)
3. Navigate to paywall
4. Tap Subscribe → complete sandbox purchase
5. Verify:
   - [ ] Purchase sheet appears with correct price
   - [ ] Sandbox purchase completes without charge
   - [ ] RevenueCat dashboard shows sandbox transaction
   - [ ] App receives `premium` entitlement
   - [ ] Premium UI state activates

### Android Verification

1. Install APK on physical device with license tester Gmail signed in
2. Navigate to paywall
3. Complete test purchase
4. Verify same checklist as iOS above

---

## Success Criteria

**All of the following must be true before Story 6.1 begins:**

- [ ] iOS: Sandbox purchase completes end-to-end
- [ ] Android: Test purchase completes end-to-end
- [ ] RevenueCat dashboard shows both transactions
- [ ] `premium` entitlement active in app after purchase
- [ ] API keys stored in `.env` (not committed)
- [ ] `react-native-purchases` installed and initialized

---

## Common Setup Pitfalls

| Pitfall | Resolution |
|---|---|
| "Product not found" error | Products not yet approved by App Review — wait 24–48h after submission |
| Sandbox purchase shows real price | Sandbox tester not signed in properly — check Settings → App Store → Sandbox Account |
| Android purchase fails | Subscription not activated in Play Console |
| RevenueCat shows no transaction | Check log level — SDK may be in wrong environment |
| Build fails after install | Run `npx expo prebuild` if bare workflow issues occur |

---

*Research conducted as Epic 5 retrospective preparation task*
