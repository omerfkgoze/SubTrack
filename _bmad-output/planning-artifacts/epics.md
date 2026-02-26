---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
workflowStatus: complete
completedAt: '2026-02-10'
inputDocuments:
  - path: '_bmad-output/planning-artifacts/prd.md'
    type: prd
    loaded: true
  - path: '_bmad-output/planning-artifacts/architecture.md'
    type: architecture
    loaded: true
  - path: '_bmad-output/planning-artifacts/ux-design-specification.md'
    type: ux-design
    loaded: true
---

# SubTrack - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for SubTrack, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**User Management (MVP):**
FR1: User can create an account using email and password
FR2: User can log in to their account with email and password
FR3: User can log in using biometric authentication (Face ID / Fingerprint)
FR4: User can reset their password via email
FR5: User can log out of their account
FR6: User can delete their account and all associated data
FR7: User can enable/disable biometric login

**Subscription Management (MVP):**
FR8: User can add a new subscription with name, price, billing cycle, and renewal date
FR9: User can edit an existing subscription's details
FR10: User can delete a subscription
FR11: User can view a list of all their subscriptions
FR12: User can mark a subscription as a trial with expiry date
FR13: User can assign a category to a subscription
FR14: User can mark a subscription as active or cancelled
FR15: User can view subscription details including next renewal date

**Dashboard & Analytics (MVP):**
FR16: User can view total monthly subscription cost
FR17: User can view total yearly subscription cost
FR18: User can view subscription breakdown by category
FR19: User can see a visual summary of their spending
FR20: User can view upcoming renewals for the next 30 days

**Notifications & Reminders (MVP):**
FR21: User can receive push notifications for upcoming subscription renewals
FR22: User can customize reminder timing (1 day, 3 days, 7 days before renewal)
FR23: User can receive notifications for trial expiry dates
FR24: User can enable/disable notifications per subscription
FR25: User can view notification history
FR26: System displays warning when notifications are disabled on device

**Calendar Integration (MVP):**
FR27: User can add subscription renewal dates to device calendar
FR28: User can select which calendar to add events to
FR29: User can remove calendar events when subscription is deleted

**Data Management (MVP):**
FR30: User can export their subscription data (JSON/CSV)
FR31: User data is automatically synced to cloud storage
FR32: User can view and manage their stored personal data

**Premium Features (MVP):**
FR33: User can view premium feature benefits
FR34: User can purchase premium subscription via in-app purchase
FR35: User can restore previous purchases
FR36: Free tier user is limited to 5 subscriptions
FR37: Premium user has unlimited subscriptions

**Bank Integration (Phase 2):**
FR38: User can connect their bank account via Open Banking (PSD2)
FR39: User can view list of supported banks
FR40: User can authorize bank data access through OAuth flow
FR41: User can disconnect a linked bank account
FR42: System can automatically detect recurring subscription transactions
FR43: User can review auto-detected subscriptions before adding
FR44: User can match detected transactions with existing manual subscriptions
FR45: User can ignore/dismiss incorrectly detected subscriptions
FR46: User can view bank connection status (connected/expired/error)
FR47: User can refresh bank data manually
FR48: System notifies user when bank connection expires or fails
FR49: User can view discrepancy between tracked vs. actual spending

### NonFunctional Requirements

**Performance:**
NFR1: App cold start time ≤ 2 seconds (P0)
NFR2: Screen transition time ≤ 300ms (P1)
NFR3: API response time (95th percentile) ≤ 1 second (P0)
NFR4: Dashboard data load time ≤ 1.5 seconds (P1)
NFR5: Subscription list scroll performance 60 FPS (P1)
NFR6: Search/filter response time ≤ 200ms (P2)

**Security:**
NFR7: Data encryption at rest AES-256 (P0)
NFR8: Data encryption in transit TLS 1.3 (P0)
NFR9: Password hashing bcrypt or Argon2 (P0)
NFR10: Session timeout on inactivity 30 minutes (P1)
NFR11: Failed login lockout 5 attempts, 15 min lock (P1)
NFR12: Biometric data handling never stored on server (P0)
NFR13: API authentication JWT with expiry (P0)
NFR14: Certificate pinning enabled for production (P1)
NFR15: No sensitive data in logs enforced (P0)
NFR16: GDPR data deletion within 30 days of request (P0)

**Phase 2 Security:**
NFR17: Bank tokens storage encrypted, never logged (P0)
NFR18: PSD2 SCA compliance full compliance (P0)
NFR19: Bank connection consent explicit user authorization (P0)

**Reliability:**
NFR20: Push notification delivery rate ≥ 99% (P0)
NFR21: System uptime ≥ 99.5% (P1)
NFR22: Data sync success rate ≥ 99.9% (P0)
NFR23: Zero data loss on crash guaranteed (P0)
NFR24: Notification retry on failure 3 attempts with backoff (P1)

**Scalability:**
NFR25: Initial user capacity 1,000 concurrent users (P1)
NFR26: Growth capacity 10x with <10% performance degradation (P2)
NFR27: Database query performance consistent up to 100K subscriptions (P2)
NFR28: Background job processing handle 10K notifications/hour (P1)

**Accessibility:**
NFR29: Screen reader support VoiceOver (iOS), TalkBack (Android) (P1)
NFR30: Minimum touch target size 44x44 points (P1)
NFR31: Color contrast ratio ≥ 4.5:1 WCAG AA (P1)
NFR32: Font scaling support up to 200% system font (P2)
NFR33: Reduced motion support respect system preference (P2)

**Integration:**
NFR34: Push notification latency ≤ 5 seconds from trigger (P0)
NFR35: Calendar sync reliability 100% for user-initiated (P1)
NFR36: Backend API availability ≥ 99.5% (P1)

**Phase 2 Integration:**
NFR37: Bank API connection success ≥ 80% of supported banks (P0)
NFR38: Transaction sync frequency daily or user-triggered (P1)
NFR39: Bank token refresh automatic before expiry (P0)
NFR40: Graceful degradation on bank API failure fallback to manual entry (P1)

### Additional Requirements

**From Architecture:**

- Starter template: Expo Blank TypeScript (`npx create-expo-app@latest SubTrack --template blank-typescript`) — impacts Epic 1 Story 1
- Backend: Supabase with PostgreSQL, Row Level Security (RLS) on all user tables
- Database-first approach with auto-generated TypeScript types via `supabase gen types typescript`
- Feature-based modular project structure under `src/features/`
- Zustand state management with AsyncStorage persistence
- React Query (TanStack Query v5) for API caching and background refetch
- Push notification pipeline: Supabase DB → pg_cron → Edge Function → Expo Push API → APNs/FCM
- Authentication: Supabase Auth + biometric unlock via `react-native-biometrics` + `react-native-keychain`
- Session: JWT (1h access / 7d refresh) with 30min app inactivity lock
- CI/CD: GitHub Actions + EAS Build (PR: Lint → Type check → Unit tests)
- Monitoring: Sentry for crash reporting (free tier)
- 2 environments: development + production
- Import aliases: `@app/*`, `@features/*`, `@shared/*`, `@config/*`
- Post-initialization dependencies: react-native-paper, react-navigation, zustand, @react-native-async-storage/async-storage, supabase-js, tanstack/react-query, axios, react-hook-form, zod, notifee, react-native-biometrics, react-native-calendar-events, react-native-keychain, react-native-reanimated, lottie-react-native, react-native-gesture-handler

**From UX Design:**

- Design system: React Native Paper (Material Design 3) with heavy customization
- Theme: Indigo primary (#6366F1), Purple secondary (#8B5CF6), Green tertiary (#10B981)
- Swipe gesture support: left swipe = edit, right swipe = delete (with undo snackbar)
- Single-handed design: bottom navigation, thumb-zone optimization, 44x44pt minimum touch targets
- Contextual onboarding: teach features while user adds first subscription
- Smart home screen: adaptive content showing upcoming renewals when urgent
- Notification permission flow: value proposition → social proof → explain → request → fallback if denied
- Celebration animations: confetti on first subscription added, victory animation on cancellation
- Lottie animations for delight moments (brief, 1-2 seconds)
- Hero number component: large animated total display with emotional impact
- Category color system: 8 preset categories with distinct colors
- Empty state design: positive messaging ("Add your first subscription!")
- Notification status always visible in app header
- Undo mechanism for destructive actions (delete)
- Pull-to-refresh on list views
- Accessibility: WCAG AA compliance, screen reader support, reduced motion support
- Error UX: no blame, quick path to resolution, clear messaging

### FR Coverage Map

FR1: Epic 1 - User account creation (email/password)
FR2: Epic 1 - User login (email/password)
FR3: Epic 1 - Biometric authentication (Face ID / Fingerprint)
FR4: Epic 1 - Password reset via email
FR5: Epic 1 - User logout
FR6: Epic 1 - Account deletion with data removal
FR7: Epic 1 - Enable/disable biometric login
FR8: Epic 2 - Add new subscription (name, price, cycle, date)
FR9: Epic 2 - Edit existing subscription
FR10: Epic 2 - Delete subscription
FR11: Epic 2 - View subscription list
FR12: Epic 2 - Mark subscription as trial with expiry
FR13: Epic 2 - Assign category to subscription
FR14: Epic 2 - Mark subscription as active/cancelled
FR15: Epic 2 - View subscription details with renewal date
FR16: Epic 3 - View total monthly cost
FR17: Epic 3 - View total yearly cost
FR18: Epic 3 - View breakdown by category
FR19: Epic 3 - Visual spending summary
FR20: Epic 3 - View upcoming renewals (30 days)
FR21: Epic 4 - Push notifications for renewals
FR22: Epic 4 - Customize reminder timing (1/3/7 days)
FR23: Epic 4 - Trial expiry notifications
FR24: Epic 4 - Enable/disable notifications per subscription
FR25: Epic 4 - View notification history
FR26: Epic 4 - Warning when notifications disabled on device
FR27: Epic 5 - Add renewal dates to device calendar
FR28: Epic 5 - Select target calendar
FR29: Epic 5 - Remove calendar events on subscription delete
FR30: Epic 5 - Export subscription data (JSON/CSV)
FR31: Epic 5 - Automatic cloud sync
FR32: Epic 5 - View and manage stored personal data
FR33: Epic 6 - View premium feature benefits
FR34: Epic 6 - Purchase premium via in-app purchase
FR35: Epic 6 - Restore previous purchases
FR36: Epic 6 - Free tier limited to 5 subscriptions
FR37: Epic 6 - Premium tier unlimited subscriptions
FR38: Epic 7 - Connect bank account via Open Banking (PSD2)
FR39: Epic 7 - View list of supported banks
FR40: Epic 7 - Authorize bank data access (OAuth)
FR41: Epic 7 - Disconnect linked bank account
FR42: Epic 7 - Automatic subscription detection from transactions
FR43: Epic 7 - Review auto-detected subscriptions before adding
FR44: Epic 7 - Match detected transactions with manual subscriptions
FR45: Epic 7 - Ignore/dismiss incorrectly detected subscriptions
FR46: Epic 7 - View bank connection status
FR47: Epic 7 - Refresh bank data manually
FR48: Epic 7 - Notification when bank connection expires/fails
FR49: Epic 7 - View discrepancy between tracked vs. actual spending

## Epic List

### Epic 1: Project Foundation & User Authentication

Users can install the app, create an account, and securely access SubTrack with email/password or biometric authentication. This epic establishes the complete project foundation including Expo initialization, Supabase setup, navigation structure, and the full authentication system.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7

### Epic 2: Subscription Tracking Core

Users can manually track all their subscriptions in one place — adding, editing, deleting, viewing details, tracking trial periods, and organizing by categories. This is the core functionality that delivers SubTrack's primary value proposition.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15

### Epic 3: Spending Dashboard & Insights

Users experience the "AHA moment" by seeing their total subscription spending with visual impact — monthly/yearly cost totals, category breakdowns, spending charts, and upcoming renewal overview.
**FRs covered:** FR16, FR17, FR18, FR19, FR20

### Epic 4: Smart Reminders & Notifications

Users never miss a subscription renewal with timely push notifications. Includes the complete notification pipeline (pg_cron → Edge Function → Expo Push API), customizable reminder timing, trial expiry alerts, and notification health monitoring.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26

### Epic 5: Calendar Integration & Data Management

Users can integrate subscription renewal dates with their device calendar and manage their data — including cloud sync, JSON/CSV export, and GDPR-compliant personal data management.
**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32

### Epic 6: Premium & Monetization

Users can upgrade to premium for unlimited subscriptions and advanced features. Includes in-app purchase flow (StoreKit 2 / Google Play Billing), freemium gating, purchase restoration, and soft upsell approach.
**FRs covered:** FR33, FR34, FR35, FR36, FR37

### Epic 7: Bank Integration (Phase 2)

Users can connect their bank accounts via Open Banking (PSD2) to automatically detect recurring subscription transactions, review and approve detected subscriptions, and reconcile manual entries with actual bank data.
**FRs covered:** FR38, FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR48, FR49

## Epic 1: Project Foundation & User Authentication

Users can install the app, create an account, and securely access SubTrack with email/password or biometric authentication. This epic establishes the complete project foundation including Expo initialization, Supabase setup, navigation structure, and the full authentication system.

### Story 1.1: Project Initialization & Core Infrastructure

As a developer,
I want to initialize the SubTrack project with Expo, install core dependencies, configure Supabase, and set up the feature-based project structure,
So that there is a solid foundation for all subsequent feature development.

**Acceptance Criteria:**

**Given** no project exists
**When** the initialization script is run
**Then** an Expo TypeScript project is created with `npx create-expo-app@latest SubTrack --template blank-typescript`
**And** all core dependencies are installed (react-native-paper, react-navigation, zustand, @react-native-async-storage/async-storage, supabase-js, react-query, react-hook-form, zod, react-native-reanimated, react-native-gesture-handler, react-native-safe-area-context)
**And** the feature-based project structure is created under `src/` with `app/`, `features/`, `shared/`, `config/` directories
**And** import aliases are configured (`@app/*`, `@features/*`, `@shared/*`, `@config/*`)
**And** Supabase project is initialized with `supabase init`
**And** environment configuration files (`.env.example`, `.env.development`) are created with Supabase URL and anon key placeholders
**And** React Native Paper theme is configured with SubTrack colors (primary: #6366F1, secondary: #8B5CF6, tertiary: #10B981)
**And** Bottom tab navigation structure is set up (Home, Subscriptions, Add, Settings)
**And** the app launches successfully on both iOS and Android simulators
**And** ESLint and Prettier configurations are in place

### Story 1.2: User Registration with Email

As a new user,
I want to create an account using my email and password,
So that I can start tracking my subscriptions securely.

**Acceptance Criteria:**

**Given** the user is on the registration screen
**When** they enter a valid email and password (8+ characters, complexity rules)
**Then** a new account is created via Supabase Auth
**And** the `users` table in Supabase is created with RLS policies (id, email, created_at, updated_at)
**And** the user receives an email verification (if enabled)
**And** the user is redirected to the main app screen

**Given** the user enters an email that is already registered
**When** they submit the registration form
**Then** a user-friendly error message is displayed ("This email is already registered")

**Given** the user enters a password that doesn't meet complexity requirements
**When** they submit the form
**Then** inline validation shows specific requirements not met
**And** the password field shows clear guidance on requirements

**Given** the user leaves required fields empty
**When** they attempt to submit
**Then** form validation prevents submission with clear error indicators

### Story 1.3: User Login with Email & Password

As a returning user,
I want to log in with my email and password,
So that I can access my subscription data.

**Acceptance Criteria:**

**Given** the user is on the login screen with a valid account
**When** they enter correct email and password
**Then** they are authenticated via Supabase Auth with JWT tokens (1h access / 7d refresh)
**And** tokens are stored securely in device keychain (iOS Keychain / Android Keystore)
**And** the user is redirected to the main app screen

**Given** the user enters incorrect credentials
**When** they submit the login form
**Then** a generic error message is displayed ("Invalid email or password")
**And** no information is leaked about which field is wrong

**Given** the user has failed login 5 times consecutively
**When** they attempt another login
**Then** the account is temporarily locked for 15 minutes (NFR11)
**And** the user is informed of the lockout duration

**Given** the user has an active session (valid JWT)
**When** they open the app
**Then** they are automatically logged in without entering credentials

### Story 1.4: Biometric Authentication Setup

As a security-conscious user,
I want to log in using Face ID or Fingerprint,
So that I can access my app quickly and securely without typing my password.

**Acceptance Criteria:**

**Given** the user is logged in and device supports biometric authentication
**When** they navigate to settings and enable biometric login
**Then** biometric enrollment is completed via `react-native-biometrics`
**And** auth tokens are stored in biometric-protected keychain via `react-native-keychain`
**And** the biometric toggle in settings reflects the enabled state

**Given** biometric login is enabled
**When** the user opens the app
**Then** a biometric prompt is displayed (Face ID / Fingerprint)
**And** upon successful biometric verification, the user is logged in
**And** biometric data is never stored on the server (NFR12)

**Given** biometric verification fails
**When** the user cannot authenticate biometrically
**Then** a fallback to email/password login is provided

**Given** the user wants to disable biometric login
**When** they toggle off biometric in settings
**Then** biometric authentication is disabled
**And** app requires email/password for next login

### Story 1.5: Password Reset via Email

As a user who forgot their password,
I want to reset my password via email,
So that I can regain access to my account.

**Acceptance Criteria:**

**Given** the user is on the login screen
**When** they tap "Forgot Password" and enter their registered email
**Then** a password reset email is sent via Supabase Auth
**And** a confirmation message is displayed ("Check your email for reset instructions")

**Given** the user receives the reset email
**When** they follow the reset link and enter a new password
**Then** the password is updated successfully
**And** all existing sessions are invalidated
**And** the user can log in with the new password

**Given** the user enters an email that doesn't exist
**When** they request a password reset
**Then** the same confirmation message is displayed (no email enumeration)

### Story 1.6: Session Management & Logout

As a logged-in user,
I want to log out of my account and have my session managed securely,
So that my data stays protected.

**Acceptance Criteria:**

**Given** the user is logged in
**When** they tap "Log Out" in settings
**Then** all local tokens are cleared from secure storage
**And** Zustand auth store is reset
**And** the user is redirected to the login screen

**Given** the user has been inactive for 30 minutes
**When** they return to the app
**Then** the app requires re-authentication (biometric if enabled, otherwise login screen)
**And** an inactivity timeout message is shown (NFR10)

**Given** the user's access token has expired
**When** the app makes an API call
**Then** the refresh token is used to obtain a new access token automatically
**And** if the refresh token is also expired, the user is redirected to login

### Story 1.7: Account Deletion & Data Removal

As a user who wants to leave,
I want to delete my account and all associated data,
So that my personal information is completely removed per GDPR requirements.

**Acceptance Criteria:**

**Given** the user is on the account settings screen
**When** they select "Delete Account"
**Then** a confirmation dialog is displayed explaining the consequences ("All your data will be permanently deleted")
**And** the user must confirm with their password or biometric

**Given** the user confirms account deletion
**When** the deletion process completes
**Then** all user data is permanently removed from Supabase (subscriptions, settings, notifications)
**And** all local data is cleared from the device
**And** the user is redirected to the welcome/registration screen
**And** deletion completes within 30 days per GDPR requirements (NFR16)

**Given** the user taps "Delete Account" but cancels
**When** they dismiss the confirmation dialog
**Then** no data is deleted and the user remains logged in

## Epic 2: Subscription Tracking Core

Users can manually track all their subscriptions in one place — adding, editing, deleting, viewing details, tracking trial periods, and organizing by categories. This is the core functionality that delivers SubTrack's primary value proposition.

### Story 2.1: Add New Subscription

As a user,
I want to add a new subscription with name, price, billing cycle, and renewal date,
So that I can start tracking my spending.

**Acceptance Criteria:**

**Given** the user taps the "Add" button (bottom tab or FAB)
**When** the add subscription form is displayed
**Then** the form contains fields for: subscription name, price (€), billing cycle (monthly/yearly/quarterly/weekly), and next renewal date
**And** the `subscriptions` table is created in Supabase with RLS policies (id, user_id, name, price, currency, billing_cycle, renewal_date, is_trial, trial_expiry_date, category, is_active, notes, created_at, updated_at)
**And** smart suggestions appear as the user types the subscription name (e.g., "Netflix", "Spotify")
**And** billing cycle defaults to "Monthly" as a smart default
**And** a date picker allows easy renewal date selection

**Given** the user fills in all required fields (name, price, billing cycle, renewal date)
**When** they submit the form
**Then** the subscription is saved to Supabase with the user's ID
**And** a celebration animation (confetti) plays for the first subscription added
**And** the user is returned to the subscription list
**And** the new subscription appears in the list immediately

**Given** the user leaves required fields empty
**When** they attempt to submit
**Then** form validation via `react-hook-form` + `zod` prevents submission with inline error messages

### Story 2.2: View Subscription List

As a user,
I want to see all my subscriptions in a unified list,
So that I can see everything I'm paying for at a glance.

**Acceptance Criteria:**

**Given** the user has added subscriptions
**When** they navigate to the Subscriptions tab
**Then** all subscriptions are displayed as cards with category color stripe, name, price, billing cycle, and next renewal date
**And** the list scrolls at 60 FPS (NFR5)
**And** a total monthly cost summary is shown at the top
**And** subscriptions are sorted by next renewal date (soonest first)

**Given** the user has no subscriptions
**When** they view the subscription list
**Then** an encouraging empty state is displayed ("Add your first subscription!")
**And** a clear CTA button leads to the add subscription form

**Given** the user pulls down on the list
**When** the pull-to-refresh gesture is detected
**Then** data is refreshed from Supabase
**And** a refresh indicator is displayed

### Story 2.3: Edit Subscription Details

As a user,
I want to edit an existing subscription's details,
So that I can keep my information accurate when prices change or details update.

**Acceptance Criteria:**

**Given** the user is viewing the subscription list
**When** they swipe left on a subscription card
**Then** an edit action is revealed

**Given** the user taps edit (or taps on a subscription card)
**When** the edit form is displayed
**Then** all current subscription details are pre-filled
**And** the user can modify any field (name, price, billing cycle, renewal date, category, notes)

**Given** the user makes changes and submits
**When** the form is saved
**Then** the subscription is updated in Supabase
**And** the subscription list reflects the changes immediately
**And** the `updated_at` timestamp is refreshed

### Story 2.4: Delete Subscription

As a user,
I want to delete a subscription I no longer need to track,
So that my list stays clean and relevant.

**Acceptance Criteria:**

**Given** the user is viewing the subscription list
**When** they swipe right on a subscription card
**Then** a delete action is revealed with a red indicator

**Given** the user confirms the delete action
**When** the deletion is processed
**Then** the subscription is removed from Supabase
**And** an undo snackbar appears at the bottom for 5 seconds ("Subscription deleted. [Undo]")
**And** if undo is tapped, the subscription is restored immediately

**Given** the undo timer expires
**When** 5 seconds have passed
**Then** the deletion is permanent
**And** the snackbar disappears

### Story 2.5: Trial Period Tracking

As a user,
I want to mark a subscription as a trial with an expiry date,
So that I don't forget to cancel before I'm charged.

**Acceptance Criteria:**

**Given** the user is adding or editing a subscription
**When** they toggle "This is a trial" switch
**Then** a trial expiry date field appears
**And** `is_trial` is set to true and `trial_expiry_date` is stored

**Given** a subscription is marked as a trial
**When** it appears in the subscription list
**Then** a visible trial badge/indicator is displayed on the card
**And** a countdown shows days remaining until trial expires (e.g., "3 days left")

**Given** a trial has expired
**When** the expiry date has passed
**Then** the trial badge changes to "Trial expired"
**And** the subscription is visually distinguished (e.g., different styling)

### Story 2.6: Subscription Categories

As a user,
I want to assign categories to my subscriptions,
So that I can organize and visually group my subscriptions.

**Acceptance Criteria:**

**Given** the user is adding or editing a subscription
**When** they reach the category field
**Then** 8 preset categories are displayed as color-coded chips: Entertainment (#8B5CF6), Music (#EF4444), Productivity (#3B82F6), Storage (#F97316), Gaming (#22C55E), News (#A16207), Health (#EC4899), Other (#6B7280)
**And** category selection is optional (not blocking)

**Given** a subscription has a category assigned
**When** it appears in the list
**Then** the subscription card shows the category color stripe on the left edge
**And** the category name is displayed on the card

**Given** no category is assigned
**When** the subscription appears in the list
**Then** the "Other" category color (gray) is used as default

### Story 2.7: Subscription Status Management

As a user,
I want to mark subscriptions as active or cancelled,
So that I can keep track of which services I'm still paying for.

**Acceptance Criteria:**

**Given** the user is viewing a subscription's details or editing it
**When** they toggle the status between "Active" and "Cancelled"
**Then** the `is_active` field is updated in Supabase
**And** the subscription list visually distinguishes cancelled subscriptions (e.g., muted styling, strikethrough on price)

**Given** the user views the subscription list
**When** there are both active and cancelled subscriptions
**Then** active subscriptions are shown prominently
**And** cancelled subscriptions are visually de-emphasized
**And** the total monthly cost only includes active subscriptions

### Story 2.8: Subscription Detail View

As a user,
I want to view detailed information about a specific subscription,
So that I can see all the relevant details including next renewal date.

**Acceptance Criteria:**

**Given** the user taps on a subscription card
**When** the detail view opens
**Then** all subscription details are displayed: name, price, billing cycle, next renewal date, category, status (active/cancelled), trial status, notes, created date
**And** action buttons are available: Edit, Delete, Toggle Status
**And** the next renewal date is clearly highlighted

**Given** the subscription is a trial
**When** viewing the detail screen
**Then** the trial expiry date and countdown are prominently displayed

## Epic 3: Spending Dashboard & Insights

Users experience the "AHA moment" by seeing their total subscription spending with visual impact — monthly/yearly cost totals, category breakdowns, spending charts, and upcoming renewal overview.

### Story 3.1: Monthly & Yearly Cost Summary

As a user,
I want to see my total monthly and yearly subscription cost prominently displayed,
So that I understand the real impact of my subscriptions on my budget.

**Acceptance Criteria:**

**Given** the user navigates to the Home (Dashboard) tab
**When** the dashboard loads
**Then** the total monthly cost is displayed as a large hero number with animated count-up effect (SpendingHero component)
**And** the yearly equivalent is shown below (monthly × 12)
**And** only active subscriptions are included in the calculation
**And** the dashboard loads within 1.5 seconds (NFR4)
**And** the currency symbol (€) is displayed correctly

**Given** the user has no subscriptions
**When** they view the dashboard
**Then** €0.00 is displayed with an encouraging message to add subscriptions
**And** a CTA leads to the add subscription form

**Given** the user adds or removes a subscription
**When** they return to the dashboard
**Then** the totals are updated immediately with smooth number animation

### Story 3.2: Category Spending Breakdown

As a user,
I want to see my spending broken down by category,
So that I can understand where most of my subscription money goes.

**Acceptance Criteria:**

**Given** the user has subscriptions with assigned categories
**When** they view the dashboard
**Then** a visual breakdown shows spending per category using the category color system
**And** each category displays: category name, color indicator, total monthly cost, percentage of total
**And** categories are sorted by cost (highest first)

**Given** the user has subscriptions in multiple categories
**When** viewing the breakdown
**Then** a donut/pie chart or horizontal bar chart visualizes the proportions
**And** the chart uses the predefined category colors (Entertainment: #8B5CF6, Music: #EF4444, etc.)

**Given** all subscriptions are in the same category or uncategorized
**When** viewing the breakdown
**Then** a single category is shown with 100% of spending
**And** the visualization remains clean and informative

### Story 3.3: Visual Spending Summary

As a user,
I want to see a compelling visual summary of my spending,
So that I feel the emotional impact and am motivated to take action.

**Acceptance Criteria:**

**Given** the user views the dashboard
**When** spending data is loaded
**Then** a visual spending summary section displays key metrics: total active subscriptions count, monthly cost, yearly cost, and average cost per subscription
**And** the yearly cost creates "shock value" (e.g., "€189/month = €2,268/year")
**And** numbers animate smoothly using `react-native-reanimated`

**Given** the user has cancelled subscriptions
**When** they view the summary
**Then** a "savings" indicator shows how much they've saved by cancelling (monthly savings amount)
**And** the savings are highlighted in green (#10B981) as a positive reinforcement

### Story 3.4: Upcoming Renewals Overview

As a user,
I want to see my upcoming subscription renewals for the next 30 days,
So that I can prepare for upcoming charges and make decisions.

**Acceptance Criteria:**

**Given** the user has active subscriptions with renewal dates within the next 30 days
**When** they view the dashboard
**Then** an "Upcoming Renewals" section lists subscriptions renewing in the next 30 days
**And** each entry shows: subscription name, renewal date, price, and days until renewal
**And** entries are sorted by renewal date (soonest first)
**And** trial expiry dates are highlighted with a warning indicator

**Given** the user has no renewals in the next 30 days
**When** they view the upcoming renewals section
**Then** a calm message is displayed ("No upcoming renewals in the next 30 days")

**Given** a renewal is within 3 days
**When** it appears in the upcoming list
**Then** it is visually highlighted as urgent (e.g., accent color, bold text)

## Epic 4: Smart Reminders & Notifications

Users never miss a subscription renewal with timely push notifications. Includes the complete notification pipeline (pg_cron → Edge Function → Expo Push API), customizable reminder timing, trial expiry alerts, and notification health monitoring.

### Story 4.1: Push Notification Permission & Setup

As a user,
I want to be guided through enabling push notifications with a clear value proposition,
So that I understand why notifications are critical and grant permission willingly.

**Acceptance Criteria:**

**Given** the user has just registered or has not yet granted notification permission
**When** the notification permission flow is triggered
**Then** a pre-permission screen displays: value proposition ("Never miss a renewal again"), social proof ("Users save €47/month on average"), and explanation of what happens ("We'll remind you 3 days before each renewal")
**And** after the user understands the value, the native OS permission dialog is presented

**Given** the user grants notification permission
**When** the permission is accepted
**Then** the device push token is obtained via Expo Push Notifications
**And** the token is stored in Supabase (new `push_tokens` table with user_id, token, platform, created_at)
**And** a success confirmation is displayed

**Given** the user denies notification permission
**When** they dismiss the native dialog
**Then** a persistent but non-intrusive banner is shown explaining notifications are disabled
**And** the app continues to function but with reduced value
**And** a "Turn on notifications" option remains accessible in settings

### Story 4.2: Renewal Reminder Scheduling

As a user,
I want to receive push notifications before my subscriptions renew,
So that I can decide whether to keep or cancel before being charged.

**Acceptance Criteria:**

**Given** the user has active subscriptions and notifications enabled
**When** a subscription's renewal date approaches
**Then** a push notification is sent at the user's configured timing (default: 3 days before)
**And** the notification contains: subscription name, renewal date, price
**And** the `reminder_settings` table is created in Supabase (id, user_id, subscription_id, remind_days_before, is_enabled, created_at)

**Given** the notification pipeline is configured
**When** a pg_cron job runs daily
**Then** the Edge Function (`calculate-reminders`) queries subscriptions due for reminders
**And** notifications are dispatched via Expo Push API to the correct device tokens
**And** notification delivery is tracked for reliability (NFR20: ≥99%)

**Given** a notification fails to deliver
**When** the delivery attempt fails
**Then** up to 3 retry attempts are made with exponential backoff (NFR24)

### Story 4.3: Customizable Reminder Timing

As a user,
I want to customize when I receive renewal reminders (1 day, 3 days, or 7 days before),
So that I get notified at the time that works best for my decision-making.

**Acceptance Criteria:**

**Given** the user is viewing notification settings (global or per-subscription)
**When** they select reminder timing
**Then** three options are available: 1 day before, 3 days before (default), 7 days before
**And** the selection is saved to the `reminder_settings` table in Supabase

**Given** the user sets a global default reminder timing
**When** a new subscription is added
**Then** the default timing is applied automatically

**Given** the user customizes timing for a specific subscription
**When** the override is saved
**Then** that subscription uses its custom timing instead of the global default

### Story 4.4: Trial Expiry Notifications

As a user,
I want to receive notifications before my trial subscriptions expire,
So that I can cancel before being charged for a service I don't want.

**Acceptance Criteria:**

**Given** the user has a subscription marked as trial with an expiry date
**When** the trial expiry date approaches
**Then** a push notification is sent with heightened urgency: "⚠️ Tomorrow: [Name] trial expires ([price]/month)"
**And** trial notifications default to 1 day and 3 days before expiry

**Given** the trial expires today
**When** the notification is sent
**Then** the message clearly states urgency: "Today is the last day to cancel [Name]"

**Given** a trial has already expired
**When** the user opens the app
**Then** the subscription detail shows "Trial expired" status
**And** no further trial notifications are sent for this subscription

### Story 4.5: Per-Subscription Notification Control

As a user,
I want to enable or disable notifications for individual subscriptions,
So that I only receive reminders for subscriptions I care about.

**Acceptance Criteria:**

**Given** the user is viewing a subscription's details or editing it
**When** they toggle "Notifications" on or off
**Then** the `is_enabled` field in `reminder_settings` is updated
**And** the toggle reflects the current state

**Given** notifications are disabled for a specific subscription
**When** that subscription's renewal approaches
**Then** no push notification is sent for that subscription
**And** other subscriptions with notifications enabled continue to receive reminders

**Given** the user re-enables notifications for a subscription
**When** the next renewal approaches
**Then** notifications resume according to the configured timing

### Story 4.6: Notification History & Health Indicator

As a user,
I want to view my notification history and see if notifications are working properly,
So that I can trust the app is watching out for me.

**Acceptance Criteria:**

**Given** the user navigates to notification history (in Settings or Notifications section)
**When** the history screen loads
**Then** a list of past notifications is displayed with: subscription name, notification type (renewal/trial), scheduled date, delivery status (delivered/missed)
**And** the `notification_history` table is created in Supabase (id, user_id, subscription_id, type, scheduled_at, delivered_at, status)

**Given** notifications are disabled at the device/OS level
**When** the user opens the app
**Then** a prominent red banner is displayed at the top: "⚠️ Notifications are off! Reminders can't reach you. [Turn On Now]"
**And** tapping the banner opens device notification settings (NFR26 compliance)

**Given** notifications are enabled and working
**When** the user views the app header or settings
**Then** a subtle green indicator confirms notification health
**And** optionally shows: "247 reminders delivered on time"

## Epic 5: Calendar Integration & Data Management

Users can integrate subscription renewal dates with their device calendar and manage their data — including cloud sync, JSON/CSV export, and GDPR-compliant personal data management.

### Story 5.1: Add Subscription Renewals to Device Calendar

As a user,
I want to add my subscription renewal dates to my device calendar,
So that I see them alongside my other events and never miss a payment.

**Acceptance Criteria:**

**Given** the user is viewing a subscription's details
**When** they tap "Add to Calendar"
**Then** the native calendar permission is requested (if not already granted)
**And** a recurring calendar event is created via `react-native-calendar-events` matching the subscription's billing cycle
**And** the event title includes the subscription name and price (e.g., "Netflix Renewal - €17.99")
**And** the calendar event ID is stored in Supabase linked to the subscription

**Given** the subscription has a monthly billing cycle
**When** a calendar event is created
**Then** the event recurs monthly on the renewal date

**Given** the subscription has a yearly billing cycle
**When** a calendar event is created
**Then** the event recurs annually on the renewal date

**Given** the user has not granted calendar permission
**When** they attempt to add to calendar
**Then** a non-intrusive explanation is shown before requesting permission
**And** if denied, the user is informed gracefully without blocking app functionality

### Story 5.2: Calendar Selection

As a user,
I want to choose which calendar my subscription events are added to,
So that I can keep them organized in a specific calendar.

**Acceptance Criteria:**

**Given** the user taps "Add to Calendar" and has multiple calendars on their device
**When** the calendar selection prompt appears
**Then** all available device calendars are listed
**And** the user can select their preferred calendar
**And** the selection is remembered for future additions (stored in `user_settings` table in Supabase)

**Given** the user has only one calendar
**When** they add a subscription to calendar
**Then** the event is added to the default calendar without prompting for selection

**Given** the user changes their preferred calendar in settings
**When** new calendar events are created
**Then** they are added to the newly selected calendar
**And** existing events remain in their original calendar

### Story 5.3: Calendar Event Cleanup on Subscription Delete

As a user,
I want calendar events to be removed when I delete a subscription,
So that my calendar stays clean and accurate.

**Acceptance Criteria:**

**Given** the user deletes a subscription that has a linked calendar event
**When** the deletion is confirmed
**Then** the corresponding calendar event is also removed from the device calendar
**And** the calendar event ID reference is cleared from Supabase

**Given** the user cancels (marks as cancelled) a subscription with a calendar event
**When** the status is updated
**Then** the user is asked: "Remove calendar events for this cancelled subscription?"
**And** if confirmed, events are removed; if not, events remain

**Given** the undo snackbar restores a deleted subscription
**When** undo is tapped within 5 seconds
**Then** the calendar event is also restored

### Story 5.4: Export Subscription Data

As a user,
I want to export my subscription data as JSON or CSV,
So that I have a backup or can use the data elsewhere.

**Acceptance Criteria:**

**Given** the user navigates to Settings > Data Export
**When** the export screen is displayed
**Then** two format options are available: JSON and CSV

**Given** the user selects JSON export
**When** they tap "Export"
**Then** all subscription data is serialized to a JSON file containing: name, price, currency, billing_cycle, renewal_date, category, is_active, is_trial, trial_expiry_date, notes
**And** the native share sheet is presented to save or share the file

**Given** the user selects CSV export
**When** they tap "Export"
**Then** all subscription data is exported as a CSV file with proper headers
**And** the native share sheet is presented to save or share the file

**Given** the user has no subscriptions
**When** they attempt to export
**Then** a message is displayed ("No data to export. Add subscriptions first.")

### Story 5.5: Cloud Data Sync

As a user,
I want my subscription data to be automatically synced to the cloud,
So that my data is safe and accessible if I change devices.

**Acceptance Criteria:**

**Given** the user is logged in and has an internet connection
**When** they add, edit, or delete a subscription
**Then** changes are automatically synced to Supabase in real-time
**And** the sync success rate meets ≥99.9% (NFR22)

**Given** the user opens the app on a new device and logs in
**When** data is loaded
**Then** all their subscriptions, settings, and preferences are available

**Given** the user loses internet connection
**When** they attempt to modify data
**Then** a "No internet connection" message is displayed with a retry option
**And** no local-only modifications are made (MVP is online-only per PRD)

**Given** a sync conflict occurs
**When** the same data is modified simultaneously
**Then** the most recent update wins (last-write-wins strategy)

### Story 5.6: Personal Data Management (GDPR)

As a user,
I want to view and manage my stored personal data,
So that I have transparency and control over my information per GDPR requirements.

**Acceptance Criteria:**

**Given** the user navigates to Settings > My Data
**When** the data management screen loads
**Then** a summary of stored personal data is displayed: email, account creation date, number of subscriptions, data storage location

**Given** the user wants to see all their data
**When** they tap "View My Data"
**Then** a detailed view shows all stored information: profile data, subscriptions list, notification settings, preferences

**Given** the user wants to download their data (data portability)
**When** they tap "Download My Data"
**Then** a comprehensive JSON export of all personal data is generated and shared via the native share sheet

**Given** the user has already deleted their account (via Story 1.7)
**When** the deletion is processed
**Then** this screen is no longer accessible and all data has been removed

## Epic 6: Premium & Monetization

Users can upgrade to premium for unlimited subscriptions and advanced features. Includes in-app purchase flow (StoreKit 2 / Google Play Billing), freemium gating, purchase restoration, and soft upsell approach.

### Story 6.1: Freemium Subscription Limit

As a free tier user,
I want to understand that I'm limited to 5 subscriptions with a clear path to upgrade,
So that I can decide when premium is worth it for me.

**Acceptance Criteria:**

**Given** the user is on the free tier
**When** they have added fewer than 5 subscriptions
**Then** a subtle counter is shown (e.g., "3/5 subscriptions used")
**And** the app functions fully without any restrictions

**Given** the free tier user has exactly 5 subscriptions
**When** they attempt to add a 6th subscription
**Then** a soft upsell screen is displayed explaining: "You've reached the free limit of 5 subscriptions"
**And** the screen shows premium benefits and pricing (€2.99/month or €24.99/year)
**And** options are: "Upgrade to Premium" or "Maybe Later"
**And** the user is NOT blocked from using existing features

**Given** the user dismisses the upsell
**When** they return to the app
**Then** they can continue using all existing 5 subscriptions without restriction
**And** the "Add" button shows a small premium badge indicating upgrade is needed for more

**Given** the `user_settings` table is updated
**When** the user's tier is checked
**Then** the `is_premium` field and `subscription_limit` are used to enforce gating

### Story 6.2: Premium Feature Benefits Display

As a user,
I want to see what premium offers before committing to purchase,
So that I can make an informed decision about upgrading.

**Acceptance Criteria:**

**Given** the user navigates to Settings > Premium or taps any premium upsell prompt
**When** the premium benefits screen loads
**Then** a clear comparison is displayed showing Free vs Premium features: subscription limits, reminder options, calendar sync, data export, and analytics access
**And** pricing is clearly shown: €2.99/month or €24.99/year (save 30%)
**And** a prominent "Subscribe" CTA is displayed
**And** the design follows the soft upsell approach (no aggressive popups)

**Given** the user is already a premium subscriber
**When** they view the premium screen
**Then** their current subscription status is shown: plan type, renewal date, and "Manage Subscription" option

### Story 6.3: In-App Purchase Flow

As a user,
I want to purchase a premium subscription through the app,
So that I can unlock unlimited subscriptions and advanced features.

**Acceptance Criteria:**

**Given** the user taps "Subscribe" on the premium screen
**When** the purchase flow initiates
**Then** the native in-app purchase dialog is presented via `react-native-iap` (StoreKit 2 on iOS, Google Play Billing on Android)
**And** available plans are shown: monthly (€2.99) and yearly (€24.99)

**Given** the user completes the purchase successfully
**When** payment is confirmed by the store
**Then** the premium entitlement is validated via the `validate-premium` Edge Function
**And** `is_premium` is set to true in the user's profile in Supabase
**And** the subscription limit is removed immediately
**And** a success celebration animation is displayed
**And** the user is returned to the app with premium features unlocked

**Given** the purchase fails or is cancelled
**When** the user returns to the app
**Then** a user-friendly message is displayed ("Purchase wasn't completed. You can try again anytime.")
**And** the user remains on the free tier

**Given** the user's premium subscription expires (non-renewal)
**When** the app checks entitlement status
**Then** the user is downgraded to free tier
**And** existing subscriptions beyond the 5 limit remain visible but read-only
**And** the user is informed with a gentle prompt to re-subscribe

### Story 6.4: Restore Previous Purchases

As a user who reinstalled the app or switched devices,
I want to restore my previous premium purchase,
So that I don't have to pay again.

**Acceptance Criteria:**

**Given** the user is on the premium screen and has previously purchased premium
**When** they tap "Restore Purchases"
**Then** the app queries the store (App Store / Play Store) for previous purchases
**And** if a valid premium subscription is found, it is restored
**And** `is_premium` is set to true in Supabase
**And** a confirmation message is displayed ("Premium restored successfully!")

**Given** no previous purchases exist
**When** the restore check completes
**Then** a message is displayed ("No previous purchases found")
**And** the user is guided to subscribe

**Given** the user logs into a new device
**When** they open the app and their Supabase profile shows `is_premium: true`
**Then** premium features are immediately available
**And** entitlement is re-validated with the store in the background

### Story 6.5: Premium Entitlement Enforcement

As a premium user,
I want my unlimited subscription access to work reliably,
So that I get the value I'm paying for without interruptions.

**Acceptance Criteria:**

**Given** the user has an active premium subscription
**When** they use the app
**Then** no subscription limit is enforced
**And** all premium features are accessible: unlimited subscriptions, calendar sync, data export, full analytics
**And** no upsell prompts are shown

**Given** the app starts or resumes from background
**When** the premium status is checked
**Then** the `validate-premium` Edge Function verifies entitlement with the store
**And** the local `usePremiumStore` Zustand store is updated
**And** premium status is cached locally in AsyncStorage to avoid unnecessary API calls

**Given** the entitlement check fails due to network issues
**When** the app cannot reach the server
**Then** the cached premium status is used (grace period)
**And** a background retry is scheduled

## Epic 7: Bank Integration (Phase 2)

Users can connect their bank accounts via Open Banking (PSD2) to automatically detect recurring subscription transactions, review and approve detected subscriptions, and reconcile manual entries with actual bank data.

### Story 7.1: Bank Account Connection via Open Banking

As a user,
I want to connect my bank account via Open Banking,
So that my subscriptions can be detected automatically from my transactions.

**Acceptance Criteria:**

**Given** the user navigates to Settings > Bank Connection
**When** the bank connection screen loads
**Then** an explanation of Open Banking is displayed: what it is, how it works, and security guarantees
**And** a "Connect Bank Account" CTA is prominently shown
**And** the `bank_connections` table is created in Supabase (id, user_id, provider, bank_name, status, connected_at, expires_at, consent_id)

**Given** the user taps "Connect Bank Account"
**When** the connection flow starts
**Then** the PSD2-compliant aggregator (Tink/Salt Edge) OAuth flow is initiated
**And** explicit user consent is obtained before any data access (NFR19)
**And** Strong Customer Authentication (SCA) is completed per PSD2 requirements (NFR18)

**Given** the OAuth flow completes successfully
**When** the bank connection is established
**Then** the connection status is stored in Supabase as "connected"
**And** bank tokens are stored encrypted and never logged (NFR17)
**And** a success message confirms the connection

**Given** the OAuth flow fails or is cancelled
**When** the user returns to the app
**Then** a user-friendly error message is shown with retry option
**And** no partial data is stored

### Story 7.2: Supported Banks List

As a user,
I want to see which banks are supported before attempting to connect,
So that I know if my bank works with SubTrack.

**Acceptance Criteria:**

**Given** the user is on the bank connection screen
**When** they tap "View Supported Banks"
**Then** a searchable list of supported banks is displayed, fetched from the aggregator API
**And** each bank shows: name, logo, country, and connection status

**Given** the user searches for their bank
**When** they type in the search field
**Then** results are filtered in real-time
**And** if their bank is found, they can proceed to connect
**And** if their bank is not found, a message explains: "Your bank isn't supported yet. You can continue using manual entry."

**Given** the aggregator supports ≥80% of major European banks (NFR37)
**When** the list is displayed
**Then** major banks in the user's region are prominently featured

### Story 7.3: Automatic Subscription Detection

As a user with a connected bank account,
I want my subscriptions to be automatically detected from my transactions,
So that I don't have to manually enter every subscription.

**Acceptance Criteria:**

**Given** the user has a connected bank account
**When** transaction data is synced (daily or user-triggered per NFR38)
**Then** an Edge Function analyzes transactions for recurring patterns
**And** detected subscriptions are identified based on: recurring amount, same merchant, regular interval
**And** the `detected_subscriptions` table is created in Supabase (id, user_id, bank_connection_id, merchant_name, amount, frequency, confidence_score, status, first_seen, last_seen)

**Given** recurring transactions are detected
**When** the detection algorithm runs
**Then** subscriptions with high confidence (>80%) are flagged as "detected"
**And** results are stored but NOT automatically added to the user's subscription list

**Given** the detection finds no recurring subscriptions
**When** the analysis completes
**Then** the user is informed: "No recurring subscriptions detected yet. We'll keep checking."

### Story 7.4: Review & Approve Detected Subscriptions

As a user,
I want to review auto-detected subscriptions before they're added to my list,
So that I have full control over what gets tracked.

**Acceptance Criteria:**

**Given** subscriptions have been auto-detected
**When** the user opens the "Detected Subscriptions" screen
**Then** each detected subscription is shown as a review card: merchant name, amount, billing frequency, confidence score, and last transaction date
**And** each card has actions: "Add to My Subscriptions", "Ignore", "Not a Subscription"

**Given** the user taps "Add to My Subscriptions"
**When** the confirmation dialog appears
**Then** the detected subscription is pre-filled into the add subscription form
**And** the user can adjust details (name, category, etc.) before saving
**And** upon save, the subscription is added to their list and linked to the detected transaction

**Given** the user taps "Ignore"
**When** the action is confirmed
**Then** the detected subscription is hidden from the review list
**And** it won't be shown again unless the user resets ignored items

### Story 7.5: Match Detected with Manual Subscriptions

As a user,
I want to match auto-detected transactions with my existing manual subscriptions,
So that I avoid duplicates and can verify my tracking is accurate.

**Acceptance Criteria:**

**Given** the user has both manual subscriptions and detected transactions
**When** the matching algorithm runs
**Then** potential matches are identified based on: similar amount (±10%), similar merchant name, similar billing cycle
**And** matches are presented to the user for confirmation

**Given** a match is found between a detected transaction and a manual subscription
**When** the user views the match suggestion
**Then** both items are shown side-by-side with differences highlighted
**And** the user can: "Confirm Match" (link them), "Not a Match" (dismiss), or "Replace" (use detected data)

**Given** the user confirms a match
**When** the linking is saved
**Then** the manual subscription is updated with real transaction data (actual amount, actual date)
**And** future transactions for this merchant automatically update the subscription

### Story 7.6: Dismiss Incorrectly Detected Subscriptions

As a user,
I want to dismiss transactions that were incorrectly identified as subscriptions,
So that my detected list stays accurate and relevant.

**Acceptance Criteria:**

**Given** the user views a detected subscription that isn't actually a subscription
**When** they tap "Not a Subscription"
**Then** the item is marked as a false positive
**And** the detection algorithm learns from this feedback (merchant excluded for this user)
**And** the item is removed from the detected list

**Given** the user has dismissed multiple items
**When** they want to review dismissed items
**Then** a "Dismissed Items" section is available in settings
**And** they can un-dismiss items if needed

### Story 7.7: Bank Connection Status & Management

As a user,
I want to see my bank connection status and manage my connections,
So that I know if my data is being synced correctly.

**Acceptance Criteria:**

**Given** the user has connected bank accounts
**When** they navigate to Settings > Bank Connections
**Then** each connection shows: bank name, status (connected/expired/error), last sync date, and connection expiry date

**Given** a bank connection is in "connected" status
**When** the user views the connection
**Then** a green indicator confirms active status
**And** "Disconnect" and "Refresh Now" actions are available

**Given** a bank connection has expired
**When** the user views the status
**Then** a warning is displayed: "Connection expired. Reconnect to continue auto-detection."
**And** a "Reconnect" button initiates a new OAuth flow

**Given** a bank connection has an error
**When** the user views the status
**Then** the error is explained in user-friendly terms
**And** troubleshooting steps or "Retry" option is provided

### Story 7.8: Manual Bank Data Refresh

As a user,
I want to manually refresh my bank data on demand,
So that I can see the latest transactions without waiting for the daily sync.

**Acceptance Criteria:**

**Given** the user has an active bank connection
**When** they tap "Refresh Now" on the bank connection screen or pull-to-refresh on detected subscriptions
**Then** a fresh transaction sync is triggered via the aggregator API
**And** a loading indicator shows sync progress
**And** new transactions are analyzed for recurring patterns

**Given** the refresh completes successfully
**When** new transactions are processed
**Then** any newly detected subscriptions appear in the review queue
**And** the "Last synced" timestamp is updated

**Given** the refresh fails
**When** the sync cannot complete
**Then** a user-friendly error is displayed with retry option
**And** the previous data remains intact (NFR40: graceful degradation)

### Story 7.9: Bank Connection Expiry Notifications

As a user,
I want to be notified when my bank connection expires or fails,
So that I can reconnect and maintain automatic detection.

**Acceptance Criteria:**

**Given** the user's bank connection is approaching expiry (typically 90 days for PSD2)
**When** the expiry is within 7 days
**Then** a push notification is sent: "Your [Bank Name] connection expires in [X] days. Reconnect to keep auto-detection active."

**Given** the bank connection has expired
**When** the expiry date has passed
**Then** a push notification is sent: "Your [Bank Name] connection has expired. Reconnect now."
**And** an in-app banner is displayed on the dashboard

**Given** the bank connection fails unexpectedly
**When** a sync error occurs
**Then** the user is notified: "There's an issue with your [Bank Name] connection. Check your bank connection settings."
**And** the connection status is updated to "error"

### Story 7.10: Spending Reconciliation View

As a user,
I want to see the difference between my tracked subscriptions and actual bank spending,
So that I can identify subscriptions I might have missed.

**Acceptance Criteria:**

**Given** the user has both manual subscriptions and bank transaction data
**When** they navigate to a "Reconciliation" view (accessible from Dashboard or Settings)
**Then** a comparison is displayed: total tracked (manual) vs. total detected (bank) subscription spending
**And** unmatched bank transactions that look like subscriptions are highlighted
**And** the difference amount is shown prominently

**Given** there are unmatched recurring transactions
**When** the user views the reconciliation
**Then** each unmatched transaction shows: merchant name, amount, frequency
**And** a CTA allows them to add it to their subscription list or dismiss it

**Given** tracked and detected amounts match perfectly
**When** the reconciliation view loads
**Then** a positive confirmation is displayed: "Your tracking is 100% accurate!"
