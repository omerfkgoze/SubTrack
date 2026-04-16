import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { enrollBiometric } from '@features/auth/services/biometricService';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const checkBiometricAvailability = useAuthStore((s) => s.checkBiometricAvailability);
  const handleSessionExpired = useAuthStore((s) => s.handleSessionExpired);
  const checkPremiumStatus = usePremiumStore((s) => s.checkPremiumStatus);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip all auth events during account deletion to prevent race condition:
      // deleteAccount calls signInWithEmail for re-verification, which fires SIGNED_IN
      // and could override isAuthenticated:false set by the deletion flow.
      if (useAuthStore.getState().isDeleting) return;

      if (event === 'SIGNED_OUT') {
        // Always reset premium state on sign-out so a stale isPremium:true from a
        // previous user session never bleeds into a newly signed-in account.
        usePremiumStore.setState({ isPremium: false, planType: null, expiresAt: null, lastValidatedAt: null });

        const wasAuthenticated = useAuthStore.getState().isAuthenticated;
        if (wasAuthenticated) {
          handleSessionExpired('Your session has expired. Please log in again.');
        }
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);

      if (session) {
        checkPremiumStatus();

        // Keep biometric keychain in sync after Supabase token rotation.
        // Supabase rotates the refresh_token on every use (TOKEN_REFRESHED) and on new
        // sessions (SIGNED_IN). If the keychain is not updated, the next biometric login
        // will fail with "Session expired" because the stored token is stale.
        if (
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          session.refresh_token &&
          useAuthStore.getState().isBiometricEnabled
        ) {
          enrollBiometric(session.refresh_token).catch(() => {
            // Non-fatal: user will see keychain error on next biometric login
            // and be prompted to re-enable biometrics
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setUser, handleSessionExpired, checkPremiumStatus]);

  // Check biometric availability after auth state is initialized
  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  // Refresh premium status when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && useAuthStore.getState().isAuthenticated) {
        usePremiumStore.getState().refreshPremiumStatus();
      }
    });
    return () => subscription.remove();
  }, []);

  return <>{children}</>;
}
