import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
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
}

export function SpendingHero({
  amount,
  currency = '€',
  showYearly = true,
  animateOnChange = true,
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
  }, [amount, animateOnChange, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const monthlyFormatted = `${currency}${amount.toFixed(2)}`;
  const yearlyFormatted = `${currency}${(amount * 12).toFixed(2)}`;

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
});
