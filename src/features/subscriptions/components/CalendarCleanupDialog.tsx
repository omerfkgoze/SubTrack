import React from 'react';
import { Dialog, Portal, Text, Button, useTheme } from 'react-native-paper';

interface CalendarCleanupDialogProps {
  visible: boolean;
  subscriptionName: string;
  onRemove: () => void;
  onKeep: () => void;
}

export function CalendarCleanupDialog({
  visible,
  subscriptionName,
  onRemove,
  onKeep,
}: CalendarCleanupDialogProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onKeep}
      >
        <Dialog.Title>Remove Calendar Events?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            {`Do you want to remove calendar events for ${subscriptionName}?`}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onKeep}>Keep</Button>
          <Button
            onPress={onRemove}
            textColor={theme.colors.error}
          >
            Remove
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
