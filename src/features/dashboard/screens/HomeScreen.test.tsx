import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { HomeScreen } from './HomeScreen';
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <HomeScreen />
    </PaperProvider>,
  );
}

const mockSubscription: Subscription = {
  id: '1',
  name: 'Netflix',
  price: 15.99,
  billing_cycle: 'monthly',
  is_active: true,
  renewal_date: '2026-04-01',
  currency: '€',
  category: null,
  notes: null,
  is_trial: false,
  trial_expiry_date: null,
  user_id: 'user-1',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const inactiveSubscription: Subscription = {
  ...mockSubscription,
  id: '2',
  name: 'Inactive Sub',
  price: 9.99,
  is_active: false,
};

describe('HomeScreen', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({
      subscriptions: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
  });

  it('renders SpendingHero with correct total from store subscriptions', () => {
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.getAllByText('€15.99').length).toBeGreaterThanOrEqual(1);
  });

  it('only active subscriptions included in total (is_active=false excluded)', () => {
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription, inactiveSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    // Only mockSubscription (€15.99) should be counted, not inactiveSubscription (€9.99)
    expect(screen.getAllByText('€15.99').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('€25.98')).toBeNull();
  });

  it('shows empty state when no subscriptions in store', () => {
    renderWithProvider();
    expect(screen.getByText('€0.00')).toBeTruthy();
    expect(screen.getByText('Add your first subscription to see your spending')).toBeTruthy();
  });

  it('CTA button present when no subscriptions (empty state)', () => {
    renderWithProvider();
    expect(screen.getByText('Add First Subscription')).toBeTruthy();
  });

  it('does not show CTA button when subscriptions exist', () => {
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.queryByText('Add First Subscription')).toBeNull();
  });

  it('renders CategoryBreakdown when subscriptions exist', () => {
    const subWithCategory: Subscription = {
      ...mockSubscription,
      category: 'entertainment',
    };
    useSubscriptionStore.setState({
      subscriptions: [subWithCategory],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.getByText('Spending by Category')).toBeTruthy();
  });

  it('does not render CategoryBreakdown when no subscriptions', () => {
    renderWithProvider();
    expect(screen.queryByText('Spending by Category')).toBeNull();
  });
});
