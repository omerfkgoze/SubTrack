import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from '@app/navigation/types';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { calculateTotalMonthlyCost, calculateCategoryBreakdown } from '@features/subscriptions/utils/subscriptionUtils';
import { SpendingHero } from '../components/SpendingHero';
import { CategoryBreakdown } from '../components/CategoryBreakdown';

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList>>();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const monthlyTotal = calculateTotalMonthlyCost(subscriptions);
  const categoryBreakdown = calculateCategoryBreakdown(subscriptions);
  const hasSubscriptions = subscriptions.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SpendingHero amount={monthlyTotal} currency="€" showYearly animateOnChange />
      {hasSubscriptions && categoryBreakdown.length > 0 && (
        <CategoryBreakdown breakdownData={categoryBreakdown} totalMonthly={monthlyTotal} />
      )}
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
