import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';
import {
  buySubscription,
  handlePurchaseUpdate,
  handlePurchaseError as mapPurchaseError,
  restorePurchases as restorePurchasesService,
} from '@features/premium/services/purchaseService';
import type { ProductPurchase, PurchaseError, SubscriptionPurchase } from 'react-native-iap';

export const MAX_FREE_SUBSCRIPTIONS = 5;

export const GRACE_PERIOD_DAYS = 7;
export const RETRY_DELAY_MS = 30_000;
export const MAX_RETRIES_PER_SESSION = 3;

export type PremiumFeature = 'calendar-sync' | 'data-export' | 'full-analytics';

const FREE_FEATURES = new Set<PremiumFeature>([]); // No premium features in free tier

let sessionRetryCount = 0;

/** For testing only — resets the per-session retry counter. */
export function _resetSessionRetryCount(): void {
  sessionRetryCount = 0;
}

function isGraceExpired(lastValidatedAt: string | null): boolean {
  if (!lastValidatedAt) return true; // never validated → grace expired
  const diffMs = Date.now() - new Date(lastValidatedAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > GRACE_PERIOD_DAYS;
}

function scheduleRetry(fn: () => Promise<void>): void {
  if (sessionRetryCount >= MAX_RETRIES_PER_SESSION) return;
  sessionRetryCount++;
  setTimeout(() => {
    fn().catch(() => {});
  }, RETRY_DELAY_MS);
}

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  planType: 'monthly' | 'yearly' | null;
  expiresAt: string | null;
  lastValidatedAt: string | null;
  purchaseInProgress: boolean;
  restoreInProgress: boolean;
  purchaseErrorMessage: string | null;
}

interface PremiumActions {
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  canAddSubscription: (activeCount: number) => boolean;
  isFeatureAvailable: (feature: PremiumFeature) => boolean;
  purchaseSubscription: (sku: string, offerToken?: string) => Promise<void>;
  handlePurchaseSuccess: (purchase: ProductPurchase | SubscriptionPurchase) => Promise<void>;
  handlePurchaseFailure: (error: PurchaseError) => { isCancelled: boolean; message: string };
  restorePurchases: () => Promise<'success' | 'no_purchases' | 'error'>;
  clearPurchaseError: () => void;
}

export type PremiumStore = PremiumState & PremiumActions;

export const usePremiumStore = create<PremiumStore>()(
  persist(
    (set, get) => ({
      isPremium: false,
      isLoading: false,
      planType: null,
      expiresAt: null,
      lastValidatedAt: null,
      purchaseInProgress: false,
      restoreInProgress: false,
      purchaseErrorMessage: null,

      checkPremiumStatus: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isLoading: true });

        const { data, error } = await supabase
          .from('user_settings')
          .select('is_premium, premium_plan_type, premium_expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          const isPremium = data.is_premium ?? false;
          const expiresAt = data.premium_expires_at ?? null;

          // If premium and has expiry date, check if expired
          if (isPremium && expiresAt && new Date(expiresAt) < new Date()) {
            // Subscription appears expired — re-validate with the store before downgrading.
            // If the subscription auto-renewed, the store will confirm it and return updated expiry.
            try {
              const restoreResult = await restorePurchasesService();
              if (restoreResult?.valid) {
                set({
                  isPremium: true,
                  planType: (restoreResult.planType as 'monthly' | 'yearly') ?? null,
                  expiresAt: restoreResult.expiresAt ?? null,
                  lastValidatedAt: new Date().toISOString(),
                  isLoading: false,
                });
              } else {
                set({ isPremium: false, planType: null, expiresAt: null, isLoading: false });
              }
            } catch {
              // Network failure: apply grace period logic
              if (isGraceExpired(get().lastValidatedAt)) {
                set({ isPremium: false, planType: null, expiresAt: null, isLoading: false });
              } else {
                set({ isLoading: false });
                scheduleRetry(() => get().checkPremiumStatus());
              }
            }
          } else {
            set({
              isPremium,
              planType: data.premium_plan_type ?? null,
              expiresAt,
              ...(isPremium ? { lastValidatedAt: new Date().toISOString() } : {}),
              isLoading: false,
            });
          }
        } else if (error) {
          // Network/DB error: apply grace period logic
          if (get().isPremium && isGraceExpired(get().lastValidatedAt)) {
            set({ isPremium: false, planType: null, expiresAt: null, isLoading: false });
          } else {
            set({ isLoading: false });
            if (get().isPremium) {
              scheduleRetry(() => get().checkPremiumStatus());
            }
          }
        } else {
          // data is null, no error — user has no settings row
          set({ isLoading: false });
        }
      },

      refreshPremiumStatus: async () => {
        await get().checkPremiumStatus();
      },

      canAddSubscription: (activeCount: number) => {
        const { isPremium } = get();
        return isPremium || activeCount < MAX_FREE_SUBSCRIPTIONS;
      },

      isFeatureAvailable: (feature: PremiumFeature): boolean => {
        return get().isPremium || FREE_FEATURES.has(feature);
      },

      purchaseSubscription: async (sku: string, offerToken?: string) => {
        set({ purchaseInProgress: true });
        try {
          await buySubscription(sku, offerToken);
          // Purchase result will come via the listener (handlePurchaseSuccess/handlePurchaseFailure)
        } catch {
          set({ purchaseInProgress: false });
          throw new Error('Failed to initiate purchase');
        }
      },

      handlePurchaseSuccess: async (purchase: ProductPurchase | SubscriptionPurchase) => {
        try {
          const result = await handlePurchaseUpdate(purchase);
          if (result.valid) {
            set({
              isPremium: true,
              planType: (result.planType as 'monthly' | 'yearly') ?? null,
              expiresAt: result.expiresAt ?? null,
              purchaseInProgress: false,
            });
          } else {
            set({ purchaseInProgress: false });
          }
        } catch {
          set({ purchaseInProgress: false });
        }
      },

      handlePurchaseFailure: (error: PurchaseError) => {
        const result = mapPurchaseError(error);
        set({ purchaseInProgress: false, purchaseErrorMessage: result.message });
        return result;
      },

      restorePurchases: async () => {
        set({ restoreInProgress: true });
        try {
          const result = await restorePurchasesService();
          if (result === null) {
            set({ restoreInProgress: false });
            return 'no_purchases';
          }
          if (result.valid) {
            set({
              isPremium: true,
              planType: (result.planType as 'monthly' | 'yearly') ?? null,
              expiresAt: result.expiresAt ?? null,
              lastValidatedAt: new Date().toISOString(),
              restoreInProgress: false,
            });
            return 'success';
          } else {
            set({ restoreInProgress: false });
            return 'no_purchases';
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Couldn't restore purchases. Please try again.";
          set({ restoreInProgress: false, purchaseErrorMessage: message });
          return 'error';
        }
      },

      clearPurchaseError: () => {
        set({ purchaseErrorMessage: null });
      },
    }),
    {
      name: 'premium-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPremium: state.isPremium,
        planType: state.planType,
        expiresAt: state.expiresAt,
        lastValidatedAt: state.lastValidatedAt,
      }),
    },
  ),
);
