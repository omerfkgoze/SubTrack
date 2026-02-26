import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
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

  const isSessionExpired = error?.code === 'SESSION_EXPIRED';

  const handleBiometricAuth = useCallback(async () => {
    clearError();
    const success = await authenticateWithBiometric();
    if (success) {
      onSuccess();
    }
  }, [authenticateWithBiometric, clearError, onSuccess]);

  useEffect(() => {
    handleBiometricAuth();
  }, [handleBiometricAuth]);

  const handleUsePassword = () => {
    clearAuth();
    onFallbackToPassword();
  };

  return (
    <View style={styles.container}>
      <Text
        variant="headlineMedium"
        style={[styles.title, { color: theme.colors.primary }]}
      >
        SubTrack
      </Text>

      {isLoading && !error && (
        <Text variant="bodyLarge" style={styles.statusText}>
          Verifying your identity...
        </Text>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={[styles.errorText, { color: theme.colors.error }]}>
            {isSessionExpired
              ? 'Session expired. Please log in with your password.'
              : error.message || 'Biometric authentication failed'}
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
    </View>
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
