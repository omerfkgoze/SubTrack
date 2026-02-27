import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';

interface EmptySubscriptionStateProps {
  onAddPress: () => void;
}

export function EmptySubscriptionState({ onAddPress }: EmptySubscriptionStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon source="package-variant" size={64} color={theme.colors.onSurfaceVariant} />
      <Text variant="headlineSmall" style={[styles.headline, { color: theme.colors.onSurface }]}>
        No subscriptions yet
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.body, { color: theme.colors.onSurfaceVariant }]}
      >
        Add your first subscription to start tracking your spending
      </Text>
      <Button
        mode="contained"
        onPress={onAddPress}
        style={styles.button}
        accessibilityLabel="Add Subscription"
      >
        Add Subscription
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headline: {
    marginTop: 16,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
  },
});
