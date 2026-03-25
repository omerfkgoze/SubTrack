import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { SettingsStackParamList, MainTabsParamList } from '@app/navigation/types';
import type { DetectedSubscription } from '../types';
import { useBankStore } from '@shared/stores/useBankStore';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { DetectedReviewCard } from '../components/DetectedReviewCard';
import { MatchSuggestionCard } from '../components/MatchSuggestionCard';

type DetectedReviewNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<SettingsStackParamList, 'DetectedReview'>,
  BottomTabNavigationProp<MainTabsParamList>
>;

export function DetectedReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation<DetectedReviewNavProp>();

  const detectedSubscriptions = useBankStore((s) => s.detectedSubscriptions);
  const isFetchingDetected = useBankStore((s) => s.isFetchingDetected);
  const detectionError = useBankStore((s) => s.detectionError);
  const fetchDetectedSubscriptions = useBankStore((s) => s.fetchDetectedSubscriptions);
  const dismissDetectedSubscription = useBankStore((s) => s.dismissDetectedSubscription);
  const matchResults = useBankStore((s) => s.matchResults);
  const computeMatches = useBankStore((s) => s.computeMatches);
  const confirmMatch = useBankStore((s) => s.confirmMatch);
  const replaceWithDetected = useBankStore((s) => s.replaceWithDetected);
  const dismissMatch = useBankStore((s) => s.dismissMatch);
  const isRefreshing = useBankStore((s) => s.isRefreshing);
  const refreshBankData = useBankStore((s) => s.refreshBankData);

  const canAddSubscription = usePremiumStore((s) => s.canAddSubscription);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const activeSubscriptionCount = subscriptions.filter((s) => s.is_active !== false).length;

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await fetchDetectedSubscriptions();
        await useSubscriptionStore.getState().fetchSubscriptions();
        computeMatches();
      };
      load();
    }, [fetchDetectedSubscriptions, computeMatches]),
  );

  const handleApprove = useCallback(
    (item: DetectedSubscription) => {
      if (!canAddSubscription(activeSubscriptionCount)) {
        navigation.navigate('Premium', { source: 'upsell' });
        return;
      }

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
    [canAddSubscription, activeSubscriptionCount, navigation],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      await dismissDetectedSubscription(id);
      const error = useBankStore.getState().detectionError;
      if (error?.code === 'DISMISS_FAILED') {
        setSnackbarType('error');
        setSnackbarMessage(error.message);
      }
    },
    [dismissDetectedSubscription],
  );

  const handleNotSubscription = useCallback(
    async (id: string) => {
      await dismissDetectedSubscription(id);
      const error = useBankStore.getState().detectionError;
      if (error?.code === 'DISMISS_FAILED') {
        setSnackbarType('error');
        setSnackbarMessage(error.message);
      } else {
        setSnackbarType('success');
        setSnackbarMessage('Merchant excluded from future detections');
      }
    },
    [dismissDetectedSubscription],
  );

  const handleConfirmMatch = useCallback(
    async (detectedId: string) => {
      await confirmMatch(detectedId);
      const error = useBankStore.getState().detectionError;
      if (error?.code === 'CONFIRM_MATCH_FAILED' || error?.code === 'NETWORK_ERROR') {
        setSnackbarType('error');
        setSnackbarMessage(error.message);
      } else {
        setSnackbarType('success');
        setSnackbarMessage('Subscription matched successfully!');
      }
    },
    [confirmMatch],
  );

  const handleReplaceWithDetected = useCallback(
    async (detectedId: string) => {
      await replaceWithDetected(detectedId);
      const error = useBankStore.getState().detectionError;
      if (error?.code === 'REPLACE_FAILED' || error?.code === 'NETWORK_ERROR') {
        setSnackbarType('error');
        setSnackbarMessage(error.message);
      } else {
        setSnackbarType('success');
        setSnackbarMessage('Subscription updated with bank data!');
      }
    },
    [replaceWithDetected],
  );

  const handleDismissMatch = useCallback(
    (detectedId: string) => {
      dismissMatch(detectedId);
    },
    [dismissMatch],
  );

  const handlePullToRefresh = useCallback(async () => {
    const { connections } = useBankStore.getState();
    const activeConn = connections.find((c) => c.status === 'active');
    if (activeConn) {
      await refreshBankData(activeConn.id);
      const error = useBankStore.getState().detectionError;
      if (error) {
        setSnackbarType('error');
        setSnackbarMessage(error.message);
      }
    }
    await fetchDetectedSubscriptions();
    computeMatches();
  }, [refreshBankData, fetchDetectedSubscriptions, computeMatches]);

  if (isFetchingDetected) {
    return (
      <View style={[styles.container, styles.centered]} accessibilityLabel="Loading detected subscriptions">
        <ActivityIndicator size="large" accessibilityLabel="Loading" />
      </View>
    );
  }

  if (!isFetchingDetected && detectedSubscriptions.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No subscriptions to review
        </Text>
        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Scan your bank transactions to detect subscriptions.
        </Text>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('BankConnection', undefined)}
          style={styles.emptyButton}
          accessibilityLabel="Go to Bank Connection"
          accessibilityRole="button"
        >
          Go to Bank Connection
        </Button>
      </View>
    );
  }

  // Sort: matched items first (by match score desc), then unmatched by confidence score desc
  const sortedItems = [...detectedSubscriptions].sort((a, b) => {
    const matchA = matchResults.get(a.id);
    const matchB = matchResults.get(b.id);
    if (matchA && !matchB) return -1;
    if (!matchA && matchB) return 1;
    if (matchA && matchB) return matchB.matchScore - matchA.matchScore;
    return b.confidenceScore - a.confidenceScore;
  });

  const matchCount = matchResults.size;
  const unmatchedCount = detectedSubscriptions.length - matchCount;

  const headerText = matchCount > 0
    ? `${matchCount} match${matchCount === 1 ? '' : 'es'}, ${unmatchedCount} to review`
    : `${detectedSubscriptions.length} subscription${detectedSubscriptions.length === 1 ? '' : 's'} to review`;

  return (
    <View style={styles.container}>
      <Text
        variant="titleSmall"
        style={[styles.countHeader, { color: theme.colors.onSurfaceVariant }]}
        accessibilityLabel={headerText}
      >
        {headerText}
      </Text>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} />
        }
        renderItem={({ item }) => {
          const match = matchResults.get(item.id);
          if (match) {
            return (
              <MatchSuggestionCard
                detected={item}
                match={match}
                onConfirm={() => handleConfirmMatch(item.id)}
                onDismiss={() => handleDismissMatch(item.id)}
                onReplace={() => handleReplaceWithDetected(item.id)}
              />
            );
          }
          return (
            <DetectedReviewCard
              item={item}
              onApprove={() => handleApprove(item)}
              onDismiss={() => handleDismiss(item.id)}
              onNotSubscription={() => handleNotSubscription(item.id)}
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
  countHeader: {
    margin: 16,
    marginBottom: 8,
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
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    minHeight: 44,
  },
});
