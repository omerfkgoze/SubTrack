import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text } from 'react-native-paper';

interface BankConsentDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BankConsentDialog({ visible, onConfirm, onCancel }: BankConsentDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>Bank Connection Consent</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            <Text variant="bodyMedium" style={styles.paragraph}>
              By connecting your bank account, you agree that SubTrack will:
            </Text>

            <Text variant="bodyMedium" style={styles.item}>
              {'\u2705'} Access your account information (account name, balance)
            </Text>
            <Text variant="bodyMedium" style={styles.item}>
              {'\u2705'} Access your transaction history (last 90 days)
            </Text>
            <Text variant="bodyMedium" style={styles.item}>
              {'\u2705'} Analyze transactions to detect recurring subscriptions
            </Text>
            <Text variant="bodyMedium" style={styles.item}>
              {'\u2705'} Store detected subscription data in your SubTrack account
            </Text>

            <Text variant="bodyMedium" style={[styles.paragraph, styles.negativeHeader]}>
              SubTrack will NOT:
            </Text>

            <Text variant="bodyMedium" style={styles.item}>
              {'\u274C'} Access your bank login credentials (handled securely by Tink)
            </Text>
            <Text variant="bodyMedium" style={styles.item}>
              {'\u274C'} Make payments or transfers from your account
            </Text>
            <Text variant="bodyMedium" style={styles.item}>
              {'\u274C'} Share your financial data with third parties
            </Text>
            <Text variant="bodyMedium" style={styles.item}>
              {'\u274C'} Store raw transaction data longer than 30 days
            </Text>

            <Text variant="bodySmall" style={styles.footer}>
              You can disconnect your bank at any time in Settings.
            </Text>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button
            onPress={onCancel}
            accessibilityLabel="Cancel bank connection"
            accessibilityRole="button"
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            accessibilityLabel="Connect Bank Account"
            accessibilityRole="button"
          >
            Connect Bank Account
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 400,
    paddingHorizontal: 0,
  },
  paragraph: {
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  negativeHeader: {
    marginTop: 16,
  },
  item: {
    marginBottom: 6,
    paddingHorizontal: 24,
  },
  footer: {
    marginTop: 16,
    paddingHorizontal: 24,
    opacity: 0.7,
  },
});
