import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { SettingsStackParamList, MainTabsParamList } from '@app/navigation/types';
import { useBankStore } from '@shared/stores/useBankStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import type { DetectedSubscription } from '../types';
import { ReconciliationSummaryCard } from '../components/ReconciliationSummaryCard';
import { UnmatchedTransactionCard } from '../components/UnmatchedTransactionCard';
import { computeReconciliation } from '../utils/reconciliationUtils';

type ReconciliationNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<SettingsStackParamList, 'Reconciliation'>,
  BottomTabNavigationProp<MainTabsParamList>
>;

export function ReconciliationScreen() {
  const theme = useTheme();
  const navigation = useNavigation<ReconciliationNavProp>();

  const connections = useBankStore((s) => s.connections);
  const detectedSubscriptions = useBankStore((s) => s.detectedSubscriptions);
  const isFetchingDetected = useBankStore((s) => s.isFetchingDetected);
  const fetchDetectedSubscriptions = useBankStore((s) => s.fetchDetectedSubscriptions);
  const dismissDetectedSubscription = useBankStore((s) => s.dismissDetectedSubscription);
  const fetchConnections = useBankStore((s) => s.fetchConnections);

  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const isFetchingSubscriptions = useSubscriptionStore((s) => s.isLoading);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await fetchConnections();
        await fetchDetectedSubscriptions();
        await useSubscriptionStore.getState().fetchSubscriptions();
      };
      load();
    }, [fetchConnections, fetchDetectedSubscriptions]),
  );

  const handleAdd = useCallback(
    (item: DetectedSubscription) => {
      navigation.navigate('Add', {
        prefill: {
          name: item.merchantName,
          price: item.amount,
          billing_cycle: item.frequency,
          currency: item.currency,
          detectedId: item.id,
          lastSeen: item.lastSeen,
        },
      });
    },
    [navigation],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      await dismissDetectedSubscription(id);
      const error = useBankStore.getState().detectionError;
      if (error?.code === 'DISMISS_FAILED') {
        setSnackbarType('error');
        setSnackbarMessage(error.message);
      } else {
        setSnackbarType('success');
        setSnackbarMessage('Transaction dismissed');
      }
    },
    [dismissDetectedSubscription],
  );

  const isLoading = isFetchingDetected || isFetchingSubscriptions;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]} accessibilityLabel="Loading reconciliation data">
        <ActivityIndicator size="large" accessibilityLabel="Loading" />
      </View>
    );
  }

  const hasConnection = connections.some((c) => c.status === 'active' || c.status === 'expiring_soon');

  if (!hasConnection) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No bank connection
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Connect your bank to see spending reconciliation.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('BankConnection', undefined)}
          style={styles.actionButton}
          accessibilityLabel="Connect Bank"
          accessibilityRole="button"
        >
          Connect Bank
        </Button>
      </View>
    );
  }

  if (detectedSubscriptions.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No transactions detected yet
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Bank data is being analyzed. Check back soon.
        </Text>
      </View>
    );
  }

  const reconciliation = computeReconciliation(subscriptions, detectedSubscriptions);

  return (
    <View style={styles.container}>
      <FlatList
        data={reconciliation.unmatchedDetected}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ReconciliationSummaryCard summary={reconciliation} />
        }
        renderItem={({ item }) => (
          <UnmatchedTransactionCard
            item={item}
            onAdd={() => handleAdd(item)}
            onDismiss={() => handleDismiss(item.id)}
          />
        )}
        ListEmptyComponent={
          reconciliation.isFullyReconciled ? null : (
            <View style={styles.centeredPad}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                No unmatched transactions
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
      />

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={snackbarType === 'error' ? 5000 : 3000}
        accessibilityLiveRegion="polite"
        style={snackbarType === 'error' ? { backgroundColor: theme.colors.error } : undefined}
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
  centeredPad: {
    padding: 24,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actionButton: {
    minHeight: 44,
  },
});
