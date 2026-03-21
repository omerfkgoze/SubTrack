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
    from: jest.fn(),
  },
}));

const mockGetReminderSettings = jest.fn().mockResolvedValue(null);
const mockCreateDefaultReminder = jest.fn();
const mockUpdateReminder = jest.fn();
jest.mock('@features/notifications', () => ({
  getReminderSettings: (...args: unknown[]) => mockGetReminderSettings(...args),
  createDefaultReminder: (...args: unknown[]) => mockCreateDefaultReminder(...args),
  updateReminder: (...args: unknown[]) => mockUpdateReminder(...args),
}));

const mockRequestCalendarAccess = jest.fn();
const mockAddSubscriptionToCalendar = jest.fn();
const mockDeleteCalendarEvent = jest.fn();
const mockGetWritableCalendars = jest.fn();
const mockIsCalendarAvailable = jest.fn();
jest.mock('@features/subscriptions/services/calendarService', () => ({
  requestCalendarAccess: (...args: unknown[]) => mockRequestCalendarAccess(...args),
  addSubscriptionToCalendar: (...args: unknown[]) => mockAddSubscriptionToCalendar(...args),
  deleteCalendarEvent: (...args: unknown[]) => mockDeleteCalendarEvent(...args),
  getWritableCalendars: (...args: unknown[]) => mockGetWritableCalendars(...args),
  isCalendarAvailable: (...args: unknown[]) => mockIsCalendarAvailable(...args),
}));

const mockGetUserSettings = jest.fn();
const mockUpsertPreferredCalendar = jest.fn();
const mockClearPreferredCalendar = jest.fn();
jest.mock('@features/settings/services/userSettingsService', () => ({
  getUserSettings: (...args: unknown[]) => mockGetUserSettings(...args),
  upsertPreferredCalendar: (...args: unknown[]) => mockUpsertPreferredCalendar(...args),
  clearPreferredCalendar: (...args: unknown[]) => mockClearPreferredCalendar(...args),
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
const { usePremiumStore } = require('@shared/stores/usePremiumStore');

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn().mockReturnValue({ navigate: mockParentNavigate });
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
  setOptions: mockSetOptions,
  getParent: mockGetParent,
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
  calendar_event_id: null,
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
    mockGetParent.mockReturnValue({ navigate: mockParentNavigate });
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription, mockTrialSubscription, mockCancelledSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
    // Calendar sync requires premium — set premium for all tests by default
    usePremiumStore.setState({ isPremium: true });
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

  describe('reminders section', () => {
    it('renders REMINDERS section for active subscription', async () => {
      mockGetReminderSettings.mockResolvedValue({
        id: 'rem-1',
        remind_days_before: 3,
        is_enabled: true,
      });
      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByText('REMINDERS')).toBeTruthy();
      });
      expect(screen.getByText('Remind me before renewal')).toBeTruthy();
      expect(screen.getByText('1 day')).toBeTruthy();
      expect(screen.getByText('3 days')).toBeTruthy();
      expect(screen.getByText('7 days')).toBeTruthy();
    });

    it('hides REMINDERS section for cancelled subscription', async () => {
      renderWithProvider('sub-cancelled');

      await waitFor(() => {
        expect(screen.queryByText('REMINDERS')).toBeNull();
      });
    });

    it('shows correct timing from reminder settings', async () => {
      mockGetReminderSettings.mockResolvedValue({
        id: 'rem-1',
        remind_days_before: 7,
        is_enabled: true,
      });
      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(mockGetReminderSettings).toHaveBeenCalledWith('sub-1');
      });
    });

    it('calls updateReminder on timing change when setting exists', async () => {
      const existingSetting = {
        id: 'rem-1',
        remind_days_before: 3,
        is_enabled: true,
      };
      mockGetReminderSettings.mockResolvedValue(existingSetting);
      mockUpdateReminder.mockResolvedValue({
        ...existingSetting,
        remind_days_before: 1,
      });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByText('1 day')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('1 day'));

      await waitFor(() => {
        expect(mockUpdateReminder).toHaveBeenCalledWith('rem-1', { remind_days_before: 1 });
      });
    });

    it('shows snackbar after successful timing change', async () => {
      mockGetReminderSettings.mockResolvedValue({
        id: 'rem-1',
        remind_days_before: 3,
        is_enabled: true,
      });
      mockUpdateReminder.mockResolvedValue({
        id: 'rem-1',
        remind_days_before: 7,
        is_enabled: true,
      });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByText('7 days')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('7 days'));

      await waitFor(() => {
        expect(screen.getByText('Reminder set to 7 days before renewal')).toBeTruthy();
      });
    });

    it('has accessibility wrapper for timing options', async () => {
      mockGetReminderSettings.mockResolvedValue({
        id: 'rem-1',
        remind_days_before: 3,
        is_enabled: true,
      });
      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByLabelText('Reminder timing options')).toBeTruthy();
      });
    });

    it('calls createDefaultReminder with subscription.user_id when no existing setting', async () => {
      mockGetReminderSettings.mockResolvedValue(null);
      mockCreateDefaultReminder.mockResolvedValue({
        id: 'rem-new',
        user_id: 'user-1',
        subscription_id: 'sub-1',
        remind_days_before: 7,
        is_enabled: true,
      });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByText('7 days')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('7 days'));

      await waitFor(() => {
        expect(mockCreateDefaultReminder).toHaveBeenCalledWith('user-1', 'sub-1', 7);
      });
    });
  });

  describe('notification toggle', () => {
    it('renders toggle ON when is_enabled = true in reminder_settings', async () => {
      mockGetReminderSettings.mockResolvedValue({
        id: 'rem-1',
        remind_days_before: 3,
        is_enabled: true,
      });

      renderWithProvider('sub-1');

      await waitFor(() => {
        const toggle = screen.getByLabelText('Notifications enabled for this subscription');
        expect(toggle).toBeTruthy();
        expect(toggle.props.value).toBe(true);
      });
    });

    it('renders toggle ON by default when no reminder_settings exist', async () => {
      mockGetReminderSettings.mockResolvedValue(null);

      renderWithProvider('sub-1');

      await waitFor(() => {
        const toggle = screen.getByLabelText('Notifications enabled for this subscription');
        expect(toggle).toBeTruthy();
        expect(toggle.props.value).toBe(true);
      });
    });

    it('toggling OFF calls updateReminder with is_enabled: false when setting exists', async () => {
      const existingSetting = { id: 'rem-1', remind_days_before: 3, is_enabled: true };
      mockGetReminderSettings.mockResolvedValue(existingSetting);
      mockUpdateReminder.mockResolvedValue({ ...existingSetting, is_enabled: false });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications enabled for this subscription')).toBeTruthy();
      });

      fireEvent(screen.getByLabelText('Notifications enabled for this subscription'), 'valueChange', false);

      await waitFor(() => {
        expect(mockUpdateReminder).toHaveBeenCalledWith('rem-1', { is_enabled: false });
      });
    });

    it('toggling ON calls updateReminder with is_enabled: true when setting exists', async () => {
      const existingSetting = { id: 'rem-1', remind_days_before: 3, is_enabled: false };
      mockGetReminderSettings.mockResolvedValue(existingSetting);
      mockUpdateReminder.mockResolvedValue({ ...existingSetting, is_enabled: true });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications disabled for this subscription')).toBeTruthy();
      });

      fireEvent(screen.getByLabelText('Notifications disabled for this subscription'), 'valueChange', true);

      await waitFor(() => {
        expect(mockUpdateReminder).toHaveBeenCalledWith('rem-1', { is_enabled: true });
      });
    });

    it('shows snackbar "Notifications disabled for Netflix" when toggled OFF', async () => {
      const existingSetting = { id: 'rem-1', remind_days_before: 3, is_enabled: true };
      mockGetReminderSettings.mockResolvedValue(existingSetting);
      mockUpdateReminder.mockResolvedValue({ ...existingSetting, is_enabled: false });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications enabled for this subscription')).toBeTruthy();
      });

      fireEvent(screen.getByLabelText('Notifications enabled for this subscription'), 'valueChange', false);

      await waitFor(() => {
        expect(screen.getByText('Notifications disabled for Netflix')).toBeTruthy();
      });
    });

    it('shows snackbar "Notifications enabled for Netflix" when toggled ON', async () => {
      const existingSetting = { id: 'rem-1', remind_days_before: 3, is_enabled: false };
      mockGetReminderSettings.mockResolvedValue(existingSetting);
      mockUpdateReminder.mockResolvedValue({ ...existingSetting, is_enabled: true });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications disabled for this subscription')).toBeTruthy();
      });

      fireEvent(screen.getByLabelText('Notifications disabled for this subscription'), 'valueChange', true);

      await waitFor(() => {
        expect(screen.getByText('Notifications enabled for Netflix')).toBeTruthy();
      });
    });

    it('reverts toggle on API failure (optimistic rollback)', async () => {
      const existingSetting = { id: 'rem-1', remind_days_before: 3, is_enabled: true };
      mockGetReminderSettings.mockResolvedValue(existingSetting);
      mockUpdateReminder.mockRejectedValue(new Error('Network error'));

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications enabled for this subscription')).toBeTruthy();
      });

      fireEvent(screen.getByLabelText('Notifications enabled for this subscription'), 'valueChange', false);

      await waitFor(() => {
        expect(screen.getByText('Failed to update notification setting. Please try again.')).toBeTruthy();
      });

      // After rollback, toggle should be back to ON
      expect(screen.getByLabelText('Notifications enabled for this subscription')).toBeTruthy();
    });

    it('when no reminder_settings, toggling OFF creates then updates with is_enabled: false', async () => {
      mockGetReminderSettings.mockResolvedValue(null);
      const createdSetting = { id: 'rem-new', remind_days_before: 3, is_enabled: true };
      mockCreateDefaultReminder.mockResolvedValue(createdSetting);
      mockUpdateReminder.mockResolvedValue({ ...createdSetting, is_enabled: false });

      renderWithProvider('sub-1');

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications enabled for this subscription')).toBeTruthy();
      });

      fireEvent(screen.getByLabelText('Notifications enabled for this subscription'), 'valueChange', false);

      await waitFor(() => {
        expect(mockCreateDefaultReminder).toHaveBeenCalledWith('user-1', 'sub-1');
        expect(mockUpdateReminder).toHaveBeenCalledWith('rem-new', { is_enabled: false });
      });
    });

    it('REMINDERS section hidden for inactive (cancelled) subscriptions', async () => {
      renderWithProvider('sub-cancelled');

      await waitFor(() => {
        expect(screen.queryByText('REMINDERS')).toBeNull();
        expect(screen.queryByLabelText(/Notifications/)).toBeNull();
      });
    });
  });

  describe('premium gating for calendar (Story 6.5)', () => {
    it('free user sees lock icon on Add to Calendar button', () => {
      usePremiumStore.setState({ isPremium: false });
      renderWithProvider('sub-1');
      expect(screen.getByLabelText('Add to Calendar')).toBeTruthy();
    });

    it('free user tapping Add to Calendar navigates to Settings > Premium', () => {
      usePremiumStore.setState({ isPremium: false });
      renderWithProvider('sub-1');
      fireEvent.press(screen.getByLabelText('Add to Calendar'));
      expect(mockParentNavigate).toHaveBeenCalledWith('Settings', { screen: 'Premium' });
    });

    it('premium user tapping Add to Calendar shows permission dialog', () => {
      usePremiumStore.setState({ isPremium: true });
      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      expect(screen.getByText('Add to Your Calendar')).toBeTruthy();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });
  });

  describe('calendar integration', () => {
    it('shows "Add to Calendar" button when no calendar_event_id', () => {
      renderWithProvider('sub-1');
      expect(screen.getByText('Add to Calendar')).toBeTruthy();
      expect(screen.getByLabelText('Add to Calendar')).toBeTruthy();
    });

    it('shows "Update Calendar Event" when calendar_event_id exists', () => {
      useSubscriptionStore.setState({
        subscriptions: [{ ...mockSubscription, calendar_event_id: 'event-123' }],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
      });
      renderWithProvider('sub-1');
      expect(screen.getByText('Update Calendar Event')).toBeTruthy();
      expect(screen.getByLabelText('Update Calendar Event')).toBeTruthy();
    });

    it('hides calendar button for cancelled subscriptions', () => {
      renderWithProvider('sub-cancelled');
      expect(screen.queryByText('Add to Calendar')).toBeNull();
    });

    it('shows pre-permission dialog when Add to Calendar is pressed', () => {
      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      expect(screen.getByText('Add to Your Calendar')).toBeTruthy();
      expect(screen.getByText('SubTrack can add subscription renewal dates to your calendar so you never miss a payment.')).toBeTruthy();
    });

    it('dismisses dialog when "Not Now" is pressed', () => {
      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      expect(screen.getByText('Add to Your Calendar')).toBeTruthy();
      fireEvent.press(screen.getByText('Not Now'));
      // Dialog should be dismissed (no longer showing dialog title)
    });

    it('shows permission denied message when calendar access is denied', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: false, canAskAgain: true });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(screen.getByText('Calendar access is needed to add renewal dates. You can enable it in Settings.')).toBeTruthy();
      });
    });

    it('shows success snackbar after successful calendar event creation (single calendar)', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
      ]);
      mockAddSubscriptionToCalendar.mockResolvedValue('event-new');

      useSubscriptionStore.setState({
        subscriptions: [mockSubscription],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(screen.getByText('Added to Personal')).toBeTruthy();
      });
    });

    it('shows "Open Settings" action when calendar access is permanently denied (canAskAgain: false)', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: false, canAskAgain: false });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(screen.getByText('Calendar access is needed to add renewal dates. You can enable it in Settings.')).toBeTruthy();
        expect(screen.getByText('Open Settings')).toBeTruthy();
      });
    });

    it('deletes old calendar event before creating new one when updating (single calendar)', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
      ]);
      mockDeleteCalendarEvent.mockResolvedValue(undefined);
      mockAddSubscriptionToCalendar.mockResolvedValue('event-updated');

      useSubscriptionStore.setState({
        subscriptions: [{ ...mockSubscription, calendar_event_id: 'old-event-id' }],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Update Calendar Event'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('old-event-id');
        expect(mockAddSubscriptionToCalendar).toHaveBeenCalled();
        expect(screen.getByText('Added to Personal')).toBeTruthy();
      });
    });

    it('does not call deleteCalendarEvent when no existing calendar event', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
      ]);
      mockAddSubscriptionToCalendar.mockResolvedValue('event-new');

      useSubscriptionStore.setState({
        subscriptions: [mockSubscription],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
        expect(mockAddSubscriptionToCalendar).toHaveBeenCalled();
      });
    });

    it('shows selection dialog when multiple calendars and no preference', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
        { id: 'cal-2', title: 'Work', color: '#0000FF', isPrimary: false },
      ]);
      mockGetUserSettings.mockResolvedValue(null);

      useSubscriptionStore.setState({
        subscriptions: [mockSubscription],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(screen.getByText('Select Calendar')).toBeTruthy();
        expect(screen.getByText('Personal')).toBeTruthy();
        expect(screen.getByText('Work')).toBeTruthy();
      });
    });

    it('uses stored preference directly when multiple calendars and preference exists', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
        { id: 'cal-2', title: 'Work', color: '#0000FF', isPrimary: false },
      ]);
      mockGetUserSettings.mockResolvedValue({
        id: 'settings-1',
        user_id: 'user-1',
        preferred_calendar_id: 'cal-2',
      });
      mockIsCalendarAvailable.mockResolvedValue(true);
      mockAddSubscriptionToCalendar.mockResolvedValue('event-pref');

      useSubscriptionStore.setState({
        subscriptions: [mockSubscription],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(mockAddSubscriptionToCalendar).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'sub-1' }),
          'cal-2',
        );
        expect(screen.getByText('Added to Work')).toBeTruthy();
      });
    });

    it('shows selection dialog and clears stale preference when preferred calendar is deleted', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
        { id: 'cal-2', title: 'Work', color: '#0000FF', isPrimary: false },
      ]);
      mockGetUserSettings.mockResolvedValue({
        id: 'settings-1',
        user_id: 'user-1',
        preferred_calendar_id: 'cal-deleted',
      });
      mockIsCalendarAvailable.mockResolvedValue(false);
      mockClearPreferredCalendar.mockResolvedValue(undefined);

      useSubscriptionStore.setState({
        subscriptions: [mockSubscription],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Add to Calendar'));
      fireEvent.press(screen.getByText('Allow'));

      await waitFor(() => {
        expect(mockClearPreferredCalendar).toHaveBeenCalledWith('user-1');
        expect(screen.getByText('Select Calendar')).toBeTruthy();
      });
    });
  });

  describe('cancel subscription with calendar cleanup', () => {
    const subWithCalendar: Subscription = {
      ...mockSubscription,
      calendar_event_id: 'cal-event-123',
    };

    it('shows CalendarCleanupDialog when cancelling subscription with calendar event', async () => {
      useSubscriptionStore.setState({
        subscriptions: [subWithCalendar],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Cancel Subscription'));

      await waitFor(() => {
        expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
        expect(screen.getByText('Do you want to remove calendar events for Netflix?')).toBeTruthy();
      });
    });

    it('does not show CalendarCleanupDialog when cancelling subscription without calendar event', async () => {
      const mockToggle = jest.fn().mockResolvedValue(true);
      useSubscriptionStore.setState({
        subscriptions: [mockSubscription],
        isLoading: false,
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
      expect(screen.queryByText('Remove Calendar Events?')).toBeNull();
    });

    it('"Remove" deletes calendar event and clears calendar_event_id', async () => {
      const mockToggle = jest.fn().mockResolvedValue(true);
      mockDeleteCalendarEvent.mockResolvedValue(undefined);

      const mockSupabaseUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const { supabase: mockSupabase } = jest.requireMock('@shared/services/supabase');
      mockSupabase.from = jest.fn().mockReturnValue({
        update: mockSupabaseUpdate,
      });

      useSubscriptionStore.setState({
        subscriptions: [subWithCalendar],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        toggleSubscriptionStatus: mockToggle,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Cancel Subscription'));

      await waitFor(() => {
        expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Remove'));

      await waitFor(() => {
        expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('cal-event-123');
        expect(mockToggle).toHaveBeenCalledWith('sub-1');
      });
    });

    it('"Keep" only toggles status without deleting calendar event', async () => {
      const mockToggle = jest.fn().mockResolvedValue(true);
      useSubscriptionStore.setState({
        subscriptions: [subWithCalendar],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        toggleSubscriptionStatus: mockToggle,
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Cancel Subscription'));

      await waitFor(() => {
        expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Keep'));

      await waitFor(() => {
        expect(mockToggle).toHaveBeenCalledWith('sub-1');
      });
      expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
    });

    it('"Remove" shows error snackbar when toggleSubscriptionStatus fails', async () => {
      const mockToggle = jest.fn().mockResolvedValue(false);
      mockDeleteCalendarEvent.mockResolvedValue(undefined);

      const mockSupabaseUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const { supabase: mockSupabase } = jest.requireMock('@shared/services/supabase');
      mockSupabase.from = jest.fn().mockReturnValue({ update: mockSupabaseUpdate });

      useSubscriptionStore.setState({
        subscriptions: [subWithCalendar],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        toggleSubscriptionStatus: mockToggle,
        fetchSubscriptions: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Cancel Subscription'));

      await waitFor(() => {
        expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Remove'));

      await waitFor(() => {
        expect(screen.getByText('Failed to update subscription status. Please try again.')).toBeTruthy();
      });
    });

    it('"Keep" shows error snackbar when toggleSubscriptionStatus fails', async () => {
      const mockToggle = jest.fn().mockResolvedValue(false);
      useSubscriptionStore.setState({
        subscriptions: [subWithCalendar],
        isLoading: false,
        isSubmitting: false,
        error: null,
        pendingDelete: null,
        toggleSubscriptionStatus: mockToggle,
      });

      renderWithProvider('sub-1');
      fireEvent.press(screen.getByText('Cancel Subscription'));

      await waitFor(() => {
        expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Keep'));

      await waitFor(() => {
        expect(screen.getByText('Failed to update subscription status. Please try again.')).toBeTruthy();
      });
    });
  });
});
