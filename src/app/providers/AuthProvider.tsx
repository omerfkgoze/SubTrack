import React, { useEffect } from 'react';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const checkBiometricAvailability = useAuthStore((s) => s.checkBiometricAvailability);
  const handleSessionExpired = useAuthStore((s) => s.handleSessionExpired);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip all auth events during account deletion to prevent race condition:
      // deleteAccount calls signInWithEmail for re-verification, which fires SIGNED_IN
      // and could override isAuthenticated:false set by the deletion flow.
      if (useAuthStore.getState().isDeleting) return;

      if (event === 'SIGNED_OUT') {
        const wasAuthenticated = useAuthStore.getState().isAuthenticated;
        if (wasAuthenticated) {
          handleSessionExpired('Your session has expired. Please log in again.');
        }
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setUser, handleSessionExpired]);

  // Check biometric availability after auth state is initialized
  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  return <>{children}</>;
}
