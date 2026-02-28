import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription, CreateSubscriptionDTO, AppError } from '@features/subscriptions/types';
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptions,
} from '@features/subscriptions/services/subscriptionService';

interface SubscriptionState {
  subscriptions: Subscription[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: AppError | null;
  pendingDelete: { subscription: Subscription; originalIndex: number } | null;
}

interface SubscriptionActions {
  fetchSubscriptions: () => Promise<void>;
  addSubscription: (dto: CreateSubscriptionDTO) => Promise<boolean>;
  updateSubscription: (id: string, dto: Partial<CreateSubscriptionDTO>) => Promise<boolean>;
  deleteSubscription: (id: string) => Promise<boolean>;
  undoDelete: () => Promise<void>;
  clearPendingDelete: () => void;
  clearError: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,

      fetchSubscriptions: async () => {
        set({ isLoading: true, error: null });

        const result = await getSubscriptions();

        if (result.error) {
          set({ isLoading: false, error: result.error });
          return;
        }

        set({ subscriptions: result.data, isLoading: false });
      },

      addSubscription: async (dto: CreateSubscriptionDTO) => {
        set({ isSubmitting: true, error: null });

        const result = await createSubscription(dto);

        if (result.error || !result.data) {
          set({ isSubmitting: false, error: result.error ?? { code: 'UNKNOWN', message: 'Failed to save subscription.' } });
          return false;
        }

        const newSubscription = result.data;
        set((state) => ({
          subscriptions: [...state.subscriptions, newSubscription],
          isSubmitting: false,
        }));
        return true;
      },

      updateSubscription: async (id: string, dto: Partial<CreateSubscriptionDTO>) => {
        set({ isSubmitting: true, error: null });

        const result = await updateSubscription(id, dto);

        if (result.error || !result.data) {
          set({
            isSubmitting: false,
            error: result.error ?? { code: 'UNKNOWN', message: 'Failed to update subscription.' },
          });
          return false;
        }

        const updatedSubscription = result.data;
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.id === id ? updatedSubscription : sub
          ),
          isSubmitting: false,
        }));
        return true;
      },

      deleteSubscription: async (id: string) => {
        const state = get();
        const index = state.subscriptions.findIndex((s) => s.id === id);
        if (index === -1) return false;

        const subscription = state.subscriptions[index];

        // Optimistic removal — instant UI feedback
        set({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
          pendingDelete: { subscription, originalIndex: index },
          error: null,
        });

        // Background Supabase delete
        const result = await deleteSubscription(id);

        if (result.error) {
          // Restore on failure — splice back at original index
          set((current) => {
            const restored = [...current.subscriptions];
            restored.splice(index, 0, subscription);
            return {
              subscriptions: restored,
              pendingDelete: null,
              error: result.error,
            };
          });
          return false;
        }

        return true;
      },

      undoDelete: async () => {
        const state = get();
        if (!state.pendingDelete) return;

        const { subscription, originalIndex } = state.pendingDelete;

        // Restore locally first (instant)
        set((current) => {
          const restored = [...current.subscriptions];
          const insertIndex = Math.min(originalIndex, restored.length);
          restored.splice(insertIndex, 0, subscription);
          return {
            subscriptions: restored,
            pendingDelete: null,
          };
        });

        // Re-create server-side (the row was already deleted from Supabase)
        const result = await createSubscription({
          name: subscription.name,
          price: subscription.price,
          currency: subscription.currency ?? undefined,
          billing_cycle: subscription.billing_cycle as 'monthly' | 'yearly' | 'quarterly' | 'weekly',
          renewal_date: subscription.renewal_date,
          is_trial: subscription.is_trial ?? false,
          trial_expiry_date: subscription.trial_expiry_date ?? undefined,
          category: subscription.category ?? undefined,
          notes: subscription.notes ?? undefined,
        });

        if (result.error || !result.data) {
          // Server restore failed — fetch fresh data
          get().fetchSubscriptions();
        } else {
          const serverSubscription = result.data;
          // Replace the local copy with the server copy (new ID from Supabase)
          set((current) => ({
            subscriptions: current.subscriptions.map((s) =>
              s.id === subscription.id ? serverSubscription : s
            ),
          }));
        }
      },

      clearPendingDelete: () => {
        set({ pendingDelete: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subscriptions: state.subscriptions,
      }),
    },
  ),
);
