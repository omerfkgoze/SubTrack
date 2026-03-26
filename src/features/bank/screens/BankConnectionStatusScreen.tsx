import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, Button, Snackbar, Dialog, Portal, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@app/navigation/types';
import { useBankStore } from '@shared/stores/useBankStore';
import { ConnectionStatusCard } from '../components/ConnectionStatusCard';
import type { BankConnection } from '../types';

export function BankConnectionStatusScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const connections = useBankStore((s) => s.connections);
  const isFetchingConnections = useBankStore((s) => s.isFetchingConnections);
  const fetchConnections = useBankStore((s) => s.fetchConnections);
  const disconnectConnection = useBankStore((s) => s.disconnectConnection);
  const refreshBankData = useBankStore((s) => s.refreshBankData);
  const isDisconnecting = useBankStore((s) => s.isDisconnecting);
  const isDetecting = useBankStore((s) => s.isDetecting);
  const isRefreshing = useBankStore((s) => s.isRefreshing);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [confirmDisconnectId, setConfirmDisconnectId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchConnections();
    }, [fetchConnections]),
  );

  const handleDisconnectPress = useCallback((connectionId: string) => {
    setConfirmDisconnectId(connectionId);
  }, []);

  const handleConfirmDisconnect = useCallback(async () => {
    if (!confirmDisconnectId) return;
    const id = confirmDisconnectId;
    setConfirmDisconnectId(null);
    await disconnectConnection(id);
    const error = useBankStore.getState().connectionError;
    if (error) {
      setSnackbarMessage(error.message);
    } else {
      setSnackbarMessage('Bank disconnected successfully');
    }
  }, [confirmDisconnectId, disconnectConnection]);

  const handleReconnect = useCallback(() => {
    navigation.navigate('BankConnection', { autoConnect: true });
  }, [navigation]);

  const handlePullToRefresh = useCallback(async () => {
    const activeConn = connections.find((c) => c.status === 'active');
    if (activeConn) {
      await refreshBankData(activeConn.id);
      await fetchConnections();
      const error = useBankStore.getState().detectionError;
      if (error) {
        setSnackbarMessage(error.message);
      } else {
        const result = useBankStore.getState().lastDetectionResult;
        if (result) {
          const count = result.detectedCount;
          setSnackbarMessage(
            count === 0
              ? 'No new subscriptions detected'
              : `${count} subscription${count === 1 ? '' : 's'} detected!`,
          );
        }
      }
    } else {
      await fetchConnections();
    }
  }, [connections, refreshBankData, fetchConnections]);

  const handleRefresh = useCallback(async (connectionId: string) => {
    await refreshBankData(connectionId);
    const error = useBankStore.getState().detectionError;
    if (error) {
      setSnackbarMessage(error.message);
    } else {
      const result = useBankStore.getState().lastDetectionResult;
      if (result) {
        const count = result.detectedCount;
        setSnackbarMessage(
          count === 0
            ? 'No new subscriptions detected'
            : `${count} subscription${count === 1 ? '' : 's'} detected!`,
        );
      }
    }
  }, [refreshBankData]);

  if (isFetchingConnections) {
    return (
      <View style={[styles.container, styles.centered]} accessibilityLabel="Loading bank connections">
        <ActivityIndicator size="large" accessibilityLabel="Loading" />
      </View>
    );
  }

  if (!isFetchingConnections && connections.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No bank connections
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Connect your bank to automatically detect subscriptions.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('BankConnection')}
          style={styles.connectButton}
          accessibilityLabel="Connect Bank"
        >
          Connect Bank
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('Reconciliation')}
        style={styles.reconciliationButton}
        icon="bank-transfer"
        accessibilityLabel="View Spending Reconciliation"
        accessibilityRole="button"
      >
        View Spending Reconciliation
      </Button>

      <FlatList
        data={connections}
        keyExtractor={(item: BankConnection) => item.id}
        renderItem={({ item }: { item: BankConnection }) => (
          <ConnectionStatusCard
            connection={item}
            onDisconnect={() => handleDisconnectPress(item.id)}
            onReconnect={handleReconnect}
            onRefresh={() => handleRefresh(item.id)}
            isDisconnecting={isDisconnecting}
            isDetecting={isDetecting}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} />
        }
      />

      <Portal>
        <Dialog
          visible={!!confirmDisconnectId}
          onDismiss={() => setConfirmDisconnectId(null)}
        >
          <Dialog.Title>Disconnect Bank?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure? This will stop auto-detection for this bank.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDisconnectId(null)} accessibilityLabel="Cancel disconnect">
              Cancel
            </Button>
            <Button
              onPress={handleConfirmDisconnect}
              textColor={theme.colors.error}
              loading={isDisconnecting}
              accessibilityLabel="Confirm disconnect"
            >
              Disconnect
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={3000}
        accessibilityLiveRegion="polite"
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  connectButton: {
    minHeight: 44,
  },
  reconciliationButton: {
    margin: 16,
    marginBottom: 0,
    minHeight: 44,
  },
});
