import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from '@app/navigation/types';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import type { Subscription } from '@features/subscriptions/types';
import { calculateTotalMonthlyCost } from '@features/subscriptions/utils/subscriptionUtils';
import { SubscriptionCard } from '@features/subscriptions/components/SubscriptionCard';
import { CostSummaryHeader } from '@features/subscriptions/components/CostSummaryHeader';
import { EmptySubscriptionState } from '@features/subscriptions/components/EmptySubscriptionState';
import { SubscriptionListSkeleton } from '@features/subscriptions/components/SubscriptionListSkeleton';

const CARD_HEIGHT = 72;
const SEPARATOR_HEIGHT = 12;

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function SubscriptionsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList, 'Subscriptions'>>();
  const { subscriptions, isLoading, error, fetchSubscriptions, clearError } =
    useSubscriptionStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (error && subscriptions.length > 0) {
      setSnackbarVisible(true);
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

  const totalMonthlyCost = calculateTotalMonthlyCost(subscriptions);
  const activeCount = subscriptions.filter((s) => s.is_active !== false).length;

  const renderItem = useCallback(
    ({ item }: { item: Subscription }) => <SubscriptionCard subscription={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Subscription) => item.id, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_HEIGHT + SEPARATOR_HEIGHT,
      offset: (CARD_HEIGHT + SEPARATOR_HEIGHT) * index,
      index,
    }),
    [],
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
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{
          label: 'Retry',
          onPress: handleRetry,
        }}
      >
        {error?.message ?? 'An error occurred'}
      </Snackbar>
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
