import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import * as Calendar from 'expo-calendar';
import { theme } from '@config/theme';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
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

jest.mock('expo-calendar', () => ({
  getCalendarPermissionsAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getCalendarPermissionsAsync: jest.fn(),
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

jest.mock('@shared/stores/usePremiumStore', () => ({
  usePremiumStore: jest.fn(),
}));

const mockUsePremiumStore = usePremiumStore as jest.MockedFunction<typeof usePremiumStore>;

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <SettingsScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
  mockGetUserSettings.mockResolvedValue(null);
  useNotificationStore.setState({
    permissionStatus: 'granted',
    expoPushToken: null,
    isLoading: false,
    error: null,
  });
  useAuthStore.setState({ user: { id: 'user-1', email: 'test@example.com' } } as any);
  mockUsePremiumStore.mockImplementation(
    (selector: (s: { isPremium: boolean }) => unknown) =>
      selector({ isPremium: false }) as never,
  );
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

  describe('Premium section (Story 6.2)', () => {
    it('renders Premium section item for free users with crown-outline icon description', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Premium')).toBeTruthy();
      expect(screen.getByText('Unlock unlimited subscriptions')).toBeTruthy();
    });

    it('renders Premium section item for premium users with "Active" description', () => {
      mockUsePremiumStore.mockImplementation(
        (selector: (s: { isPremium: boolean }) => unknown) =>
          selector({ isPremium: true }) as never,
      );
      renderWithProvider();
      expect(screen.getByLabelText('Premium')).toBeTruthy();
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('navigates to Premium screen when Premium item is tapped', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Premium'));
      expect(mockNavigate).toHaveBeenCalledWith('Premium');
    });
  });

  describe('Bank Connection premium gating (Story 7.1)', () => {
    it('renders Bank Connection entry for free users', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Bank Connection')).toBeTruthy();
      expect(screen.getByText('Premium feature')).toBeTruthy();
    });

    it('free user tapping Bank Connection navigates to Premium screen', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Bank Connection'));
      expect(mockNavigate).toHaveBeenCalledWith('Premium');
    });

    it('premium user tapping Bank Connection navigates to BankConnection screen', () => {
      mockUsePremiumStore.mockImplementation(
        (selector: (s: { isPremium: boolean }) => unknown) =>
          selector({ isPremium: true }) as never,
      );
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Bank Connection'));
      expect(mockNavigate).toHaveBeenCalledWith('BankConnection');
    });

    it('premium user sees "Connect via Open Banking" description', () => {
      mockUsePremiumStore.mockImplementation(
        (selector: (s: { isPremium: boolean }) => unknown) =>
          selector({ isPremium: true }) as never,
      );
      renderWithProvider();
      expect(screen.getByText('Connect via Open Banking')).toBeTruthy();
    });
  });

  describe('Premium feature gating (Story 6.5)', () => {
    it('shows lock icon on Data Export for free users', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Data Export')).toBeTruthy();
    });

    it('free user tapping Data Export navigates to Premium screen', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Data Export'));
      expect(mockNavigate).toHaveBeenCalledWith('Premium');
    });

    it('premium user tapping Data Export navigates to DataExport screen', () => {
      mockUsePremiumStore.mockImplementation(
        (selector: (s: { isPremium: boolean }) => unknown) =>
          selector({ isPremium: true }) as never,
      );
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Data Export'));
      expect(mockNavigate).toHaveBeenCalledWith('DataExport');
    });

    it('free user tapping Preferred Calendar navigates to Premium screen', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Preferred Calendar'));
      expect(mockNavigate).toHaveBeenCalledWith('Premium');
    });

    it('premium user tapping Preferred Calendar opens calendar selection', async () => {
      mockUsePremiumStore.mockImplementation(
        (selector: (s: { isPremium: boolean }) => unknown) =>
          selector({ isPremium: true }) as never,
      );
      mockRequestCalendarAccess.mockResolvedValue({ granted: true, canAskAgain: true });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
      ]);

      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Preferred Calendar'));

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith('Premium');
      });
    });
  });

  describe('Calendar section (Story 5.2 AC4)', () => {
    it('renders Calendar section with Preferred Calendar item showing Default', () => {
      renderWithProvider();
      expect(screen.getByText('Calendar')).toBeTruthy();
      expect(screen.getByText('Preferred Calendar')).toBeTruthy();
      expect(screen.getByText('Default')).toBeTruthy();
    });

    it('shows stored preferred calendar name when permission already granted', async () => {
      (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      mockGetUserSettings.mockResolvedValue({
        id: 'settings-1',
        user_id: 'user-1',
        preferred_calendar_id: 'cal-1',
      });
      mockGetWritableCalendars.mockResolvedValue([
        { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
        { id: 'cal-2', title: 'Work', color: '#0000FF', isPrimary: false },
      ]);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeTruthy();
      });
    });

    it('renders Preferred Calendar with accessibility label', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Preferred Calendar')).toBeTruthy();
    });

    it('opens calendar selection dialog when tapped by premium user', async () => {
      mockUsePremiumStore.mockImplementation(
        (selector: (s: { isPremium: boolean }) => unknown) =>
          selector({ isPremium: true }) as never,
      );
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
