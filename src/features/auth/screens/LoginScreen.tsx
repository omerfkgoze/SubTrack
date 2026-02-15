import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Login</Text>
      <Text variant="bodyMedium" style={styles.placeholder}>
        Login form will be implemented in Story 1.3
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
