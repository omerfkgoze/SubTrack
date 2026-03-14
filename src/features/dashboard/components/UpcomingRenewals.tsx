import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';
import {
  formatPrice,
  getCategoryConfig,
} from '@features/subscriptions/utils/subscriptionUtils';
import type { UpcomingRenewal } from '@features/subscriptions/utils/subscriptionUtils';
import type { BillingCycle } from '@features/subscriptions/types';

const URGENT_COLOR = '#F59E0B';

interface UpcomingRenewalsProps {
  renewals: UpcomingRenewal[];
}

export function UpcomingRenewals({ renewals }: UpcomingRenewalsProps) {
  return (
    <Surface style={styles.container} elevation={1}>
      <Text variant="titleMedium" style={styles.title}>
        Upcoming Renewals
      </Text>

      {renewals.length === 0 ? (
        <Text variant="bodyMedium" style={styles.emptyText}>
          No upcoming renewals in the next 30 days
        </Text>
      ) : (
        renewals.map((item, index) => {
          const { subscription, daysUntil, isUrgent, renewalText, isTrial, trialText } = item;
          const categoryConfig = getCategoryConfig(subscription.category ?? 'other');
          const isLast = index === renewals.length - 1;
          const priceText = formatPrice(subscription.price, subscription.billing_cycle as BillingCycle);

          const accessibilityLabel = `${subscription.name}, ${renewalText}, ${priceText}`;

          return (
            <View
              key={subscription.id}
              style={[
                styles.row,
                !isLast && styles.rowBorder,
                isUrgent && styles.urgentRow,
              ]}
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="text"
            >
              <View style={styles.rowLeft}>
                <View style={styles.nameRow}>
                  <Icon
                    source={categoryConfig.icon}
                    size={16}
                    color={categoryConfig.color}
                  />
                  <Text variant="bodyMedium" style={styles.name}>
                    {subscription.name}
                  </Text>
                  {isTrial && (
                    <View style={styles.trialBadge}>
                      <Icon source="timer-sand" size={12} color={URGENT_COLOR} />
                      <Text style={styles.trialText}>{trialText}</Text>
                    </View>
                  )}
                </View>
                <Text
                  variant="bodySmall"
                  style={[styles.renewalText, isUrgent && styles.urgentText]}
                >
                  {renewalText}
                  {isUrgent && daysUntil > 0 ? ' 🔥' : ''}
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.price}>
                {priceText}
              </Text>
            </View>
          );
        })
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  title: {
    marginBottom: 12,
  },
  emptyText: {
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
  },
  urgentRow: {
    borderLeftWidth: 3,
    borderLeftColor: URGENT_COLOR,
    paddingLeft: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 4,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontWeight: '600',
    flexShrink: 1,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  trialText: {
    fontSize: 11,
    fontWeight: '600',
    color: URGENT_COLOR,
  },
  renewalText: {
    color: '#6B7280',
  },
  urgentText: {
    color: URGENT_COLOR,
  },
  price: {
    fontWeight: '600',
    marginLeft: 8,
  },
});
