---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowStatus: complete
completedAt: '2026-01-30'
inputDocuments:
  - path: '_bmad-output/planning-artifacts/prd.md'
    type: prd
    loaded: true
  - path: '_bmad-output/planning-artifacts/ux-design-specification.md'
    type: ux-design
    loaded: true
  - path: '_bmad-output/planning-artifacts/prd-validation-report.md'
    type: validation
    loaded: true
workflowType: 'architecture'
project_name: 'SubTrack'
user_name: 'GOZE'
date: '2026-01-30'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
SubTrack has 49 functional requirements spanning 8 capability areas. The MVP includes 37 requirements focused on manual subscription tracking, notifications, and premium features. Phase 2 adds 12 bank integration requirements for automatic subscription detection via PSD2/Open Banking APIs.

Key architectural drivers from FRs:

- User authentication with biometric support (FR1-FR7)
- CRUD operations for subscriptions with trial tracking (FR8-FR15)
- Real-time dashboard with spending analytics (FR16-FR20)
- Push notification pipeline for renewal reminders (FR21-FR26)
- Calendar integration via native APIs (FR27-FR29)
- In-app purchase for premium tier (FR33-FR37)

**Non-Functional Requirements:**
40 NFRs with heavy emphasis on security (13 requirements, 9 at P0 priority).

Critical NFRs shaping architecture:

- NFR7-NFR16: Comprehensive security (AES-256, TLS 1.3, JWT, certificate pinning)
- NFR1-NFR6: Strict performance targets (2s cold start, 300ms transitions, 60 FPS)
- NFR20-NFR24: High reliability (99% notification delivery, 99.9% sync success)
- NFR29-NFR33: Accessibility (WCAG AA compliance, screen reader support)

**UX Technical Requirements:**

- Design System: React Native Paper (Material Design 3)
- Gesture Support: Swipe actions on list items (left=edit, right=delete)
- Animation Library: react-native-reanimated + Lottie for celebrations
- Navigation: Bottom tab navigation (4 tabs)
- Offline: Not supported in MVP (clear error messaging required)
- Critical Permission: Push notifications (core value proposition)

**Scale & Complexity:**

- Primary domain: Cross-platform Mobile (Fintech-Lite)
- Complexity level: Medium-High
- Estimated architectural components: 15-20 distinct modules

### Technical Constraints & Dependencies

**Platform Constraints:**

- iOS 14+ / Android 10+ minimum support
- React Native 0.73+ framework
- Online-only operation (no offline mode in MVP)

**Security Constraints:**

- GDPR full compliance (Europe target market)
- PSD2 compliance preparation for Phase 2
- No sensitive data in logs
- Biometric data never stored on server

**Integration Dependencies:**

- Firebase Cloud Messaging (Android push)
- Apple Push Notification Service (iOS push)
- Native calendar APIs
- App Store / Play Store billing APIs
- Phase 2: Open Banking aggregator (Tink/Salt Edge/Nordigen)

### Cross-Cutting Concerns Identified

1. **Authentication & Session Management**
   - Affects: All API calls, data access, premium features
   - Pattern: JWT with refresh tokens, biometric unlock

2. **Push Notification Pipeline**
   - Affects: Core value delivery, user retention
   - Pattern: Multi-channel (FCM + APNs + local), delivery tracking

3. **Data Encryption**
   - Affects: All user data, credentials, subscription info
   - Pattern: AES-256 at rest, TLS 1.3 in transit

4. **Premium/Freemium Gating**
   - Affects: Subscription limits, feature access
   - Pattern: Feature flags, entitlement service

5. **Error Handling & Recovery**
   - Affects: All user-facing operations
   - Pattern: User-friendly messages, retry logic, no blame

## Starter Template Evaluation

### Primary Technology Domain

Cross-platform Mobile Application using React Native with Expo managed workflow, targeting iOS 14+ and Android 10+.

### Starter Options Considered

| Option                    | Pros                                            | Cons                                                | Fit     |
| ------------------------- | ----------------------------------------------- | --------------------------------------------------- | ------- |
| Obytes Starter            | Production-ready, Zustand included, CI/CD ready | Uses TailwindCSS (PRD specifies React Native Paper) | Partial |
| Vanilla Expo              | Full control, matches PRD/UX specs exactly      | More manual setup                                   | High    |
| react-native-supa-starter | Supabase pre-configured                         | Less comprehensive, lower maintenance               | Low     |

### Selected Starter: Expo Blank TypeScript

**Rationale for Selection:**

- Allows full alignment with PRD-specified React Native Paper UI library
- Enables React Navigation 6 as specified in PRD
- Provides clean foundation without conflicting opinions
- Expo SDK 54 includes React Native 0.81 with New Architecture support
- Solo developer benefits from managed workflow simplicity

**Initialization Command:**

```bash
npx create-expo-app@latest SubTrack --template blank-typescript
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**

- TypeScript 5.x with strict mode
- Expo SDK 54 (React Native 0.81.4)
- React 19.1.0
- New Architecture enabled by default

**Styling Solution:**

- None pre-configured (React Native Paper to be added per UX spec)

**Build Tooling:**

- Metro bundler with Expo optimizations
- Precompiled XCFrameworks for faster iOS builds
- EAS Build for production builds

**Testing Framework:**

- Jest pre-configured (basic)
- Additional testing libraries to be added

**Code Organization:**

- Minimal structure, to be extended with feature-based architecture

**Development Experience:**

- Expo CLI with hot reloading
- Expo Go for rapid development
- Development builds for native module testing

### Post-Initialization Setup Required

The following will be added after project initialization:

1. **UI Library:** `react-native-paper` + `react-native-safe-area-context`
2. **Navigation:** `@react-navigation/native` + `@react-navigation/bottom-tabs`
3. **State Management:** `zustand` + `@react-native-async-storage/async-storage`
4. **Data Fetching:** `@tanstack/react-query` + `axios`
5. **Forms:** `react-hook-form` + `zod`
6. **Backend:** `@supabase/supabase-js`
7. **Notifications:** `@react-native-firebase/messaging` + `notifee`
8. **Biometric:** `react-native-biometrics`
9. **Calendar:** `react-native-calendar-events`
10. **Secure Storage:** `react-native-keychain`
11. **Animations:** `react-native-reanimated` + `lottie-react-native`
12. **Gestures:** `react-native-gesture-handler`

**Note:** Project initialization should be the first implementation story, followed by dependency installation and basic project structure setup.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Backend Platform: Supabase
- Authentication: Supabase Auth + Biometric
- Database Approach: Database-first with generated types
- Project Structure: Feature-based modular architecture

**Important Decisions (Shape Architecture):**

- State Management: Zustand with AsyncStorage persistence
- API Pattern: Hybrid (Supabase Client + Edge Functions)
- Navigation: React Navigation 6 with AuthStack + MainTabs
- Push Notifications: Supabase + pg_cron + Expo Push API

**Deferred Decisions (Post-MVP):**

- File Storage: Supabase Storage (Phase 2)
- Real-time Features: Evaluate in Phase 2
- Staging Environment: Add when team grows
- Advanced Analytics: Mixpanel/Amplitude in Phase 2

### Data Architecture

| Decision          | Choice             | Version           | Rationale                                                               |
| ----------------- | ------------------ | ----------------- | ----------------------------------------------------------------------- |
| Backend Platform  | Supabase           | Latest            | PostgreSQL for financial data, GDPR-friendly, RLS, MCP server available |
| Database Approach | Database-first     | -                 | SQL migrations, `supabase gen types typescript` for type safety         |
| Caching           | React Query + AsyncStorage | TanStack Query v5 | API cache + persistent local storage for fast app startup               |
| File Storage      | Supabase Storage   | -                 | Deferred to Phase 2 (receipts, bank statements)                         |

**Database Schema Strategy:**

- Migrations managed via Supabase CLI
- Types auto-generated from schema
- Row Level Security (RLS) for all user data tables
- MCP server for direct schema management during development

### Authentication & Security

| Decision           | Choice                            | Rationale                                           |
| ------------------ | --------------------------------- | --------------------------------------------------- |
| Auth Provider      | Supabase Auth                     | Integrated with database, GDPR-compliant            |
| Biometric Strategy | App Unlock + Secure Token Storage | `react-native-biometrics` + `react-native-keychain` |
| Token Storage      | iOS Keychain / Android Keystore   | Secure, encrypted, biometric-protected              |
| Session Management | JWT (1h access / 7d refresh)      | Supabase default with 30min app inactivity lock     |
| Password Policy    | 8+ chars, complexity rules        | Enforced by Supabase Auth                           |
| Failed Login       | 5 attempts → 15 min lockout       | NFR11 compliance                                    |

**Encryption Standards:**

- At Rest: AES-256 (Supabase managed)
- In Transit: TLS 1.3
- Local Storage: AsyncStorage (encrypted via OS-level storage encryption)
- Credentials: iOS Keychain / Android Keystore
- Password Hashing: bcrypt (Supabase managed)

### API & Communication Patterns

| Decision         | Choice                                      | Rationale                                                |
| ---------------- | ------------------------------------------- | -------------------------------------------------------- |
| API Pattern      | Hybrid (Client + Edge Functions)            | Simple CRUD via client, complex logic via Edge Functions |
| Data Fetching    | React Query + Supabase Client               | Caching, background refetch, optimistic updates          |
| Error Handling   | Centralized ErrorBoundary + useErrorHandler | Consistent user-friendly messages                        |
| Real-time        | Not used (MVP)                              | Pull-to-refresh + background refetch sufficient          |
| Offline Handling | "No connection" screen with retry           | MVP is online-only per PRD                               |

**Edge Functions Use Cases:**

- Notification scheduling and dispatch
- Analytics aggregation for dashboard
- Premium entitlement validation
- Phase 2: Bank transaction categorization

### Frontend Architecture

| Decision          | Choice                             | Rationale                                         |
| ----------------- | ---------------------------------- | ------------------------------------------------- |
| Project Structure | Feature-based modular              | Clear boundaries, testable, AI-agent friendly     |
| Component Pattern | Functional + TypeScript interfaces | Modern React, type-safe props                     |
| State Management  | Zustand with slices                | Lightweight, TypeScript-friendly, persist to AsyncStorage |
| Navigation        | React Navigation 6                 | PRD-specified, deep linking support               |

**Project Structure:**

```
src/
├── app/                    # App entry, navigation setup
├── features/
│   ├── auth/              # Login, register, biometric
│   ├── subscriptions/     # CRUD, list, details
│   ├── dashboard/         # Summary, charts
│   ├── notifications/     # Reminder settings
│   ├── settings/          # User preferences, premium
│   └── onboarding/        # First-time user flow
├── shared/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Shared hooks
│   ├── services/          # Supabase client, API
│   ├── stores/            # Zustand stores
│   ├── utils/             # Helpers, formatters
│   └── types/             # Shared TypeScript types
└── config/                # Environment, constants
```

**Zustand Stores:**

- `useAuthStore` - User session, biometric status
- `useSubscriptionStore` - Subscription list, filters
- `useNotificationStore` - Permission status, settings
- `useSettingsStore` - User preferences, theme
- `usePremiumStore` - Premium status, entitlements

**Navigation Structure:**

- AuthStack: Welcome → Login → Register
- MainTabs: Home (Dashboard) | Subscriptions | Add (Modal) | Settings
- Settings Stack: Notifications | Premium | DataExport | Account

### Infrastructure & Deployment

| Decision      | Choice               | Rationale                                              |
| ------------- | -------------------- | ------------------------------------------------------ |
| Build Service | EAS Build            | No local native builds needed, solo developer friendly |
| OTA Updates   | EAS Update           | JS bundle updates without store review                 |
| Environments  | 2 (dev + prod)       | MVP simplicity, staging added later                    |
| CI/CD         | GitHub Actions + EAS | PR checks, auto builds on merge                        |

**Push Notification Architecture:**

```
User sets reminder → Supabase DB
                          ↓
              pg_cron job (daily)
                          ↓
              Edge Function (calculate notifications)
                          ↓
              Expo Push API → APNs/FCM
                          ↓
              User device
```

**Monitoring & Logging:**

- Crash Reporting: Sentry (free tier, 5K errors/month)
- Backend Logs: Supabase Dashboard
- Analytics: Deferred to Phase 2 (store analytics sufficient for MVP)

**CI/CD Pipeline:**

- PR: Lint → Type check → Unit tests
- Merge to develop: EAS Build (development)
- Merge to main: EAS Build (production)
- Store Submit: Manual trigger via EAS Submit

### Decision Impact Analysis

**Implementation Sequence:**

1. Project initialization (Expo + dependencies)
2. Supabase project setup + schema
3. Authentication flow
4. Core subscription CRUD
5. Dashboard & analytics
6. Push notification pipeline
7. Premium/IAP integration
8. Polish & testing

**Cross-Component Dependencies:**

- Auth → All features (required first)
- Supabase schema → All data operations
- Zustand stores → All screens
- Push notifications → Supabase Edge Functions + pg_cron
- Premium → IAP libraries + entitlement checks

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices, all now standardized.

### Naming Patterns

**Database Naming Conventions (Supabase PostgreSQL):**

| Element      | Convention                 | Example                                  |
| ------------ | -------------------------- | ---------------------------------------- |
| Tables       | snake_case, plural         | `subscriptions`, `reminder_settings`     |
| Columns      | snake_case                 | `user_id`, `billing_cycle`, `created_at` |
| Primary Keys | `id` (UUID)                | `id`                                     |
| Foreign Keys | `{table}_id`               | `user_id`, `subscription_id`             |
| Timestamps   | `created_at`, `updated_at` | Supabase default                         |
| Booleans     | `is_` prefix               | `is_active`, `is_trial`                  |

**Code Naming Conventions (TypeScript/React Native):**

| Element          | Convention              | Example                               |
| ---------------- | ----------------------- | ------------------------------------- |
| Components       | PascalCase              | `SubscriptionCard`, `DashboardScreen` |
| Component Files  | PascalCase.tsx          | `SubscriptionCard.tsx`                |
| Utility Files    | camelCase.ts            | `dateUtils.ts`, `formatCurrency.ts`   |
| Hooks            | camelCase, `use` prefix | `useSubscriptions.ts`                 |
| Functions        | camelCase               | `getSubscriptions`, `formatPrice`     |
| Variables        | camelCase               | `subscriptionList`, `isLoading`       |
| Constants        | SCREAMING_SNAKE_CASE    | `MAX_FREE_SUBSCRIPTIONS`              |
| Types/Interfaces | PascalCase              | `Subscription`, `UserSettings`        |
| Zustand Stores   | camelCase, `use` prefix | `useAuthStore`                        |

### Structure Patterns

**Test File Location:** Co-located with source files

```
features/subscriptions/
├── components/
│   ├── SubscriptionCard.tsx
│   ├── SubscriptionCard.test.tsx  ← Co-located
│   └── SubscriptionList.tsx
```

**Feature Module Structure:**

```
features/{feature-name}/
├── components/           # Feature-specific UI components
│   ├── ComponentName.tsx
│   └── ComponentName.test.tsx
├── hooks/               # Feature-specific hooks
│   └── useFeatureHook.ts
├── screens/             # Screen components
│   └── FeatureScreen.tsx
├── services/            # Feature-specific API calls
│   └── featureService.ts
├── types/               # Feature-specific types
│   └── index.ts
└── index.ts             # Public exports
```

### Format Patterns

**API Response Handling:**

Supabase client standard response:

```typescript
const { data, error } = await supabase.from('subscriptions').select('*');
```

**Internal Error Format:**

```typescript
interface AppError {
  code: string; // 'AUTH_FAILED', 'NETWORK_ERROR'
  message: string; // User-friendly message
  details?: unknown; // Technical details (dev only)
}
```

**Date/Time Handling:**

| Context        | Format          | Library                |
| -------------- | --------------- | ---------------------- |
| Database       | ISO 8601 UTC    | Supabase default       |
| API Transfer   | ISO 8601 string | `2026-01-30T10:00:00Z` |
| Display        | Localized       | `date-fns` with locale |
| Storage (AsyncStorage) | ISO 8601 string | Serializable           |

### Communication Patterns

**Zustand Store Pattern:**

```typescript
interface FeatureState {
  // State
  items: Item[];
  isLoading: boolean;
  error: AppError | null;

  // Actions
  fetchItems: () => Promise<void>;
  addItem: (data: CreateItemDTO) => Promise<void>;
  updateItem: (id: string, data: UpdateItemDTO) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Selectors (computed)
  getFilteredItems: () => Item[];
}
```

**Store Rules:**

- State and Actions in same store
- Async actions inside store with try/catch
- Error state managed in store
- Loading state is global per store, not per-action

### Process Patterns

**Loading State Pattern:**

```typescript
interface AsyncState {
  isLoading: boolean; // Primary loading (initial)
  isRefreshing: boolean; // Pull-to-refresh
  isSubmitting: boolean; // Form submission
}
```

**UI Mapping:**

- `isLoading` → Full screen spinner
- `isRefreshing` → Pull-to-refresh indicator
- `isSubmitting` → Button disabled + spinner

**Error Handling Pattern:**

```typescript
const handleError = (error: unknown): AppError => {
  if (error instanceof AuthError) {
    return { code: 'AUTH_ERROR', message: 'Session expired' };
  }
  if (error instanceof PostgrestError) {
    return { code: 'DB_ERROR', message: 'Failed to load data' };
  }
  return { code: 'UNKNOWN', message: 'An error occurred' };
};
```

**Store Error Handling:**

```typescript
fetchItems: async () => {
  set({ isLoading: true, error: null });
  try {
    const { data, error } = await supabase.from('items').select('*');
    if (error) throw error;
    set({ items: data, isLoading: false });
  } catch (err) {
    set({ error: handleError(err), isLoading: false });
  }
};
```

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow naming conventions exactly as specified (no variations)
2. Use co-located test files within feature directories
3. Implement Zustand stores using the standard pattern
4. Handle errors using centralized `handleError` function
5. Use ISO 8601 for all date/time storage and transfer
6. Structure features using the standard module template

**Pattern Verification:**

- ESLint rules enforce naming conventions
- PR reviews check pattern compliance
- TypeScript interfaces enforce data structures

### Pattern Examples

**Good Examples:**

```typescript
// ✅ Correct: Component naming
export const SubscriptionCard: React.FC<SubscriptionCardProps> = () => {};

// ✅ Correct: Store naming and pattern
export const useSubscriptionStore = create<SubscriptionState>(set => ({
  subscriptions: [],
  isLoading: false,
  error: null,
  fetchSubscriptions: async () => {
    /* pattern */
  },
}));

// ✅ Correct: Database query
const { data, error } = await supabase
  .from('subscriptions')
  .select('id, name, price, billing_cycle, is_active');
```

**Anti-Patterns:**

```typescript
// ❌ Wrong: camelCase in database
.from('subscriptions').select('userId, billingCycle')

// ❌ Wrong: Inconsistent file naming
subscription-card.tsx  // Should be SubscriptionCard.tsx

// ❌ Wrong: Separate test directory
__tests__/SubscriptionCard.test.tsx  // Should be co-located

// ❌ Wrong: Error handling outside store
const data = await fetchSubscriptions(); // No try/catch in store
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
SubTrack/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test on PR
│       ├── build-dev.yml             # EAS Build for development
│       └── build-prod.yml            # EAS Build for production
├── app.json                          # Expo app configuration
├── eas.json                          # EAS Build configuration
├── babel.config.js                   # Babel configuration
├── metro.config.js                   # Metro bundler config
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Dependencies
├── .eslintrc.js                      # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── .gitignore                        # Git ignore rules
├── .env.example                      # Environment template
├── .env.development                  # Dev environment (git ignored)
├── .env.production                   # Prod environment (git ignored)
├── README.md                         # Project documentation
│
├── src/
│   ├── app/                          # App entry & navigation
│   │   ├── App.tsx
│   │   ├── navigation/
│   │   │   ├── index.tsx
│   │   │   ├── AuthStack.tsx
│   │   │   ├── MainTabs.tsx
│   │   │   ├── SettingsStack.tsx
│   │   │   └── types.ts
│   │   └── providers/
│   │       ├── index.tsx
│   │       ├── QueryProvider.tsx
│   │       ├── ThemeProvider.tsx
│   │       └── AuthProvider.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── subscriptions/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── premium/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   └── onboarding/
│   │       ├── components/
│   │       ├── screens/
│   │       └── index.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── feedback/
│   │   │   └── layout/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── utils/
│   │   └── types/
│   │
│   └── config/
│       ├── env.ts
│       ├── theme.ts
│       ├── categories.ts
│       └── index.ts
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── functions/
│   │   ├── send-notification/
│   │   ├── calculate-reminders/
│   │   └── validate-premium/
│   └── seed.sql
│
├── assets/
│   ├── images/
│   ├── animations/
│   └── fonts/
│
└── __mocks__/
```

### Architectural Boundaries

**API Boundaries:**

| Boundary         | Location                      | Responsibility                                   |
| ---------------- | ----------------------------- | ------------------------------------------------ |
| Supabase Client  | `shared/services/supabase.ts` | Single entry point for all Supabase operations   |
| Feature Services | `features/*/services/`        | Feature-specific API calls using Supabase client |
| Edge Functions   | `supabase/functions/`         | Server-side logic (notifications, validation)    |

**Component Boundaries:**

| Boundary           | Rule                                              |
| ------------------ | ------------------------------------------------- |
| Feature → Feature  | No direct imports; communicate via Zustand stores |
| Feature → Shared   | Features can import from `shared/`                |
| Shared → Feature   | Never import feature code into shared             |
| Screen → Component | Screens compose feature components                |

**Data Boundaries:**

| Layer    | Access Pattern                             |
| -------- | ------------------------------------------ |
| Screens  | Read from Zustand stores, dispatch actions |
| Stores   | Call services, manage state                |
| Services | Call Supabase client, return typed data    |
| Supabase | RLS enforces user data isolation           |

### Requirements to Structure Mapping

**Feature Mapping:**

| PRD Requirement             | Feature Module           | Key Files                                           |
| --------------------------- | ------------------------ | --------------------------------------------------- |
| FR1-FR7 (User Management)   | `features/auth`          | `authService.ts`, `useAuthStore.ts`                 |
| FR8-FR15 (Subscriptions)    | `features/subscriptions` | `subscriptionService.ts`, `useSubscriptionStore.ts` |
| FR16-FR20 (Dashboard)       | `features/dashboard`     | `useDashboardStats.ts`, `SpendingHero.tsx`          |
| FR21-FR26 (Notifications)   | `features/notifications` | `notificationService.ts`, `useNotificationStore.ts` |
| FR27-FR29 (Calendar)        | `features/subscriptions` | Integrated in `subscriptionService.ts`              |
| FR30-FR32 (Data Management) | `features/settings`      | `DataExportScreen.tsx`                              |
| FR33-FR37 (Premium)         | `features/premium`       | `purchaseService.ts`, `usePremiumStore.ts`          |

**Cross-Cutting Concerns:**

| Concern              | Location                           | Used By                 |
| -------------------- | ---------------------------------- | ----------------------- |
| Authentication State | `shared/stores/useAuthStore.ts`    | All features            |
| Error Handling       | `shared/services/errorHandler.ts`  | All services            |
| Theme & Styling      | `config/theme.ts`                  | All components          |
| Network Status       | `shared/hooks/useNetworkStatus.ts` | All screens             |
| Premium Gating       | `shared/stores/usePremiumStore.ts` | subscriptions, settings |

### Integration Points

**Internal Communication:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Screens   │ ──▶ │   Stores    │ ──▶ │  Services   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      │ UI Events         │ State Updates      │ API Calls
      ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Components  │     │  React Query │     │  Supabase   │
└─────────────┘     └─────────────┘     └─────────────┘
```

**External Integrations:**

| Service        | Integration Point                  | Configuration   |
| -------------- | ---------------------------------- | --------------- |
| Supabase       | `shared/services/supabase.ts`      | `config/env.ts` |
| Expo Push      | `features/notifications/services/` | `app.json`      |
| App Store IAP  | `features/premium/services/`       | `app.json`      |
| Play Store IAP | `features/premium/services/`       | `app.json`      |
| Sentry         | `src/app/App.tsx`                  | `config/env.ts` |

**Data Flow:**

```
User Action
    ↓
Screen (dispatch action)
    ↓
Zustand Store (set loading, call service)
    ↓
Service (Supabase query)
    ↓
Supabase (RLS check → PostgreSQL)
    ↓
Service (return typed data)
    ↓
Store (update state)
    ↓
Screen (re-render with new data)
```

### File Organization Patterns

**Configuration Files:**

| File              | Purpose               | Environment-Specific |
| ----------------- | --------------------- | -------------------- |
| `app.json`        | Expo configuration    | No                   |
| `eas.json`        | Build profiles        | No                   |
| `.env.*`          | Environment variables | Yes                  |
| `config/env.ts`   | Runtime env access    | No                   |
| `config/theme.ts` | UI theme tokens       | No                   |

**Source Organization:**

| Directory      | Contains                     | Import Alias  |
| -------------- | ---------------------------- | ------------- |
| `src/app`      | Entry, navigation, providers | `@app/*`      |
| `src/features` | Feature modules              | `@features/*` |
| `src/shared`   | Shared code                  | `@shared/*`   |
| `src/config`   | Configuration                | `@config/*`   |

**Test Organization:**

| Test Type       | Location                  | Naming                   |
| --------------- | ------------------------- | ------------------------ |
| Unit Tests      | Co-located with source    | `*.test.tsx`             |
| Component Tests | Co-located with component | `ComponentName.test.tsx` |
| Hook Tests      | Co-located with hook      | `useHookName.test.ts`    |
| E2E Tests       | `e2e/` (if added later)   | `*.e2e.ts`               |

### Development Workflow Integration

**Development Server:**

```bash
npx expo start                 # Start Metro bundler
npx expo start --ios          # Start with iOS simulator
npx expo start --android      # Start with Android emulator
```

**Build Process:**

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile production --platform all
```

**Database Workflow:**

```bash
supabase start                 # Local Supabase
supabase db reset             # Reset with migrations
supabase gen types typescript  # Generate types
supabase functions serve      # Test Edge Functions
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices validated as compatible:

- Expo SDK 54 + React Native Paper: Fully compatible
- Supabase + React Query: Complementary caching strategies
- Zustand + AsyncStorage: Native persist middleware support
- TypeScript throughout: Consistent type safety

**Pattern Consistency:**
All implementation patterns align with technology choices:

- Database snake_case matches PostgreSQL conventions
- Code naming follows TypeScript/React community standards
- Feature-based structure enables pattern enforcement

**Structure Alignment:**
Project structure fully supports architectural decisions:

- Each feature module has corresponding store, service, types
- Shared components respect boundary rules
- Integration points clearly defined

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

- MVP FRs (37/37): 100% architecturally supported
- Phase 2 FRs (12): Architecture prepared for future integration

**Non-Functional Requirements Coverage:**

- Performance (NFR1-6): Addressed via Expo optimizations, React Query caching
- Security (NFR7-19): Comprehensive encryption, auth, and compliance measures
- Reliability (NFR20-24): Multi-channel notifications, error recovery patterns
- Accessibility (NFR29-33): React Native Paper WCAG AA support

### Implementation Readiness Validation ✅

**Decision Completeness:**

- All critical decisions documented with specific versions
- Technology rationale provided for each choice
- Code examples included for all major patterns
- Anti-patterns documented to prevent common mistakes

**Structure Completeness:**

- Complete directory tree with all files and folders
- Feature-to-structure mapping for all PRD requirements
- Integration points and data flow documented
- Import aliases defined for clean imports

**Pattern Completeness:**

- Naming conventions cover database, code, and files
- Error handling centralized with user-friendly messages
- Loading states standardized across the app
- Zustand store pattern template provided

### Gap Analysis Results

**Critical Gaps:** None identified ✅

**Minor Gaps (Non-blocking):**

| Gap                     | Resolution                                    |
| ----------------------- | --------------------------------------------- |
| Database schema details | Create via Supabase MCP during implementation |
| Lottie animation files  | Add as assets per UX specification            |
| ESLint configuration    | Adopt from Expo or Obytes starter             |

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (medium-high)
- [x] Technical constraints identified (GDPR, PSD2-ready)
- [x] Cross-cutting concerns mapped (5 concerns)

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**

1. Complete technology stack with verified compatibility
2. Comprehensive implementation patterns prevent AI agent conflicts
3. Clear feature boundaries enable parallel development
4. Supabase MCP integration accelerates database development
5. Well-documented patterns with examples and anti-patterns

**Areas for Future Enhancement:**

1. Add staging environment when team grows
2. Implement advanced analytics in Phase 2
3. Consider real-time features for Phase 2 collaboration
4. Add E2E testing framework (Maestro) post-MVP

### Implementation Handoff

**AI Agent Guidelines:**

1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and feature boundaries
4. Use Supabase MCP for database operations when available
5. Refer to this document for all architectural questions

**First Implementation Priority:**

```bash
# 1. Initialize project
npx create-expo-app@latest SubTrack --template blank-typescript

# 2. Install core dependencies
npx expo install react-native-paper react-native-safe-area-context
npx expo install @react-navigation/native @react-navigation/bottom-tabs
npx expo install zustand @react-native-async-storage/async-storage
npx expo install @supabase/supabase-js
npx expo install @tanstack/react-query

# 3. Set up Supabase
supabase init
supabase start
```
