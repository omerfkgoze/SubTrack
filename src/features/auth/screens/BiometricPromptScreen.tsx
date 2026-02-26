import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, useTheme } from 'react-native-paper';
import { useAuthStore } from '@shared/stores/useAuthStore';

interface BiometricPromptScreenProps {
  onSuccess: () => void;
  onFallbackToPassword: () => void;
}

export function BiometricPromptScreen({
  onSuccess,
  onFallbackToPassword,
}: BiometricPromptScreenProps) {
  const theme = useTheme();
  const authenticateWithBiometric = useAuthStore((s) => s.authenticateWithBiometric);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [wasCancelled, setWasCancelled] = useState(false);

  const isSessionExpired = error?.code === 'SESSION_EXPIRED';

  const handleBiometricAuth = useCallback(async () => {
    clearError();
    setWasCancelled(false);
    const success = await authenticateWithBiometric();
    if (success) {
      onSuccess();
    } else if (!useAuthStore.getState().error) {
      setWasCancelled(true);
    }
  }, [authenticateWithBiometric, clearError, onSuccess]);

  useEffect(() => {
    handleBiometricAuth();
  }, [handleBiometricAuth]);

  const handleUsePassword = () => {
    clearAuth();
    onFallbackToPassword();
  };

  const showActions = error || wasCancelled;

  return (
    <SafeAreaView style={styles.container}>
      <Text
        variant="headlineMedium"
        style={[styles.title, { color: theme.colors.primary }]}
      >
        SubTrack
      </Text>

      {isLoading && !error && !wasCancelled && (
        <Text variant="bodyLarge" style={styles.statusText}>
          Verifying your identity...
        </Text>
      )}

      {showActions && (
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={[styles.errorText, { color: error ? theme.colors.error : theme.colors.onSurface }]}>
            {isSessionExpired
              ? 'Session expired. Please log in with your password.'
              : error?.message || 'Biometric authentication failed'}
          </Text>

          <View style={styles.buttonContainer}>
            {!isSessionExpired && (
              <Button
                mode="contained"
                onPress={handleBiometricAuth}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                accessibilityLabel="Try biometric authentication again"
              >
                Try Again
              </Button>
            )}

            <Button
              mode={isSessionExpired ? 'contained' : 'outlined'}
              onPress={handleUsePassword}
              style={styles.button}
              contentStyle={styles.buttonContent}
              accessibilityLabel="Log in with password instead"
            >
              Use Password
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  statusText: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    minHeight: 48,
  },
});
