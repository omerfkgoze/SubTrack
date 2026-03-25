import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
import type { BankConnection, BankConnectionStatus } from '../types';

function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return 'Never';
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 2) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 2) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getDaysUntilExpiry(isoDate: string): number {
  const expiry = new Date(isoDate);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface ConnectionStatusCardProps {
  connection: BankConnection;
  onDisconnect: () => void;
  onReconnect: () => void;
  onRefresh: () => void;
  isDisconnecting: boolean;
  isDetecting: boolean;
}

export function ConnectionStatusCard({
  connection,
  onDisconnect,
  onReconnect,
  onRefresh,
  isDisconnecting,
  isDetecting,
}: ConnectionStatusCardProps) {
  const theme = useTheme();

  const STATUS_CONFIG: Record<BankConnectionStatus, { label: string; color: string }> = {
    active: { label: 'Connected', color: theme.colors.secondary },
    expiring_soon: { label: 'Expiring Soon', color: theme.colors.tertiary },
    expired: { label: 'Expired', color: theme.colors.error },
    error: { label: 'Error', color: theme.colors.error },
    disconnected: { label: 'Disconnected', color: theme.colors.outline },
  };

  const statusConfig = STATUS_CONFIG[connection.status];
  const daysUntilExpiry = getDaysUntilExpiry(connection.consentExpiresAt);

  return (
    <Surface style={styles.card} elevation={1} accessibilityLabel={`Bank connection: ${connection.bankName}`}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.bankName}>
          {connection.bankName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Text
            variant="labelSmall"
            style={[styles.statusLabel, { color: statusConfig.color }]}
            accessibilityLabel={`Status: ${statusConfig.label}`}
          >
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Connected: {formatDate(connection.connectedAt)}
        </Text>
        {connection.lastSyncedAt && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Last synced: {formatRelativeDate(connection.lastSyncedAt)}
          </Text>
        )}
        {connection.status === 'active' && daysUntilExpiry > 0 && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
          </Text>
        )}
        {connection.status === 'expired' && (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Expired on {formatDate(connection.consentExpiresAt)}
          </Text>
        )}
        {connection.status === 'expiring_soon' && (
          <Text variant="bodySmall" style={{ color: theme.colors.tertiary }}>
            Consent expires on {formatDate(connection.consentExpiresAt)}. Reconnect to renew.
          </Text>
        )}
      </View>

      {connection.status === 'active' && (
        <View style={styles.actions}>
          <Button
            mode="outlined"
            textColor={theme.colors.error}
            onPress={onDisconnect}
            loading={isDisconnecting}
            disabled={isDisconnecting || isDetecting}
            style={styles.actionButton}
            accessibilityLabel="Disconnect bank"
          >
            Disconnect
          </Button>
          <Button
            mode="contained"
            onPress={onRefresh}
            loading={isDetecting}
            disabled={isDisconnecting || isDetecting}
            style={styles.actionButton}
            accessibilityLabel="Refresh bank data"
          >
            Refresh Now
          </Button>
        </View>
      )}

      {(connection.status === 'expiring_soon' || connection.status === 'expired') && (
        <View style={styles.actions}>
          {connection.status === 'expired' && (
            <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.error }]}>
              Connection expired. Reconnect to continue auto-detection.
            </Text>
          )}
          <Button
            mode="contained"
            onPress={onReconnect}
            style={styles.actionButton}
            accessibilityLabel="Reconnect bank"
          >
            Reconnect
          </Button>
        </View>
      )}

      {connection.status === 'error' && (
        <View style={styles.actions}>
          <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.error }]}>
            An error occurred with this connection. Please reconnect to restore access.
          </Text>
          <Button
            mode="contained"
            onPress={onReconnect}
            style={styles.actionButton}
            accessibilityLabel="Retry bank connection"
          >
            Retry
          </Button>
        </View>
      )}

      {connection.status === 'disconnected' && (
        <Text
          variant="bodySmall"
          style={[styles.disconnectedText, { color: theme.colors.onSurfaceVariant }]}
          accessibilityLabel="Bank disconnected"
        >
          Connect a new bank from the Bank Connection screen.
        </Text>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankName: {
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusLabel: {
    fontWeight: 'bold',
  },
  details: {
    gap: 4,
    marginBottom: 12,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    minHeight: 44,
  },
  warningText: {
    marginBottom: 4,
  },
  disconnectedText: {
    marginTop: 4,
    fontStyle: 'italic',
  },
});
