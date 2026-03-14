import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';

interface SpendingHeroProps {
  amount: number;
  currency?: string;
  showYearly?: boolean;
  animateOnChange?: boolean;
  subscriptionCount?: number;
  averageAmount?: number;
  showQuickStats?: boolean;
}

export function SpendingHero({
  amount,
  currency = '€',
  showYearly = true,
  animateOnChange = true,
  subscriptionCount,
  averageAmount,
  showQuickStats = false,
}: SpendingHeroProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (animateOnChange && !reducedMotion) {
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 300 }),
      );
    }
  }, [amount, subscriptionCount, averageAmount, animateOnChange, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const monthlyFormatted = `${currency}${amount.toFixed(2)}`;
  const yearlyFormatted = `${currency}${(amount * 12).toFixed(2)}`;
  const showStats = showQuickStats && (subscriptionCount ?? 0) > 0;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: theme.colors.primary }, animatedStyle]}
      accessibilityRole="header"
      accessibilityLabel={`Total monthly spending: ${amount.toFixed(2)} euros`}
    >
      <Text style={styles.heroNumber}>{monthlyFormatted}</Text>
      <Text style={styles.subtitle}>per month</Text>
      {showYearly && (
        <Text style={[styles.yearlyConversion, { color: theme.colors.tertiary }]}>
          {`= ${yearlyFormatted} per year`}
        </Text>
      )}
      {amount === 0 && (
        <Text style={styles.emptyMessage}>
          Add your first subscription to see your spending
        </Text>
      )}
      {showStats && (
        <View style={styles.quickStatsRow}>
          <View
            style={styles.statCard}
            accessible
            accessibilityLabel={`${subscriptionCount} active ${subscriptionCount === 1 ? 'subscription' : 'subscriptions'}`}
          >
            <Text style={styles.statValue}>{subscriptionCount}</Text>
            <Text style={styles.statLabel}>active</Text>
          </View>
          <View
            style={styles.statCard}
            accessible
            accessibilityLabel={`${currency}${(averageAmount ?? 0).toFixed(2)} average monthly cost`}
          >
            <Text style={styles.statValue}>{`${currency}${(averageAmount ?? 0).toFixed(2)}`}</Text>
            <Text style={styles.statLabel}>average</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  yearlyConversion: {
    fontSize: 20,
    marginTop: 12,
  },
  emptyMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 16,
    textAlign: 'center',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    minWidth: 90,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
});
