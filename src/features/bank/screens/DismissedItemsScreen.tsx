import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, Snackbar, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useBankStore } from '@shared/stores/useBankStore';
import { DismissedItemCard } from '../components/DismissedItemCard';
import type { DetectedSubscription } from '../types';

export function DismissedItemsScreen() {
  const theme = useTheme();

  const dismissedItems = useBankStore((s) => s.dismissedItems);
  const isFetchingDismissedItems = useBankStore((s) => s.isFetchingDismissedItems);
  const fetchDismissedItems = useBankStore((s) => s.fetchDismissedItems);
  const undismissDetectedSubscription = useBankStore((s) => s.undismissDetectedSubscription);
  const detectionError = useBankStore((s) => s.detectionError);
  const dismissedMerchants = useBankStore((s) => s.dismissedMerchants);
  const fetchDismissedMerchants = useBankStore((s) => s.fetchDismissedMerchants);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  useFocusEffect(
    useCallback(() => {
      fetchDismissedItems();
      fetchDismissedMerchants();
    }, [fetchDismissedItems, fetchDismissedMerchants]),
  );

  const handleUndismiss = useCallback(
    async (id: string) => {
      await undismissDetectedSubscription(id);
      const error = useBankStore.getState().detectionError;
      if (error?.code === 'UNDISMISS_FAILED' || error?.code === 'NETWORK_ERROR') {
        setSnackbarType('error');
        setSnackbarMessage(error.message);
      } else {
        setSnackbarType('success');
        setSnackbarMessage('Item restored to detected list.');
      }
    },
    [undismissDetectedSubscription],
  );

  if (isFetchingDismissedItems) {
    return (
      <View style={[styles.container, styles.centered]} accessibilityLabel="Loading dismissed items">
        <ActivityIndicator size="large" accessibilityLabel="Loading" />
      </View>
    );
  }

  if (!isFetchingDismissedItems && dismissedItems.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No dismissed items
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Items you mark as "Not a Subscription" will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dismissedItems}
        keyExtractor={(item: DetectedSubscription) => item.id}
        renderItem={({ item }: { item: DetectedSubscription }) => {
          const merchant = dismissedMerchants.find((m) => m.merchantName === item.merchantName);
          return (
            <DismissedItemCard
              item={item}
              dismissedAt={merchant?.dismissedAt}
              onUndismiss={() => handleUndismiss(item.id)}
            />
          );
        }}
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
  },
});
