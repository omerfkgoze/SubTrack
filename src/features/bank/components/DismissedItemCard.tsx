import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import type { DetectedSubscription } from '../types';

interface DismissedItemCardProps {
  item: DetectedSubscription;
  onUndismiss: () => void;
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

function formatFrequency(frequency: DetectedSubscription['frequency']): string {
  switch (frequency) {
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'yearly': return 'Yearly';
    default: return frequency;
  }
}

export function DismissedItemCard({ item, onUndismiss }: DismissedItemCardProps) {
  const theme = useTheme();
  const dismissedDate = formatRelativeDate(item.lastSeen);

  return (
    <Card style={styles.card} accessibilityLabel={`Dismissed item: ${item.merchantName}`}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text variant="titleMedium" style={styles.merchantName}>
              {item.merchantName}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {`${item.currency} ${item.amount.toFixed(2)} · ${formatFrequency(item.frequency)}`}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.dismissedDate, { color: theme.colors.onSurfaceVariant }]}
            >
              {`Dismissed ${dismissedDate}`}
            </Text>
          </View>
          <Button
            mode="outlined"
            compact
            onPress={onUndismiss}
            style={styles.undismissButton}
            accessibilityLabel={`Undo dismiss for ${item.merchantName}`}
            accessibilityRole="button"
          >
            Undo
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  merchantName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  dismissedDate: {
    marginTop: 4,
  },
  undismissButton: {
    minHeight: 44,
    alignSelf: 'center',
  },
});
