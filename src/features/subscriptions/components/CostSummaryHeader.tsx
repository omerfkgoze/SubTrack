import React from 'react';
import { StyleSheet } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

interface CostSummaryHeaderProps {
  totalMonthlyCost: number;
  subscriptionCount: number;
}

export function CostSummaryHeader({ totalMonthlyCost, subscriptionCount }: CostSummaryHeaderProps) {
  const theme = useTheme();
  const yearlyEquivalent = totalMonthlyCost * 12;

  const countLabel = subscriptionCount === 1 ? 'subscription' : 'subscriptions';

  return (
    <Surface
      style={styles.container}
      elevation={0}
      accessibilityRole="summary"
      accessibilityLabel={`Total monthly cost: ${totalMonthlyCost.toFixed(2)} euros, ${subscriptionCount} active ${countLabel}, ${yearlyEquivalent.toFixed(2)} euros per year`}
    >
      <Text variant="headlineMedium" style={[styles.totalCost, { color: theme.colors.primary }]}>
        €{totalMonthlyCost.toFixed(2)}/month
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {subscriptionCount} {countLabel}
      </Text>
      <Text variant="bodySmall" style={[styles.yearlyText, { color: theme.colors.onSurfaceVariant }]}>
        €{yearlyEquivalent.toFixed(2)}/year
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 8,
  },
  totalCost: {
    fontWeight: '700',
  },
  yearlyText: {
    marginTop: 2,
  },
});
