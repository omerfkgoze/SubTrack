import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from '@app/navigation/types';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import {
  calculateTotalMonthlyCost,
  calculateCategoryBreakdown,
  calculateActiveCount,
  calculateAverageMonthlyCost,
  calculateMonthlySavings,
  calculateInactiveCount,
  getUpcomingRenewals,
} from '@features/subscriptions/utils/subscriptionUtils';
import { SpendingHero } from '../components/SpendingHero';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { SavingsIndicator } from '../components/SavingsIndicator';
import { UpcomingRenewals } from '../components/UpcomingRenewals';
import { NotificationStatusBanner } from '@features/notifications/components/NotificationStatusBanner';
import { NotificationStatusBadge } from '@features/notifications/components/NotificationStatusBadge';
import { useNotificationStore } from '@shared/stores/useNotificationStore';

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList>>();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const permissionStatus = useNotificationStore((s) => s.permissionStatus);
  const monthlyTotal = calculateTotalMonthlyCost(subscriptions);
  const categoryBreakdown = calculateCategoryBreakdown(subscriptions);
  const activeCount = calculateActiveCount(subscriptions);
  const averageMonthly = calculateAverageMonthlyCost(subscriptions);
  const monthlySavings = calculateMonthlySavings(subscriptions);
  const inactiveCount = calculateInactiveCount(subscriptions);
  const hasSubscriptions = subscriptions.length > 0;
  const upcomingRenewals = getUpcomingRenewals(subscriptions);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <NotificationStatusBanner />
      {permissionStatus !== 'denied' && <NotificationStatusBadge variant="header" />}
      <SpendingHero
        amount={monthlyTotal}
        currency="€"
        showYearly
        animateOnChange
        showQuickStats
        subscriptionCount={activeCount}
        averageAmount={averageMonthly}
      />
      {hasSubscriptions && categoryBreakdown.length > 0 && (
        <CategoryBreakdown breakdownData={categoryBreakdown} totalMonthly={monthlyTotal} />
      )}
      {monthlySavings > 0 && (
        <SavingsIndicator savingsAmount={monthlySavings} inactiveCount={inactiveCount} />
      )}
      {hasSubscriptions && <UpcomingRenewals renewals={upcomingRenewals} />}
      {!hasSubscriptions && (
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Add')}
          style={styles.ctaButton}
        >
          Add First Subscription
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  ctaButton: {
    marginHorizontal: 16,
    marginTop: 24,
  },
});
