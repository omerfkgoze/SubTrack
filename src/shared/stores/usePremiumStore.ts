import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';

export const MAX_FREE_SUBSCRIPTIONS = 5;

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
}

interface PremiumActions {
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  canAddSubscription: (activeCount: number) => boolean;
}

export type PremiumStore = PremiumState & PremiumActions;

export const usePremiumStore = create<PremiumStore>()(
  persist(
    (set, get) => ({
      isPremium: false,
      isLoading: false,

      checkPremiumStatus: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isLoading: true });

        const { data, error } = await supabase
          .from('user_settings')
          .select('is_premium')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          set({ isPremium: data.is_premium ?? false, isLoading: false });
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
    }),
    {
      name: 'premium-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isPremium: state.isPremium }),
    },
  ),
);
