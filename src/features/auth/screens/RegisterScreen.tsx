import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Register</Text>
      <Text variant="bodyMedium" style={styles.placeholder}>
        Registration form will be implemented in Story 1.2
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
