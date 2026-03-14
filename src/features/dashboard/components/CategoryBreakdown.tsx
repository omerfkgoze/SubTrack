import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import type { CategoryBreakdownItem } from '@features/subscriptions/utils/subscriptionUtils';

interface CategoryBreakdownProps {
  breakdownData: CategoryBreakdownItem[];
  totalMonthly: number;
}

export function CategoryBreakdown({ breakdownData }: CategoryBreakdownProps) {
  return (
    <Surface style={styles.container} elevation={1}>
      <Text variant="titleMedium" style={styles.title}>
        Spending by Category
      </Text>

      <View style={styles.colorBar}>
        {breakdownData.map((item) => (
          <View
            key={item.categoryId}
            style={{
              flex: item.percentage,
              backgroundColor: item.color,
              height: 8,
            }}
          />
        ))}
      </View>

      {breakdownData.map((item) => (
        <View
          key={item.categoryId}
          style={styles.row}
          accessibilityLabel={`${item.categoryLabel} spending: ${item.monthlyTotal.toFixed(2)} euros, ${Math.round(item.percentage)} percent of total`}
        >
          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          <Text style={styles.categoryLabel}>{item.categoryLabel}</Text>
          <Text style={styles.amount}>€{item.monthlyTotal.toFixed(2)}</Text>
          <Text style={styles.percentage}>{Math.round(item.percentage)}%</Text>
        </View>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  title: {
    marginBottom: 12,
    fontWeight: '600',
  },
  colorBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabel: {
    flex: 1,
    marginLeft: 8,
  },
  amount: {
    marginRight: 8,
  },
  percentage: {
    width: 50,
    textAlign: 'right',
  },
});
