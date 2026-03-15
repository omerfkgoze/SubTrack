import React from 'react';
import { StyleSheet } from 'react-native';
import { Banner, useTheme } from 'react-native-paper';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { openNotificationSettings } from '@features/notifications/services/notificationService';

interface NotificationStatusBannerProps {
  visible?: boolean;
}

export function NotificationStatusBanner({ visible }: NotificationStatusBannerProps) {
  const theme = useTheme();
  const permissionStatus = useNotificationStore((s) => s.permissionStatus);

  const isDisabled = permissionStatus === 'denied';
  const shouldShow = visible !== undefined ? visible && isDisabled : isDisabled;

  if (!shouldShow) {
    return null;
  }

  return (
    <Banner
      visible
      actions={[
        {
          label: 'Turn On',
          onPress: openNotificationSettings,
          accessibilityLabel: 'Turn on notifications',
        },
      ]}
      icon="bell-off"
      style={[styles.banner, { backgroundColor: '#EF4444' }]}
      contentStyle={styles.content}
      theme={{
        ...theme,
        colors: {
          ...theme.colors,
          onSurface: '#FFFFFF',
          primary: '#FFFFFF',
        },
      }}
    >
      Notifications are off! Reminders can{"'"}t reach you.
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: 0,
  },
  content: {
    paddingVertical: 4,
  },
});
