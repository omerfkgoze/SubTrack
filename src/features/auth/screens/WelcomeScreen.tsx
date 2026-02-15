import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import type { AuthStackScreenProps } from '@app/navigation/types';

export function WelcomeScreen({ navigation }: AuthStackScreenProps<'Welcome'>) {
  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        SubTrack
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Track your subscriptions effortlessly
      </Text>
      <Button mode="contained" onPress={() => navigation.navigate('Login')} style={styles.button}>
        Login
      </Button>
      <Button mode="outlined" onPress={() => navigation.navigate('Register')} style={styles.button}>
        Register
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
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
    opacity: 0.7,
  },
  button: {
    width: '100%',
    marginTop: 12,
  },
});
