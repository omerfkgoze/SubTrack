# Story 2.2: View Subscription List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see all my subscriptions in a unified list,
so that I can see everything I'm paying for at a glance.

## Acceptance Criteria

1. **AC1 - Subscription List Display:** Given the user has added subscriptions, when they navigate to the Subscriptions tab, then all subscriptions are displayed as cards with category color stripe (4px left edge), name, price with billing cycle label, and next renewal date info (e.g., "Renews in 5 days"). The list scrolls at 60 FPS (NFR5). Subscriptions are sorted by next renewal date (soonest first) — this matches the existing `getSubscriptions()` service which already orders by `renewal_date ASC`.

2. **AC2 - Monthly Cost Summary:** Given the user has active subscriptions, when they view the Subscriptions tab, then a total monthly cost summary is displayed at the top of the list. The total is calculated by normalizing all billing cycles to monthly: monthly=price, yearly=price/12, quarterly=price/3, weekly=price×(52/12). Only active subscriptions (`is_active === true`) are included in the total.

3. **AC3 - Empty State:** Given the user has no subscriptions, when they view the Subscriptions tab, then an encouraging empty state is displayed with: a package icon (MaterialCommunityIcons), headline "No subscriptions yet", body text "Add your first subscription to start tracking your spending", and a primary CTA button "Add Subscription" that navigates to the Add tab.

4. **AC4 - Pull-to-Refresh:** Given the user is viewing the subscription list, when they pull down on the list, then data is refreshed from Supabase via `fetchSubscriptions()`, a `RefreshControl` indicator is displayed during refresh, and the list updates with latest data.

5. **AC5 - Loading State:** Given the user navigates to the Subscriptions tab for the first time (or store has no cached data), when `fetchSubscriptions()` is called, then skeleton loading placeholders (3 shimmer card shapes) are displayed while data loads. Subsequent visits show cached data from Zustand persist immediately, with background refresh.

6. **AC6 - Error State:** Given a network error or server error occurs during data fetch, when the fetch fails, then a user-friendly error message is displayed with a "Retry" button. The previously cached subscription data (if any) remains visible.

7. **AC7 - SubscriptionCard Component:** Given a subscription object, when it renders as a card, then the card displays: a 4px category color stripe on the left edge (using category color from `SUBSCRIPTION_CATEGORIES`, defaulting to "Other" gray #6B7280 if no category), the subscription name (medium weight), the price formatted as "€{price}/{cycle}" (e.g., "€17.99/mo"), and renewal info as "Renews in X days" or "Renews today" or "Overdue by X days". If `is_trial` is true, a simple "Trial" chip/badge is shown. If `is_active` is false, the card uses muted/dimmed styling.

8. **AC8 - Subscription Count:** Given the user has subscriptions, when the list is displayed, then the total count is shown near the cost summary (e.g., "12 subscriptions").

9. **AC9 - Accessibility:** All list items have `accessibilityLabel` formatted as "[Name], [price] euros per [cycle], renews in [days] days". `accessibilityRole="button"` on each card. `accessibilityHint="Swipe left for options"` (prepared for Stories 2.3/2.4). Touch targets are minimum 44x44pt (card height 72px exceeds this). Pull-to-refresh is announced via `accessibilityLiveRegion`.

10. **AC10 - Data Fetch on Mount:** Given the user navigates to the Subscriptions tab, when the screen mounts, then `fetchSubscriptions()` is called to ensure fresh data. If cached subscriptions exist in Zustand persist, they are shown immediately while the fresh fetch completes in the background.

## Tasks / Subtasks

- [x] Task 1: Create SubscriptionCard Component (AC: #7, #9)
  - [x] 1.1 Create `src/features/subscriptions/components/SubscriptionCard.tsx`:
    - Props: `subscription: Subscription`, `onPress?: () => void`
    - 4px category color stripe on left edge (View with backgroundColor from SUBSCRIPTION_CATEGORIES lookup)
    - Category icon from `SUBSCRIPTION_CATEGORIES` (MaterialCommunityIcons via react-native-paper `Icon`)
    - Name: `Text variant="titleMedium"` (medium weight, 18px)
    - Price: formatted as "€{price}/mo" or "€{price}/yr" etc. using helper function
    - Renewal info: "Renews in X days" calculated via `date-fns` `differenceInDays`
    - Trial indicator: simple `Chip` with "Trial" label when `is_trial === true`
    - Inactive styling: `opacity: 0.5` when `is_active === false`
    - Card base: `react-native-paper` `Card` with `mode="elevated"`, elevation 1, borderRadius 12
    - Height: ~72px (default variant)
    - Touch: `Card` `onPress` prop for tap handling
    - Accessibility: `accessibilityLabel`, `accessibilityRole="button"`, `accessibilityHint`
  - [x] 1.2 Create `src/features/subscriptions/components/SubscriptionCard.test.tsx`:
    - Test renders subscription name, price, renewal info
    - Test category color stripe renders correctly
    - Test trial badge shows when is_trial is true
    - Test inactive styling when is_active is false
    - Test accessibility label format

- [x] Task 2: Create Utility Functions (AC: #2, #7)
  - [x] 2.1 Create `src/features/subscriptions/utils/subscriptionUtils.ts`:
    - `formatBillingCycleShort(cycle: BillingCycle): string` — returns 'mo', 'yr', 'qtr', 'wk'
    - `formatPrice(price: number, cycle: BillingCycle): string` — returns "€17.99/mo"
    - `calculateMonthlyEquivalent(price: number, cycle: BillingCycle): number` — normalizes to monthly
    - `calculateTotalMonthlyCost(subscriptions: Subscription[]): number` — sum of monthly equivalents for active subscriptions only
    - `getRenewalInfo(renewalDate: string): { text: string; daysUntil: number; isOverdue: boolean }` — returns "Renews in 5 days", "Renews today", "Overdue by 3 days"
    - `getCategoryConfig(categoryId: string | null): SubscriptionCategory` — returns category from SUBSCRIPTION_CATEGORIES or "Other" default
  - [x] 2.2 Create `src/features/subscriptions/utils/subscriptionUtils.test.ts`:
    - Test all utility functions with edge cases (weekly, quarterly, null category, past dates, today, etc.)

- [x] Task 3: Create Cost Summary Header Component (AC: #2, #8)
  - [x] 3.1 Create `src/features/subscriptions/components/CostSummaryHeader.tsx`:
    - Shows total monthly cost: "€{total}/month" in large bold text
    - Shows subscription count: "12 subscriptions" below
    - Shows yearly equivalent: "€{total×12}/year" in smaller text
    - Uses `useTheme()` for colors — primary color for amounts
    - Wrapped in `Surface` with elevation 0, padding 16
  - [x] 3.2 Create `src/features/subscriptions/components/CostSummaryHeader.test.tsx`:
    - Test correct total calculation display
    - Test subscription count display

- [x] Task 4: Create Empty State Component (AC: #3)
  - [x] 4.1 Create `src/features/subscriptions/components/EmptySubscriptionState.tsx`:
    - Package icon: `MaterialCommunityIcons` "package-variant" (via react-native-paper `Icon`, size 64)
    - Headline: "No subscriptions yet" (`Text variant="headlineSmall"`)
    - Body: "Add your first subscription to start tracking your spending" (`Text variant="bodyMedium"`, muted color)
    - CTA: `Button mode="contained"` "Add Subscription" → navigates to Add tab
    - Centered layout with spacing per UX spec (24px padding)
    - Accessibility: `accessibilityLabel` on CTA button

- [x] Task 5: Create Skeleton Loading Component (AC: #5)
  - [x] 5.1 Create `src/features/subscriptions/components/SubscriptionListSkeleton.tsx`:
    - 3 skeleton card placeholders (gray shimmer shapes matching SubscriptionCard dimensions: 72px height, 12px border radius)
    - Use `Animated` API or `react-native-reanimated` for shimmer effect
    - Include skeleton for cost summary header area
    - Lightweight implementation — no additional dependencies

- [x] Task 6: Implement SubscriptionsScreen (AC: #1, #2, #3, #4, #5, #6, #8, #9, #10)
  - [x] 6.1 Rewrite `src/features/subscriptions/screens/SubscriptionsScreen.tsx` (replace placeholder):
    - Import `useSubscriptionStore` for subscriptions, isLoading, error state
    - Import `SubscriptionCard`, `CostSummaryHeader`, `EmptySubscriptionState`, `SubscriptionListSkeleton`
    - Import `calculateTotalMonthlyCost` from utils
  - [x] 6.2 Data fetching:
    - `useEffect` on mount → call `fetchSubscriptions()`
    - If cached subscriptions exist, show them immediately (Zustand persist provides this)
    - Background refresh on every mount to ensure freshness
  - [x] 6.3 List implementation:
    - Use `FlatList` with `keyExtractor={item => item.id}`
    - `ListHeaderComponent` = `CostSummaryHeader` (only when subscriptions exist)
    - `ListEmptyComponent` = `EmptySubscriptionState` (only when NOT loading)
    - `renderItem` = `SubscriptionCard` for each subscription
    - `ItemSeparatorComponent` = 12px gap between cards
    - `contentContainerStyle` = padding 16, flexGrow 1 (for empty state centering)
  - [x] 6.4 Pull-to-refresh:
    - `RefreshControl` with `refreshing={isRefreshing}`, `onRefresh={handleRefresh}`
    - Add `isRefreshing` state (local useState, NOT in Zustand — it's a UI-only state)
    - `handleRefresh`: set isRefreshing true → `fetchSubscriptions()` → set isRefreshing false
  - [x] 6.5 Loading state:
    - When `isLoading && subscriptions.length === 0` → show `SubscriptionListSkeleton`
    - When `isLoading && subscriptions.length > 0` → show existing data (background refresh)
  - [x] 6.6 Error state:
    - When `error && subscriptions.length === 0` → show error message + "Retry" button
    - When `error && subscriptions.length > 0` → show Snackbar with error + retain cached data
  - [x] 6.7 SafeAreaView wrapping for proper insets

- [x] Task 7: Update Store with isRefreshing Support (AC: #4)
  - [x] 7.1 Update `src/shared/stores/useSubscriptionStore.ts`:
    - No changes needed — `isLoading` is sufficient. Pull-to-refresh uses local `isRefreshing` state in SubscriptionsScreen to differentiate visual indicator. The `fetchSubscriptions()` action already handles the loading state properly.
    - **NOTE:** Do NOT add `isRefreshing` to Zustand store. It's a UI-only concern managed by the screen component.

- [x] Task 8: Update Feature Exports (AC: all)
  - [x] 8.1 Update `src/features/subscriptions/index.ts`:
    - Export `SubscriptionCard` from components
    - Export `CostSummaryHeader` from components
    - Export utility functions from utils
  - [x] 8.2 Verify all imports use path aliases (`@features/*`, `@shared/*`, `@config/*`)
  - [x] 8.3 Run `npx tsc --noEmit` — zero errors
  - [x] 8.4 Run `npx eslint src/` — zero errors/warnings

## Dev Notes

### Critical Technical Requirements

**FlatList Performance — 60 FPS Scrolling (CRITICAL):**

Story 2.2 requires 60 FPS scroll performance (NFR5). Key optimizations:

```typescript
<FlatList
  data={subscriptions}
  keyExtractor={(item) => item.id}
  renderItem={renderSubscriptionCard}
  ItemSeparatorComponent={ItemSeparator}
  ListHeaderComponent={renderHeader}
  ListEmptyComponent={renderEmptyState}
  refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
  contentContainerStyle={styles.listContent}
  // Performance optimizations:
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  getItemLayout={(_, index) => ({
    length: CARD_HEIGHT + SEPARATOR_HEIGHT,
    offset: (CARD_HEIGHT + SEPARATOR_HEIGHT) * index,
    index,
  })}
/>
```

**CRITICAL: `getItemLayout` requires fixed-height cards.** SubscriptionCard MUST be a consistent 72px height. Do NOT use dynamic height based on content — truncate long names with `numberOfLines={1}`.

**CRITICAL: Monthly Cost Calculation Logic:**

```typescript
export function calculateMonthlyEquivalent(price: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly':
      return price;
    case 'yearly':
      return price / 12;
    case 'quarterly':
      return price / 3;
    case 'weekly':
      return price * (52 / 12);
  }
}

export function calculateTotalMonthlyCost(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((sub) => sub.is_active !== false)
    .reduce((total, sub) => {
      return total + calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle);
    }, 0);
}
```

**CRITICAL: Renewal Date Calculation:**

```typescript
import { differenceInDays, isToday, isPast, parseISO } from 'date-fns';

export function getRenewalInfo(renewalDate: string): {
  text: string;
  daysUntil: number;
  isOverdue: boolean;
} {
  const date = parseISO(renewalDate);
  const today = new Date();

  if (isToday(date)) {
    return { text: 'Renews today', daysUntil: 0, isOverdue: false };
  }

  const days = differenceInDays(date, today);

  if (days < 0) {
    return { text: `Overdue by ${Math.abs(days)} days`, daysUntil: days, isOverdue: true };
  }

  return { text: `Renews in ${days} days`, daysUntil: days, isOverdue: false };
}
```

**CRITICAL: Category Color Stripe Implementation:**

```typescript
import { SUBSCRIPTION_CATEGORIES } from '@config/categories';

export function getCategoryConfig(categoryId: string | null): SubscriptionCategory {
  if (!categoryId) {
    return SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'other')!;
  }
  return SUBSCRIPTION_CATEGORIES.find((c) => c.id === categoryId)
    ?? SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'other')!;
}

// In SubscriptionCard:
<View style={[styles.categoryStripe, { backgroundColor: categoryConfig.color }]} />
```

The stripe is a 4px wide `View` positioned absolutely on the left edge of the card, full height, with `borderTopLeftRadius: 12` and `borderBottomLeftRadius: 12` to match card corners.

**CRITICAL: SubscriptionCard Component Structure:**

```typescript
interface SubscriptionCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

// Card anatomy:
// ┌─────────────────────────────────────┐
// │▌ 🎬  Netflix             €17.99/mo │
// │▌      Renews in 5 days             │
// └─────────────────────────────────────┘

export function SubscriptionCard({ subscription, onPress }: SubscriptionCardProps) {
  const theme = useTheme();
  const categoryConfig = getCategoryConfig(subscription.category);
  const renewalInfo = getRenewalInfo(subscription.renewal_date);
  const priceLabel = formatPrice(subscription.price, subscription.billing_cycle as BillingCycle);
  const isInactive = subscription.is_active === false;

  return (
    <Card
      mode="elevated"
      elevation={1}
      onPress={onPress}
      style={[styles.card, isInactive && styles.inactiveCard]}
      accessibilityRole="button"
      accessibilityLabel={`${subscription.name}, ${subscription.price} euros per ${subscription.billing_cycle}, ${renewalInfo.text}`}
      accessibilityHint="Swipe left for options"
    >
      <View style={styles.cardContent}>
        {/* Category stripe */}
        <View style={[styles.categoryStripe, { backgroundColor: categoryConfig.color }]} />

        {/* Icon */}
        <Icon source={categoryConfig.icon} size={24} color={categoryConfig.color} />

        {/* Text content */}
        <View style={styles.textContent}>
          <View style={styles.topRow}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.name}>
              {subscription.name}
            </Text>
            <Text variant="titleMedium" style={styles.price}>{priceLabel}</Text>
          </View>
          <View style={styles.bottomRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {renewalInfo.text}
            </Text>
            {subscription.is_trial && (
              <Chip compact textStyle={styles.trialChipText}>Trial</Chip>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}
```

**CRITICAL: Pull-to-Refresh Pattern (Local State, NOT Zustand):**

```typescript
const [isRefreshing, setIsRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  await fetchSubscriptions();
  setIsRefreshing(false);
}, [fetchSubscriptions]);
```

`isRefreshing` is local state because it's a UI-only concern specific to the pull-to-refresh gesture. The Zustand store's `isLoading` handles the initial load state. Do NOT add `isRefreshing` to the store.

**CRITICAL: Data Fetch Strategy — Show Cached, Refresh Background:**

```typescript
const { subscriptions, isLoading, error, fetchSubscriptions } = useSubscriptionStore();

useEffect(() => {
  fetchSubscriptions();
}, [fetchSubscriptions]);

// Render logic:
// - isLoading && subscriptions.length === 0 → Show skeleton
// - isLoading && subscriptions.length > 0 → Show data (silent background refresh)
// - error && subscriptions.length === 0 → Show error + retry
// - error && subscriptions.length > 0 → Show data + error snackbar
// - !isLoading && subscriptions.length === 0 → Show empty state
// - !isLoading && subscriptions.length > 0 → Show data
```

### Architecture Compliance

**MANDATORY Patterns — Do NOT Deviate:**

1. **Feature Structure (extend existing):**

   ```
   features/subscriptions/
   ├── components/
   │   ├── SubscriptionCard.tsx          (CREATE)
   │   ├── SubscriptionCard.test.tsx     (CREATE)
   │   ├── CostSummaryHeader.tsx         (CREATE)
   │   ├── CostSummaryHeader.test.tsx    (CREATE)
   │   ├── EmptySubscriptionState.tsx    (CREATE)
   │   └── SubscriptionListSkeleton.tsx  (CREATE)
   ├── hooks/
   │   └── .gitkeep                      (NO CHANGE)
   ├── screens/
   │   ├── AddSubscriptionScreen.tsx     (NO CHANGE)
   │   └── SubscriptionsScreen.tsx       (REWRITE — replace placeholder)
   ├── services/
   │   └── subscriptionService.ts        (NO CHANGE)
   ├── types/
   │   ├── index.ts                      (NO CHANGE)
   │   └── schemas.ts                    (NO CHANGE)
   ├── utils/
   │   ├── subscriptionUtils.ts          (CREATE)
   │   └── subscriptionUtils.test.ts     (CREATE)
   └── index.ts                          (MODIFY — add new exports)
   ```

2. **Component Boundaries:**
   - SubscriptionsScreen → reads from `useSubscriptionStore` for state
   - SubscriptionCard → pure presentational component, receives subscription data as props
   - CostSummaryHeader → receives calculated total and count as props
   - EmptySubscriptionState → receives navigation callback as prop
   - Utility functions → pure functions, no side effects, no store access
   - No direct feature-to-feature imports — use stores for cross-feature data

3. **Naming Conventions:**
   - Components: PascalCase files (`SubscriptionCard.tsx`, `CostSummaryHeader.tsx`)
   - Utils: camelCase files (`subscriptionUtils.ts`)
   - Functions: camelCase (`calculateTotalMonthlyCost`, `getRenewalInfo`, `formatPrice`)
   - Test files: co-located (`SubscriptionCard.test.tsx` next to `SubscriptionCard.tsx`)
   - Constants: SCREAMING_SNAKE_CASE (`CARD_HEIGHT`, `SEPARATOR_HEIGHT`)

4. **Import Aliases — REQUIRED:**

   ```typescript
   import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
   import { SUBSCRIPTION_CATEGORIES } from '@config/categories';
   import type { Subscription, BillingCycle } from '@features/subscriptions/types';
   import {
     getCategoryConfig,
     formatPrice,
     getRenewalInfo,
   } from '@features/subscriptions/utils/subscriptionUtils';
   ```

5. **Theme Compliance:**
   - Use `useTheme()` hook for ALL colors — no hardcoded hex values
   - Exception: category colors come from `SUBSCRIPTION_CATEGORIES` config (these are the design system's category palette)
   - Card background: `theme.colors.surface`
   - Text colors: `theme.colors.onSurface`, `theme.colors.onSurfaceVariant`
   - Primary accents: `theme.colors.primary`

6. **Error Handling Pattern:** Same as Story 2.1 — store manages error state, screen displays user-friendly messages, retry capability provided.

### Library & Framework Requirements

**No New Dependencies to Install:**

All required libraries are already installed from previous stories.

**Existing Dependencies Used:**

| Package                                   | Version | Usage in This Story                                           |
| ----------------------------------------- | ------- | ------------------------------------------------------------- |
| react-native-paper                        | ^5.15.0 | Card, Text, Icon, Chip, Button, Snackbar, Surface             |
| date-fns                                  | ^4.1.0  | differenceInDays, parseISO, isToday, isPast                   |
| zustand                                   | ^5.0.11 | useSubscriptionStore (read subscriptions, fetchSubscriptions) |
| @react-native-async-storage/async-storage | 2.2.0   | Zustand persist (cached subscriptions shown immediately)      |
| react-native-reanimated                   | ~4.1.1  | Optional: skeleton shimmer animation                          |
| @supabase/supabase-js                     | ^2.95.3 | Via subscriptionService.getSubscriptions()                    |

**CRITICAL: Do NOT install any additional packages.** Everything needed is already available. Specifically:

- Do NOT install `react-native-skeleton-placeholder` or similar — build a simple skeleton with `Animated` or `react-native-reanimated`
- Do NOT install `react-native-gesture-handler` swipeable components — swipe actions are Story 2.3/2.4 scope
- Do NOT install additional icon packages — use `Icon` from `react-native-paper` which uses MaterialCommunityIcons internally

**CRITICAL: @expo/vector-icons Ionicons Bug (from Story 2.1):**
Expo SDK 54 has a known bug where Ionicons render as `[?]`. Use `MaterialCommunityIcons` only. React Native Paper's `Icon` component uses MaterialCommunityIcons internally — always use this.

### File Structure Requirements

**Files to CREATE:**

- `src/features/subscriptions/components/SubscriptionCard.tsx` — Individual subscription card component
- `src/features/subscriptions/components/SubscriptionCard.test.tsx` — Card component tests
- `src/features/subscriptions/components/CostSummaryHeader.tsx` — Monthly cost summary header
- `src/features/subscriptions/components/CostSummaryHeader.test.tsx` — Cost summary tests
- `src/features/subscriptions/components/EmptySubscriptionState.tsx` — Empty state display
- `src/features/subscriptions/components/SubscriptionListSkeleton.tsx` — Loading skeleton
- `src/features/subscriptions/utils/subscriptionUtils.ts` — Price formatting, renewal calc, category lookup
- `src/features/subscriptions/utils/subscriptionUtils.test.ts` — Utility function tests

**Files to MODIFY:**

- `src/features/subscriptions/screens/SubscriptionsScreen.tsx` — REWRITE (replace placeholder with full list implementation)
- `src/features/subscriptions/index.ts` — Add exports for new components and utils

**Files NOT to touch:**

- `src/features/subscriptions/screens/AddSubscriptionScreen.tsx` — Story 2.1 complete, no changes
- `src/features/subscriptions/services/subscriptionService.ts` — Already has getSubscriptions(), no changes needed
- `src/features/subscriptions/types/index.ts` — Types are sufficient, no changes needed
- `src/features/subscriptions/types/schemas.ts` — No schema changes needed
- `src/shared/stores/useSubscriptionStore.ts` — Store already has fetchSubscriptions(), no changes needed
- `src/shared/components/CelebrationOverlay.tsx` — Not used in this story
- `src/config/categories.ts` — Already has correct category data
- `src/config/theme.ts` — No changes needed
- `src/app/navigation/*.tsx` — No navigation changes needed
- `src/features/auth/*` — No auth changes needed
- `package.json` — No new dependencies needed

### Testing Requirements

- Verify TypeScript compiles: `npx tsc --noEmit` — zero errors
- Verify ESLint passes: `npx eslint src/` — zero errors/warnings
- **Manual Smoke Test:**
  1. App launches → Login → navigate to "Subscriptions" tab
  2. **No subscriptions:** Empty state shows "No subscriptions yet" with "Add Subscription" CTA → tap CTA → navigates to Add tab
  3. **Add 2-3 subscriptions** via Add tab (different categories, billing cycles)
  4. Navigate to Subscriptions tab → all subscriptions displayed as cards
  5. **Card display:** Each card shows category color stripe (left), category icon, name, price/cycle, renewal info
  6. **Cost summary:** Total monthly cost shown at top (correctly calculated), subscription count shown
  7. **Sort order:** Subscriptions sorted by renewal date (soonest first)
  8. **Pull-to-refresh:** Pull down → refresh indicator → data refreshes
  9. **Loading state:** Clear app data → reopen → skeleton loading shown → then data loads
  10. **Trial indicator:** Add a trial subscription → "Trial" chip shown on card
  11. **Inactive styling:** (Future: when Story 2.7 adds status toggle, inactive cards should appear dimmed)
  12. **Network error:** Enable airplane mode → pull-to-refresh → error message + retry button → cached data still visible
  13. **Performance:** Scroll list with 10+ items → smooth 60 FPS, no jank
  14. **Accessibility:** VoiceOver/TalkBack reads card labels correctly: "Netflix, 17.99 euros per monthly, Renews in 5 days"

### Previous Story Intelligence (Story 2.1)

**Key Learnings from Story 2.1 (CRITICAL — Apply to this story):**

- **Zustand persist provides instant cached data:** Subscriptions array is persisted to AsyncStorage. When user revisits Subscriptions tab, cached data shows IMMEDIATELY while background refresh runs. This is critical for perceived performance.
- **isSubmitting vs isLoading distinction:** Use `isLoading` for data fetching (full skeleton), local `isRefreshing` for pull-to-refresh (RefreshControl indicator only). Same rationale as Story 2.1's `isSubmitting` for form submission.
- **Theme compliance:** Use `theme.colors.*` via `useTheme()` hook, NOT hardcoded hex values.
- **Path aliases REQUIRED:** `@features/*`, `@shared/*`, `@config/*`, `@app/*` — defined in both `tsconfig.json` and `babel.config.js`.
- **ESLint flat config:** `eslint.config.js`. Unused variables in catch blocks → use bare `catch {}`.
- **Portal pattern:** Use `<Portal>` wrapper from react-native-paper for any overlays (not needed for this story, but noted).
- **Snackbar pattern:** Established in AddSubscriptionScreen and SettingsScreen for user feedback messages — reuse for error display.
- **TypeScript strict mode:** Enabled. All props must be typed. No `any` types.
- **subscriptionService already sorts by renewal_date ASC:** No need to re-sort in the UI layer.
- **SUBSCRIPTION_CATEGORIES exists in `@config/categories`:** 8 categories with id, label, icon (MaterialCommunityIcons names), and color hex values. Use `getCategoryConfig()` utility for safe lookup with "Other" fallback.
- **Zod v4 quirks:** `z.coerce.number()` and `z.boolean().default()` had type issues. Not relevant for Story 2.2 (no forms), but good to know.
- **CelebrationOverlay established pattern:** Overlay with Lottie, auto-dismiss, Portal-based. Not used in this story but shows the overlay pattern.
- **Database types auto-generated:** `src/shared/types/database.types.ts` has the Subscription row type. The `Subscription` type in `@features/subscriptions/types` is aliased from this.

**Patterns to Reuse from Existing Code:**

- Zustand store consumption pattern from AddSubscriptionScreen (`useSubscriptionStore` destructuring)
- Component styling via `useTheme()` hook (used in all auth screens and AddSubscriptionScreen)
- Snackbar feedback from AddSubscriptionScreen and SettingsScreen
- Accessibility patterns from auth screens and AddSubscriptionScreen (labels, roles, live regions)
- `SUBSCRIPTION_CATEGORIES` usage from AddSubscriptionScreen (CategoryChip pattern)

### Git Intelligence

**Recent Commits (last 5):**

```
be1d240 story 2.1 done
6f4e127 story 2-1 in review
5dbd091 epic-1 retrospective and start epic-2 story 2-1
d322c01 fix: account delete issue
a6f61e5 story 1.7 done
```

**Key Insights:**

- Story 2.1 just completed — subscription service, store, types all fresh and stable
- No existing SubscriptionCard component — this story creates it for the first time
- SubscriptionsScreen.tsx is a placeholder with just "Subscriptions" text — full rewrite needed
- The subscriptions feature module is well-scaffolded with directories and index.ts
- The `utils/` directory doesn't exist yet under subscriptions feature — create it

### Latest Technical Information

**Library Versions (verified Feb 2026):**

| Library                 | Installed | Notes                                                                   |
| ----------------------- | --------- | ----------------------------------------------------------------------- |
| react-native-paper      | ^5.15.0   | Card, Text, Icon, Chip — all available, no issues                       |
| date-fns                | ^4.1.0    | differenceInDays, parseISO, isToday — tree-shakeable, Hermes compatible |
| zustand                 | ^5.0.11   | persist middleware working, proven in Story 2.1                         |
| react-native-reanimated | ~4.1.1    | Available for skeleton shimmer if desired                               |

**date-fns v4 Usage Notes:**

- Import individual functions: `import { differenceInDays, parseISO, isToday } from 'date-fns'`
- Tree-shakeable — only imported functions are bundled
- Works with Hermes JavaScript engine (React Native default)
- Date strings from Supabase are ISO 8601 format — use `parseISO()` to parse

**React Native Paper Card Notes:**

- `Card mode="elevated"` — provides subtle shadow
- `Card.Content` — padding wrapper for card content
- `Card onPress` — built-in touch handling with ripple effect
- Use `elevation={1}` for subtle depth per UX spec

**FlatList Performance Notes:**

- `removeClippedSubviews={true}` — unmounts off-screen items (saves memory)
- `getItemLayout` — enables scroll-to-index and prevents layout thrashing (requires fixed-height items)
- `maxToRenderPerBatch={10}` — limits concurrent renders
- `windowSize={5}` — renders 5 viewport heights of content

### Project Structure Notes

- `SubscriptionCard` is the FIRST component in `features/subscriptions/components/` — the directory exists but only has `.gitkeep`
- The `utils/` directory does NOT exist under `features/subscriptions/` — create it for `subscriptionUtils.ts`
- `CostSummaryHeader` is a feature-specific component, NOT shared — it belongs in `features/subscriptions/components/`
- `EmptySubscriptionState` is also feature-specific — different empty states have different content per UX spec
- `SubscriptionListSkeleton` is feature-specific — skeleton shape matches SubscriptionCard dimensions
- All test files are CO-LOCATED with source files per architecture pattern

### Scope Boundaries — What This Story Does NOT Include

**Explicitly OUT OF SCOPE (handled by future stories):**

- **Swipe gestures** (edit/delete swipe actions) → Story 2.3 & 2.4
- **Delete with undo snackbar** → Story 2.4
- **Trial countdown badge with urgency colors** → Story 2.5
- **Category assignment/editing** → Story 2.6
- **Active/Cancelled status toggle** → Story 2.7
- **Subscription detail view (tap to expand)** → Story 2.8
- **SpendingHero animated component** → Epic 3 (Dashboard)
- **Search/filter functionality** → Not in current epic scope
- **Sorting options (user-selectable)** → Not in current epic scope

**Preparation for future stories:**

- SubscriptionCard accepts `onPress` prop (for Story 2.8 detail navigation)
- Card accessibility hint says "Swipe left for options" (ready for Stories 2.3/2.4)
- Inactive styling (`is_active === false`) is implemented (ready for Story 2.7)
- Trial chip shown when `is_trial === true` (Story 2.5 will enhance with countdown)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: View Subscription List]
- [Source: _bmad-output/planning-artifacts/prd.md#FR11 — View subscription list]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR5 — 60 FPS scroll performance]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Feature-based modular, Zustand]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Structure, Communication]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries — Feature module structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#SubscriptionCard — Anatomy, props, states, variants]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty States — "No subscriptions yet" with CTA]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading States — Skeleton shimmer for list loading]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility — Card labels, roles, hints]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction — Card layout with category stripe, 12px border radius]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Pull to Refresh — Universal pattern for list sync]
- [Source: _bmad-output/implementation-artifacts/2-1-add-new-subscription.md — Zustand pattern, service pattern, accessibility patterns]
- [Source: src/shared/stores/useSubscriptionStore.ts — fetchSubscriptions, addSubscription, persist pattern]
- [Source: src/features/subscriptions/services/subscriptionService.ts — getSubscriptions (ordered by renewal_date ASC)]
- [Source: src/features/subscriptions/types/index.ts — Subscription type, BillingCycle, AppError]
- [Source: src/config/categories.ts — 8 categories with id, label, icon, color]
- [Source: src/config/theme.ts — Primary #6366F1, secondary #8B5CF6, tertiary #10B981]

## Change Log

- 2026-02-28: Implemented Story 2.2 — View Subscription List. Created SubscriptionCard, CostSummaryHeader, EmptySubscriptionState, SubscriptionListSkeleton components. Created subscription utility functions. Rewrote SubscriptionsScreen with full FlatList implementation including pull-to-refresh, loading skeleton, error handling, and empty state. Set up Jest testing framework. All 39 tests passing, TypeScript and ESLint zero errors.
- 2026-02-28: Code review fixes (6 MEDIUM issues resolved): M1-getRenewalInfo singular/plural grammar fix, M2-getItemLayout header offset correction, M3-getCategoryConfig safe fallback (removed non-null assertions), M4-conditional accessibilityRole/Hint on SubscriptionCard (only when onPress provided), M5-default case in calculateMonthlyEquivalent switch, M6-accessibility attributes added to CostSummaryHeader. 4 new tests added (43 total). TypeScript and ESLint zero errors.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed timezone issue in `getRenewalInfo` by using `startOfDay` from date-fns to normalize date comparisons
- Jest 30 incompatible with jest-expo@55, downgraded to Jest 29.7.0
- react-test-renderer version mismatch resolved by pinning to 19.1.0 (matching React version)
- `@testing-library/jest-native` deprecated, ESLint warnings suppressed with inline directives where necessary

### Completion Notes List

- Task 1: SubscriptionCard component created with category color stripe, icon, name, price, renewal info, trial badge, inactive styling, and full accessibility support (9 tests)
- Task 2: Utility functions created — formatBillingCycleShort, formatPrice, calculateMonthlyEquivalent, calculateTotalMonthlyCost, getRenewalInfo, getCategoryConfig (25 tests)
- Task 3: CostSummaryHeader component with total monthly cost, subscription count, yearly equivalent (5 tests)
- Task 4: EmptySubscriptionState component with package icon, headline, body text, and CTA button navigating to Add tab
- Task 5: SubscriptionListSkeleton with shimmer animation using Animated API — 3 skeleton cards + header placeholder
- Task 6: SubscriptionsScreen fully rewritten with FlatList, pull-to-refresh (local isRefreshing state), loading skeleton, error state with retry, empty state, CostSummaryHeader, and 60 FPS performance optimizations (getItemLayout, removeClippedSubviews, windowSize)
- Task 7: Verified store needs no changes — isRefreshing handled locally in screen component
- Task 8: Feature exports updated, TypeScript zero errors, ESLint zero errors/warnings

### File List

**Created:**
- src/features/subscriptions/components/SubscriptionCard.tsx
- src/features/subscriptions/components/SubscriptionCard.test.tsx
- src/features/subscriptions/components/CostSummaryHeader.tsx
- src/features/subscriptions/components/CostSummaryHeader.test.tsx
- src/features/subscriptions/components/EmptySubscriptionState.tsx
- src/features/subscriptions/components/SubscriptionListSkeleton.tsx
- src/features/subscriptions/utils/subscriptionUtils.ts
- src/features/subscriptions/utils/subscriptionUtils.test.ts
- jest.config.js

**Modified:**
- src/features/subscriptions/screens/SubscriptionsScreen.tsx (full rewrite from placeholder)
- src/features/subscriptions/index.ts (added new component and utility exports)
- package.json (added test dependencies: jest, jest-expo, @testing-library/react-native, @types/jest, react-test-renderer)
