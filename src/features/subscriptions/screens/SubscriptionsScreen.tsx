import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList, SubscriptionsStackParamList } from '@app/navigation/types';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import type { Subscription } from '@features/subscriptions/types';
import { calculateTotalMonthlyCost } from '@features/subscriptions/utils/subscriptionUtils';
import { SwipeableSubscriptionCard } from '@features/subscriptions/components/SwipeableSubscriptionCard';
import { CostSummaryHeader } from '@features/subscriptions/components/CostSummaryHeader';
import { EmptySubscriptionState } from '@features/subscriptions/components/EmptySubscriptionState';
import { SubscriptionListSkeleton } from '@features/subscriptions/components/SubscriptionListSkeleton';
import { DeleteConfirmationDialog } from '@features/subscriptions/components/DeleteConfirmationDialog';
import { UndoSnackbar } from '@shared/components/feedback/UndoSnackbar';

const CARD_HEIGHT = 72;
const SEPARATOR_HEIGHT = 12;
const HEADER_HEIGHT = 82; // CostSummaryHeader: padding 16*2 + headline ~28 + body ~18 + yearly ~14 + margins ~6

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function SubscriptionsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<
    CompositeNavigationProp<
      NativeStackNavigationProp<SubscriptionsStackParamList, 'SubscriptionsList'>,
      BottomTabNavigationProp<MainTabsParamList>
    >
  >();
  const route = useRoute<RouteProp<SubscriptionsStackParamList, 'SubscriptionsList'>>();
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteDialogSubscription, setDeleteDialogSubscription] = useState<Subscription | null>(null);
  const [undoSnackbarVisible, setUndoSnackbarVisible] = useState(false);
  const [deletedSubscriptionName, setDeletedSubscriptionName] = useState('');
  const {
    subscriptions, isLoading, error, fetchSubscriptions, clearError,
    deleteSubscription: storeDelete, undoDelete, clearPendingDelete,
  } = useSubscriptionStore();

  useEffect(() => {
    if (route.params?.updated) {
      setSnackbar({ message: 'Subscription updated', type: 'success' });
      navigation.setParams({ updated: undefined });
    }
  }, [route.params?.updated, navigation]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (error && subscriptions.length > 0) {
      setSnackbar({ message: error.message, type: 'error' });
    }
  }, [error, subscriptions.length]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchSubscriptions();
    setIsRefreshing(false);
  }, [fetchSubscriptions]);

  const handleAddPress = useCallback(() => {
    navigation.navigate('Add');
  }, [navigation]);

  const handleRetry = useCallback(() => {
    clearError();
    fetchSubscriptions();
  }, [clearError, fetchSubscriptions]);

  const closeActiveSwipeable = useRef<(() => void) | null>(null);

  const handleSwipeableOpen = useCallback((close: () => void) => {
    if (closeActiveSwipeable.current) {
      closeActiveSwipeable.current();
    }
    closeActiveSwipeable.current = close;
  }, []);

  const handleEdit = useCallback(
    (subscriptionId: string) => {
      navigation.navigate('EditSubscription', { subscriptionId });
    },
    [navigation],
  );

  const handleDelete = useCallback((subscription: Subscription) => {
    setDeleteDialogSubscription(subscription);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialogSubscription) return;
    const name = deleteDialogSubscription.name;
    const id = deleteDialogSubscription.id;
    setDeleteDialogSubscription(null);
    setSnackbar(null);

    // Show undo snackbar immediately for instant UX (AC3/AC7)
    setDeletedSubscriptionName(name);
    setUndoSnackbarVisible(true);

    const success = await storeDelete(id);
    if (!success) {
      // Delete failed — store auto-restores, hide undo snackbar
      setUndoSnackbarVisible(false);
    }
  }, [deleteDialogSubscription, storeDelete]);

  const handleUndoDelete = useCallback(async () => {
    setUndoSnackbarVisible(false);
    await undoDelete();
  }, [undoDelete]);

  const handleUndoDismiss = useCallback(() => {
    setUndoSnackbarVisible(false);
    clearPendingDelete();
  }, [clearPendingDelete]);

  const totalMonthlyCost = calculateTotalMonthlyCost(subscriptions);
  const activeCount = subscriptions.filter((s) => s.is_active !== false).length;

  const renderItem = useCallback(
    ({ item }: { item: Subscription }) => (
      <SwipeableSubscriptionCard
        subscription={item}
        onEdit={() => handleEdit(item.id)}
        onDelete={() => handleDelete(item)}
        onPress={() => handleEdit(item.id)}
        onSwipeableOpen={handleSwipeableOpen}
      />
    ),
    [handleEdit, handleDelete, handleSwipeableOpen],
  );

  const keyExtractor = useCallback((item: Subscription) => item.id, []);

  const hasHeader = subscriptions.length > 0;
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_HEIGHT + SEPARATOR_HEIGHT,
      offset: (hasHeader ? HEADER_HEIGHT : 0) + (CARD_HEIGHT + SEPARATOR_HEIGHT) * index,
      index,
    }),
    [hasHeader],
  );

  // Loading state: first load with no cached data
  if (isLoading && subscriptions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <SubscriptionListSkeleton />
      </SafeAreaView>
    );
  }

  // Error state: error with no cached data
  if (error && subscriptions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
          {error.message}
        </Text>
        <Button mode="contained" onPress={handleRetry} style={styles.retryButton}>
          Retry
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <FlatList
        data={subscriptions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={
          subscriptions.length > 0 ? (
            <CostSummaryHeader
              totalMonthlyCost={totalMonthlyCost}
              subscriptionCount={activeCount}
            />
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? <EmptySubscriptionState onAddPress={handleAddPress} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          subscriptions.length === 0 && styles.emptyListContent,
        ]}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        accessibilityLiveRegion="polite"
      />
      <Snackbar
        visible={!!snackbar && !undoSnackbarVisible}
        onDismiss={() => setSnackbar(null)}
        duration={snackbar?.type === 'error' ? 4000 : 3000}
        action={snackbar?.type === 'error' ? { label: 'Retry', onPress: handleRetry } : undefined}
      >
        {snackbar?.message ?? ''}
      </Snackbar>
      <DeleteConfirmationDialog
        visible={!!deleteDialogSubscription}
        subscriptionName={deleteDialogSubscription?.name ?? ''}
        onConfirm={handleConfirmDelete}
        onDismiss={() => setDeleteDialogSubscription(null)}
      />
      <UndoSnackbar
        visible={undoSnackbarVisible}
        message={`${deletedSubscriptionName} deleted`}
        onUndo={handleUndoDelete}
        onDismiss={handleUndoDismiss}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  separator: {
    height: SEPARATOR_HEIGHT,
  },
  retryButton: {
    marginTop: 16,
  },
});
