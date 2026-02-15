import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function SubscriptionsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Subscriptions</Text>
      <Text variant="bodyMedium" style={styles.placeholder}>
        Subscription list will be implemented in Epic 2
      </Text>
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
  placeholder: {
    marginTop: 8,
    opacity: 0.5,
  },
});
