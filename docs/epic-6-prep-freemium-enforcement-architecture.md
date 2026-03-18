# Epic 6 Preparation: Freemium Limit Enforcement Architecture Decision

**Date:** 2026-03-18
**Owner:** Charlie (Senior Dev)
**Task:** Decide freemium enforcement strategy — client-side vs. Supabase RLS vs. hybrid

---

## Decision

**Hybrid approach: Client-side enforcement for UX, Supabase RLS for security.**

Client-side handles the user-facing gate (paywall prompt, disabled UI). Supabase RLS prevents server-side bypass — free users cannot insert beyond the limit even if client-side is circumvented.

---

## Options Evaluated

### Option A: Client-Side Only

| Dimension | Assessment |
|---|---|
| Implementation effort | ✅ Low — check `subscriptionCount >= FREE_LIMIT` before add |
| UX | ✅ Instant gate, no network round trip |
| Security | ❌ Trivially bypassable — direct API call bypasses limit |
| Backend consistency | ❌ Supabase has no knowledge of the limit |

**Verdict:** Insufficient for a paid product. Free users could bypass the limit via API.

### Option B: Supabase RLS Only

| Dimension | Assessment |
|---|---|
| Implementation effort | ⚠️ Medium — RLS policy with subquery count |
| UX | ❌ Poor — INSERT failure returns error, requires app to catch and show paywall |
| Security | ✅ Enforced at DB level — bypass-proof |
| Backend consistency | ✅ Single source of truth |

**Verdict:** Secure but poor UX. Error-driven paywall is not acceptable for a premium product.

### Option C: Hybrid (Selected)

| Dimension | Assessment |
|---|---|
| Implementation effort | ⚠️ Medium — both layers required |
| UX | ✅ Client-side gate shows paywall before any failed request |
| Security | ✅ RLS enforces at DB level as safety net |
| Backend consistency | ✅ RLS is authoritative; client mirrors it |

**Verdict:** Best combination. Client-side = good UX. RLS = security guarantee.

---

## Free Tier Limit

**Free users: maximum 3 active subscriptions.**

This limit applies to the `subscriptions` table rows with `user_id = auth.uid()` and `status != 'cancelled'`.

> This limit must be aligned with Product (Alice) before Story 6.1. Placeholder: 3. Adjust if product spec differs.

---

## Supabase RLS Implementation

Add the following policy to the `subscriptions` table:

```sql
-- Policy: Free users cannot insert more than 3 active subscriptions
CREATE POLICY "free_tier_insert_limit"
ON subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user has premium entitlement
  EXISTS (
    SELECT 1 FROM user_entitlements
    WHERE user_id = auth.uid()
    AND entitlement = 'premium'
    AND is_active = true
  )
  OR
  -- Allow if user is below the free tier limit
  (
    SELECT COUNT(*)
    FROM subscriptions
    WHERE user_id = auth.uid()
    AND status != 'cancelled'
  ) < 3
);
```

> **Note:** This requires a `user_entitlements` table (or equivalent) populated by RevenueCat webhooks. If webhook integration is not ready for Story 6.1, use a `is_premium` column on the `profiles` table as a temporary substitute.

---

## Client-Side Implementation

Before showing the "Add Subscription" flow, check:

```typescript
const FREE_TIER_LIMIT = 3;

function canAddSubscription(activeCount: number, isPremium: boolean): boolean {
  return isPremium || activeCount < FREE_TIER_LIMIT;
}

// Usage in component:
if (!canAddSubscription(activeSubscriptionCount, user.isPremium)) {
  // Show paywall / upgrade prompt
  navigation.navigate('Paywall');
  return;
}
// Proceed with add subscription flow
```

The client-side check runs before any navigation to the add flow. No failed network request, no error state — just a smooth paywall redirect.

---

## entitlement Source of Truth

| Source | Role |
|---|---|
| RevenueCat | Authoritative — manages purchase state, handles receipt validation |
| Supabase `user_entitlements` (or `profiles.is_premium`) | Server-side mirror — populated by RevenueCat webhook on subscription events |
| App local state | Cache of Supabase value — refreshed on app focus and after purchase |

RevenueCat webhook events to handle:
- `INITIAL_PURCHASE` → set `is_premium = true`
- `RENEWAL` → keep `is_premium = true`
- `CANCELLATION` (period end) → set `is_premium = false`
- `EXPIRATION` → set `is_premium = false`

---

## Data Flow: Adding a Subscription (Free User at Limit)

```
User taps "Add Subscription"
        ↓
Client checks: activeCount >= 3 AND !isPremium
        ↓ (true)
Navigate to Paywall
        ↓ (user subscribes)
RevenueCat purchase completes
        ↓
RevenueCat webhook → Supabase updates is_premium = true
        ↓
App refreshes entitlement state
        ↓
User returns to add subscription — RLS allows INSERT
```

---

## Scope for Epic 6

| Story | Enforcement Component |
|---|---|
| Story 6.1 (Paywall UI) | Client-side gate + paywall navigation |
| Story 6.2 (Purchase flow) | RevenueCat purchase + entitlement update |
| Story 6.3 (Entitlement sync) | Webhook → Supabase `is_premium` update + RLS policy active |

RLS policy should be deployed (via migration) as part of Story 6.3 when the entitlement source of truth is established.

---

## Revisit Trigger

Revisit enforcement architecture when:
- Multiple subscription tiers introduced (e.g., Basic / Pro)
- Limit changes (e.g., free tier expands from 3 to 5)
- Server-side enforcement needs to extend beyond INSERT (e.g., UPDATE, READ restrictions)

---

*Research conducted as Epic 5 retrospective preparation task*
