import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { BiometricPromptScreen } from '@features/auth/screens/BiometricPromptScreen';
import { useAuthStore } from '@shared/stores/useAuthStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);

  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const appStateRef = useRef(AppState.currentState);

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
