import React from 'react';
import { Dialog, Portal, Text, Button, useTheme } from 'react-native-paper';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  subscriptionName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function DeleteConfirmationDialog({
  visible,
  subscriptionName,
  onConfirm,
  onDismiss,
}: DeleteConfirmationDialogProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Icon icon="trash-can-outline" />
        <Dialog.Title style={{ textAlign: 'center' }}>
          {`Delete ${subscriptionName}?`}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
            This subscription will be removed from your tracking. This action
            can be undone for the next 5 seconds.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={onConfirm}
            textColor={theme.colors.error}
            accessibilityLabel={`Confirm delete ${subscriptionName}`}
          >
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
