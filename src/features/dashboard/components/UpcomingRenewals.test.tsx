import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { UpcomingRenewals } from './UpcomingRenewals';
import type { UpcomingRenewal } from '@features/subscriptions/utils/subscriptionUtils';
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

const baseSubscription: Subscription = {
  id: '1',
  name: 'Netflix',
  price: 17.99,
  billing_cycle: 'monthly',
  is_active: true,
  renewal_date: '2026-03-20',
  currency: '€',
  category: null,
  notes: null,
  is_trial: false,
  trial_expiry_date: null,
  user_id: 'user-1',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  calendar_event_id: null,
};

const makeRenewal = (overrides: Partial<UpcomingRenewal> = {}): UpcomingRenewal => ({
  subscription: baseSubscription,
  daysUntil: 6,
  isUrgent: false,
  renewalText: 'Renews in 6 days',
  isTrial: false,
  trialText: '',
  ...overrides,
});

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('UpcomingRenewals', () => {
  it('renders section title "Upcoming Renewals"', () => {
    renderWithProvider(<UpcomingRenewals renewals={[]} />);
    expect(screen.getByText('Upcoming Renewals')).toBeTruthy();
  });

  it('shows empty state message when renewals array is empty', () => {
    renderWithProvider(<UpcomingRenewals renewals={[]} />);
    expect(screen.getByText('No upcoming renewals in the next 30 days')).toBeTruthy();
  });

  it('does not show empty state when renewals exist', () => {
    const renewal = makeRenewal();
    renderWithProvider(<UpcomingRenewals renewals={[renewal]} />);
    expect(screen.queryByText('No upcoming renewals in the next 30 days')).toBeNull();
  });

  it('renders subscription name and price', () => {
    const renewal = makeRenewal();
    renderWithProvider(<UpcomingRenewals renewals={[renewal]} />);
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText('€17.99/mo')).toBeTruthy();
  });

  it('renders renewal text', () => {
    const renewal = makeRenewal({ renewalText: 'Renews in 6 days' });
    renderWithProvider(<UpcomingRenewals renewals={[renewal]} />);
    expect(screen.getByText('Renews in 6 days')).toBeTruthy();
  });

  it('renders multiple renewals', () => {
    const renewal1 = makeRenewal({ subscription: { ...baseSubscription, id: '1', name: 'Netflix' } });
    const renewal2 = makeRenewal({
      subscription: { ...baseSubscription, id: '2', name: 'Spotify' },
      renewalText: 'Renews in 10 days',
    });
    renderWithProvider(<UpcomingRenewals renewals={[renewal1, renewal2]} />);
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText('Spotify')).toBeTruthy();
  });

  it('shows trial indicator text for trial subscriptions', () => {
    const renewal = makeRenewal({
      isTrial: true,
      trialText: '5 days left',
    });
    renderWithProvider(<UpcomingRenewals renewals={[renewal]} />);
    expect(screen.getByText('5 days left')).toBeTruthy();
  });

  it('does not show trial indicator for non-trial subscriptions', () => {
    const renewal = makeRenewal({ isTrial: false, trialText: '' });
    renderWithProvider(<UpcomingRenewals renewals={[renewal]} />);
    expect(screen.queryByText('Trial')).toBeNull();
  });

  it('applies urgent styling for renewals within 3 days', () => {
    const urgentRenewal = makeRenewal({
      daysUntil: 2,
      isUrgent: true,
      renewalText: 'Renews in 2 days',
    });
    renderWithProvider(<UpcomingRenewals renewals={[urgentRenewal]} />);
    // Component appends ' 🔥' when isUrgent && daysUntil > 0
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText('Renews in 2 days 🔥')).toBeTruthy();
  });

  it('has accessibility label on each renewal row', () => {
    const renewal = makeRenewal();
    renderWithProvider(<UpcomingRenewals renewals={[renewal]} />);
    expect(screen.getByLabelText('Netflix, Renews in 6 days, €17.99/mo')).toBeTruthy();
  });
});
