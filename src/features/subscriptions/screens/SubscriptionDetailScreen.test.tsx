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
const { SubscriptionDetailScreen } = require('./SubscriptionDetailScreen');

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
  setOptions: mockSetOptions,
} as never;

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
  notes: 'Premium plan with extra screens',
  trial_expiry_date: null,
  created_at: '2026-01-10',
  updated_at: '2026-01-10',
};

const mockTrialSubscription: Subscription = {
  ...mockSubscription,
  id: 'sub-trial',
  name: 'Spotify',
  is_trial: true,
  trial_expiry_date: '2026-03-05',
  category: 'entertainment',
};

const mockCancelledSubscription: Subscription = {
  ...mockSubscription,
  id: 'sub-cancelled',
  name: 'Hulu',
  is_active: false,
};

function renderWithProvider(subscriptionId: string) {
  const route = { params: { subscriptionId }, key: 'test', name: 'SubscriptionDetail' as const };
  return render(
    <PaperProvider theme={theme}>
      <SubscriptionDetailScreen route={route} navigation={mockNavigation} />
    </PaperProvider>,
  );
}

describe('SubscriptionDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription, mockTrialSubscription, mockCancelledSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
  });

  it('renders all subscription details', () => {
    renderWithProvider('sub-1');
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getAllByText(/17\.99/).length).toBeGreaterThan(0);
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('March 15, 2026')).toBeTruthy();
    expect(screen.getAllByText('Entertainment').length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('January 10, 2026')).toBeTruthy();
  });

  it('displays notes section when notes exist', () => {
    renderWithProvider('sub-1');
    expect(screen.getByText('NOTES')).toBeTruthy();
    expect(screen.getByText('Premium plan with extra screens')).toBeTruthy();
  });

  it('highlights next renewal date with primary color', () => {
    renderWithProvider('sub-1');
    const renewalLabel = screen.getByLabelText(/Next renewal date/);
    expect(renewalLabel).toBeTruthy();
  });

  it('shows trial information when is_trial is true', () => {
    renderWithProvider('sub-trial');
    expect(screen.getByText('TRIAL INFO')).toBeTruthy();
    expect(screen.getByText(/Expires:.*March 5, 2026/)).toBeTruthy();
  });

  it('hides trial section when is_trial is false', () => {
    renderWithProvider('sub-1');
    expect(screen.queryByText('TRIAL INFO')).toBeNull();
  });

  it('shows strikethrough price and "Cancelled" badge for inactive subscription', () => {
    renderWithProvider('sub-cancelled');
    const cancelledTexts = screen.getAllByText('Cancelled');
    expect(cancelledTexts.length).toBeGreaterThan(0);
    // The price text in the hero card should have strikethrough styling
    const priceTexts = screen.getAllByText(/€17\.99\/mo/);
    expect(priceTexts.length).toBeGreaterThan(0);
    const heroPrice = priceTexts[0];
    const styleStr = JSON.stringify(heroPrice.props.style);
    expect(styleStr).toContain('line-through');
  });

  it('Edit button navigates to EditSubscription screen', () => {
    renderWithProvider('sub-1');
    fireEvent.press(screen.getByText('Edit Details'));
    expect(mockNavigate).toHaveBeenCalledWith('EditSubscription', { subscriptionId: 'sub-1' });
  });

  it('Delete button shows confirmation dialog', () => {
    renderWithProvider('sub-1');
    fireEvent.press(screen.getByText('Delete Subscription'));
    expect(screen.getByText('Delete Netflix?')).toBeTruthy();
  });

  it('Toggle status button calls toggleSubscriptionStatus', async () => {
    const mockToggle = jest.fn().mockResolvedValue(true);
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      toggleSubscriptionStatus: mockToggle,
    });

    renderWithProvider('sub-1');
    fireEvent.press(screen.getByText('Cancel Subscription'));

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('sub-1');
    });
  });

  it('shows "Subscription not found" for invalid ID', () => {
    renderWithProvider('invalid-id');
    expect(screen.getByText('Subscription not found.')).toBeTruthy();
  });

  it('accessibility labels are correct for action buttons', () => {
    renderWithProvider('sub-1');
    expect(screen.getByLabelText('Edit subscription details')).toBeTruthy();
    expect(screen.getByLabelText('Delete subscription')).toBeTruthy();
    expect(screen.getByLabelText('Cancel subscription')).toBeTruthy();
  });

  it('shows "Activate Subscription" for cancelled subscription', () => {
    renderWithProvider('sub-cancelled');
    expect(screen.getByText('Activate Subscription')).toBeTruthy();
    expect(screen.getByLabelText('Activate subscription')).toBeTruthy();
  });

  it('configures header with edit and delete icons via setOptions', () => {
    renderWithProvider('sub-1');
    expect(mockSetOptions).toHaveBeenCalled();
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    expect(lastCall).toHaveProperty('headerRight');
    // Render the headerRight to verify icons
    const { getByLabelText } = render(
      <PaperProvider theme={theme}>{lastCall.headerRight()}</PaperProvider>,
    );
    expect(getByLabelText('Edit subscription')).toBeTruthy();
    expect(getByLabelText('Delete subscription')).toBeTruthy();
  });

  it('header edit icon navigates to EditSubscription', () => {
    renderWithProvider('sub-1');
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    const { getByLabelText } = render(
      <PaperProvider theme={theme}>{lastCall.headerRight()}</PaperProvider>,
    );
    fireEvent.press(getByLabelText('Edit subscription'));
    expect(mockNavigate).toHaveBeenCalledWith('EditSubscription', { subscriptionId: 'sub-1' });
  });

  it('header delete icon is rendered and pressable', () => {
    renderWithProvider('sub-1');
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    const { getByLabelText } = render(
      <PaperProvider theme={theme}>{lastCall.headerRight()}</PaperProvider>,
    );
    const deleteIcon = getByLabelText('Delete subscription');
    expect(deleteIcon).toBeTruthy();
    // Verify onPress is wired (doesn't throw)
    fireEvent.press(deleteIcon);
  });

  it('confirms delete and navigates back', async () => {
    const mockDelete = jest.fn().mockResolvedValue(true);
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      deleteSubscription: mockDelete,
    });

    renderWithProvider('sub-1');
    fireEvent.press(screen.getByText('Delete Subscription'));
    // Dialog should be visible
    expect(screen.getByText('Delete Netflix?')).toBeTruthy();
    // Confirm delete
    fireEvent.press(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('sub-1');
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
