import React from 'react';
import { Snackbar } from 'react-native-paper';

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function UndoSnackbar({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 5000,
}: UndoSnackbarProps) {
  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={duration}
      action={{
        label: 'UNDO',
        onPress: onUndo,
        accessibilityLabel: `Undo: ${message}`,
      }}
    >
      {message}
    </Snackbar>
  );
}
