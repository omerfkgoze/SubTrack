import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { getTrialInfo } from '@features/subscriptions/utils/subscriptionUtils';
import type { TrialUrgency } from '@features/subscriptions/utils/subscriptionUtils';

interface TrialBadgeProps {
  isTrial: boolean | null;
  trialExpiryDate: string | null;
}

const URGENCY_COLORS: Record<TrialUrgency, string> = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

const URGENCY_ICONS: Record<TrialUrgency, string> = {
  low: 'timer-sand',
  medium: 'timer-sand',
  high: 'alert',
  critical: 'alert-circle',
};

export function TrialBadge({ isTrial, trialExpiryDate }: TrialBadgeProps) {
  const trialInfo = getTrialInfo(isTrial, trialExpiryDate);

  if (trialInfo.status === 'none') {
    return null;
  }

  const color = URGENCY_COLORS[trialInfo.urgencyLevel];
  const icon = URGENCY_ICONS[trialInfo.urgencyLevel];

  const accessibilityText =
    trialInfo.status === 'expired'
      ? 'Trial expired'
      : trialInfo.daysRemaining === 0
        ? 'Trial expires today'
        : `Trial, ${trialInfo.daysRemaining} ${trialInfo.daysRemaining === 1 ? 'day' : 'days'} remaining`;

  return (
    <View
      style={[styles.badge, { backgroundColor: `${color}18` }]}
      accessibilityLabel={accessibilityText}
      accessibilityRole="text"
    >
      <Icon source={icon} size={12} color={color} />
      <Text style={[styles.text, { color }]}>{trialInfo.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
