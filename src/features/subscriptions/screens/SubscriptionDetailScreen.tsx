import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  Divider,
  Icon,
  IconButton,
  Portal,
  SegmentedButtons,
  Snackbar,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  getReminderSettings,
  createDefaultReminder,
  updateReminder,
} from '@features/notifications';
import type { ReminderSetting } from '@features/notifications';
import {
  requestCalendarAccess,
  addSubscriptionToCalendar,
  deleteCalendarEvent,
  getWritableCalendars,
  isCalendarAvailable,
} from '@features/subscriptions/services/calendarService';
import {
  getUserSettings,
  upsertPreferredCalendar,
  clearPreferredCalendar,
} from '@features/settings/services/userSettingsService';
import { CalendarSelectionDialog } from '@features/subscriptions/components/CalendarSelectionDialog';

const REMINDER_TIMING_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
];

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
  const [snackbar, setSnackbar] = useState<{ message: string; action?: { label: string; onPress: () => void } } | null>(null);
  const [reminderSetting, setReminderSetting] = useState<ReminderSetting | null>(null);
  const [reminderTiming, setReminderTiming] = useState<string>('3');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(true);
  const [calendarPermissionDialog, setCalendarPermissionDialog] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarSelectionVisible, setCalendarSelectionVisible] = useState(false);
  const [writableCalendars, setWritableCalendars] = useState<Array<{ id: string; title: string; color: string; isPrimary: boolean }>>([]);

  useEffect(() => {
    if (!subscription || subscription.is_active === false) {
      setReminderLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const setting = await getReminderSettings(subscriptionId);
        if (cancelled) return;
        setReminderSetting(setting);
        if (setting) {
          setReminderTiming(String(setting.remind_days_before));
          setReminderEnabled(setting.is_enabled);
        } else {
          const stored = await AsyncStorage.getItem('@subtrack:default_remind_days');
          if (!cancelled) {
            setReminderTiming(stored ?? '3');
          }
        }
      } catch {
        // Non-blocking — default timing will be used
      } finally {
        if (!cancelled) {
          setReminderLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [subscription, subscriptionId]);

  const handleTimingChange = useCallback(async (value: string) => {
    if (!subscription) return;
    const previousTiming = reminderTiming;
    setReminderTiming(value);

    try {
      if (reminderSetting) {
        const updated = await updateReminder(reminderSetting.id, {
          remind_days_before: parseInt(value, 10),
        });
        setReminderSetting(updated);
      } else {
        const created = await createDefaultReminder(subscription.user_id, subscriptionId, parseInt(value, 10));
        setReminderSetting(created);
      }
      setSnackbar({ message: `Reminder set to ${value} day${value === '1' ? '' : 's'} before renewal` });
    } catch {
      setReminderTiming(previousTiming);
      setSnackbar({ message: 'Failed to update reminder timing. Please try again.' });
    }
  }, [subscription, subscriptionId, reminderSetting, reminderTiming]);

  const handleToggleNotification = useCallback(async (newValue: boolean) => {
    if (!subscription) return;
    const previousValue = reminderEnabled;
    setReminderEnabled(newValue);

    try {
      if (reminderSetting) {
        const updated = await updateReminder(reminderSetting.id, { is_enabled: newValue });
        setReminderSetting(updated);
      } else {
        const created = await createDefaultReminder(subscription.user_id, subscriptionId);
        const updated = await updateReminder(created.id, { is_enabled: newValue });
        setReminderSetting(updated);
      }
      setSnackbar({
        message: newValue
          ? `Notifications enabled for ${subscription.name}`
          : `Notifications disabled for ${subscription.name}`,
      });
    } catch {
      setReminderEnabled(previousValue);
      setSnackbar({ message: 'Failed to update notification setting. Please try again.' });
    }
  }, [subscription, subscriptionId, reminderSetting, reminderEnabled]);

  const updateSubscriptionInStore = useSubscriptionStore((s) => s.fetchSubscriptions);

  const handleAddToCalendar = useCallback(() => {
    setCalendarPermissionDialog(true);
  }, []);

  const handleCalendarPermissionConfirm = useCallback(async () => {
    if (!subscription) return;
    setCalendarPermissionDialog(false);
    setCalendarLoading(true);

    try {
      const { granted, canAskAgain } = await requestCalendarAccess();

      if (!granted) {
        if (!canAskAgain) {
          setSnackbar({
            message: 'Calendar access is needed to add renewal dates. You can enable it in Settings.',
            action: { label: 'Open Settings', onPress: () => Linking.openSettings() },
          });
        } else {
          setSnackbar({ message: 'Calendar access is needed to add renewal dates. You can enable it in Settings.' });
        }
        return;
      }

      const calendars = await getWritableCalendars();

      if (calendars.length === 1) {
        if (subscription.calendar_event_id) {
          await deleteCalendarEvent(subscription.calendar_event_id);
        }
        await addSubscriptionToCalendar(subscription, calendars[0].id);
        await updateSubscriptionInStore();
        setSnackbar({ message: `Added to ${calendars[0].title}` });
        return;
      }

      if (calendars.length > 1) {
        const settings = await getUserSettings(subscription.user_id);
        const preferredId = settings?.preferred_calendar_id;

        if (preferredId) {
          const available = await isCalendarAvailable(preferredId);
          if (available) {
            if (subscription.calendar_event_id) {
              await deleteCalendarEvent(subscription.calendar_event_id);
            }
            await addSubscriptionToCalendar(subscription, preferredId);
            await updateSubscriptionInStore();
            const calName = calendars.find((c) => c.id === preferredId)?.title ?? 'calendar';
            setSnackbar({ message: `Added to ${calName}` });
            return;
          }
          await clearPreferredCalendar(subscription.user_id);
        }

        setWritableCalendars(calendars);
        setCalendarSelectionVisible(true);
        return;
      }

      throw new Error('No writable calendar found');
    } catch {
      setSnackbar({ message: 'Failed to add to calendar. Please try again.' });
    } finally {
      setCalendarLoading(false);
    }
  }, [subscription, updateSubscriptionInStore]);

  const handleCalendarSelected = useCallback(async (calendarId: string, calendarTitle: string) => {
    if (!subscription) return;
    setCalendarSelectionVisible(false);
    setCalendarLoading(true);

    try {
      if (subscription.calendar_event_id) {
        await deleteCalendarEvent(subscription.calendar_event_id);
      }
      await addSubscriptionToCalendar(subscription, calendarId);
      await upsertPreferredCalendar(subscription.user_id, calendarId);
      await updateSubscriptionInStore();
      setSnackbar({ message: `Added to ${calendarTitle}` });
    } catch {
      setSnackbar({ message: 'Failed to add to calendar. Please try again.' });
    } finally {
      setCalendarLoading(false);
    }
  }, [subscription, updateSubscriptionInStore]);

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
    } else {
      setSnackbar({
        message: 'Failed to update subscription status. Please try again.',
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

        <DetailRow label="Price" value={`${subscription.currency ?? '€'}${subscription.price.toFixed(2)}/${BILLING_CYCLE_LABELS[subscription.billing_cycle] ?? subscription.billing_cycle}`} />
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

        {/* Reminders Section — only for active subscriptions */}
        {!isInactive && (
          <>
            <Text
              variant="labelLarge"
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant, marginTop: 24 }]}
            >
              REMINDERS
            </Text>
            <Divider style={styles.divider} />
            {reminderLoading ? (
              <View style={styles.reminderLoading}>
                <ActivityIndicator size="small" />
              </View>
            ) : (
              <View style={styles.reminderSection}>
                <View style={styles.toggleRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    Notifications
                  </Text>
                  <Switch
                    value={reminderEnabled}
                    onValueChange={handleToggleNotification}
                    accessibilityLabel={`Notifications ${reminderEnabled ? 'enabled' : 'disabled'} for this subscription`}
                    accessibilityRole="switch"
                  />
                </View>
                <View style={[!reminderEnabled && { opacity: 0.4 }]} pointerEvents={reminderEnabled ? 'auto' : 'none'}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurface, marginBottom: 12 }}
                  >
                    Remind me before renewal
                  </Text>
                  <View accessibilityLabel="Reminder timing options" accessibilityRole="radiogroup">
                    <SegmentedButtons
                      value={reminderTiming}
                      onValueChange={handleTimingChange}
                      buttons={REMINDER_TIMING_OPTIONS}
                      density="small"
                      style={styles.segmentedButtons}
                    />
                  </View>
                </View>
              </View>
            )}
          </>
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
          {!isInactive && (
            <Button
              mode="outlined"
              onPress={handleAddToCalendar}
              icon="calendar-plus"
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              disabled={isSubmitting || calendarLoading}
              loading={calendarLoading}
              accessibilityLabel={subscription.calendar_event_id ? 'Update Calendar Event' : 'Add to Calendar'}
            >
              {subscription.calendar_event_id ? 'Update Calendar Event' : 'Add to Calendar'}
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            disabled={isSubmitting}
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

      <Portal>
        <Dialog visible={calendarPermissionDialog} onDismiss={() => setCalendarPermissionDialog(false)}>
          <Dialog.Title>Add to Your Calendar</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              SubTrack can add subscription renewal dates to your calendar so you never miss a payment.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCalendarPermissionDialog(false)}>Not Now</Button>
            <Button onPress={handleCalendarPermissionConfirm}>Allow</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <CalendarSelectionDialog
        visible={calendarSelectionVisible}
        calendars={writableCalendars}
        onSelect={handleCalendarSelected}
        onDismiss={() => setCalendarSelectionVisible(false)}
      />

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar(null)}
        duration={3000}
        action={snackbar?.action}
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
  reminderSection: {
    paddingVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  segmentedButtons: {
    alignSelf: 'stretch',
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
