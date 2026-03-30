# GOZE Release Management Tasks

# SubTrack — App Store & Google Play

**Owner:** GOZE (Project Lead)
**Scope:** Initial submission + ongoing release management
**Last Updated:** 2026-03-21
**Context:** These are outside-the-code tasks that only GOZE can perform. Track and check off as completed.

---

## PART 1: One-Time Setup (Do Once)

### Apple / App Store

- [x] **Apple Developer Program enrollment**
  - URL: https://developer.apple.com/programs/enroll/
  - Cost: $99/year
  - Requires: Apple ID, D-U-N-S number (for organizations) or personal verification
  - Timeline: Can take 24–48 hours for approval

- [ ] **App Store Connect — create app record**
  - URL: https://appstoreconnect.apple.com
  - App Name: SubTrack
  - Primary Language: Choose carefully (cannot be changed easily)
  - Bundle ID: must match `app.json` > `ios.bundleIdentifier`
  - SKU: unique internal identifier (e.g. `subtrack-001`)

- [ ] **Apple Developer certificates**
  - Distribution certificate: needed for App Store builds
  - Push notification certificate: needed for production push notifications (Epic 4 feature)
  - Generate via: Xcode > Preferences > Accounts, or manually in developer.apple.com > Certificates

- [ ] **Provisioning profiles**
  - App Store Distribution profile: ties Bundle ID + Distribution cert
  - Generate in developer.apple.com > Profiles
  - Or use Expo EAS (recommended): `eas credentials` handles this automatically

- [ ] **In-App Purchase products setup — App Store Connect**
  - Create subscription group: "SubTrack Premium"
  - Add products:
    - `com.subtrack.premium.monthly` — Auto-Renewable Subscription, €2.99/month
    - `com.subtrack.premium.yearly` — Auto-Renewable Subscription, €24.99/year
  - Add localized display name and description
  - Submit for review (can be reviewed with first app submission)
  - ⚠️ Product IDs must exactly match `src/features/premium/config/iapProducts.ts`

- [ ] **App Store Connect — Banking entitlement (for Epic 7)**
  - When Epic 7 is ready: request "Financial Services" entitlement if required by aggregator
  - Check if Open Banking/PSD2 data requires special App Store disclosure

### Google Play

- [x] **Google Play Developer account**
  - URL: https://play.google.com/console
  - Cost: $25 one-time
  - Requires: Google account, identity verification, 2–3 days for approval

- [x] **Google Play Console — create app**
  - App name: SubTrack
  - Default language
  - App type: App
  - Free / Paid: Free (IAP is handled separately)

- [x] **Google Play — In-App Purchase products setup**
  - Create subscription: "SubTrack Premium"
  - Add products:
    - `com.subtrack.premium.monthly` — €2.99/month
    - `com.subtrack.premium.yearly` — €24.99/year
  - ⚠️ Product IDs must exactly match `src/features/premium/config/iapProducts.ts`
  - Note: Google Play requires at least one APK/AAB uploaded before activating IAP products

- [x] **Google Play API credentials (for server-side receipt validation)**
  - Step 1 — Google Cloud Console:
    1. Go to console.cloud.google.com → select (or create) a project linked to your Play account
    2. APIs & Services → Enable **Google Play Android Developer API**
    3. IAM & Admin → Service Accounts → Create Service Account
    4. Name: e.g. `subtrack-play-validator`, Role: none needed here (set in Play Console)
    5. Keys tab → Add Key → JSON → download the file
  - Step 2 — Google Play Console:
    1. Setup → API access → Link to the Google Cloud project above
    2. Grant access to the service account → Role: **Financial data viewer**
  - Step 3 — Supabase:
    - `supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='<paste full JSON content here>'`
  - ⚠️ Never commit the JSON file to git — already in .gitignore as `google-service-account.json`

---

## PART 2: First Submission

### Pre-Submission Checklist

- [ ] **App Store listing content ready**
  - App name: SubTrack
  - Subtitle (30 chars max)
  - Description (4000 chars max) — highlight key features
  - Keywords (100 chars max) — subscription tracker, budget, reminders
  - Support URL
  - Marketing URL (optional)
  - Privacy Policy URL — **required**, must be publicly accessible

- [ ] **Screenshots prepared**
  - iPhone 6.7" (required): at least 3 screenshots
  - iPhone 6.5" (required)
  - iPad (if supporting iPad)
  - Use realistic data in screenshots — no placeholder content

- [x] **App icon**
  - 1024×1024 PNG, no transparency, no rounded corners (App Store applies rounding)
  - Must match icon in app

- [x] **Age rating questionnaire** — fill in App Store Connect
  - SubTrack: likely 4+ (no objectionable content)

- [x] **Privacy nutrition labels (App Store)**
  - Declare all data collected: email, usage data, purchase history
  - Financial data (when Epic 7 launches): bank account data

- [x] **Google Play store listing**
  - Short description (80 chars)
  - Full description (4000 chars)
  - Screenshots: phone (min 2), 7" tablet, 10" tablet (optional)
  - Feature graphic: 1024×500 px
  - App icon: 512×512 PNG

- [x] **Privacy policy**
  - Must cover: what data is collected, how it's used, third parties (Supabase, Apple/Google IAP, future: bank aggregator)
  - Must be publicly hosted (GitHub Pages, own domain, etc.)
  - Same URL used for both App Store and Play Store

- [x] **Google Play — data safety section**
  - Declare data types collected: account info, purchase history, financial info (Epic 7)

### Build & Upload

- [ ] **iOS: production build via EAS**
  - `eas build --platform ios --profile production`
  - Upload to App Store Connect via `eas submit --platform ios` or Transporter app

- [x] **Android: production AAB via EAS**
  - `eas build --platform android --profile production`
  - Upload to Google Play Console as AAB (not APk)

- [ ] **TestFlight setup (iOS)**
  - Add internal testers (yourself + dev team)
  - Test IAP in sandbox before production submission
  - Apple Sandbox account: create in App Store Connect > Users > Sandbox Testers

- [x] **Google Play internal testing track**
  - Upload AAB to internal testing track first
  - Test IAP with test accounts
  - Promote to production when ready

### Submission

- [ ] **iOS: submit for App Store Review**
  - App Store Connect > App > Prepare for Submission > Submit for Review
  - Review time: typically 1–3 days (can be longer for first submission)
  - Have answers ready for: does app use encryption? (yes — HTTPS/Supabase), does app use IAP? (yes)

- [x] **Android: publish to Google Play**
  - Internal → Closed Testing → Open Testing → Production (progressive rollout) (🚧 sended to Closed Testing and waiting review results)
  - First review: 3–7 days typically
  - Can do staged rollout: start at 10–20%, monitor crash rate, expand

---

## PART 3: Ongoing Release Management

### Every New Release

- [ ] **Version bump**
  - `app.json` > `version` (user-facing, e.g. 1.1.0)
  - `app.json` > `ios.buildNumber` (increment every submission, e.g. "2")
  - `app.json` > `android.versionCode` (increment by 1 every submission, e.g. 2)
  - ⚠️ Never reuse a build number — Apple and Google reject duplicate build numbers

- [ ] **What's New / Release Notes**
  - App Store Connect: "What's New in This Version" (4000 chars)
  - Google Play: Release notes per track (500 chars)
  - Write user-facing language — not technical jargon

- [ ] **Build → TestFlight → Staging review → Production**

### Hotfix Release Process

1. Identify the bug and severity
2. Dev team implements fix in a new branch
3. Bump `buildNumber`/`versionCode`
4. EAS build → TestFlight/Internal track → verify fix
5. Expedited App Store review: request via Resolution Center if user-facing critical bug
6. Google Play: rollout can be paused and new build deployed quickly

### Monitoring (Post-Launch)

- [ ] **App Store Connect — Crashes & Analytics**
  - Check TestFlight crash logs before production
  - Monitor crash rate in App Store Connect > Analytics
  - Target: <1% crash-free sessions

- [ ] **Google Play Console — Android Vitals**
  - Monitor ANR rate, crash rate
  - Google may limit app visibility if vitals are poor

- [ ] **Subscription metrics**
  - App Store Connect > Sales and Trends > Subscriptions
  - Google Play Console > Monetization > Subscriptions
  - Track: new subscribers, churn rate, trial conversions

---

## PART 4: Epic 7 — Bank Integration Specific Tasks

_(Complete when Epic 7 is ready for submission)_

- [ ] **App Store — "Financial Services" category review**
  - Open Banking / bank data access may require additional review
  - Prepare explanation of PSD2 compliance and data handling

- [ ] **Update privacy policy** — add bank data / Open Banking section
  - Aggregator name, what data is accessed, retention period, how to revoke consent

- [ ] **App Store Connect — update privacy nutrition labels**
  - Add: Financial Info > Bank account > Used for app functionality

- [ ] **Google Play — data safety update**
  - Add financial data type

- [ ] **Aggregator compliance confirmation**
  - Get written confirmation from Tink/Salt Edge that their SDK is approved for App Store / Play Store use
  - Some aggregators have specific App Store review guidance

---

## Reference Links

| Resource                    | URL                                                                      |
| --------------------------- | ------------------------------------------------------------------------ |
| App Store Connect           | https://appstoreconnect.apple.com                                        |
| Apple Developer             | https://developer.apple.com                                              |
| Google Play Console         | https://play.google.com/console                                          |
| EAS Build docs              | https://docs.expo.dev/build/introduction/                                |
| EAS Submit docs             | https://docs.expo.dev/submit/introduction/                               |
| App Store Review Guidelines | https://developer.apple.com/app-store/review/guidelines/                 |
| Google Play Policy          | https://play.google.com/about/developer-content-policy/                  |
| App Store IAP Guidelines    | https://developer.apple.com/app-store/review/guidelines/#in-app-purchase |

---

_This is a living document. Update as tasks are completed and new release cycles begin._
