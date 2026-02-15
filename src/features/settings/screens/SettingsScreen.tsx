import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Settings</Text>
      <Text variant="bodyMedium" style={styles.placeholder}>
        Settings options will be implemented in later stories
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
