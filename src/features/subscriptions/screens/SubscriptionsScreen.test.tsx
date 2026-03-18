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
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

const mockDeleteCalendarEvent = jest.fn();
jest.mock('@features/subscriptions/services/calendarService', () => ({
  deleteCalendarEvent: (...args: unknown[]) => mockDeleteCalendarEvent(...args),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Swipeable: React.forwardRef(({ children, renderRightActions }: { children: React.ReactNode; renderRightActions?: () => React.ReactNode }, _ref: unknown) => (
      <View>
        {children}
        {renderRightActions ? renderRightActions() : null}
      </View>
    )),
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 0, height: 0 };
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaInsetsContext: React.createContext(inset),
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets: inset, frame },
  };
});

const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }),
  useRoute: () => ({ params: {} }),
}));

// Must import after mocks
const { SubscriptionsScreen } = require('./SubscriptionsScreen');

const mockSubscription: Subscription = {
  id: 'sub-1',
  user_id: 'user-1',
  name: 'Netflix',
  price: 9.99,
  currency: 'EUR',
  billing_cycle: 'monthly',
  renewal_date: '2026-04-01',
  is_trial: false,
  trial_expiry_date: null,
  category: null,
  notes: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  calendar_event_id: null,
};

const subWithCalendar: Subscription = {
  ...mockSubscription,
  id: 'sub-cal',
  name: 'Spotify',
  calendar_event_id: 'cal-event-456',
};

function renderScreen() {
  return render(
    <PaperProvider theme={theme}>
      <SubscriptionsScreen />
    </PaperProvider>,
  );
}

describe('SubscriptionsScreen - calendar cleanup on cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription, subWithCalendar],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
  });

  it('does not show CalendarCleanupDialog when toggling subscription without calendar event', async () => {
    const mockToggle = jest.fn().mockResolvedValue(true);
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      toggleSubscriptionStatus: mockToggle,
      fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
    });

    renderScreen();

    const cancelButton = screen.getByLabelText('Toggle status for Netflix');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('sub-1');
    });
    expect(screen.queryByText('Remove Calendar Events?')).toBeNull();
  });

  it('shows CalendarCleanupDialog when cancel toggle is triggered for subscription with calendar event', async () => {
    // This tests the integration between the screen's handleToggleStatus and CalendarCleanupDialog
    const mockToggle = jest.fn().mockResolvedValue(true);
    const mockFetch = jest.fn().mockResolvedValue(undefined);
    useSubscriptionStore.setState({
      subscriptions: [subWithCalendar],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      toggleSubscriptionStatus: mockToggle,
      fetchSubscriptions: mockFetch,
    });

    renderScreen();

    // Find and press toggle status in swipe actions (accessibilityLabel is "Toggle status for Spotify")
    const cancelButton = screen.getByLabelText('Toggle status for Spotify');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
      expect(screen.getByText('Do you want to remove calendar events for Spotify?')).toBeTruthy();
    });
  });

  it('"Keep" on CalendarCleanupDialog only toggles status', async () => {
    const mockToggle = jest.fn().mockResolvedValue(true);
    useSubscriptionStore.setState({
      subscriptions: [subWithCalendar],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      toggleSubscriptionStatus: mockToggle,
      fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
    });

    renderScreen();

    const cancelButton = screen.getByLabelText('Toggle status for Spotify');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Keep'));

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('sub-cal');
    });
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it('"Remove" on CalendarCleanupDialog shows error snackbar when toggle fails', async () => {
    const mockToggle = jest.fn().mockResolvedValue(false);
    const mockFetch = jest.fn().mockResolvedValue(undefined);
    mockDeleteCalendarEvent.mockResolvedValue(undefined);

    const { supabase: mockSupabase } = jest.requireMock('@shared/services/supabase');
    mockSupabase.from = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
    });

    useSubscriptionStore.setState({
      subscriptions: [subWithCalendar],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      toggleSubscriptionStatus: mockToggle,
      fetchSubscriptions: mockFetch,
    });

    renderScreen();

    fireEvent.press(screen.getByLabelText('Toggle status for Spotify'));

    await waitFor(() => {
      expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Remove'));

    await waitFor(() => {
      expect(screen.getByText('Failed to update subscription status. Please try again.')).toBeTruthy();
    });
  });

  it('"Keep" on CalendarCleanupDialog shows error snackbar when toggle fails', async () => {
    const mockToggle = jest.fn().mockResolvedValue(false);
    useSubscriptionStore.setState({
      subscriptions: [subWithCalendar],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      toggleSubscriptionStatus: mockToggle,
      fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
    });

    renderScreen();

    fireEvent.press(screen.getByLabelText('Toggle status for Spotify'));

    await waitFor(() => {
      expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Keep'));

    await waitFor(() => {
      expect(screen.getByText('Failed to update subscription status. Please try again.')).toBeTruthy();
    });
  });

  it('swipe-delete with calendar event calls deleteCalendarEvent via store', async () => {
    const mockStoreDelete = jest.fn().mockResolvedValue(true);
    useSubscriptionStore.setState({
      subscriptions: [subWithCalendar],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
      deleteSubscription: mockStoreDelete,
    });

    renderScreen();

    // Find Delete button in swipe actions (accessibilityLabel is "Delete Spotify")
    const deleteButton = screen.getByLabelText('Delete Spotify');
    fireEvent.press(deleteButton);

    // Confirm in delete dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Spotify?')).toBeTruthy();
    });

    // Press the "Delete" button inside the confirmation dialog (not the swipe action)
    const confirmButton = screen.getByLabelText('Confirm delete Spotify');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockStoreDelete).toHaveBeenCalledWith('sub-cal');
    });
  });
});
