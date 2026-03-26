import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import type { DetectedSubscription } from '../types';

interface UnmatchedTransactionCardProps {
  item: DetectedSubscription;
  onAdd: () => void;
  onDismiss: () => void;
}

function formatFrequency(frequency: DetectedSubscription['frequency']): string {
  const map: Record<DetectedSubscription['frequency'], string> = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };
  return map[frequency] ?? frequency;
}

export function UnmatchedTransactionCard({ item, onAdd, onDismiss }: UnmatchedTransactionCardProps) {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={styles.card}
      accessibilityLabel={`Unmatched transaction: ${item.merchantName}`}
    >
      <Card.Content>
        <Text variant="titleMedium">{item.merchantName}</Text>
        <Text variant="bodyMedium" style={styles.amount}>
          {item.amount.toFixed(2)} {item.currency}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatFrequency(item.frequency)}
        </Text>
      </Card.Content>

      <Card.Actions style={styles.actions}>
        <Button
          mode="contained"
          onPress={onAdd}
          style={styles.addButton}
          accessibilityLabel={`Add ${item.merchantName} to subscriptions`}
          accessibilityRole="button"
        >
          Add to Subscriptions
        </Button>
        <Button
          mode="outlined"
          onPress={onDismiss}
          accessibilityLabel={`Dismiss ${item.merchantName}`}
          accessibilityRole="button"
        >
          Dismiss
        </Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  amount: {
    marginTop: 4,
    marginBottom: 4,
  },
  actions: {
    justifyContent: 'flex-start',
    paddingTop: 0,
    flexWrap: 'wrap',
    gap: 8,
  },
  addButton: {
    minHeight: 44,
  },
});
