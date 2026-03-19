import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { openSubscriptionManagement } from '@features/premium/services/subscriptionManagement';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { format, parseISO } from 'date-fns';

const PREMIUM_FEATURES = [
  'Unlimited subscriptions',
  'Advanced reminder options',
  'Calendar sync',
  'Data export (CSV/JSON)',
  'Full analytics & insights',
];

interface PremiumStatusCardProps {
  onManageError: (message: string) => void;
}

export function PremiumStatusCard({ onManageError }: PremiumStatusCardProps) {
  const theme = useTheme();
  const planType = usePremiumStore((s) => s.planType);
  const expiresAt = usePremiumStore((s) => s.expiresAt);

  const planLabel = planType === 'yearly' ? 'Yearly Plan' : planType === 'monthly' ? 'Monthly Plan' : 'Premium Subscription';
  const renewalDate = expiresAt ? format(parseISO(expiresAt), 'dd MMM yyyy') : null;

  const handleManageSubscription = async () => {
    try {
      await openSubscriptionManagement();
    } catch {
      onManageError('Could not open subscription management. Please manage your subscription through the App Store or Google Play.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon source="crown" size={48} color={theme.colors.secondary} />
        <View style={[styles.badge, { backgroundColor: theme.colors.secondary }]}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSecondary }}>
            Premium Active
          </Text>
        </View>
        <Text variant="titleLarge" style={[styles.planTitle, { color: theme.colors.onSurface }]}>
          {planLabel}
        </Text>
        {renewalDate ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Renews on {renewalDate}
          </Text>
        ) : (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Managed via App Store / Play Store
          </Text>
        )}
      </View>

      <Button
        mode="outlined"
        onPress={handleManageSubscription}
        style={[styles.manageButton, { borderColor: theme.colors.secondary }]}
        textColor={theme.colors.secondary}
      >
        Manage Subscription
      </Button>

      <View style={[styles.featuresCard, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleMedium" style={[styles.featuresTitle, { color: theme.colors.secondary }]}>
          Your Premium Features
        </Text>
        {PREMIUM_FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Icon source="check-circle" size={18} color={theme.colors.secondary} />
            <Text variant="bodyMedium" style={[styles.featureText, { color: theme.colors.onSurface }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planTitle: {
    fontWeight: '700',
  },
  manageButton: {
    borderRadius: 8,
  },
  featuresCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  featuresTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
  },
});
