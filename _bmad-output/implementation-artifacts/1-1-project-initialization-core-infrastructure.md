# Story 1.1: Project Initialization & Core Infrastructure

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to initialize the SubTrack project with Expo, install core dependencies, configure Supabase, and set up the feature-based project structure,
So that there is a solid foundation for all subsequent feature development.

## Acceptance Criteria

1. **AC1 - Expo Project Created:** An Expo TypeScript project is created with `npx create-expo-app@latest SubTrack --template blank-typescript` using Expo SDK 54 (React Native 0.81, React 19.1.0).
2. **AC2 - Core Dependencies Installed:** All core dependencies are installed: react-native-paper (^5.15.0), @react-navigation/native (^7.x), @react-navigation/bottom-tabs (^7.x), zustand (^5.x), react-native-mmkv (^4.x), @supabase/supabase-js (^2.x), @tanstack/react-query (^5.x), react-hook-form (^7.x), zod (^4.x), @hookform/resolvers (^5.x), react-native-reanimated (^4.x), react-native-gesture-handler (^2.x), react-native-safe-area-context, lottie-react-native.
3. **AC3 - Feature-Based Project Structure:** The feature-based project structure is created under `src/` with `app/`, `features/`, `shared/`, `config/` directories following the architecture specification exactly.
4. **AC4 - Import Aliases Configured:** Import aliases are configured in `tsconfig.json` and `babel.config.js`: `@app/*`, `@features/*`, `@shared/*`, `@config/*`.
5. **AC5 - Supabase Initialized:** Supabase project is initialized with `supabase init` and local development configuration is in place.
6. **AC6 - Environment Configuration:** Environment configuration files (`.env.example`, `.env.development`) are created with Supabase URL and anon key placeholders. Runtime env access via `config/env.ts`.
7. **AC7 - Theme Configured:** React Native Paper MD3 theme is configured with SubTrack brand colors — Primary: #6366F1 (Indigo), Secondary: #8B5CF6 (Purple), Tertiary: #10B981 (Green).
8. **AC8 - Bottom Tab Navigation:** Bottom tab navigation structure is set up with 4 tabs: Home (Dashboard), Subscriptions, Add (Modal), Settings — using React Navigation v7 with AuthStack and MainTabs structure.
9. **AC9 - App Launches Successfully:** The app launches successfully on both iOS simulator and Android emulator without errors.
10. **AC10 - Linting & Formatting:** ESLint and Prettier configurations are in place with TypeScript strict mode enabled.

## Tasks / Subtasks

- [ ] Task 1: Initialize Expo project (AC: #1)
  - [ ] 1.1 Run `npx create-expo-app@latest SubTrack --template blank-typescript`
  - [ ] 1.2 Verify Expo SDK 54, React Native 0.81, React 19.1.0 in package.json
  - [ ] 1.3 Verify the app runs with `npx expo start` on both platforms
- [ ] Task 2: Install all core dependencies (AC: #2)
  - [ ] 2.1 Install UI: `npx expo install react-native-paper react-native-safe-area-context`
  - [ ] 2.2 Install Navigation: `npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack`
  - [ ] 2.3 Install State: `npx expo install zustand react-native-mmkv`
  - [ ] 2.4 Install Backend: `npx expo install @supabase/supabase-js`
  - [ ] 2.5 Install Data Fetching: `npx expo install @tanstack/react-query`
  - [ ] 2.6 Install Forms: `npm install react-hook-form zod @hookform/resolvers`
  - [ ] 2.7 Install Animation: `npx expo install react-native-reanimated react-native-worklets lottie-react-native`
  - [ ] 2.8 Install Gestures: `npx expo install react-native-gesture-handler`
  - [ ] 2.9 Verify no dependency conflicts, run app successfully
- [ ] Task 3: Create feature-based project structure (AC: #3)
  - [ ] 3.1 Create `src/app/` with `App.tsx`, `navigation/`, `providers/`
  - [ ] 3.2 Create `src/features/` with subdirectories: `auth/`, `subscriptions/`, `dashboard/`, `notifications/`, `settings/`, `premium/`, `onboarding/`
  - [ ] 3.3 Create each feature module structure: `components/`, `screens/`, `hooks/`, `services/`, `types/`, `index.ts`
  - [ ] 3.4 Create `src/shared/` with: `components/` (ui/, feedback/, layout/), `hooks/`, `services/`, `stores/`, `utils/`, `types/`
  - [ ] 3.5 Create `src/config/` with: `env.ts`, `theme.ts`, `categories.ts`, `index.ts`
- [ ] Task 4: Configure import aliases (AC: #4)
  - [ ] 4.1 Update `tsconfig.json` with path aliases: `@app/*`, `@features/*`, `@shared/*`, `@config/*`
  - [ ] 4.2 Install and configure `babel-plugin-module-resolver` in `babel.config.js`
  - [ ] 4.3 Verify aliases resolve correctly in a test import
- [ ] Task 5: Initialize Supabase (AC: #5)
  - [ ] 5.1 Run `supabase init` in project root
  - [ ] 5.2 Configure `supabase/config.toml` for local development
  - [ ] 5.3 Create placeholder directories: `supabase/migrations/`, `supabase/functions/`
- [ ] Task 6: Set up environment configuration (AC: #6)
  - [ ] 6.1 Create `.env.example` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` placeholders
  - [ ] 6.2 Create `.env.development` with local Supabase values (git-ignored)
  - [ ] 6.3 Implement `src/config/env.ts` for typed runtime env access
  - [ ] 6.4 Ensure `.env.development` and `.env.production` are in `.gitignore`
- [ ] Task 7: Configure React Native Paper theme (AC: #7)
  - [ ] 7.1 Create `src/config/theme.ts` with MD3 theme extending `MD3LightTheme`
  - [ ] 7.2 Set brand colors: primary #6366F1, secondary #8B5CF6, tertiary #10B981
  - [ ] 7.3 Create `src/app/providers/ThemeProvider.tsx` wrapping `PaperProvider`
  - [ ] 7.4 Configure `src/config/categories.ts` with 8 preset category colors
- [ ] Task 8: Set up navigation structure (AC: #8)
  - [ ] 8.1 Create `src/app/navigation/AuthStack.tsx` (Welcome → Login → Register placeholders)
  - [ ] 8.2 Create `src/app/navigation/MainTabs.tsx` (Home | Subscriptions | Add | Settings)
  - [ ] 8.3 Create `src/app/navigation/SettingsStack.tsx` (placeholder)
  - [ ] 8.4 Create `src/app/navigation/index.tsx` with root navigator and auth state conditional
  - [ ] 8.5 Create `src/app/navigation/types.ts` with typed navigation params
  - [ ] 8.6 Create placeholder screens for each tab with basic UI
- [ ] Task 9: Configure providers and app entry (AC: #9)
  - [ ] 9.1 Create `src/app/providers/QueryProvider.tsx` wrapping `QueryClientProvider`
  - [ ] 9.2 Create `src/app/providers/AuthProvider.tsx` (placeholder with auth state context)
  - [ ] 9.3 Create `src/app/providers/index.tsx` composing all providers
  - [ ] 9.4 Update `src/app/App.tsx` as root entry with all providers
  - [ ] 9.5 Wire App.tsx into Expo entry point
  - [ ] 9.6 Verify app launches on iOS simulator and Android emulator
- [ ] Task 10: Configure ESLint and Prettier (AC: #10)
  - [ ] 10.1 Create `.eslintrc.js` with TypeScript + React Native rules
  - [ ] 10.2 Create `.prettierrc` with consistent formatting rules
  - [ ] 10.3 Enable TypeScript strict mode in `tsconfig.json`
  - [ ] 10.4 Add lint script to `package.json`
  - [ ] 10.5 Run lint and fix any initial issues

## Dev Notes

### Critical Technical Requirements

**Expo SDK 54 Specifics:**
- New Architecture is enabled by default — DO NOT disable it
- Android edge-to-edge mode is mandatory in SDK 54 (cannot be opted out)
- `react-native-reanimated` v4 requires `react-native-worklets` as a peer dependency
- Babel config MUST include `react-native-worklets/plugin` for Reanimated v4 to work
- Use `npx expo install` for all Expo-compatible packages to ensure version compatibility
- SDK 55 is in beta — DO NOT use it, stick with SDK 54 stable

**React Navigation v7 (NOT v6):**
- The architecture doc references React Navigation 6, but the current stable is **v7**. Use v7.
- v7 breaking change: `@react-navigation/material-bottom-tabs` was removed. Use `react-native-paper/react-navigation` integration for MD3-compatible bottom tabs instead.
- v7 uses a new `StaticNavigation` API but the dynamic API still works. Use the dynamic API for consistency with auth state management.
- Install `@react-navigation/native-stack` for stack navigators (not `@react-navigation/stack`).

**Zustand v5 (NOT v4):**
- Zustand v5 has a cleaner TypeScript API
- `useShallow` helper hook is available for selector optimization
- Slice pattern is supported but syntax differs from v4 examples
- MMKV persistence middleware: use `zustand/middleware` with `persist` and custom MMKV storage adapter

**Zod v4 (Major Breaking Change from v3):**
- Zod v4 has significant API changes from v3
- Use `@hookform/resolvers` ^5.x which supports Zod v4
- Import from `zod` (not `zod/v4` or other paths)
- Native JSON Schema generation is now built-in

**react-native-mmkv v4:**
- Rewritten as a Nitro Module — requires New Architecture (OK with SDK 54)
- API is largely the same as v3 but ensure import paths are correct
- Use for Zustand persistence and fast key-value storage

### Architecture Compliance

**MANDATORY Architecture Patterns — Do NOT Deviate:**

1. **Project Structure:** Feature-based modular architecture under `src/`. Every feature gets its own directory under `src/features/` with standardized subdirectories.

2. **Component Boundaries:**
   - Feature → Feature: NO direct imports. Communicate only via Zustand stores.
   - Feature → Shared: Features CAN import from `shared/`
   - Shared → Feature: NEVER import feature code into shared
   - Screen → Component: Screens compose feature components

3. **Naming Conventions (Enforced):**
   - Components: `PascalCase` files (`SubscriptionCard.tsx`)
   - Utilities: `camelCase` files (`dateUtils.ts`)
   - Hooks: `camelCase` with `use` prefix (`useSubscriptions.ts`)
   - Constants: `SCREAMING_SNAKE_CASE` (`MAX_FREE_SUBSCRIPTIONS`)
   - Types/Interfaces: `PascalCase` (`Subscription`, `UserSettings`)
   - Zustand Stores: `camelCase` with `use` prefix (`useAuthStore`)

4. **Navigation Structure:**
   - AuthStack: Welcome → Login → Register
   - MainTabs: Home (Dashboard) | Subscriptions | Add (Modal) | Settings
   - Settings Stack: Notifications | Premium | DataExport | Account

5. **Provider Hierarchy (App.tsx):**
   ```
   SafeAreaProvider → GestureHandlerRootView → QueryClientProvider → PaperProvider (themed) → AuthProvider → NavigationContainer → RootNavigator
   ```

6. **Environment Variables:**
   - Use `EXPO_PUBLIC_` prefix for client-accessible env vars (Expo convention)
   - Never hardcode Supabase URLs or keys in source code
   - `.env.example` committed to git, `.env.development` and `.env.production` git-ignored

### Library & Framework Requirements

**Exact Dependency Installation Order (use `npx expo install` where possible):**

```bash
# Step 1: UI Framework
npx expo install react-native-paper react-native-safe-area-context

# Step 2: Navigation
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens

# Step 3: State Management
npx expo install zustand react-native-mmkv

# Step 4: Backend
npx expo install @supabase/supabase-js

# Step 5: Data Fetching
npx expo install @tanstack/react-query

# Step 6: Forms (not Expo-managed, use npm)
npm install react-hook-form zod @hookform/resolvers

# Step 7: Animations
npx expo install react-native-reanimated react-native-worklets lottie-react-native

# Step 8: Gestures
npx expo install react-native-gesture-handler
```

**Babel Configuration (babel.config.js) — CRITICAL ORDER:**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./src'],
        alias: {
          '@app': './src/app',
          '@features': './src/features',
          '@shared': './src/shared',
          '@config': './src/config',
        },
      }],
      'react-native-worklets/plugin',    // MUST be before reanimated
      'react-native-reanimated/plugin',  // MUST be LAST plugin
    ],
  };
};
```

**tsconfig.json Path Aliases:**
```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@config/*": ["src/config/*"]
    }
  }
}
```

### File Structure Requirements

**Complete Directory Tree to Create:**

```
SubTrack/
├── src/
│   ├── app/
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
│   └── seed.sql
│
├── assets/
│   ├── images/
│   ├── animations/
│   └── fonts/
│
├── .github/
│   └── workflows/
│
├── .eslintrc.js
├── .prettierrc
├── .env.example
├── .gitignore
├── app.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── package.json
└── README.md
```

**Empty Directory Handling:**
- Each empty directory should contain a `.gitkeep` file or a placeholder `index.ts` that exports nothing, so git tracks the directory structure.
- Feature `index.ts` files should export empty barrel: `// Feature public exports`

### Testing Requirements

- This is a foundation story — no unit tests are required for placeholder screens
- Ensure Jest is configured by Expo (comes pre-configured with blank-typescript template)
- Test file convention: co-located with source (`ComponentName.test.tsx`)
- Verify the app compiles without TypeScript errors: `npx tsc --noEmit`
- Verify ESLint passes: `npx eslint src/ --ext .ts,.tsx`
- **Manual smoke test:** App launches → shows bottom tabs → can navigate between tabs

### Project Structure Notes

- This story establishes the canonical project structure that ALL subsequent stories must follow
- The feature-based architecture enables parallel development and clear boundaries
- Import aliases (`@app/*`, `@features/*`, etc.) must be used from Story 1.2 onwards — no relative imports crossing module boundaries
- Detected conflicts: Architecture doc says React Navigation 6 but latest stable is v7. **Decision: Use v7** as it is the current stable release and v6 is legacy.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Project Initialization & Core Infrastructure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation]
- [Source: _bmad-output/planning-artifacts/prd.md#Technical Architecture]

### Latest Technology Information (February 2026)

| Package | Verified Version | Critical Notes |
|---|---|---|
| Expo SDK | 54.0.33 (stable) | SDK 55 beta exists — do NOT use |
| React Native | 0.81.x | New Architecture default |
| React | 19.1.0 | Comes with SDK 54 |
| react-native-paper | ^5.15.0 | Full MD3 support |
| @react-navigation/native | ^7.1.28 | v7 stable (NOT v6) |
| @react-navigation/bottom-tabs | ^7.12.0 | v7 stable |
| zustand | ^5.0.11 | v5 with new TS API |
| @tanstack/react-query | ^5.90.21 | Single object signature for hooks |
| @supabase/supabase-js | ^2.95.3 | Latest v2 |
| react-native-mmkv | ^4.1.2 | Nitro Module, requires New Arch |
| react-hook-form | ^7.71.1 | Stable |
| zod | ^4.3.6 | v4 major breaking changes from v3 |
| @hookform/resolvers | ^5.2.2 | Supports Zod v4 |
| react-native-reanimated | ^4.2.1 | Requires react-native-worklets peer dep |
| react-native-gesture-handler | ^2.30.0 | v3 beta exists — do NOT use |
| react-native-worklets | latest | Required peer dep for Reanimated v4 |
| lottie-react-native | latest | For celebration animations in later stories |

**Version Pinning Strategy:**
- Use `npx expo install` for Expo-compatible packages (auto-resolves compatible versions)
- Use `npm install` only for packages not in Expo ecosystem (react-hook-form, zod, @hookform/resolvers)
- Do NOT pin exact versions — use caret (^) ranges to receive patch updates

### Project Context

- **Project:** SubTrack — Cross-platform subscription tracking mobile app
- **Domain:** Fintech-Lite, targeting European market (GDPR/PSD2 compliant)
- **Team:** Solo developer
- **Tech Stack:** Expo (React Native) + Supabase (PostgreSQL) + TypeScript
- **Business Model:** Freemium (5 free subs → €2.99/month or €24.99/year premium)
- **MVP Scope:** 37 functional requirements across 7 epics
- **This Story:** Foundation epic (Epic 1, Story 1) — ALL other stories depend on this
- **Architecture Doc:** `_bmad-output/planning-artifacts/architecture.md`
- **PRD:** `_bmad-output/planning-artifacts/prd.md`
- **UX Spec:** `_bmad-output/planning-artifacts/ux-design-specification.md`
- **Epics:** `_bmad-output/planning-artifacts/epics.md`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created

### File List
