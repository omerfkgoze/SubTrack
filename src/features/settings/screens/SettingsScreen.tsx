import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  List,
  Switch,
  HelperText,
  Snackbar,
  Dialog,
  Portal,
  Button,
  useTheme,
} from 'react-native-paper';
import { useAuthStore } from '@shared/stores/useAuthStore';

export function SettingsScreen() {
  const theme = useTheme();
  const isBiometricAvailable = useAuthStore((s) => s.isBiometricAvailable);
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);
  const biometryType = useAuthStore((s) => s.biometryType);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const checkBiometricAvailability = useAuthStore((s) => s.checkBiometricAvailability);
  const enableBiometric = useAuthStore((s) => s.enableBiometric);
  const disableBiometric = useAuthStore((s) => s.disableBiometric);
  const clearError = useAuthStore((s) => s.clearError);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  const biometricLabel =
    biometryType === 'FaceID'
      ? 'Face ID'
      : biometryType === 'TouchID'
        ? 'Fingerprint'
        : 'Biometric Login';

  const unavailableReason =
    biometryType === null && !isBiometricAvailable
      ? 'Your device does not support biometric authentication'
      : !isBiometricAvailable
        ? 'No biometrics enrolled on this device'
        : '';

  const handleToggle = async () => {
    clearError();

    if (isBiometricEnabled) {
      setShowDisableDialog(true);
      return;
    }

    await enableBiometric();
    if (!error) {
      setSnackbarMessage('Biometric login enabled');
    }
  };

  const handleConfirmDisable = async () => {
    setShowDisableDialog(false);
    await disableBiometric();
    setSnackbarMessage('Biometric login disabled');
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text variant="headlineMedium" style={styles.heading}>
          Settings
        </Text>

        <List.Section>
          <List.Subheader>Security</List.Subheader>
          <List.Item
            title={biometricLabel}
            description={isBiometricAvailable ? 'Quick and secure login' : unavailableReason}
            left={(props) => <List.Icon {...props} icon="fingerprint" />}
            right={() => (
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggle}
                disabled={!isBiometricAvailable || isLoading}
                accessibilityLabel="Enable biometric login"
                accessibilityRole="switch"
                style={styles.switch}
              />
            )}
            style={styles.listItem}
          />
          {!isBiometricAvailable && (
            <HelperText type="info" style={styles.helperText}>
              {unavailableReason}
            </HelperText>
          )}
          {error && (
            <HelperText type="error" style={styles.helperText}>
              {error.message}
            </HelperText>
          )}
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog visible={showDisableDialog} onDismiss={() => setShowDisableDialog(false)}>
          <Dialog.Title>Disable biometric login?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              You will need to use your email and password to log in next time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDisableDialog(false)}>Cancel</Button>
            <Button onPress={handleConfirmDisable} textColor={theme.colors.error}>
              Disable
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    padding: 24,
    paddingBottom: 8,
  },
  listItem: {
    minHeight: 56,
  },
  switch: {
    minWidth: 44,
    minHeight: 44,
  },
  helperText: {
    paddingHorizontal: 16,
  },
});
