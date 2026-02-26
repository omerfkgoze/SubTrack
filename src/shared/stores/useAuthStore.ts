import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session } from '@supabase/supabase-js';
import { signUpWithEmail, signInWithEmail } from '@features/auth/services/authService';
import type { AuthError } from '@features/auth/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  needsEmailConfirmation: boolean;
}

interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      needsEmailConfirmation: false,

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

      clearAuth: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          needsEmailConfirmation: false,
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
      }),
    },
  ),
);
