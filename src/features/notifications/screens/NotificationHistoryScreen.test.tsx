import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { NotificationHistoryScreen } from './NotificationHistoryScreen';
import type { NotificationHistoryItem } from '../services/notificationHistoryService';

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
  getNotificationHistory: jest.fn(),
  getDeliveryCount: jest.fn(),
  hasPartialNotifications: jest.fn(),
}));

function getServiceMocks() {
  return jest.requireMock('../services/notificationHistoryService') as {
    getNotificationHistory: jest.Mock;
    getDeliveryCount: jest.Mock;
    hasPartialNotifications: jest.Mock;
  };
}

const mockUser = { id: 'user-1', email: 'test@example.com' };

const mockItems: NotificationHistoryItem[] = [
  {
    id: 'log-1',
    subscription_name: 'Netflix',
    notification_type: 'renewal',
    renewal_date: '2026-03-20',
    sent_at: '2026-03-17T10:00:00Z',
    status: 'sent',
  },
  {
    id: 'log-2',
    subscription_name: 'Spotify',
    notification_type: 'trial_expiry',
    renewal_date: '2026-03-21',
    sent_at: '2026-03-16T08:00:00Z',
    status: 'failed',
  },
];

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <NotificationHistoryScreen />
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
  const mocks = getServiceMocks();
  mocks.getNotificationHistory.mockResolvedValue([]);
  mocks.getDeliveryCount.mockResolvedValue(0);
  mocks.hasPartialNotifications.mockResolvedValue(false);
});

describe('NotificationHistoryScreen', () => {
  describe('renders list of notifications (AC1)', () => {
    it('shows subscription name for each notification', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue(mockItems);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.getByText('Spotify')).toBeTruthy();
      });
    });

    it('shows delivery status chip for sent notification', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue([mockItems[0]]);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Delivered')).toBeTruthy();
      });
    });

    it('shows failed status chip for failed notification', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue([mockItems[1]]);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeTruthy();
      });
    });

    it('shows retrying status chip for retrying notification', async () => {
      const retryingItem: NotificationHistoryItem = {
        ...mockItems[0],
        id: 'log-3',
        status: 'retrying',
      };
      getServiceMocks().getNotificationHistory.mockResolvedValue([retryingItem]);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Retrying')).toBeTruthy();
      });
    });

    it('shows Renewal reminder description for renewal type', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue([mockItems[0]]);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText(/Renewal reminder/)).toBeTruthy();
      });
    });

    it('shows Trial expiry description for trial_expiry type', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue([mockItems[1]]);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText(/Trial expiry/)).toBeTruthy();
      });
    });
  });

  describe('empty state (AC2)', () => {
    it('shows empty state message when no notifications exist', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue([]);

      renderWithProvider();

      await waitFor(() => {
        expect(
          screen.getByText(
            /No notifications yet. Reminders will appear here once your subscriptions approach renewal./,
          ),
        ).toBeTruthy();
      });
    });

    it('does not show empty state when notifications exist', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue(mockItems);

      renderWithProvider();

      await waitFor(() => {
        expect(
          screen.queryByText(/No notifications yet/),
        ).toBeNull();
      });
    });
  });

  describe('pull-to-refresh (AC8)', () => {
    it('reloads data when pull-to-refresh triggered', async () => {
      const mocks = getServiceMocks();
      mocks.getNotificationHistory.mockResolvedValue([]);

      renderWithProvider();
      await waitFor(() => expect(mocks.getNotificationHistory).toHaveBeenCalledTimes(1));

      const flatList = screen.UNSAFE_getByType(require('react-native').FlatList);
      await act(async () => {
        flatList.props.onRefresh();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mocks.getNotificationHistory).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('loading state (M1 fix)', () => {
    it('shows loading indicator while data is being fetched', () => {
      const mocks = getServiceMocks();
      // Never resolve to keep loading state
      mocks.getNotificationHistory.mockReturnValue(new Promise(() => {}));

      renderWithProvider();

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      expect(screen.queryByText(/No notifications yet/)).toBeNull();
    });

    it('hides loading indicator after data loads', async () => {
      getServiceMocks().getNotificationHistory.mockResolvedValue(mockItems);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
        expect(screen.getByText('Netflix')).toBeTruthy();
      });
    });
  });

  describe('error state (M2 fix)', () => {
    it('shows error message when fetch fails', async () => {
      getServiceMocks().getNotificationHistory.mockRejectedValue(new Error('Network error'));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/)).toBeTruthy();
      });
    });

    it('does not show empty state when fetch fails', async () => {
      getServiceMocks().getNotificationHistory.mockRejectedValue(new Error('Network error'));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/)).toBeTruthy();
        expect(screen.queryByText(/No notifications yet/)).toBeNull();
      });
    });

    it('shows retry button on error', async () => {
      const mocks = getServiceMocks();
      mocks.getNotificationHistory.mockRejectedValueOnce(new Error('fail'));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });

    it('retries fetch when retry button pressed', async () => {
      const mocks = getServiceMocks();
      mocks.getNotificationHistory
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(mockItems);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByText('Retry'));
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.queryByText(/Something went wrong/)).toBeNull();
      });
    });
  });

  describe('calls service with correct user id', () => {
    it('fetches history for the authenticated user', async () => {
      const mocks = getServiceMocks();
      mocks.getNotificationHistory.mockResolvedValue([]);

      renderWithProvider();

      await waitFor(() => {
        expect(mocks.getNotificationHistory).toHaveBeenCalledWith('user-1');
      });
    });

    it('does not fetch when user is null', async () => {
      useAuthStore.setState({ user: null } as any);
      const mocks = getServiceMocks();

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(mocks.getNotificationHistory).not.toHaveBeenCalled();
    });
  });
});
