import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Divider,
  Icon,
  IconButton,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import type { SubscriptionsStackScreenProps } from '@app/navigation/types';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import type { BillingCycle } from '@features/subscriptions/types';
import {
  formatPrice,
  getCategoryConfig,
  getRenewalInfo,
  getTrialInfo,
} from '@features/subscriptions/utils/subscriptionUtils';
import { DeleteConfirmationDialog } from '@features/subscriptions/components/DeleteConfirmationDialog';
import { TrialBadge } from '@features/subscriptions/components/TrialBadge';

type Props = SubscriptionsStackScreenProps<'SubscriptionDetail'>;

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  quarterly: 'Quarterly',
  weekly: 'Weekly',
};

export function SubscriptionDetailScreen({ route, navigation }: Props) {
  const { subscriptionId } = route.params;
  const theme = useTheme();

  const subscription = useSubscriptionStore((s) =>
    s.subscriptions.find((sub) => sub.id === subscriptionId),
  );
  const storeDelete = useSubscriptionStore((s) => s.deleteSubscription);
  const toggleSubscriptionStatus = useSubscriptionStore((s) => s.toggleSubscriptionStatus);
  const isSubmitting = useSubscriptionStore((s) => s.isSubmitting);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string } | null>(null);

  const handleEdit = useCallback(() => {
    navigation.navigate('EditSubscription', { subscriptionId });
  }, [navigation, subscriptionId]);

  const handleDeletePress = useCallback(() => {
    setDeleteDialogVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!subscription) return;
    setDeleteDialogVisible(false);
    await storeDelete(subscription.id);
    navigation.goBack();
  }, [subscription, storeDelete, navigation]);

  const handleToggleStatus = useCallback(async () => {
    if (!subscription) return;
    const wasActive = subscription.is_active !== false;
    const success = await toggleSubscriptionStatus(subscription.id);
    if (success) {
      const name = subscription.name;
      setSnackbar({
        message: wasActive ? `${name} cancelled` : `${name} activated`,
      });
    }
  }, [subscription, toggleSubscriptionStatus]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={handleEdit}
            accessibilityLabel="Edit subscription"
          />
          <IconButton
            icon="trash-can-outline"
            size={20}
            onPress={handleDeletePress}
            accessibilityLabel="Delete subscription"
          />
        </View>
      ),
    });
  }, [navigation, handleEdit, handleDeletePress]);

  if (!subscription) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge">Subscription not found.</Text>
      </View>
    );
  }

  const categoryConfig = getCategoryConfig(subscription.category);
  const renewalInfo = getRenewalInfo(subscription.renewal_date);
  const trialInfo = getTrialInfo(subscription.is_trial, subscription.trial_expiry_date);
  const priceLabel = formatPrice(subscription.price, subscription.billing_cycle as BillingCycle);
  const isInactive = subscription.is_active === false;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={[styles.heroStripe, { backgroundColor: categoryConfig.color }]} />
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <Icon source={categoryConfig.icon} size={28} color={categoryConfig.color} />
              <View style={styles.heroTextContainer}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, fontWeight: '500' }}
                  numberOfLines={1}
                >
                  {subscription.name}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {categoryConfig.label}
                </Text>
              </View>
              <Text
                variant="titleMedium"
                style={[
                  { color: theme.colors.onSurface, fontWeight: '600' },
                  isInactive && styles.strikethrough,
                ]}
              >
                {priceLabel}
              </Text>
            </View>
            <Text
              variant="bodySmall"
              style={{
                color: renewalInfo.isOverdue ? theme.colors.error : theme.colors.onSurfaceVariant,
                marginTop: 4,
              }}
            >
              {isInactive ? 'Cancelled' : renewalInfo.text}
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
          DETAILS
        </Text>
        <Divider style={styles.divider} />

        <DetailRow label="Price" value={`€${subscription.price.toFixed(2)}/${BILLING_CYCLE_LABELS[subscription.billing_cycle] ?? subscription.billing_cycle}`} />
        <DetailRow label="Billing Cycle" value={BILLING_CYCLE_LABELS[subscription.billing_cycle] ?? subscription.billing_cycle} />
        <DetailRow
          label="Next Renewal"
          value={format(parseISO(subscription.renewal_date), 'MMMM d, yyyy')}
          valueColor={theme.colors.primary}
          bold
          accessibilityLabel={`Next renewal date: ${format(parseISO(subscription.renewal_date), 'MMMM d, yyyy')}`}
        />
        <DetailRow label="Category" value={categoryConfig.label} />
        <DetailRow
          label="Status"
          value={isInactive ? 'Cancelled' : 'Active'}
          valueColor={isInactive ? theme.colors.error : theme.colors.tertiary}
        />
        {subscription.created_at && (
          <DetailRow
            label="Created"
            value={format(parseISO(subscription.created_at), 'MMMM d, yyyy')}
          />
        )}

        {/* Trial Section */}
        {trialInfo.status !== 'none' && (
          <>
            <Text
              variant="labelLarge"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant, marginTop: 24 }]}
            >
              TRIAL INFO
            </Text>
            <Divider style={styles.divider} />
            <View style={styles.trialSection}>
              <TrialBadge
                isTrial={subscription.is_trial}
                trialExpiryDate={subscription.trial_expiry_date}
              />
              {subscription.trial_expiry_date && (
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface, marginTop: 8 }}
                >
                  Expires: {format(parseISO(subscription.trial_expiry_date), 'MMMM d, yyyy')}
                </Text>
              )}
            </View>
          </>
        )}

        {/* Notes Section */}
        {subscription.notes ? (
          <>
            <Text
              variant="labelLarge"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant, marginTop: 24 }]}
            >
              NOTES
            </Text>
            <Divider style={styles.divider} />
            <Text
              variant="bodyMedium"
              style={[styles.notesText, { color: theme.colors.onSurface }]}
            >
              {subscription.notes}
            </Text>
          </>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            accessibilityLabel="Edit subscription details"
          >
            Edit Details
          </Button>
          <Button
            mode="contained"
            onPress={handleDeletePress}
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            disabled={isSubmitting}
            accessibilityLabel="Delete subscription"
          >
            Delete Subscription
          </Button>
          <Button
            mode="text"
            onPress={handleToggleStatus}
            disabled={isSubmitting}
            accessibilityLabel={isInactive ? 'Activate subscription' : 'Cancel subscription'}
          >
            {isInactive ? 'Activate Subscription' : 'Cancel Subscription'}
          </Button>
        </View>
      </ScrollView>

      <DeleteConfirmationDialog
        visible={deleteDialogVisible}
        subscriptionName={subscription.name}
        onConfirm={handleConfirmDelete}
        onDismiss={() => setDeleteDialogVisible(false)}
      />

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar(null)}
        duration={3000}
      >
        {snackbar?.message ?? ''}
      </Snackbar>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  accessibilityLabel?: string;
}

function DetailRow({ label, value, valueColor, bold, accessibilityLabel }: DetailRowProps) {
  const theme = useTheme();
  return (
    <View
      style={styles.detailRow}
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={[
          { color: valueColor ?? theme.colors.onSurface },
          bold && { fontWeight: '600' },
        ]}
      >
        {value}
      </Text>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  headerActions: {
    flexDirection: 'row',
  },
  heroCard: {
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  heroStripe: {
    width: 4,
  },
  heroContent: {
    flex: 1,
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTextContainer: {
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  trialSection: {
    paddingVertical: 8,
  },
  notesText: {
    paddingVertical: 8,
  },
  actionsContainer: {
    marginTop: 32,
    gap: 12,
  },
  actionButton: {
    minHeight: 44,
  },
  actionButtonContent: {
    minHeight: 44,
  },
});
