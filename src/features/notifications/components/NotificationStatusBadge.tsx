import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { openNotificationSettings } from '@features/notifications/services/notificationService';
import { getDeliveryCount, hasPartialNotifications } from '../services/notificationHistoryService';

export interface NotificationStatusBadgeProps {
  variant: 'header' | 'banner';
  enabled?: boolean;
  deliveryCount?: number;
  onEnablePress?: () => void;
  partial?: boolean;
}

type BadgeState = 'enabled' | 'disabled' | 'partial';

const STATE_COLORS: Record<BadgeState, string> = {
  enabled: '#10B981',
  disabled: '#EF4444',
  partial: '#F59E0B',
};

export function NotificationStatusBadge({
  variant,
  enabled: enabledProp,
  deliveryCount: deliveryCountProp,
  onEnablePress,
  partial: partialProp,
}: NotificationStatusBadgeProps) {
  const permissionStatus = useNotificationStore((s) => s.permissionStatus);
  const user = useAuthStore((s) => s.user);

  const [deliveryCount, setDeliveryCount] = useState<number>(deliveryCountProp ?? 0);
  const [isPartial, setIsPartial] = useState<boolean>(partialProp ?? false);

  const isEnabled = enabledProp !== undefined ? enabledProp : permissionStatus === 'granted';

  const loadStats = useCallback(async () => {
    if (!user || !isEnabled) return;
    try {
      const [count, partial] = await Promise.all([
        getDeliveryCount(user.id),
        hasPartialNotifications(user.id),
      ]);
      setDeliveryCount(count);
      setIsPartial(partial);
    } catch {
      // non-critical
    }
  }, [user, isEnabled]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const state: BadgeState = !isEnabled ? 'disabled' : isPartial ? 'partial' : 'enabled';
  const color = STATE_COLORS[state];

  const messageMap: Record<BadgeState, string> = {
    enabled:
      deliveryCount > 0
        ? `${deliveryCount} reminder${deliveryCount === 1 ? '' : 's'} delivered`
        : 'Notifications active',
    disabled: 'Notifications off',
    partial: 'Some notifications blocked',
  };

  const message = messageMap[state];

  const handlePress = state === 'disabled' ? (onEnablePress ?? openNotificationSettings) : undefined;

  const isBanner = variant === 'banner';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={handlePress ? 0.7 : 1}
      style={[styles.container, isBanner ? styles.bannerContainer : styles.headerContainer]}
      accessibilityLabel={`Notification status: ${message}`}
      accessibilityRole={handlePress ? 'button' : 'text'}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        variant={isBanner ? 'bodyMedium' : 'bodySmall'}
        style={[styles.text, { color }]}
      >
        {message}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontWeight: '500',
  },
});
