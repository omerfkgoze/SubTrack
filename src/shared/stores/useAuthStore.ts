import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session } from '@supabase/supabase-js';
import {
  signUpWithEmail,
  signInWithEmail,
  requestPasswordReset as requestPasswordResetService,
  updatePassword as updatePasswordService,
  signOut as signOutService,
} from '@features/auth/services/authService';
import {
  checkBiometricAvailability as checkBiometricAvailabilityService,
  enrollBiometric,
  disableBiometric as disableBiometricService,
  authenticateWithBiometric as authenticateWithBiometricService,
} from '@features/auth/services/biometricService';
import { supabase } from '@shared/services/supabase';
import type { AuthError } from '@features/auth/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  needsEmailConfirmation: boolean;
  isResetEmailSent: boolean;
  pendingPasswordReset: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  biometryType: string | null;
  lastActiveTimestamp: number | null;
  sessionExpiredMessage: string | null;
}

interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  clearError: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  setPendingPasswordReset: (pending: boolean) => void;
  clearResetState: () => void;
  checkBiometricAvailability: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  handleSessionExpired: (message: string) => Promise<void>;
  updateLastActive: () => void;
  clearSessionExpiredMessage: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      needsEmailConfirmation: false,
      isResetEmailSent: false,
      pendingPasswordReset: false,
      isBiometricAvailable: false,
      isBiometricEnabled: false,
      biometryType: null,
      lastActiveTimestamp: null,
      sessionExpiredMessage: null,

      signUp: async (email: string, password: string) => {
        set({ isLoading: true, error: null, needsEmailConfirmation: false });

        const result = await signUpWithEmail(email, password);

        if (result.error) {
          set({ isLoading: false, error: result.error });
          return;
        }

        // Email confirmation required: user exists but no session
        if (result.user && !result.session) {
          set({
            user: result.user,
            needsEmailConfirmation: true,
            isLoading: false,
            error: null,
          });
          return;
        }

        set({
          user: result.user,
          session: result.session,
          isAuthenticated: result.session !== null,
          isLoading: false,
          error: null,
        });
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        const result = await signInWithEmail(email, password);

        if (result.error) {
          set({ isLoading: false, error: result.error });
          return;
        }

        set({
          user: result.user,
          session: result.session,
          isAuthenticated: result.session !== null,
          isLoading: false,
          error: null,
        });
      },

      setSession: (session: Session | null) => {
        set({
          session,
          isAuthenticated: session !== null,
          needsEmailConfirmation: false,
        });
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      requestPasswordReset: async (email: string) => {
        set({ isLoading: true, error: null, isResetEmailSent: false });

        const result = await requestPasswordResetService(email);

        if (result.error) {
          set({ isLoading: false, error: result.error });
          return;
        }

        set({ isLoading: false, isResetEmailSent: true });
      },

      updatePassword: async (newPassword: string) => {
        set({ isLoading: true, error: null });

        const result = await updatePasswordService(newPassword);

        if (result.error) {
          set({ isLoading: false, error: result.error });
          return false;
        }

        // Sign out to invalidate the recovery session after password update.
        // User should re-authenticate with their new password (AC4).
        // AuthProvider's onAuthStateChange will set isAuthenticated = false.
        await supabase.auth.signOut();
        set({ isLoading: false });
        return true;
      },

      setPendingPasswordReset: (pending: boolean) => {
        set({ pendingPasswordReset: pending });
      },

      clearResetState: () => {
        set({ isResetEmailSent: false, pendingPasswordReset: false, error: null });
      },

      checkBiometricAvailability: async () => {
        const result = await checkBiometricAvailabilityService();
        set({
          isBiometricAvailable: result.available,
          biometryType: result.biometryType,
        });
      },

      enableBiometric: async () => {
        set({ isLoading: true, error: null });
        const session = get().session;

        if (!session?.refresh_token) {
          set({
            isLoading: false,
            error: { message: 'No active session. Please log in first.' },
          });
          return;
        }

        const result = await enrollBiometric(session.refresh_token);

        if (!result.success) {
          set({
            isLoading: false,
            error: result.error ? { message: result.error.message, code: result.error.code } : { message: 'Biometric enrollment failed' },
          });
          return;
        }

        set({ isBiometricEnabled: true, isLoading: false, error: null });
      },

      disableBiometric: async () => {
        set({ isLoading: true, error: null });
        await disableBiometricService();
        set({ isBiometricEnabled: false, isLoading: false, error: null });
      },

      authenticateWithBiometric: async () => {
        set({ isLoading: true, error: null });
        const result = await authenticateWithBiometricService();

        if (!result.success || !result.refreshToken) {
          const error = result.error;

          if (error && error.code === 'USER_CANCELLED') {
            set({ isLoading: false });
            return false;
          }

          set({
            isLoading: false,
            error: error ? { message: error.message, code: error.code } : null,
          });
          return false;
        }

        try {
          const { error: sessionError } = await supabase.auth.setSession({
            refresh_token: result.refreshToken,
            access_token: '',
          });

          if (sessionError) {
            await disableBiometricService();
            set({
              isLoading: false,
              isBiometricEnabled: false,
              error: { message: 'Session expired. Please log in with your password.', code: 'SESSION_EXPIRED' },
            });
            return false;
          }

          set({ isLoading: false });
          return true;
        } catch {
          await disableBiometricService();
          set({
            isLoading: false,
            isBiometricEnabled: false,
            error: { message: 'Session expired. Please log in with your password.', code: 'SESSION_EXPIRED' },
          });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null, isAuthenticated: false });
        try {
          await signOutService();
          await disableBiometricService();
        } catch {
          // Force local cleanup even if network fails
        }
        get().clearAuth();
        set({ isLoading: false });
      },

      handleSessionExpired: async (message: string) => {
        try {
          await disableBiometricService();
        } catch {
          // Biometric cleanup failure shouldn't prevent session expiry handling
        }
        get().clearAuth();
        set({ sessionExpiredMessage: message });
      },

      updateLastActive: () => {
        set({ lastActiveTimestamp: Date.now() });
      },

      clearSessionExpiredMessage: () => {
        set({ sessionExpiredMessage: null });
      },

      clearAuth: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          needsEmailConfirmation: false,
          isResetEmailSent: false,
          pendingPasswordReset: false,
          isBiometricEnabled: false,
          biometryType: null,
          lastActiveTimestamp: null,
          sessionExpiredMessage: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        isBiometricEnabled: state.isBiometricEnabled,
        biometryType: state.biometryType,
      }),
    },
  ),
);
