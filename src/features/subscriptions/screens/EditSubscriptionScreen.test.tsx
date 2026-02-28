import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { theme } from '@config/theme';
import type { Subscription } from '@features/subscriptions/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('react-native-paper-dates', () => ({
  DatePickerInput: ({ label, accessibilityLabel }: { label: string; accessibilityLabel?: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View accessibilityLabel={accessibilityLabel}>
        <Text>{label}</Text>
      </View>
    );
  },
  registerTranslation: jest.fn(),
  en: {},
}));

// Must import after mocks are set up
const { EditSubscriptionScreen } = require('./EditSubscriptionScreen');

const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack } as never;

const mockSubscription: Subscription = {
  id: 'sub-1',
  user_id: 'user-1',
  name: 'Netflix',
  price: 17.99,
  currency: 'EUR',
  billing_cycle: 'monthly',
  renewal_date: '2026-03-15',
  is_trial: false,
  is_active: true,
  category: 'entertainment',
  notes: 'Family plan',
  trial_expiry_date: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

function renderWithProvider(subscriptionId: string) {
  const route = { params: { subscriptionId }, key: 'test', name: 'EditSubscription' as const };
  return render(
    <PaperProvider theme={theme}>
      <EditSubscriptionScreen route={route} navigation={mockNavigation} />
    </PaperProvider>,
  );
}

describe('EditSubscriptionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
    });
  });

  it('pre-fills form with subscription data', () => {
    renderWithProvider('sub-1');
    expect(screen.getByDisplayValue('Netflix')).toBeTruthy();
    expect(screen.getByDisplayValue('17.99')).toBeTruthy();
    expect(screen.getByDisplayValue('Family plan')).toBeTruthy();
  });

  it('shows heading "Edit Subscription"', () => {
    renderWithProvider('sub-1');
    expect(screen.getByText('Edit Subscription')).toBeTruthy();
  });

  it('shows "Save Changes" button', () => {
    renderWithProvider('sub-1');
    expect(screen.getByText('Save Changes')).toBeTruthy();
  });

  it('shows not found message for invalid subscription id', () => {
    renderWithProvider('invalid-id');
    expect(screen.getByText('Subscription not found.')).toBeTruthy();
  });

  it('calls updateSubscription and navigates back on successful submit', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(true);
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isSubmitting: false,
      error: null,
      updateSubscription: mockUpdate,
    });

    renderWithProvider('sub-1');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('sub-1', expect.objectContaining({
        name: 'Netflix',
        price: 17.99,
      }));
    });
  });

  it('shows error snackbar on failed submit', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(false);
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isSubmitting: false,
      error: { code: 'DB_ERROR', message: 'Failed to update subscription. Please try again.' },
      updateSubscription: mockUpdate,
      clearError: jest.fn(),
    });

    renderWithProvider('sub-1');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
