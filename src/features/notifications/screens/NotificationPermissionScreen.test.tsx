import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { NotificationPermissionScreen } from './NotificationPermissionScreen';

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

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <NotificationPermissionScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationStore.setState({
    permissionStatus: 'undetermined',
    expoPushToken: null,
    isLoading: false,
    error: null,
  });
});

describe('NotificationPermissionScreen', () => {
  describe('pre-permission state', () => {
    it('renders value proposition text', () => {
      renderWithProvider();
      expect(screen.getByText('Never miss a renewal again')).toBeTruthy();
    });

    it('renders social proof text', () => {
      renderWithProvider();
      expect(screen.getByText('Users save €47/month on average')).toBeTruthy();
    });

    it('renders explanation text', () => {
      renderWithProvider();
      expect(
        screen.getByText(
          "We'll remind you 3 days before each renewal so you can decide whether to keep or cancel.",
        ),
      ).toBeTruthy();
    });

    it('renders Enable Notifications button with accessibility label', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Enable push notifications')).toBeTruthy();
    });

    it('renders Maybe Later button', () => {
      renderWithProvider();
      expect(screen.getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('enable button', () => {
    it('triggers permission request on press', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue(undefined);
      useNotificationStore.setState({ requestPermission: mockRequestPermission });

      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Enable push notifications'));

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    it('shows loading state during permission request', () => {
      useNotificationStore.setState({ isLoading: true });
      renderWithProvider();

      const button = screen.getByLabelText('Enable push notifications');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('maybe later button', () => {
    it('navigates back on press', () => {
      renderWithProvider();
      fireEvent.press(screen.getByText('Maybe Later'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('success state', () => {
    it('shows success confirmation when permission granted', () => {
      useNotificationStore.setState({ permissionStatus: 'granted' });
      renderWithProvider();
      expect(screen.getByText('Notifications enabled!')).toBeTruthy();
    });

    it('shows Continue button in success state', () => {
      useNotificationStore.setState({ permissionStatus: 'granted' });
      renderWithProvider();
      expect(screen.getByLabelText('Continue to app')).toBeTruthy();
    });

    it('Continue button navigates back', () => {
      useNotificationStore.setState({ permissionStatus: 'granted' });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Continue to app'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('error state', () => {
    it('shows error message when error exists', () => {
      useNotificationStore.setState({
        error: { code: 'NOTIFICATION_ERROR', message: 'Failed to set up notifications. Please try again.' },
      });
      renderWithProvider();
      expect(
        screen.getByText('Failed to set up notifications. Please try again.'),
      ).toBeTruthy();
    });
  });

  describe('denied state', () => {
    it('shows pre-permission screen when denied (user can retry)', () => {
      useNotificationStore.setState({ permissionStatus: 'denied' });
      renderWithProvider();
      expect(screen.getByText('Never miss a renewal again')).toBeTruthy();
    });
  });
});
