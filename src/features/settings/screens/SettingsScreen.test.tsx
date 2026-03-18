import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { SettingsScreen } from './SettingsScreen';

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

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    easConfig: { projectId: 'test-project-id' },
  },
}));

jest.mock('@features/notifications/services/notificationHistoryService', () => ({
  getDeliveryCount: jest.fn().mockResolvedValue(0),
  hasPartialNotifications: jest.fn().mockResolvedValue(false),
  getNotificationHistory: jest.fn().mockResolvedValue([]),
}));

const mockGetUserSettings = jest.fn().mockResolvedValue(null);
const mockUpsertPreferredCalendar = jest.fn();
jest.mock('@features/settings/services/userSettingsService', () => ({
  getUserSettings: (...args: unknown[]) => mockGetUserSettings(...args),
  upsertPreferredCalendar: (...args: unknown[]) => mockUpsertPreferredCalendar(...args),
}));

const mockRequestCalendarAccess = jest.fn();
const mockGetWritableCalendars = jest.fn();
jest.mock('@features/subscriptions/services/calendarService', () => ({
  requestCalendarAccess: (...args: unknown[]) => mockRequestCalendarAccess(...args),
  getWritableCalendars: (...args: unknown[]) => mockGetWritableCalendars(...args),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <SettingsScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationStore.setState({
    permissionStatus: 'granted',
    expoPushToken: null,
    isLoading: false,
    error: null,
  });
  useAuthStore.setState({ user: { id: 'user-1', email: 'test@example.com' } } as any);
});

describe('SettingsScreen', () => {
  describe('Notification History navigation (AC7)', () => {
    it('renders Notification History menu item', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Notification History')).toBeTruthy();
    });

    it('navigates to NotificationHistory screen when tapped', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Notification History'));
      expect(mockNavigate).toHaveBeenCalledWith('NotificationHistory');
    });
  });

  describe('Notification Settings row (AC4)', () => {
    it('renders Notification Settings row', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Notification Settings')).toBeTruthy();
    });

    it('navigates to Notifications screen when Notification Settings tapped', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Notification Settings'));
      expect(mockNavigate).toHaveBeenCalledWith('Notifications');
    });
  });

  describe('Calendar section (Story 5.2 AC4)', () => {
    it('renders Calendar section with Preferred Calendar item showing Default', () => {
      renderWithProvider();
      expect(screen.getByText('Calendar')).toBeTruthy();
      expect(screen.getByText('Preferred Calendar')).toBeTruthy();
      expect(screen.getByText('Default')).toBeTruthy();
    });

    it('renders Preferred Calendar with accessibility label', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Preferred Calendar')).toBeTruthy();
    });

    it('opens calendar selection dialog when tapped', async () => {
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
        { id: 'cal-2', title: 'Work', color: '#0000FF', isPrimary: false },
      ]);

      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Preferred Calendar'));

      await waitFor(() => {
        expect(screen.getByText('Select Calendar')).toBeTruthy();
        expect(screen.getByText('Personal')).toBeTruthy();
        expect(screen.getByText('Work')).toBeTruthy();
      });
    });
  });
});
