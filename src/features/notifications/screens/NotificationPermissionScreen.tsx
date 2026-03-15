import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore } from '@shared/stores/useNotificationStore';

export function NotificationPermissionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const permissionStatus = useNotificationStore((s) => s.permissionStatus);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const error = useNotificationStore((s) => s.error);
  const requestPermission = useNotificationStore((s) => s.requestPermission);

  const handleEnable = async () => {
    await requestPermission();
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  if (permissionStatus === 'granted') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Icon source="check-circle" size={64} color={theme.colors.primary} />
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Notifications enabled!
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {"We'll remind you before each renewal so you stay in control."}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
            accessibilityLabel="Continue to app"
          >
            Continue
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon source="bell-outline" size={64} color={theme.colors.primary} />
        <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
          Never miss a renewal again
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.subtitle, { color: theme.colors.secondary }]}
        >
          Users save €47/month on average
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {"We'll remind you 3 days before each renewal so you can decide whether to keep or cancel."}
        </Text>
        {error && (
          <Text
            variant="bodySmall"
            style={[styles.errorText, { color: theme.colors.error }]}
          >
            {error.message}
          </Text>
        )}
        <Button
          mode="contained"
          onPress={handleEnable}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          icon="bell"
          accessibilityLabel="Enable push notifications"
        >
          Enable Notifications
        </Button>
        <Button
          mode="text"
          onPress={handleSkip}
          disabled={isLoading}
          style={styles.skipButton}
          accessibilityLabel="Skip notifications setup"
        >
          Maybe Later
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    marginTop: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 32,
    minWidth: 240,
    minHeight: 44,
  },
  skipButton: {
    marginTop: 16,
    minHeight: 44,
  },
});
