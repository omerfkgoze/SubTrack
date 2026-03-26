import React from 'react';
import { StyleSheet } from 'react-native';
import { Banner } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useBankStore } from '@shared/stores/useBankStore';

export function BankConnectionExpiryBanner() {
  const navigation = useNavigation();
  const connections = useBankStore((s) => s.connections);

  const alertConnection = connections.find(
    (c) => c.status === 'expiring_soon' || c.status === 'expired'
  );

  if (!alertConnection) return null;

  const isExpired = alertConnection.status === 'expired';
  const bgColor = isExpired ? '#EF4444' : '#F59E0B';
  const message = isExpired
    ? `Your ${alertConnection.bankName} connection has expired. Reconnect now.`
    : `Your ${alertConnection.bankName} connection expires soon. Reconnect to keep auto-detection.`;

  return (
    <Banner
      visible
      actions={[{
        label: 'Reconnect',
        onPress: () => navigation.navigate('BankConnectionStatus' as never),
      }]}
      icon="bank-off"
      style={[styles.banner, { backgroundColor: bgColor }]}
      contentStyle={styles.content}
      theme={{ colors: { onSurface: '#FFFFFF', primary: '#FFFFFF' } }}
    >
      {message}
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: 0 },
  content: { paddingVertical: 4 },
});
