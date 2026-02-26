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
  TextInput,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useAuthStore } from '@shared/stores/useAuthStore';

export function SettingsScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const isBiometricAvailable = useAuthStore((s) => s.isBiometricAvailable);
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);
  const biometryType = useAuthStore((s) => s.biometryType);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const checkBiometricAvailability = useAuthStore((s) => s.checkBiometricAvailability);
  const enableBiometric = useAuthStore((s) => s.enableBiometric);
  const disableBiometric = useAuthStore((s) => s.disableBiometric);
  const isDeleting = useAuthStore((s) => s.isDeleting);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const deleteAccountWithBiometric = useAuthStore((s) => s.deleteAccountWithBiometric);
  const clearError = useAuthStore((s) => s.clearError);
  const logout = useAuthStore((s) => s.logout);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteVerification, setShowDeleteVerification] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

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
    const currentError = useAuthStore.getState().error;
    if (!currentError) {
      setSnackbarMessage('Biometric login enabled');
    }
  };

  const handleConfirmDisable = async () => {
    setShowDisableDialog(false);
    await disableBiometric();
    setSnackbarMessage('Biometric login disabled');
  };

  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
  };

  const handleDeleteWithPassword = async () => {
    const success = await deleteAccount(deletePassword);
    if (!success) {
      setDeleteError(useAuthStore.getState().error?.message ?? 'Deletion failed.');
    }
  };

  const handleDeleteWithBiometric = async () => {
    const success = await deleteAccountWithBiometric();
    if (!success) {
      setDeleteError(useAuthStore.getState().error?.message ?? 'Verification failed.');
    }
  };

  const dismissDeleteVerification = () => {
    setShowDeleteVerification(false);
    setDeletePassword('');
    setDeleteError('');
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

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title={user?.email ?? ''}
            left={(props) => <List.Icon {...props} icon="email-outline" />}
            style={styles.listItem}
            accessibilityLabel={`Email: ${user?.email ?? ''}`}
          />
          <List.Item
            title="Log Out"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
            onPress={() => setShowLogoutDialog(true)}
            disabled={isLoading || isDeleting}
            style={styles.listItem}
            accessibilityLabel="Log Out"
            accessibilityRole="button"
          />
          <List.Item
            title="Delete Account"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="delete-forever" color={theme.colors.error} />}
            onPress={() => setShowDeleteDialog(true)}
            disabled={isLoading || isDeleting}
            style={styles.listItem}
            accessibilityLabel="Delete Account"
            accessibilityRole="button"
          />
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
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Log Out</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to log out?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button onPress={handleConfirmLogout} textColor={theme.colors.error}>
              Log Out
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {'This action is permanent and cannot be undone.\n\nAll your data will be permanently deleted:\n\u2022 Your account and profile\n\u2022 All subscriptions and settings\n\u2022 All notification preferences'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)} accessibilityLabel="Cancel" accessibilityRole="button">
              Cancel
            </Button>
            <Button
              onPress={() => {
                setShowDeleteDialog(false);
                setShowDeleteVerification(true);
                setDeletePassword('');
                setDeleteError('');
              }}
              textColor={theme.colors.error}
              accessibilityLabel="Continue"
              accessibilityRole="button"
            >
              Continue
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={showDeleteVerification}
          onDismiss={dismissDeleteVerification}
          dismissable={!isDeleting}
        >
          <Dialog.Title>Verify Your Identity</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.verificationText}>
              Enter your password to confirm account deletion.
            </Text>
            <TextInput
              mode="outlined"
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              disabled={isDeleting}
              autoFocus
              accessibilityLabel="Password"
              accessibilityRole="text"
            />
            {!!deleteError && (
              <HelperText type="error" accessibilityLiveRegion="polite">
                {deleteError}
              </HelperText>
            )}
            {isBiometricEnabled && isBiometricAvailable && (
              <>
                <Divider style={styles.divider} />
                <Button
                  mode="outlined"
                  icon={biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
                  onPress={handleDeleteWithBiometric}
                  disabled={isDeleting}
                  style={styles.biometricButton}
                  accessibilityLabel={`Verify with ${biometricLabel}`}
                  accessibilityRole="button"
                >
                  {`Verify with ${biometricLabel}`}
                </Button>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={dismissDeleteVerification}
              disabled={isDeleting}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              Cancel
            </Button>
            <Button
              onPress={handleDeleteWithPassword}
              textColor={theme.colors.error}
              disabled={isDeleting || !deletePassword.trim()}
              loading={isDeleting}
              accessibilityLabel="Delete My Account"
              accessibilityRole="button"
            >
              Delete My Account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={3000}
        accessibilityLiveRegion="polite"
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
  verificationText: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  biometricButton: {
    minHeight: 44,
  },
});
