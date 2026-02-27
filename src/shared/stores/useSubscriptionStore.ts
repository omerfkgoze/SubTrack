import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription, CreateSubscriptionDTO, AppError } from '@features/subscriptions/types';
import {
  createSubscription,
  getSubscriptions,
} from '@features/subscriptions/services/subscriptionService';

interface SubscriptionState {
  subscriptions: Subscription[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: AppError | null;
}

interface SubscriptionActions {
  fetchSubscriptions: () => Promise<void>;
  addSubscription: (dto: CreateSubscriptionDTO) => Promise<boolean>;
  clearError: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set) => ({
      subscriptions: [],
      isLoading: false,
      isSubmitting: false,
      error: null,

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

        if (result.error) {
          set({ isSubmitting: false, error: result.error });
          return false;
        }

        set((state) => ({
          subscriptions: [...state.subscriptions, result.data!],
          isSubmitting: false,
        }));
        return true;
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
