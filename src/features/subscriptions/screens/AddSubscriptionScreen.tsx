import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  SegmentedButtons,
  Switch,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatePickerInput, registerTranslation, en } from 'react-native-paper-dates';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { createSubscriptionSchema } from '@features/subscriptions/types/schemas';
import type { CreateSubscriptionFormData } from '@features/subscriptions/types/schemas';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { SUBSCRIPTION_CATEGORIES } from '@config/categories';
import { searchPopularServices } from '@config/popularServices';
import { CategoryChip } from '@features/subscriptions/components/CategoryChip';
import { CelebrationOverlay } from '@shared/components/CelebrationOverlay';

registerTranslation('en', en);

const BILLING_CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'weekly', label: 'Weekly' },
];

export function AddSubscriptionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const addSubscription = useSubscriptionStore((s) => s.addSubscription);
  const isSubmitting = useSubscriptionStore((s) => s.isSubmitting);
  const clearError = useSubscriptionStore((s) => s.clearError);

  const [suggestions, setSuggestions] = useState<ReturnType<typeof searchPopularServices>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [renewalDate, setRenewalDate] = useState<Date | undefined>(undefined);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CreateSubscriptionFormData>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      billing_cycle: 'monthly',
      is_trial: false,
      name: '',
      price: 0,
      renewal_date: '',
      category: undefined,
      notes: undefined,
      trial_expiry_date: undefined,
    },
  });

  const isTrial = watch('is_trial');

  const handleNameChange = useCallback(
    (text: string, onChange: (val: string) => void) => {
      onChange(text);
      const results = searchPopularServices(text);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    },
    [],
  );

  const handleSuggestionSelect = useCallback(
    (name: string, defaultCategory?: string) => {
      setValue('name', name);
      if (defaultCategory) {
        setValue('category', defaultCategory);
      }
      setSuggestions([]);
      setShowSuggestions(false);
    },
    [setValue],
  );

  const onSubmit = useCallback(
    async (data: CreateSubscriptionFormData) => {
      clearError();

      const previousCount = useSubscriptionStore.getState().subscriptions.length;

      const success = await addSubscription({
        name: data.name,
        price: data.price,
        currency: 'EUR',
        billing_cycle: data.billing_cycle,
        renewal_date: data.renewal_date,
        is_trial: data.is_trial,
        trial_expiry_date: data.trial_expiry_date,
        category: data.category,
        notes: data.notes,
      });

      if (success) {
        if (previousCount === 0) {
          setShowCelebration(true);
        } else {
          reset();
          setRenewalDate(undefined);
          navigation.goBack();
        }
      } else {
        const errorMsg = useSubscriptionStore.getState().error?.message ?? 'Failed to save subscription.';
        setSnackbarMessage(errorMsg);
        clearError();
      }
    },
    [addSubscription, clearError, navigation, reset],
  );

  const handleCelebrationDismiss = useCallback(() => {
    setShowCelebration(false);
    reset();
    setRenewalDate(undefined);
    navigation.goBack();
  }, [navigation, reset]);

  const selectedCategory = watch('category');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMedium" style={styles.heading}>
          Add Subscription
        </Text>

        {/* Name Field with Suggestions */}
        <View style={styles.fieldContainer}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Subscription Name"
                mode="outlined"
                value={value}
                onChangeText={(text) => handleNameChange(text, onChange)}
                onBlur={() => {
                  onBlur();
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
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
          {showSuggestions && (
            <View style={[styles.suggestionsContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => handleSuggestionSelect(item.name, item.defaultCategory)}
                  style={styles.suggestionItem}
                  accessibilityLabel={`Select ${item.name}`}
                  accessibilityRole="button"
                >
                  <Text variant="bodyMedium">{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
              <CategoryChip
                key={cat.id}
                category={cat}
                selected={selectedCategory === cat.id}
                onPress={() =>
                  setValue('category', selectedCategory === cat.id ? undefined : cat.id)
                }
                disabled={isSubmitting}
              />
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
          accessibilityLabel="Save Subscription"
          accessibilityRole="button"
        >
          Save Subscription
        </Button>
      </ScrollView>

      <CelebrationOverlay
        visible={showCelebration}
        onDismiss={handleCelebrationDismiss}
        message="Great start!"
      />

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={4000}
        accessibilityLiveRegion="polite"
        action={{ label: 'Dismiss', onPress: () => setSnackbarMessage('') }}
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
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 4,
    elevation: 4,
  },
  suggestionItem: {
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  segmentedButtons: {
    marginTop: 4,
  },
  chipScroll: {
    flexDirection: 'row',
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
