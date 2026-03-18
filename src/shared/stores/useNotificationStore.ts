import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { AppError } from '@features/subscriptions/types';
import {
  registerForPushNotificationsAsync,
  savePushToken,
  getPermissionStatus,
} from '@features/notifications/services/notificationService';
import { supabase } from '@shared/services/supabase';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface NotificationState {
  permissionStatus: PermissionStatus;
  expoPushToken: string | null;
  isLoading: boolean;
  error: AppError | null;
}

interface NotificationActions {
  requestPermission: () => Promise<void>;
  checkPermission: () => Promise<void>;
  registerToken: () => Promise<void>;
  clearError: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      permissionStatus: 'undetermined',
      expoPushToken: null,
      isLoading: false,
      error: null,

      requestPermission: async () => {
        set({ isLoading: true, error: null });
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            set({
              permissionStatus: 'granted',
              expoPushToken: token,
              isLoading: false,
            });
            await get().registerToken();
          } else {
            set({
              permissionStatus: 'denied',
              isLoading: false,
            });
          }
        } catch (err) {
          set({
            isLoading: false,
            error: {
              code: 'NOTIFICATION_ERROR',
              message: 'Failed to set up notifications. Please try again.',
            },
          });
        }
      },

      checkPermission: async () => {
        try {
          const status = await getPermissionStatus();
          const mappedStatus: PermissionStatus =
            status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
          set({ permissionStatus: mappedStatus });
        } catch {
          // Silently fail — permission check is non-critical
        }
      },

      registerToken: async () => {
        const { expoPushToken } = get();
        if (!expoPushToken) return;

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const platform = Platform.OS === 'ios' ? 'ios' : 'android';
          await savePushToken(user.id, expoPushToken, platform);
        } catch {
          // Token registration failure is non-blocking
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'notification-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        permissionStatus: state.permissionStatus,
      }),
    },
  ),
);
