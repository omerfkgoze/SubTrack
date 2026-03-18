import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import { MAX_FREE_SUBSCRIPTIONS, usePremiumStore } from '@shared/stores/usePremiumStore';

interface SubscriptionCounterProps {
  activeCount: number;
}

export function SubscriptionCounter({ activeCount }: SubscriptionCounterProps) {
  const theme = useTheme();
  const isPremium = usePremiumStore((s) => s.isPremium);

  if (isPremium) return null;

  const progress = activeCount / MAX_FREE_SUBSCRIPTIONS;

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${activeCount} of ${MAX_FREE_SUBSCRIPTIONS} subscriptions used`}
    >
      <Text variant="bodySmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
        {activeCount}/{MAX_FREE_SUBSCRIPTIONS} subscriptions used
      </Text>
      <ProgressBar
        progress={progress}
        color={theme.colors.secondary}
        style={styles.progressBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  label: {
    opacity: 0.7,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
});
