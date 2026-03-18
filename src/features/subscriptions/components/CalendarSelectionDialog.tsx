import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, List, Portal, useTheme } from 'react-native-paper';

interface CalendarItem {
  id: string;
  title: string;
  color: string;
  isPrimary: boolean;
}

interface CalendarSelectionDialogProps {
  visible: boolean;
  calendars: CalendarItem[];
  selectedId?: string;
  onSelect: (calendarId: string, calendarTitle: string) => void;
  onDismiss: () => void;
}

export function CalendarSelectionDialog({
  visible,
  calendars,
  selectedId,
  onSelect,
  onDismiss,
}: CalendarSelectionDialogProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Select Calendar</Dialog.Title>
        <Dialog.Content>
          <View accessibilityRole="radiogroup">
            {calendars.map((cal) => (
              <List.Item
                key={cal.id}
                title={cal.title}
                left={() => (
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: cal.color },
                    ]}
                  />
                )}
                right={() =>
                  cal.id === selectedId ? (
                    <List.Icon icon="check" color={theme.colors.primary} />
                  ) : null
                }
                onPress={() => onSelect(cal.id, cal.title)}
                style={styles.calendarItem}
                accessibilityRole="radio"
                accessibilityState={{ checked: cal.id === selectedId }}
              />
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginLeft: 8,
  },
  calendarItem: {
    minHeight: 44,
  },
});
