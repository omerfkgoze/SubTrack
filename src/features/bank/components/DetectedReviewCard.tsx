import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { format } from 'date-fns';
import type { DetectedSubscription } from '../types';

interface DetectedReviewCardProps {
  item: DetectedSubscription;
  onApprove: () => void;
  onDismiss: () => void;
  onNotSubscription: () => void;
}

function getConfidenceColor(score: number, colors: { primary: string; secondary: string; error: string }) {
  if (score >= 0.8) return colors.primary;
  if (score >= 0.6) return colors.secondary;
  return colors.error;
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

export function DetectedReviewCard({ item, onApprove, onDismiss, onNotSubscription }: DetectedReviewCardProps) {
  const theme = useTheme();
  const confidenceColor = getConfidenceColor(item.confidenceScore, theme.colors);
  const confidencePercent = Math.round(item.confidenceScore * 100);

  let formattedDate = '';
  try {
    formattedDate = format(new Date(item.lastSeen), 'MMM d, yyyy');
  } catch {
    formattedDate = item.lastSeen;
  }

  return (
    <Card
      mode="elevated"
      elevation={1}
      style={styles.card}
      accessibilityLabel={`Detected subscription: ${item.merchantName}`}
    >
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium">{item.merchantName}</Text>
          <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
            <Text variant="labelSmall" style={styles.confidenceText}>
              {confidencePercent}%
            </Text>
          </View>
        </View>

        <Text variant="bodyMedium" style={styles.amount}>
          {item.amount.toFixed(2)} {item.currency}
        </Text>

        <View style={styles.metaRow}>
          <Text variant="labelSmall" style={[styles.frequency, { color: theme.colors.onSurfaceVariant }]}>
            {formatFrequency(item.frequency)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Last seen: {formattedDate}
          </Text>
        </View>
      </Card.Content>

      <Card.Actions style={styles.actions}>
        <Button
          mode="contained"
          onPress={onApprove}
          style={styles.addButton}
          accessibilityLabel={`Add ${item.merchantName} to My Subscriptions`}
          accessibilityRole="button"
        >
          Add
        </Button>
        <Button
          mode="outlined"
          onPress={onDismiss}
          accessibilityLabel={`Ignore ${item.merchantName}`}
          accessibilityRole="button"
        >
          Ignore
        </Button>
        <Button
          mode="text"
          onPress={onNotSubscription}
          accessibilityLabel={`${item.merchantName} is not a subscription`}
          accessibilityRole="button"
        >
          Not a Sub
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  confidenceBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  confidenceText: {
    color: '#fff',
    fontWeight: '700',
  },
  amount: {
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frequency: {
    textTransform: 'capitalize',
  },
  actions: {
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  addButton: {
    minHeight: 44,
  },
});
