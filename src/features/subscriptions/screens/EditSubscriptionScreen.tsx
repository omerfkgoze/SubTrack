import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  SegmentedButtons,
  Switch,
  Chip,
  Snackbar,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatePickerInput, registerTranslation, en } from 'react-native-paper-dates';
import { format, parseISO } from 'date-fns';
import { createSubscriptionSchema } from '@features/subscriptions/types/schemas';
import type { CreateSubscriptionFormData } from '@features/subscriptions/types/schemas';
import type { BillingCycle } from '@features/subscriptions/types';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { SUBSCRIPTION_CATEGORIES } from '@config/categories';
import type { SubscriptionsStackScreenProps } from '@app/navigation/types';

registerTranslation('en', en);

const BILLING_CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'weekly', label: 'Weekly' },
];

type Props = SubscriptionsStackScreenProps<'EditSubscription'>;

export function EditSubscriptionScreen({ route, navigation }: Props) {
  const { subscriptionId } = route.params;

  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const updateSubscription = useSubscriptionStore((s) => s.updateSubscription);
  const isSubmitting = useSubscriptionStore((s) => s.isSubmitting);
  const clearError = useSubscriptionStore((s) => s.clearError);

  const subscription = subscriptions.find((s) => s.id === subscriptionId);

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [renewalDate, setRenewalDate] = useState<Date | undefined>(
    subscription?.renewal_date ? parseISO(subscription.renewal_date) : undefined,
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateSubscriptionFormData>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      name: subscription?.name ?? '',
      price: subscription?.price ?? 0,
      billing_cycle: (subscription?.billing_cycle as BillingCycle) ?? 'monthly',
      renewal_date: subscription?.renewal_date ?? '',
      is_trial: subscription?.is_trial ?? false,
      trial_expiry_date: subscription?.trial_expiry_date ?? undefined,
      category: subscription?.category ?? undefined,
      notes: subscription?.notes ?? undefined,
    },
  });

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: !isSubmitting,
      gestureEnabled: !isSubmitting,
    });
  }, [isSubmitting, navigation]);

  const isTrial = watch('is_trial');
  const selectedCategory = watch('category');

  const onSubmit = useCallback(
    async (data: CreateSubscriptionFormData) => {
      clearError();

      const success = await updateSubscription(subscriptionId, {
        name: data.name,
        price: data.price,
        currency: subscription?.currency ?? 'EUR',
        billing_cycle: data.billing_cycle,
        renewal_date: data.renewal_date,
        is_trial: data.is_trial,
        trial_expiry_date: data.trial_expiry_date,
        category: data.category,
        notes: data.notes,
      });

      if (success) {
        navigation.navigate('SubscriptionsList', { updated: true });
      } else {
        const errorMsg =
          useSubscriptionStore.getState().error?.message ?? 'Failed to update subscription.';
        setSnackbarMessage(errorMsg);
        clearError();
      }
    },
    [updateSubscription, clearError, navigation, subscriptionId, subscription?.currency],
  );

  if (!subscription) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge">Subscription not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMedium" style={styles.heading}>
          Edit Subscription
        </Text>

        {/* Name Field */}
        <View style={styles.fieldContainer}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Subscription Name"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.name}
                disabled={isSubmitting}
                accessibilityLabel="Subscription name"
                accessibilityRole="text"
              />
            )}
          />
          {errors.name && (
            <HelperText type="error" accessibilityLiveRegion="polite">
              {errors.name.message}
            </HelperText>
          )}
        </View>

        {/* Price Field */}
        <View style={styles.fieldContainer}>
          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Price"
                mode="outlined"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="€" />}
                value={value ? String(value) : ''}
                onChangeText={(text) => {
                  const parsed = parseFloat(text);
                  onChange(isNaN(parsed) ? 0 : parsed);
                }}
                onBlur={onBlur}
                error={!!errors.price}
                disabled={isSubmitting}
                accessibilityLabel="Subscription price"
                accessibilityRole="text"
              />
            )}
          />
          {errors.price && (
            <HelperText type="error" accessibilityLiveRegion="polite">
              {errors.price.message}
            </HelperText>
          )}
        </View>

        {/* Billing Cycle */}
        <View style={styles.fieldContainer}>
          <Text variant="labelLarge" style={styles.fieldLabel}>
            Billing Cycle
          </Text>
          <Controller
            control={control}
            name="billing_cycle"
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={BILLING_CYCLE_OPTIONS}
                density="small"
                style={styles.segmentedButtons}
              />
            )}
          />
        </View>

        {/* Renewal Date */}
        <View style={styles.fieldContainer}>
          <Controller
            control={control}
            name="renewal_date"
            render={({ field: { onChange } }) => (
              <DatePickerInput
                locale="en"
                label="Next Renewal Date"
                value={renewalDate}
                onChange={(date: Date | undefined) => {
                  setRenewalDate(date);
                  onChange(date ? format(date, 'yyyy-MM-dd') : '');
                }}
                inputMode="start"
                mode="outlined"
                disabled={isSubmitting}
                accessibilityLabel="Next renewal date"
              />
            )}
          />
          {errors.renewal_date && (
            <HelperText type="error" accessibilityLiveRegion="polite">
              {errors.renewal_date.message}
            </HelperText>
          )}
        </View>

        {/* Category Selection */}
        <View style={styles.fieldContainer}>
          <Text variant="labelLarge" style={styles.fieldLabel}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {SUBSCRIPTION_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                selected={selectedCategory === cat.id}
                onPress={() =>
                  setValue('category', selectedCategory === cat.id ? undefined : cat.id)
                }
                icon={cat.icon}
                style={[
                  styles.chip,
                  selectedCategory === cat.id && { backgroundColor: cat.color + '20' },
                ]}
                disabled={isSubmitting}
                accessibilityLabel={`${cat.label} category`}
                accessibilityRole="button"
              >
                {cat.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Trial Toggle */}
        <View style={styles.fieldContainer}>
          <View style={styles.trialRow}>
            <Text variant="bodyLarge">This is a trial</Text>
            <Controller
              control={control}
              name="is_trial"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  disabled={isSubmitting}
                  accessibilityLabel="Enable trial period"
                  accessibilityRole="switch"
                  style={styles.switch}
                />
              )}
            />
          </View>
        </View>

        {/* Trial Expiry Date (conditional) */}
        {isTrial && (
          <View style={styles.fieldContainer}>
            <Controller
              control={control}
              name="trial_expiry_date"
              render={({ field: { onChange, value } }) => {
                const trialDate = value ? new Date(value) : undefined;
                return (
                  <DatePickerInput
                    locale="en"
                    label="Trial Expiry Date"
                    value={trialDate}
                    onChange={(date) => {
                      if (date) {
                        onChange(format(date, 'yyyy-MM-dd'));
                      } else {
                        onChange(undefined);
                      }
                    }}
                    inputMode="start"
                    mode="outlined"
                    disabled={isSubmitting}
                    accessibilityLabel="Trial expiry date"
                  />
                );
              }}
            />
            {errors.trial_expiry_date && (
              <HelperText type="error" accessibilityLiveRegion="polite">
                {errors.trial_expiry_date.message}
              </HelperText>
            )}
          </View>
        )}

        {/* Notes Field */}
        <View style={styles.fieldContainer}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Notes"
                mode="outlined"
                multiline
                numberOfLines={3}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                disabled={isSubmitting}
                accessibilityLabel="Notes"
                accessibilityRole="text"
              />
            )}
          />
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={isSubmitting || Object.keys(errors).length > 0}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          accessibilityLabel="Save Changes"
          accessibilityRole="button"
        >
          Save Changes
        </Button>
      </ScrollView>

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={4000}
        accessibilityLiveRegion="polite"
        action={{ label: 'Retry', onPress: handleSubmit(onSubmit) }}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  heading: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginTop: 4,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
    minHeight: 44,
  },
  trialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switch: {
    minWidth: 44,
    minHeight: 44,
  },
  submitButton: {
    marginTop: 8,
    minHeight: 44,
  },
  submitButtonContent: {
    minHeight: 44,
  },
});
