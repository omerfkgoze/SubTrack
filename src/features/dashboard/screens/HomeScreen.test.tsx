import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
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

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    easConfig: { projectId: 'test-project-id' },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@features/notifications/services/notificationHistoryService', () => ({
  getDeliveryCount: jest.fn().mockResolvedValue(0),
  hasPartialNotifications: jest.fn().mockResolvedValue(false),
  getNotificationHistory: jest.fn().mockResolvedValue([]),
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
  calendar_event_id: null,
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

  it('renders SavingsIndicator when inactive subscriptions exist', () => {
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription, inactiveSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.getByText(/You're saving/)).toBeTruthy();
  });

  it('does NOT render SavingsIndicator when all subscriptions are active', () => {
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.queryByText(/You're saving/)).toBeNull();
  });

  it('quick stats card shows correct subscription count', () => {
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.getByLabelText(/1 active subscription/)).toBeTruthy();
  });

  it('does NOT render SavingsIndicator when no subscriptions', () => {
    renderWithProvider();
    expect(screen.queryByText(/You're saving/)).toBeNull();
  });

  it('renders UpcomingRenewals section when subscriptions exist', () => {
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.getByText('Upcoming Renewals')).toBeTruthy();
  });

  it('does not render UpcomingRenewals when no subscriptions', () => {
    renderWithProvider();
    expect(screen.queryByText('Upcoming Renewals')).toBeNull();
  });

  it('shows empty state in UpcomingRenewals when subscription renewal is beyond 30 days', () => {
    const farFutureSubscription: Subscription = {
      ...mockSubscription,
      renewal_date: '2026-05-01',
    };
    useSubscriptionStore.setState({
      subscriptions: [farFutureSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    renderWithProvider();
    expect(screen.getByText('No upcoming renewals in the next 30 days')).toBeTruthy();
  });

  describe('NotificationStatusBanner integration', () => {
    it('renders notification banner when notifications are denied', () => {
      useNotificationStore.setState({ permissionStatus: 'denied' });
      renderWithProvider();
      expect(screen.getByText(/Notifications are off/)).toBeTruthy();
    });

    it('does not render notification banner when notifications are granted', () => {
      useNotificationStore.setState({ permissionStatus: 'granted' });
      renderWithProvider();
      expect(screen.queryByText(/Notifications are off/)).toBeNull();
    });

    it('does not render notification banner when permission is undetermined', () => {
      useNotificationStore.setState({ permissionStatus: 'undetermined' });
      renderWithProvider();
      expect(screen.queryByText(/Notifications are off/)).toBeNull();
    });
  });

  describe('NotificationStatusBadge integration (AC5)', () => {
    it('shows badge when notifications are enabled', () => {
      useNotificationStore.setState({ permissionStatus: 'granted' });
      renderWithProvider();
      // badge renders when not denied
      expect(screen.getByLabelText(/Notification status:/)).toBeTruthy();
    });

    it('does not show badge when notifications are denied (banner shown instead)', () => {
      useNotificationStore.setState({ permissionStatus: 'denied' });
      renderWithProvider();
      // banner shows but badge is hidden
      expect(screen.queryByLabelText(/Notification status:/)).toBeNull();
    });
  });
});
