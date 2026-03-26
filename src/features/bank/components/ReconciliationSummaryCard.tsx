import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Icon, useTheme } from 'react-native-paper';
import type { ReconciliationSummary } from '../types/reconciliation';

const GREEN = '#10B981';
const AMBER = '#F59E0B';

interface ReconciliationSummaryCardProps {
  summary: ReconciliationSummary;
}

export function ReconciliationSummaryCard({ summary }: ReconciliationSummaryCardProps) {
  const theme = useTheme();
  const { trackedTotal, detectedTotal, difference, isFullyReconciled } = summary;

  const statusColor = isFullyReconciled ? GREEN : AMBER;
  const iconName = isFullyReconciled ? 'check-circle' : 'alert-circle';

  return (
    <Card
      mode="elevated"
      elevation={2}
      style={styles.card}
      accessibilityLabel="Reconciliation summary"
    >
      <Card.Content>
        <View style={styles.headerRow}>
          <Icon source={iconName} size={24} color={statusColor} />
          {isFullyReconciled ? (
            <Text
              variant="titleMedium"
              style={[styles.statusText, { color: statusColor }]}
              accessibilityLabel="Your tracking is 100% accurate!"
            >
              Your tracking is 100% accurate!
            </Text>
          ) : (
            <Text
              variant="titleMedium"
              style={[styles.statusText, { color: statusColor }]}
              accessibilityLabel="Spending mismatch detected"
            >
              Spending mismatch detected
            </Text>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Tracked
            </Text>
            <Text variant="headlineSmall" accessibilityLabel={`Tracked: €${trackedTotal.toFixed(2)} per month`}>
              €{trackedTotal.toFixed(2)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              /mo
            </Text>
          </View>

          <View style={styles.comparisonItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Detected
            </Text>
            <Text variant="headlineSmall" accessibilityLabel={`Detected: €${detectedTotal.toFixed(2)} per month`}>
              €{detectedTotal.toFixed(2)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              /mo
            </Text>
          </View>
        </View>

        {!isFullyReconciled && (
          <View style={[styles.differenceRow, { backgroundColor: AMBER + '22' }]}>
            <Text
              variant="bodyMedium"
              style={{ color: AMBER }}
              accessibilityLabel={`Difference: €${Math.abs(difference).toFixed(2)} per month`}
            >
              Difference: €{Math.abs(difference).toFixed(2)}/mo
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusText: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  comparisonItem: {
    alignItems: 'center',
    gap: 2,
  },
  differenceRow: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
});
