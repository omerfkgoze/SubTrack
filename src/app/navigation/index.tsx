import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { BiometricPromptScreen } from '@features/auth/screens/BiometricPromptScreen';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { parseSupabaseDeepLink } from '@shared/services/deepLinking';
import { setSessionFromTokens } from '@features/auth/services/authService';
import { supabase } from '@shared/services/supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);
  const setPendingPasswordReset = useAuthStore((s) => s.setPendingPasswordReset);

  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const handleDeepLink = useCallback(
    async (url: string) => {
      const result = parseSupabaseDeepLink(url);

      if (result.type === 'recovery' && result.accessToken && result.refreshToken) {
        const sessionResult = await setSessionFromTokens(result.accessToken, result.refreshToken);
        if (!sessionResult.error) {
          setPendingPasswordReset(true);
        }
      }
    },
    [setPendingPasswordReset],
  );

  // Listen for deep links
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  // Listen for PASSWORD_RECOVERY event as secondary detection
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPendingPasswordReset(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [setPendingPasswordReset]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState === 'background'
      ) {
        setIsBiometricVerified(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // Reset verification when biometric is disabled
  useEffect(() => {
    if (!isBiometricEnabled) {
      setIsBiometricVerified(false);
    }
  }, [isBiometricEnabled]);

  const handleBiometricSuccess = useCallback(() => {
    setIsBiometricVerified(true);
  }, []);

  const handleFallbackToPassword = useCallback(() => {
    setIsBiometricVerified(false);
  }, []);

  const showBiometricGate =
    isAuthenticated && isBiometricEnabled && !isBiometricVerified;

  if (showBiometricGate) {
    return (
      <BiometricPromptScreen
        onSuccess={handleBiometricSuccess}
        onFallbackToPassword={handleFallbackToPassword}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
