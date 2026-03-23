import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip, useTheme } from 'react-native-paper';
import type { DetectedSubscription } from '../types';
import type { MatchResult } from '@shared/stores/useBankStore';

interface MatchSuggestionCardProps {
  detected: DetectedSubscription;
  match: MatchResult;
  onConfirm: () => void;
  onDismiss: () => void;
  onReplace: () => void;
}

function formatCycle(cycle: string): string {
  const map: Record<string, string> = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };
  return map[cycle] ?? cycle;
}

function MatchReasonChip({ reason }: { reason: string }) {
  const labels: Record<string, string> = {
    name_similar: 'Name Match',
    amount_close: 'Amount Close',
    cycle_match: 'Same Cycle',
  };
  return (
    <Chip compact style={styles.reasonChip} accessibilityLabel={labels[reason] ?? reason}>
      {labels[reason] ?? reason}
    </Chip>
  );
}

export function MatchSuggestionCard({
  detected,
  match,
  onConfirm,
  onDismiss,
  onReplace,
}: MatchSuggestionCardProps) {
  const theme = useTheme();

  const nameDiffers = detected.merchantName.toLowerCase().trim() !== match.subscriptionName.toLowerCase().trim();
  const amountDiffers = detected.amount !== match.subscriptionPrice;
  const cycleDiffers = detected.frequency !== match.subscriptionBillingCycle;

  const diffStyle = { color: theme.colors.tertiary, fontWeight: '700' as const };

  return (
    <Card
      mode="elevated"
      elevation={2}
      style={styles.card}
      accessibilityLabel={`Possible match: ${detected.merchantName} and ${match.subscriptionName}`}
    >
      <Card.Content>
        <Chip
          icon="link"
          style={[styles.matchChip, { backgroundColor: theme.colors.secondaryContainer }]}
          textStyle={{ color: theme.colors.onSecondaryContainer }}
          accessibilityLabel="Possible Match"
        >
          Possible Match
        </Chip>

        {/* Side-by-side comparison */}
        <View style={styles.comparisonRow}>
          <View style={styles.column}>
            <Text variant="labelMedium" style={[styles.columnLabel, { color: theme.colors.onSurfaceVariant }]}>
              Detected
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.fieldValue, nameDiffers && diffStyle]}
              accessibilityLabel={`Detected name: ${detected.merchantName}`}
            >
              {detected.merchantName}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.fieldValue, amountDiffers && diffStyle]}
              accessibilityLabel={`Detected amount: ${detected.amount.toFixed(2)} ${detected.currency}`}
            >
              {detected.amount.toFixed(2)} {detected.currency}
            </Text>
            <Text
              variant="bodySmall"
              style={[{ color: theme.colors.onSurfaceVariant }, cycleDiffers && diffStyle]}
              accessibilityLabel={`Detected cycle: ${formatCycle(detected.frequency)}`}
            >
              {formatCycle(detected.frequency)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <Text variant="labelMedium" style={[styles.columnLabel, { color: theme.colors.onSurfaceVariant }]}>
              Your Subscription
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.fieldValue, nameDiffers && diffStyle]}
              accessibilityLabel={`Subscription name: ${match.subscriptionName}`}
            >
              {match.subscriptionName}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.fieldValue, amountDiffers && diffStyle]}
              accessibilityLabel={`Subscription price: ${match.subscriptionPrice.toFixed(2)} ${match.subscriptionCurrency}`}
            >
              {match.subscriptionPrice.toFixed(2)} {match.subscriptionCurrency}
            </Text>
            <Text
              variant="bodySmall"
              style={[{ color: theme.colors.onSurfaceVariant }, cycleDiffers && diffStyle]}
              accessibilityLabel={`Subscription cycle: ${formatCycle(match.subscriptionBillingCycle)}`}
            >
              {formatCycle(match.subscriptionBillingCycle)}
            </Text>
          </View>
        </View>

        {/* Match reason chips */}
        <View style={styles.reasonsRow}>
          {match.matchReasons.map((reason) => (
            <MatchReasonChip key={reason} reason={reason} />
          ))}
        </View>
      </Card.Content>

      <Card.Actions style={styles.actions}>
        <Button
          mode="contained"
          onPress={onConfirm}
          style={styles.actionButton}
          accessibilityLabel={`Confirm match between ${detected.merchantName} and ${match.subscriptionName}`}
          accessibilityRole="button"
        >
          Confirm Match
        </Button>
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={styles.actionButton}
          accessibilityLabel={`Not a match: ${detected.merchantName}`}
          accessibilityRole="button"
        >
          Not a Match
        </Button>
        <Button
          mode="text"
          onPress={onReplace}
          accessibilityLabel={`Replace ${match.subscriptionName} with detected data`}
          accessibilityRole="button"
        >
          Replace
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
  matchChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    marginBottom: 4,
  },
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  reasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonChip: {
    marginBottom: 4,
  },
  actions: {
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    paddingTop: 0,
  },
  actionButton: {
    minHeight: 44,
    marginBottom: 4,
  },
});
