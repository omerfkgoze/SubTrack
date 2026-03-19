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

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  planType: 'monthly' | 'yearly' | null;
  expiresAt: string | null;
  purchaseInProgress: boolean;
  restoreInProgress: boolean;
  purchaseErrorMessage: string | null;
}

interface PremiumActions {
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  canAddSubscription: (activeCount: number) => boolean;
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
                  isLoading: false,
                });
              } else {
                set({ isPremium: false, planType: null, expiresAt: null, isLoading: false });
              }
            } catch {
              // If restore fails, downgrade to free
              set({ isPremium: false, planType: null, expiresAt: null, isLoading: false });
            }
          } else {
            set({
              isPremium,
              planType: data.premium_plan_type ?? null,
              expiresAt,
              isLoading: false,
            });
          }
        } else {
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
      }),
    },
  ),
);
