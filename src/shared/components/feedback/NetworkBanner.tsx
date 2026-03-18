import React from 'react';
import { Banner, useTheme } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';

export function NetworkBanner() {
  const { isOnline } = useNetworkStatus();
  const theme = useTheme();

  return (
    <Banner
      visible={!isOnline}
      actions={[{ label: 'Retry', onPress: () => NetInfo.refresh() }]}
      style={{ backgroundColor: theme.colors.errorContainer }}
      icon="wifi-off"
    >
      No internet connection
    </Banner>
  );
}
