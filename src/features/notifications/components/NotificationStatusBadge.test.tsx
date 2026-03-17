import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { NotificationStatusBadge } from './NotificationStatusBadge';

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

jest.mock('../services/notificationHistoryService', () => ({
  getDeliveryCount: jest.fn(),
  hasPartialNotifications: jest.fn(),
  getNotificationHistory: jest.fn(),
}));

function getServiceMocks() {
  return jest.requireMock('../services/notificationHistoryService') as {
    getDeliveryCount: jest.Mock;
    hasPartialNotifications: jest.Mock;
    getNotificationHistory: jest.Mock;
  };
}

const mockUser = { id: 'user-1', email: 'test@example.com' };

function renderWithProvider(props: React.ComponentProps<typeof NotificationStatusBadge>) {
  return render(
    <PaperProvider theme={theme}>
      <NotificationStatusBadge {...props} />
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
  useAuthStore.setState({ user: mockUser } as any);
  getServiceMocks().getDeliveryCount.mockResolvedValue(0);
  getServiceMocks().hasPartialNotifications.mockResolvedValue(false);
});

describe('NotificationStatusBadge', () => {
  describe('enabled state (AC4, AC5)', () => {
    it('shows green "Notifications active" when enabled and no deliveries', async () => {
      getServiceMocks().getDeliveryCount.mockResolvedValue(0);
      getServiceMocks().hasPartialNotifications.mockResolvedValue(false);

      renderWithProvider({ variant: 'banner' });

      await waitFor(() => {
        expect(screen.getByText('Notifications active')).toBeTruthy();
      });
    });

    it('shows delivery count when deliveries exist', async () => {
      getServiceMocks().getDeliveryCount.mockResolvedValue(12);
      getServiceMocks().hasPartialNotifications.mockResolvedValue(false);

      renderWithProvider({ variant: 'banner' });

      await waitFor(() => {
        expect(screen.getByText('12 reminders delivered')).toBeTruthy();
      });
    });

    it('uses singular "reminder" when count is 1', async () => {
      getServiceMocks().getDeliveryCount.mockResolvedValue(1);
      getServiceMocks().hasPartialNotifications.mockResolvedValue(false);

      renderWithProvider({ variant: 'banner' });

      await waitFor(() => {
        expect(screen.getByText('1 reminder delivered')).toBeTruthy();
      });
    });
  });

  describe('partial state (AC6)', () => {
    it('shows amber "Some notifications blocked" when partial', async () => {
      getServiceMocks().getDeliveryCount.mockResolvedValue(0);
      getServiceMocks().hasPartialNotifications.mockResolvedValue(true);

      renderWithProvider({ variant: 'banner' });

      await waitFor(() => {
        expect(screen.getByText('Some notifications blocked')).toBeTruthy();
      });
    });

    it('uses partial prop override when provided', async () => {
      renderWithProvider({ variant: 'banner', partial: true, enabled: true });

      await waitFor(() => {
        expect(screen.getByText('Some notifications blocked')).toBeTruthy();
      });
    });
  });

  describe('disabled state', () => {
    it('shows red "Notifications off" when permission denied', () => {
      useNotificationStore.setState({ permissionStatus: 'denied' });

      renderWithProvider({ variant: 'banner' });

      expect(screen.getByText('Notifications off')).toBeTruthy();
    });

    it('uses enabled prop override when provided', () => {
      renderWithProvider({ variant: 'banner', enabled: false });

      expect(screen.getByText('Notifications off')).toBeTruthy();
    });

    it('does not call loadStats when disabled', async () => {
      useNotificationStore.setState({ permissionStatus: 'denied' });

      renderWithProvider({ variant: 'banner' });

      await waitFor(() => {
        expect(getServiceMocks().getDeliveryCount).not.toHaveBeenCalled();
      });
    });
  });

  describe('variants', () => {
    it('renders header variant', async () => {
      renderWithProvider({ variant: 'header' });

      await waitFor(() => {
        expect(screen.getByText('Notifications active')).toBeTruthy();
      });
    });

    it('renders banner variant', async () => {
      renderWithProvider({ variant: 'banner' });

      await waitFor(() => {
        expect(screen.getByText('Notifications active')).toBeTruthy();
      });
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label for enabled state', async () => {
      getServiceMocks().getDeliveryCount.mockResolvedValue(0);
      getServiceMocks().hasPartialNotifications.mockResolvedValue(false);

      renderWithProvider({ variant: 'banner' });

      await waitFor(() => {
        expect(screen.getByLabelText(/Notification status: Notifications active/)).toBeTruthy();
      });
    });

    it('has correct accessibility label for disabled state', () => {
      useNotificationStore.setState({ permissionStatus: 'denied' });

      renderWithProvider({ variant: 'banner' });

      expect(screen.getByLabelText(/Notification status: Notifications off/)).toBeTruthy();
    });
  });
});
