import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';

interface SavingsIndicatorProps {
  savingsAmount: number;
  inactiveCount: number;
}

export function SavingsIndicator({ savingsAmount, inactiveCount }: SavingsIndicatorProps) {
  if (savingsAmount <= 0 || inactiveCount <= 0) return null;

  const formattedAmount = `€${savingsAmount.toFixed(2)}`;
  const subText = inactiveCount === 1 ? 'subscription' : 'subscriptions';
  const accessibilityText = `You are saving ${formattedAmount} per month by cancelling ${inactiveCount} ${subText}`;

  return (
    <Surface
      style={styles.container}
      elevation={1}
      accessible
      accessibilityLabel={accessibilityText}
    >
      <View style={styles.row}>
        <Icon source="trending-down" size={20} color="#10B981" />
        <Text style={styles.text}>
          {"You're saving "}
          <Text style={styles.amount}>{formattedAmount}</Text>
          {`/month by cancelling ${inactiveCount} ${subText}`}
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
  },
  amount: {
    color: '#10B981',
    fontWeight: '600',
  },
});
