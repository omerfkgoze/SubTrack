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
  const theme = useTheme();
  const labels: Record<string, string> = {
    name_similar: 'Name',
    amount_close: 'Amount',
    cycle_match: 'Cycle',
  };
  return (
    <View
      style={[styles.reasonChip, { backgroundColor: theme.colors.secondaryContainer }]}
      accessibilityLabel={labels[reason] ?? reason}
    >
      <Text style={[styles.reasonChipText, { color: theme.colors.onSecondaryContainer }]}>
        {labels[reason] ?? reason}
      </Text>
    </View>
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

          <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

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
          contentStyle={styles.actionButtonContent}
          accessibilityLabel={`Confirm match between ${detected.merchantName} and ${match.subscriptionName}`}
          accessibilityRole="button"
        >
          Confirm Match
        </Button>
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
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
    marginBottom: 8,
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
    marginHorizontal: 12,
  },
  reasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reasonChip: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  reasonChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    paddingTop: 0,
    gap: 4,
  },
  actionButton: {
    minHeight: 44,
    marginBottom: 4,
  },
  actionButtonContent: {
    height: 44,
  },
});
