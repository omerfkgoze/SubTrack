---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
inputDocuments: []
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: mobile_app_crossplatform
  domain: fintech_lite
  complexity: medium-high
  projectContext: greenfield
  detectionMethod: bank_integration_manual
  coreFeatures:
    - subscription_tracking
    - smart_reminders
    - bank_integration
personas:
  - name: Elif
    age: 28
    role: Young Professional
    techLevel: intermediate
    platform: iOS
  - name: Mehmet
    age: 47
    role: Family Father
    techLevel: intermediate
    platform: Android
---

# Product Requirements Document - SubTrack

**Author:** GOZE
**Date:** 2026-01-26

## Executive Summary

### The Problem

The average consumer today manages 12+ active subscriptions, spending approximately €273/month—often 3x more than they believe. This "subscription hell" phenomenon leads to:

- End-of-month billing surprises
- Forgotten trials converting to paid subscriptions
- Difficulty tracking family subscription usage
- Money leaking to unused services

### The Solution

**SubTrack** is a cross-platform mobile application (iOS & Android) that empowers users to take control of their subscriptions through manual tracking and smart reminders. Users can see all their subscriptions in one place, receive timely renewal notifications, and make conscious decisions about their digital spending.

### Key Differentiators

| Aspect             | SubTrack Approach                                  |
| ------------------ | -------------------------------------------------- |
| **Focus**          | Tracking + Reminders (not savings recommendations) |
| **Entry Method**   | Manual entry (MVP) + Bank integration (Phase 2)    |
| **Target Market**  | Europe (GDPR/PSD2 compliant)                       |
| **Business Model** | Freemium (5 free subs → €2.99/month premium)       |

### Success Metrics

| Timeframe | Target                          |
| --------- | ------------------------------- |
| 3 months  | 400 users, 50 paid subscribers  |
| 12 months | €2,000 MRR, 15% conversion rate |

### Technical Overview

- **Platform:** React Native (iOS 14+ / Android 10+)
- **Backend:** Supabase or Firebase
- **Key Features:** Biometric auth, push notifications, calendar integration
- **Phase 2:** PSD2/Open Banking integration (Tink, Salt Edge)

### Development Timeline

| Phase       | Duration   | Scope                                            |
| ----------- | ---------- | ------------------------------------------------ |
| **MVP**     | 3-4 months | Manual entry, reminders, dashboard, premium tier |
| **Phase 2** | 2-3 months | Bank integration, auto-detection                 |
| **Phase 3** | 6+ months  | Smart suggestions, family sharing                |

### Document Scope

This PRD contains:

- 49 Functional Requirements (37 MVP + 12 Phase 2)
- 40 Non-Functional Requirements
- 3 User Journeys with detailed personas
- Domain-specific compliance requirements (GDPR, PSD2)
- Complete mobile app technical specifications

## Success Criteria

### User Success

| Criteria               | Definition                                                         | Measurement                                                      |
| ---------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **AHA Moment**         | User sees all subscriptions in one unified view for the first time | Time to first "all subscriptions" screen < 2 minutes from signup |
| **Value Realization**  | No surprises when checking bank statement at month end             | User-reported confidence score ≥ 4/5                             |
| **Trial Protection**   | User can add trial subscriptions and receive timely reminders      | 100% of trial reminders delivered before expiry                  |
| **Healthy Engagement** | Weekly app usage indicates ongoing value                           | Weekly Active Users (WAU) rate ≥ 60% of MAU                      |

### Business Success

| Timeframe    | Metric                    | Target |
| ------------ | ------------------------- | ------ |
| **3-Month**  | Total Users               | 400    |
| **3-Month**  | Paid Subscribers          | 50     |
| **3-Month**  | Conversion Rate           | 12.5%  |
| **12-Month** | Monthly Recurring Revenue | €2,000 |
| **Ongoing**  | Free-to-Paid Conversion   | ≥ 15%  |

**Revenue Model:** Freemium

- Free tier: Basic subscription tracking, limited reminders
- Premium tier: Unlimited subscriptions, advanced reminders, analytics

### Technical Success

| Metric                             | Target                          | Priority |
| ---------------------------------- | ------------------------------- | -------- |
| App Load Time                      | ≤ 2 seconds                     | P0       |
| Notification Delivery Rate         | ≥ 99%                           | P0       |
| Bank Integration Success (Phase 2) | ≥ 80% of major banks            | P1       |
| Data Encryption                    | AES-256 at rest, TLS in transit | P0       |
| GDPR Compliance                    | Full compliance                 | P0       |

### Measurable Outcomes

- **User Acquisition:** 400 users within 3 months of launch
- **Retention:** 60% of users return weekly
- **Conversion:** 15% free-to-paid conversion rate
- **Revenue:** €2,000 MRR by month 12
- **NPS:** ≥ 40 (indicating strong word-of-mouth potential)

## Product Scope

### MVP - Minimum Viable Product

**Core Features (Must Have):**

- ✅ Manual subscription entry (name, price, billing cycle, renewal date)
- ✅ Unified subscription list view with total monthly/yearly cost
- ✅ Renewal reminder notifications (customizable: 1 day, 3 days, 7 days before)
- ✅ Trial period tracking with expiry reminders
- ✅ Monthly spending summary dashboard
- ✅ Push notifications (iOS & Android)
- ✅ Basic categorization (Entertainment, Productivity, Storage, etc.)

**Platform:** Cross-platform (iOS + Android)

**Out of MVP Scope:**

- ❌ Bank/credit card integration (Phase 2)
- ❌ Automatic subscription detection
- ❌ Savings recommendations

### Phase 2 - Bank Integration (CRITICAL)

**🚨 MUST HAVE - Non-negotiable for Phase 2:**

- 🏦 Bank account connection via Open Banking APIs (PSD2)
- 🔄 Automatic subscription detection from transactions
- 📊 Real spending vs. tracked subscriptions reconciliation
- 🔐 Secure credential handling via aggregator (Plaid/Tink/Salt Edge)

### Growth Features (Post-Phase 2)

- 💡 Smart savings suggestions ("You haven't used X in 3 months")
- 📁 Advanced category analytics with trends
- 👨‍👩‍👧‍👦 Family/group subscription sharing
- 📧 Email receipt scanning for auto-detection
- 🔔 Price increase alerts

### Vision (Future)

- 🚀 One-click cancel assistant (guided cancellation flows)
- 💰 Alternative service recommendations ("Save €5/month with Y instead of X")
- 📈 Price increase tracking and alerts
- 🤖 Negotiation bot (automated price reduction requests)
- 🌍 Multi-currency support for travelers

## User Journeys

### Personas

#### Elif (28) - Young Professional

- **Situation:** Works at a digital agency, good salary but doesn't know where it goes
- **Subscriptions:** Netflix, Spotify, iCloud, Canva, Adobe, gym, 2 streaming platforms
- **Pain Point:** End-of-month "did I spend this much?" shock
- **Goal:** Take control, identify unnecessary subscriptions
- **Technical Level:** iPhone user, comfortable with apps

#### Mehmet (47) - Family Father

- **Situation:** Father of 2, manages family's digital subscriptions
- **Subscriptions:** Disney+, Netflix, YouTube Premium, Spotify Family, iCloud, Google One
- **Pain Point:** Can't track trials started by kids, billing surprises
- **Goal:** Control family budget
- **Technical Level:** Android user, prefers simple apps

---

### Journey 1: Elif's Awakening (Happy Path)

**Opening Scene:**
Elif came home tired on a Friday evening. She opened her banking app and looked at her end-of-month statement. "€582?!" Last month it was around €450. Where did this money go?

She knows Spotify €14.99, Netflix €17.99, iCloud €2.99... But "Canva Pro €12.99"? She's still paying for Canva she hasn't used in 3 months. And "Headspace €9.99"? She downloaded that for a trial 6 months ago!

_"I need a list"_ she thought.

**Rising Action:**

- Downloaded the app from App Store
- Signed up with email (2 minutes)
- Added first subscription: Netflix, €17.99, monthly, 15th of each month
- Added 8 subscriptions she remembered
- Total: €127/month - _"Not bad..."_
- 3 days later: Checked bank statement, found 4 more subscriptions
- **New total: €189/month**
- _"€189 PER MONTH?!"_

**Climax:**
Elif looked at the dashboard showing €189/month = €2,268/year. She immediately cancelled Canva Pro, Headspace, and LinkedIn Premium.

**Savings: €47/month = €564/year**

**Resolution:**
3 weeks later, Elif opens the app every Sunday evening. When "renewal approaching" notification comes, she makes a conscious decision: continue or cancel? No surprises at month end. Control is hers.

She posted on Instagram: _"This app saved me €47/month 💸"_

---

### Journey 2: Mehmet's Billing Shock (Edge Case)

**Opening Scene:**
Mehmet opened his credit card bill on Saturday morning. "€890 this month? Last month was €780!"

He examined the list: "Xbox Game Pass Ultimate - €14.99"

_"What is this?!"_

He called his son Efe. "Dad, it was a trial, I thought it was free..."

The trial ended 3 days ago, automatic payment started.

**Rising Action:**

- Mehmet downloaded the app
- Problem: Too many subscriptions and can't remember them all
- Added first 5, then gave up
- 2 days later: Got notification "Missing subscriptions? Try comparing with your bank statement."
- Opened statement, checked against app
- Added 7 more subscriptions
- **Total: €156/month**
- Found another trial his son started: "Crunchyroll Premium"
- Expiry date: 3 days away!
- Set reminder: "Notify 1 day before"

**Climax:**
Notification arrived: _"⚠️ Tomorrow: Crunchyroll Premium trial expires (€7.99/month)"_

Mehmet asked Efe: "Do you use Crunchyroll?"
"No dad, I only looked at it once."

**Cancelled immediately.**

Mehmet set a rule: _"No trial starts without being added to this app."_

**Resolution:**
1 month later, Mehmet's system is in place: All family subscriptions in the app, notifications active for every trial start, no surprise bills at month end.

---

### Journey 3: Elif's Notification Failure (Error Recovery)

**Problem Scenario:**
Elif changed her phone. Installed the app on the new phone but **forgot to allow notifications.**

Adobe Creative Cloud renewal date came and went. €54.99 was charged.

_"I didn't get a reminder!"_

**Recovery Flow:**
She opened the app. Red banner:

```
⚠️ Notifications are off!
Reminders can't reach you.
[Turn On Now]
```

Elif turned on notifications. Looked at History tab: "Missed reminders (1)" - Adobe Creative Cloud, renewed 3 days ago.

_"At least now I know. I'll cancel next month."_

Set reminder for next month's renewal date.

**Lesson Learned:**
The app clearly showed that notifications are critical. Elif never made this mistake again.

---

### Journey Requirements Summary

| Journey Moment                | Required Capability                    |
| ----------------------------- | -------------------------------------- |
| First subscription entry      | Easy onboarding, quick input form      |
| See total spending            | Dashboard, monthly/yearly summary      |
| Category analysis             | Categorization system                  |
| "AHA" moment                  | Visual impact, shock value display     |
| Trial tracking                | Trial period field, countdown timer    |
| Renewal reminder              | Push notification, customizable timing |
| Missed notification awareness | Notification status check, history log |
| Family sharing                | (Growth) Multi-user support            |

### Capability to Feature Mapping

| Capability               | MVP Feature                               | Priority |
| ------------------------ | ----------------------------------------- | -------- |
| Quick subscription entry | Add subscription form with smart defaults | P0       |
| Unified view             | Subscription list with total cost         | P0       |
| Visual spending summary  | Dashboard with charts                     | P0       |
| Category organization    | Preset categories + custom                | P1       |
| Renewal alerts           | Push notifications                        | P0       |
| Trial protection         | Trial mode with countdown                 | P0       |
| Notification health      | Status indicator + history                | P1       |
| Data backup              | Cloud sync                                | P1       |

## Domain-Specific Requirements

**Domain:** Fintech-Lite (Subscription Tracking)
**Target Market:** Europe (PSD2 region)
**Compliance Level:** Basic

### Compliance & Regulatory

| Requirement                | Phase   | Status      |
| -------------------------- | ------- | ----------- |
| GDPR Basic Compliance      | MVP     | ✅ Required |
| Privacy Policy             | MVP     | ✅ Required |
| User Consent Mechanism     | MVP     | ✅ Required |
| Right to Deletion          | MVP     | ✅ Required |
| Data Export (Portability)  | MVP     | ✅ Required |
| PSD2/Open Banking          | Phase 2 | ✅ Required |
| SCA (Strong Customer Auth) | Phase 2 | ✅ Required |

### Technical Constraints

**MVP:**

- AES-256 encryption (at rest)
- TLS 1.3 (in transit)
- Secure session management (JWT with expiry)
- Password policy (minimum 8 characters, complexity rules)
- Secure password storage (bcrypt/Argon2)

**Phase 2:**

- OAuth 2.0 / OpenID Connect flows
- PSD2-compliant aggregator integration
- Token refresh mechanism
- Bank connection status monitoring
- Consent management for bank access

### Integration Requirements

| Integration        | Phase   | Provider Options               | Notes                          |
| ------------------ | ------- | ------------------------------ | ------------------------------ |
| Open Banking API   | Phase 2 | Tink, Salt Edge, Nordigen      | Europe-focused, PSD2 compliant |
| Push Notifications | MVP     | Firebase (Android), APNs (iOS) | Cross-platform support         |
| Email Service      | MVP     | SendGrid, AWS SES              | Transactional emails           |
| Analytics          | MVP     | Mixpanel, Amplitude            | Optional, privacy-friendly     |
| Cloud Storage      | MVP     | Firebase, Supabase             | User data sync                 |

### Risk Mitigations

| Risk                 | Impact | Mitigation                                                   | Priority |
| -------------------- | ------ | ------------------------------------------------------------ | -------- |
| Data breach          | High   | End-to-end encryption, security audits, penetration testing  | P0       |
| Notification failure | High   | Multi-channel fallback (push + email), delivery tracking     | P0       |
| Bank API downtime    | Medium | Manual entry fallback, user notification, retry logic        | P1       |
| Account takeover     | High   | Optional 2FA, suspicious activity alerts, session management | P1       |
| GDPR violation       | High   | Privacy-by-design, data minimization, clear consent flows    | P0       |

### Data Handling Policies

| Policy             | Implementation                                 |
| ------------------ | ---------------------------------------------- |
| Data Minimization  | Collect only essential subscription data       |
| Purpose Limitation | Use data only for subscription tracking        |
| Storage Limitation | Delete data within 30 days of account deletion |
| User Access        | Provide data viewing and export functionality  |
| Consent Withdrawal | Allow users to revoke consent and delete data  |

## Mobile App Specific Requirements

### Project-Type Overview

| Property         | Value                              |
| ---------------- | ---------------------------------- |
| **Framework**    | React Native                       |
| **Platforms**    | iOS 14+ / Android 10+              |
| **Architecture** | Cross-platform with native modules |
| **Connectivity** | Online required (no offline mode)  |

### Platform Requirements

**iOS:**

| Requirement | Minimum   | Recommended |
| ----------- | --------- | ----------- |
| iOS Version | 14.0      | 15.0+       |
| Device      | iPhone 8+ | iPhone 12+  |
| Storage     | 50 MB     | 100 MB      |

**Android:**

| Requirement     | Minimum     | Recommended  |
| --------------- | ----------- | ------------ |
| Android Version | 10 (API 29) | 12+ (API 31) |
| RAM             | 2 GB        | 4 GB+        |
| Storage         | 50 MB       | 100 MB       |

### Device Permissions

| Permission        | Platform      | Purpose                                   | Required   |
| ----------------- | ------------- | ----------------------------------------- | ---------- |
| **Notifications** | iOS & Android | Renewal reminders                         | Critical   |
| **Biometric**     | iOS & Android | Secure app access (Face ID / Fingerprint) | Required   |
| **Calendar**      | iOS & Android | Add renewal dates to device calendar      | Required   |
| **Internet**      | iOS & Android | Data sync, authentication                 | Required   |
| **Camera**        | iOS & Android | Future: Receipt scanning                  | Out of MVP |

**iOS Permission Strings:**

- `NSFaceIDUsageDescription` - "Secure login with Face ID"
- `NSCalendarsUsageDescription` - "Add reminders to your calendar"

**Android Permissions:**

- `android.permission.USE_BIOMETRIC`
- `android.permission.READ_CALENDAR`
- `android.permission.WRITE_CALENDAR`
- `android.permission.POST_NOTIFICATIONS` (Android 13+)

### Offline Mode

| Aspect                   | Decision                                          |
| ------------------------ | ------------------------------------------------- |
| **Offline Support**      | Not supported in MVP                              |
| **Rationale**            | Simplifies architecture, reduces development time |
| **User Experience**      | Show "No internet connection" message with retry  |
| **Future Consideration** | Phase 2+ can add local caching if needed          |

### Push Notification Strategy

| Notification Type        | Trigger                  | Timing Options             | Priority |
| ------------------------ | ------------------------ | -------------------------- | -------- |
| **Renewal Reminder**     | X days before renewal    | 1, 3, 7 days (user choice) | High     |
| **Trial Expiry**         | X days before trial ends | 1, 3 days                  | Critical |
| **Payment Confirmation** | After renewal detected   | Immediate                  | Medium   |
| **Weekly Summary**       | Scheduled                | User-selected day/time     | Low      |
| **App Health**           | Notifications disabled   | On app open                | Critical |

**Technical Implementation:**

- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification Service (APNs) for iOS
- Local notifications for time-based reminders
- Background fetch for notification scheduling

### Calendar Integration

| Feature                | Implementation                   |
| ---------------------- | -------------------------------- |
| **Add to Calendar**    | Native calendar API integration  |
| **Event Type**         | All-day event or timed reminder  |
| **Recurrence**         | Match subscription billing cycle |
| **Edit/Delete**        | Sync with subscription changes   |
| **Multiple Calendars** | Let user choose target calendar  |

### Store Compliance

**App Store (iOS):**

| Requirement                | Status                           |
| -------------------------- | -------------------------------- |
| App Review Guidelines      | Compliant                        |
| Privacy Nutrition Labels   | Required                         |
| In-App Purchases (Premium) | Use StoreKit 2                   |
| Data Collection Disclosure | Required                         |
| Sign in with Apple         | Required if social login offered |

**Play Store (Android):**

| Requirement             | Status                  |
| ----------------------- | ----------------------- |
| Target API Level        | API 34 (Android 14)     |
| Data Safety Section     | Required                |
| In-App Billing          | Use Google Play Billing |
| User Data Policy        | Compliant               |
| Permissions Declaration | Required                |

### Technical Architecture

**React Native Stack:**

| Layer              | Technology                       |
| ------------------ | -------------------------------- |
| Framework          | React Native 0.73+               |
| Navigation         | React Navigation 6               |
| State Management   | Zustand or Redux Toolkit         |
| Storage            | AsyncStorage + React Query       |
| Push Notifications | @react-native-firebase/messaging |
| Biometric Auth     | react-native-biometrics          |
| Calendar           | react-native-calendar-events     |
| UI Components      | React Native Paper or NativeBase |
| Backend            | Supabase or Firebase             |

**Key Libraries:**

| Purpose             | Library                          |
| ------------------- | -------------------------------- |
| Push Notifications  | @react-native-firebase/messaging |
| Local Notifications | notifee                          |
| Biometric Auth      | react-native-biometrics          |
| Calendar            | react-native-calendar-events     |
| Secure Storage      | react-native-keychain            |
| In-App Purchases    | react-native-iap                 |

### Performance Targets

| Metric                | Target           |
| --------------------- | ---------------- |
| Cold Start            | < 2 seconds      |
| Screen Transitions    | < 300ms          |
| API Response Handling | < 1 second       |
| Notification Delivery | 99%+ reliability |

### Security Implementation

| Aspect             | Implementation                             |
| ------------------ | ------------------------------------------ |
| App Access         | Biometric authentication                   |
| Token Storage      | Secure Keychain (iOS) / Keystore (Android) |
| API Security       | Certificate pinning                        |
| Logging            | No sensitive data in logs                  |
| Session Management | Auto-logout on inactivity                  |

### Testing Strategy

| Test Type    | Tool                                |
| ------------ | ----------------------------------- |
| Unit Tests   | Jest + React Native Testing Library |
| E2E Tests    | Detox                               |
| iOS Beta     | TestFlight                          |
| Android Beta | Internal Testing Track              |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP

Core Hypothesis: "Users will manually enter their subscriptions and save money through timely reminders."

**Validation Metrics:**

- 400 users within 3 months
- 15% free-to-paid conversion
- 60% weekly active user rate

### Resource Requirements

| Resource       | Value                            |
| -------------- | -------------------------------- |
| **Team Size**  | Solo Developer                   |
| **Timeline**   | 3-4 months                       |
| **Tech Stack** | React Native + Supabase/Firebase |
| **Budget**     | Bootstrap (minimal)              |

### MVP Feature Set (Phase 1)

**Timeline:** 3-4 months

**Core User Journeys Supported:**

- Elif's Awakening (Happy Path)
- Mehmet's Billing Shock (Edge Case)
- Notification Failure Recovery

**Must-Have Capabilities:**

| #   | Feature                                 | Effort | Priority |
| --- | --------------------------------------- | ------ | -------- |
| 1   | User authentication (Email + Biometric) | Medium | P0       |
| 2   | Subscription CRUD (Add/Edit/Delete)     | Medium | P0       |
| 3   | Subscription list view with totals      | Low    | P0       |
| 4   | Dashboard with spending summary         | Medium | P0       |
| 5   | Push notification system                | Medium | P0       |
| 6   | Renewal reminder scheduling             | Medium | P0       |
| 7   | Trial period tracking                   | Low    | P0       |
| 8   | Basic categories (preset)               | Low    | P1       |
| 9   | Calendar integration                    | Medium | P1       |
| 10  | Notification health indicator           | Low    | P1       |
| 11  | Data export (JSON/CSV)                  | Low    | P1       |
| 12  | In-app purchase (Premium)               | Medium | P1       |

**Freemium Model:**

| Tier        | Limits                                      | Price                      |
| ----------- | ------------------------------------------- | -------------------------- |
| **Free**    | 5 subscriptions, basic reminders            | €0                         |
| **Premium** | Unlimited, advanced features, calendar sync | €2.99/month or €24.99/year |

### Phase 2 - Bank Integration (CRITICAL)

**Timeline:** Immediately after MVP success (2-3 months)
**Trigger:** 400+ users OR 15%+ conversion rate

**Features:**

| Feature                                      | Effort | Notes                 |
| -------------------------------------------- | ------ | --------------------- |
| PSD2 aggregator integration (Tink/Salt Edge) | High   | 3rd party dependency  |
| Bank account connection flow                 | High   | OAuth2 + consent      |
| Automatic subscription detection             | High   | Transaction parsing   |
| Manual vs. detected reconciliation           | Medium | UI/UX critical        |
| Multi-bank support                           | Medium | At least 80% coverage |

**Phase 2 Success Criteria:**

- 80% bank connection success rate
- Automatic detection accuracy > 90%
- User satisfaction increase

### Phase 3 - Growth Features

**Timeline:** Post Phase 2 (6+ months)

| Feature                        | Value  | Effort |
| ------------------------------ | ------ | ------ |
| Smart savings suggestions      | High   | Medium |
| Category analytics with trends | Medium | Low    |
| Family/group sharing           | High   | High   |
| Email receipt scanning         | Medium | High   |
| Price increase alerts          | Medium | Low    |

### Phase 4 - Vision (Future)

**Timeline:** 12+ months

| Feature                             | Value     | Complexity |
| ----------------------------------- | --------- | ---------- |
| One-click cancel assistant          | Very High | Very High  |
| Alternative service recommendations | High      | High       |
| Price negotiation bot               | Medium    | Very High  |
| Multi-currency support              | Medium    | Medium     |

### Risk Mitigation Strategy

**Technical Risks:**

| Risk                          | Mitigation                                             |
| ----------------------------- | ------------------------------------------------------ |
| Solo developer bandwidth      | Strict MVP scope, no feature creep                     |
| Push notification reliability | Use both FCM + local notifications                     |
| React Native performance      | Profile early, use native modules if needed            |
| Store rejection               | Follow guidelines strictly, test with TestFlight first |

**Market Risks:**

| Risk                 | Mitigation                                     |
| -------------------- | ---------------------------------------------- |
| Low user acquisition | Focus on ASO, viral sharing features           |
| Manual entry fatigue | Clear value prop, Phase 2 bank integration     |
| Low conversion rate  | A/B test pricing, improve premium value prop   |
| Competition          | Focus on Europe/Turkey, localization advantage |

**Resource Risks:**

| Risk               | Mitigation                           |
| ------------------ | ------------------------------------ |
| Burnout (solo dev) | Realistic timeline, scope discipline |
| Budget overrun     | Use free tiers (Supabase, Firebase)  |
| Phase 2 complexity | Delay if MVP doesn't validate        |

### Development Milestones

**Month 1: Foundation**

- Project setup (React Native, backend)
- Authentication system
- Basic subscription CRUD
- Local data storage

**Month 2: Core Features**

- Dashboard & visualizations
- Push notification system
- Reminder scheduling
- Trial period tracking

**Month 3: Polish & Premium**

- Biometric authentication
- Calendar integration
- In-app purchases
- Bug fixes & optimization

**Month 4: Launch Prep**

- Beta testing (TestFlight + Internal)
- Store listing optimization
- Privacy policy & legal
- Launch

### Go/No-Go Criteria for Phase 2

| Metric           | Threshold | Action               |
| ---------------- | --------- | -------------------- |
| Users            | ≥ 400     | Proceed to Phase 2   |
| Conversion       | ≥ 10%     | Proceed to Phase 2   |
| WAU/MAU          | ≥ 50%     | Proceed to Phase 2   |
| NPS              | ≥ 30      | Proceed to Phase 2   |
| Any metric fails | -         | Pivot or iterate MVP |

## Functional Requirements

### User Management

| ID  | Requirement                                                            | Phase |
| --- | ---------------------------------------------------------------------- | ----- |
| FR1 | User can create an account using email and password                    | MVP   |
| FR2 | User can log in to their account with email and password               | MVP   |
| FR3 | User can log in using biometric authentication (Face ID / Fingerprint) | MVP   |
| FR4 | User can reset their password via email                                | MVP   |
| FR5 | User can log out of their account                                      | MVP   |
| FR6 | User can delete their account and all associated data                  | MVP   |
| FR7 | User can enable/disable biometric login                                | MVP   |

### Subscription Management

| ID   | Requirement                                                                       | Phase |
| ---- | --------------------------------------------------------------------------------- | ----- |
| FR8  | User can add a new subscription with name, price, billing cycle, and renewal date | MVP   |
| FR9  | User can edit an existing subscription's details                                  | MVP   |
| FR10 | User can delete a subscription                                                    | MVP   |
| FR11 | User can view a list of all their subscriptions                                   | MVP   |
| FR12 | User can mark a subscription as a trial with expiry date                          | MVP   |
| FR13 | User can assign a category to a subscription                                      | MVP   |
| FR14 | User can mark a subscription as active or cancelled                               | MVP   |
| FR15 | User can view subscription details including next renewal date                    | MVP   |

### Dashboard & Analytics

| ID   | Requirement                                          | Phase |
| ---- | ---------------------------------------------------- | ----- |
| FR16 | User can view total monthly subscription cost        | MVP   |
| FR17 | User can view total yearly subscription cost         | MVP   |
| FR18 | User can view subscription breakdown by category     | MVP   |
| FR19 | User can see a visual summary of their spending      | MVP   |
| FR20 | User can view upcoming renewals for the next 30 days | MVP   |

### Notifications & Reminders

| ID   | Requirement                                                               | Phase |
| ---- | ------------------------------------------------------------------------- | ----- |
| FR21 | User can receive push notifications for upcoming subscription renewals    | MVP   |
| FR22 | User can customize reminder timing (1 day, 3 days, 7 days before renewal) | MVP   |
| FR23 | User can receive notifications for trial expiry dates                     | MVP   |
| FR24 | User can enable/disable notifications per subscription                    | MVP   |
| FR25 | User can view notification history                                        | MVP   |
| FR26 | System displays warning when notifications are disabled on device         | MVP   |

### Calendar Integration

| ID   | Requirement                                                  | Phase |
| ---- | ------------------------------------------------------------ | ----- |
| FR27 | User can add subscription renewal dates to device calendar   | MVP   |
| FR28 | User can select which calendar to add events to              | MVP   |
| FR29 | User can remove calendar events when subscription is deleted | MVP   |

### Data Management

| ID   | Requirement                                         | Phase |
| ---- | --------------------------------------------------- | ----- |
| FR30 | User can export their subscription data (JSON/CSV)  | MVP   |
| FR31 | User data is automatically synced to cloud storage  | MVP   |
| FR32 | User can view and manage their stored personal data | MVP   |

### Premium Features

| ID   | Requirement                                                | Phase |
| ---- | ---------------------------------------------------------- | ----- |
| FR33 | User can view premium feature benefits                     | MVP   |
| FR34 | User can purchase premium subscription via in-app purchase | MVP   |
| FR35 | User can restore previous purchases                        | MVP   |
| FR36 | Free tier user is limited to 5 subscriptions               | MVP   |
| FR37 | Premium user has unlimited subscriptions                   | MVP   |

### Bank Integration (Phase 2)

| ID   | Requirement                                                             | Phase   |
| ---- | ----------------------------------------------------------------------- | ------- |
| FR38 | User can connect their bank account via Open Banking (PSD2)             | Phase 2 |
| FR39 | User can view list of supported banks                                   | Phase 2 |
| FR40 | User can authorize bank data access through OAuth flow                  | Phase 2 |
| FR41 | User can disconnect a linked bank account                               | Phase 2 |
| FR42 | System can automatically detect recurring subscription transactions     | Phase 2 |
| FR43 | User can review auto-detected subscriptions before adding               | Phase 2 |
| FR44 | User can match detected transactions with existing manual subscriptions | Phase 2 |
| FR45 | User can ignore/dismiss incorrectly detected subscriptions              | Phase 2 |
| FR46 | User can view bank connection status (connected/expired/error)          | Phase 2 |
| FR47 | User can refresh bank data manually                                     | Phase 2 |
| FR48 | System notifies user when bank connection expires or fails              | Phase 2 |
| FR49 | User can view discrepancy between tracked vs. actual spending           | Phase 2 |

### Functional Requirements Summary

| Capability Area           | FR Count | Phase   |
| ------------------------- | -------- | ------- |
| User Management           | 7        | MVP     |
| Subscription Management   | 8        | MVP     |
| Dashboard & Analytics     | 5        | MVP     |
| Notifications & Reminders | 6        | MVP     |
| Calendar Integration      | 3        | MVP     |
| Data Management           | 3        | MVP     |
| Premium Features          | 5        | MVP     |
| Bank Integration          | 12       | Phase 2 |
| **TOTAL**                 | **49**   |         |

## Non-Functional Requirements

### Performance

| ID   | Requirement                          | Target        | Priority |
| ---- | ------------------------------------ | ------------- | -------- |
| NFR1 | App cold start time                  | ≤ 2 seconds   | P0       |
| NFR2 | Screen transition time               | ≤ 300ms       | P1       |
| NFR3 | API response time (95th percentile)  | ≤ 1 second    | P0       |
| NFR4 | Dashboard data load time             | ≤ 1.5 seconds | P1       |
| NFR5 | Subscription list scroll performance | 60 FPS        | P1       |
| NFR6 | Search/filter response time          | ≤ 200ms       | P2       |

### Security

| ID    | Requirement                   | Target                    | Priority |
| ----- | ----------------------------- | ------------------------- | -------- |
| NFR7  | Data encryption at rest       | AES-256                   | P0       |
| NFR8  | Data encryption in transit    | TLS 1.3                   | P0       |
| NFR9  | Password hashing              | bcrypt or Argon2          | P0       |
| NFR10 | Session timeout on inactivity | 30 minutes                | P1       |
| NFR11 | Failed login lockout          | 5 attempts, 15 min lock   | P1       |
| NFR12 | Biometric data handling       | Never stored on server    | P0       |
| NFR13 | API authentication            | JWT with expiry           | P0       |
| NFR14 | Certificate pinning           | Enabled for production    | P1       |
| NFR15 | No sensitive data in logs     | Enforced                  | P0       |
| NFR16 | GDPR data deletion            | Within 30 days of request | P0       |

**Phase 2 Security:**

| ID    | Requirement             | Target                      | Priority |
| ----- | ----------------------- | --------------------------- | -------- |
| NFR17 | Bank tokens storage     | Encrypted, never logged     | P0       |
| NFR18 | PSD2 SCA compliance     | Full compliance             | P0       |
| NFR19 | Bank connection consent | Explicit user authorization | P0       |

### Reliability

| ID    | Requirement                     | Target                  | Priority |
| ----- | ------------------------------- | ----------------------- | -------- |
| NFR20 | Push notification delivery rate | ≥ 99%                   | P0       |
| NFR21 | System uptime                   | ≥ 99.5%                 | P1       |
| NFR22 | Data sync success rate          | ≥ 99.9%                 | P0       |
| NFR23 | Zero data loss on crash         | Guaranteed              | P0       |
| NFR24 | Notification retry on failure   | 3 attempts with backoff | P1       |

### Scalability

| ID    | Requirement                | Target                                | Priority |
| ----- | -------------------------- | ------------------------------------- | -------- |
| NFR25 | Initial user capacity      | 1,000 concurrent users                | P1       |
| NFR26 | Growth capacity            | 10x with <10% performance degradation | P2       |
| NFR27 | Database query performance | Consistent up to 100K subscriptions   | P2       |
| NFR28 | Background job processing  | Handle 10K notifications/hour         | P1       |

### Accessibility

| ID    | Requirement               | Target                              | Priority |
| ----- | ------------------------- | ----------------------------------- | -------- |
| NFR29 | Screen reader support     | VoiceOver (iOS), TalkBack (Android) | P1       |
| NFR30 | Minimum touch target size | 44x44 points                        | P1       |
| NFR31 | Color contrast ratio      | ≥ 4.5:1 (WCAG AA)                   | P1       |
| NFR32 | Font scaling support      | Up to 200% system font              | P2       |
| NFR33 | Reduced motion support    | Respect system preference           | P2       |

### Integration

| ID    | Requirement               | Target                   | Priority |
| ----- | ------------------------- | ------------------------ | -------- |
| NFR34 | Push notification latency | ≤ 5 seconds from trigger | P0       |
| NFR35 | Calendar sync reliability | 100% for user-initiated  | P1       |
| NFR36 | Backend API availability  | ≥ 99.5%                  | P1       |

**Phase 2 Integration:**

| ID    | Requirement                              | Target                   | Priority |
| ----- | ---------------------------------------- | ------------------------ | -------- |
| NFR37 | Bank API connection success              | ≥ 80% of supported banks | P0       |
| NFR38 | Transaction sync frequency               | Daily or user-triggered  | P1       |
| NFR39 | Bank token refresh                       | Automatic before expiry  | P0       |
| NFR40 | Graceful degradation on bank API failure | Fallback to manual entry | P1       |

### Non-Functional Requirements Summary

| Category      | Count  | P0     | P1     | P2    |
| ------------- | ------ | ------ | ------ | ----- |
| Performance   | 6      | 2      | 3      | 1     |
| Security      | 13     | 9      | 4      | 0     |
| Reliability   | 5      | 3      | 2      | 0     |
| Scalability   | 4      | 0      | 2      | 2     |
| Accessibility | 5      | 0      | 3      | 2     |
| Integration   | 7      | 3      | 4      | 0     |
| **TOTAL**     | **40** | **17** | **18** | **5** |
