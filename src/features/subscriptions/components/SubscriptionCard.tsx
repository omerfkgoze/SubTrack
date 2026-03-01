import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Icon, useTheme } from 'react-native-paper';
import type { Subscription, BillingCycle } from '@features/subscriptions/types';
import {
  getCategoryConfig,
  formatPrice,
  getRenewalInfo,
  getTrialInfo,
} from '@features/subscriptions/utils/subscriptionUtils';
import { TrialBadge } from '@features/subscriptions/components/TrialBadge';

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

export function SubscriptionCard({ subscription, onPress }: SubscriptionCardProps) {
  const theme = useTheme();
  const categoryConfig = getCategoryConfig(subscription.category);
  const renewalInfo = getRenewalInfo(subscription.renewal_date);
  const trialInfo = getTrialInfo(subscription.is_trial, subscription.trial_expiry_date);
  const priceLabel = formatPrice(subscription.price, subscription.billing_cycle as BillingCycle);
  const isInactive = subscription.is_active === false;

  return (
    <Card
      mode="elevated"
      elevation={1}
      onPress={onPress}
      style={[styles.card, isInactive && styles.inactiveCard]}
      {...(onPress ? { accessibilityRole: 'button' as const } : {})}
      accessibilityLabel={`${subscription.name}, ${subscription.price} euros per ${subscription.billing_cycle}${trialInfo.status !== 'none' ? `, ${trialInfo.text}` : ''}, ${renewalInfo.text}`}
      {...(onPress ? { accessibilityHint: 'Swipe left for options' } : {})}
    >
      <View style={styles.cardContent}>
        <View
          style={[
            styles.categoryStripe,
            { backgroundColor: categoryConfig.color },
          ]}
        />

        <View style={styles.iconContainer}>
          <Icon source={categoryConfig.icon} size={24} color={categoryConfig.color} />
        </View>

        <View style={styles.textContent}>
          <View style={styles.topRow}>
            <Text
              variant="titleMedium"
              numberOfLines={1}
              style={[styles.name, { color: theme.colors.onSurface }]}
            >
              {subscription.name}
            </Text>
            <Text variant="titleMedium" style={[styles.price, { color: theme.colors.onSurface }]}>
              {priceLabel}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {renewalInfo.text}
            </Text>
            <TrialBadge
              isTrial={subscription.is_trial}
              trialExpiryDate={subscription.trial_expiry_date}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

const CARD_HEIGHT = 72;

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  inactiveCard: {
    opacity: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CARD_HEIGHT,
    paddingRight: 16,
  },
  categoryStripe: {
    width: 4,
    height: CARD_HEIGHT,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  iconContainer: {
    marginLeft: 12,
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  name: {
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontWeight: '600',
  },
});
