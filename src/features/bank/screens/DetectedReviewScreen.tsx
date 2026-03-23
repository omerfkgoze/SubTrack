import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
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
import { addMonths, addWeeks, addYears, addDays, format } from 'date-fns';

type DetectedReviewNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<SettingsStackParamList, 'DetectedReview'>,
  BottomTabNavigationProp<MainTabsParamList>
>;

function calculateRenewalDate(lastSeen: string, frequency: DetectedSubscription['frequency']): string {
  const base = new Date(lastSeen);
  let renewal: Date;
  switch (frequency) {
    case 'weekly':
      renewal = addWeeks(base, 1);
      break;
    case 'quarterly':
      renewal = addDays(base, 90);
      break;
    case 'yearly':
      renewal = addYears(base, 1);
      break;
    case 'monthly':
    default:
      renewal = addMonths(base, 1);
      break;
  }
  return format(renewal, 'yyyy-MM-dd');
}

export function DetectedReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation<DetectedReviewNavProp>();

  const detectedSubscriptions = useBankStore((s) => s.detectedSubscriptions);
  const isFetchingDetected = useBankStore((s) => s.isFetchingDetected);
  const detectionError = useBankStore((s) => s.detectionError);
  const fetchDetectedSubscriptions = useBankStore((s) => s.fetchDetectedSubscriptions);
  const dismissDetectedSubscription = useBankStore((s) => s.dismissDetectedSubscription);

  const canAddSubscription = usePremiumStore((s) => s.canAddSubscription);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const activeSubscriptionCount = subscriptions.filter((s) => s.is_active !== false).length;

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  useFocusEffect(
    useCallback(() => {
      fetchDetectedSubscriptions();
    }, [fetchDetectedSubscriptions]),
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
      }
    },
    [dismissDetectedSubscription],
  );

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

  const count = detectedSubscriptions.length;

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={[styles.countHeader, { color: theme.colors.onSurfaceVariant }]}>
        {count} subscription{count === 1 ? '' : 's'} to review
      </Text>

      <FlatList
        data={detectedSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DetectedReviewCard
            item={item}
            onApprove={() => handleApprove(item)}
            onDismiss={() => handleDismiss(item.id)}
            onNotSubscription={() => handleNotSubscription(item.id)}
          />
        )}
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

// Export for use in AddSubscriptionScreen
export { calculateRenewalDate };

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
