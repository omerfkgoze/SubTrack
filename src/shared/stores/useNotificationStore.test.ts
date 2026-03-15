import { act } from '@testing-library/react-native';
import { useNotificationStore } from './useNotificationStore';

jest.mock('@features/notifications/services/notificationService', () => ({
  registerForPushNotificationsAsync: jest.fn(),
  savePushToken: jest.fn(),
  getPermissionStatus: jest.fn(),
}));

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const {
  registerForPushNotificationsAsync: mockRegister,
  savePushToken: mockSaveToken,
  getPermissionStatus: mockGetStatus,
} = jest.requireMock('@features/notifications/services/notificationService');

const { supabase: mockSupabase } = jest.requireMock('@shared/services/supabase');

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationStore.setState({
    permissionStatus: 'undetermined',
    expoPushToken: null,
    isLoading: false,
    error: null,
  });
});

describe('useNotificationStore', () => {
  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useNotificationStore.getState();
      expect(state.permissionStatus).toBe('undetermined');
      expect(state.expoPushToken).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('requestPermission', () => {
    it('sets granted status and token when permission accepted', async () => {
      mockRegister.mockResolvedValue('ExponentPushToken[abc123]');
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      mockSaveToken.mockResolvedValue(undefined);

      await act(async () => {
        await useNotificationStore.getState().requestPermission();
      });

      const state = useNotificationStore.getState();
      expect(state.permissionStatus).toBe('granted');
      expect(state.expoPushToken).toBe('ExponentPushToken[abc123]');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets denied status when permission rejected', async () => {
      mockRegister.mockResolvedValue(null);

      await act(async () => {
        await useNotificationStore.getState().requestPermission();
      });

      const state = useNotificationStore.getState();
      expect(state.permissionStatus).toBe('denied');
      expect(state.expoPushToken).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('sets error on registration failure', async () => {
      mockRegister.mockRejectedValue(new Error('Registration failed'));

      await act(async () => {
        await useNotificationStore.getState().requestPermission();
      });

      const state = useNotificationStore.getState();
      expect(state.error).not.toBeNull();
      expect(state.error?.code).toBe('NOTIFICATION_ERROR');
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoading during request', async () => {
      let resolveRegister: ((value: string | null) => void) | undefined;
      mockRegister.mockReturnValue(
        new Promise<string | null>((resolve) => {
          resolveRegister = resolve;
        }),
      );

      let requestPromise: Promise<void>;
      act(() => {
        requestPromise = useNotificationStore.getState().requestPermission();
      });

      expect(useNotificationStore.getState().isLoading).toBe(true);

      await act(async () => {
        resolveRegister?.(null);
        await requestPromise;
      });

      expect(useNotificationStore.getState().isLoading).toBe(false);
    });

    it('calls registerToken after successful permission grant', async () => {
      mockRegister.mockResolvedValue('ExponentPushToken[abc123]');
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      mockSaveToken.mockResolvedValue(undefined);

      await act(async () => {
        await useNotificationStore.getState().requestPermission();
      });

      expect(mockSaveToken).toHaveBeenCalledWith(
        'user-1',
        'ExponentPushToken[abc123]',
        expect.any(String),
      );
    });
  });

  describe('checkPermission', () => {
    it('updates permission status to granted', async () => {
      mockGetStatus.mockResolvedValue('granted');

      await act(async () => {
        await useNotificationStore.getState().checkPermission();
      });

      expect(useNotificationStore.getState().permissionStatus).toBe('granted');
    });

    it('updates permission status to denied', async () => {
      mockGetStatus.mockResolvedValue('denied');

      await act(async () => {
        await useNotificationStore.getState().checkPermission();
      });

      expect(useNotificationStore.getState().permissionStatus).toBe('denied');
    });

    it('maps undetermined status correctly', async () => {
      mockGetStatus.mockResolvedValue('undetermined');

      await act(async () => {
        await useNotificationStore.getState().checkPermission();
      });

      expect(useNotificationStore.getState().permissionStatus).toBe('undetermined');
    });

    it('silently handles errors', async () => {
      mockGetStatus.mockRejectedValue(new Error('Check failed'));

      await act(async () => {
        await useNotificationStore.getState().checkPermission();
      });

      // Should not throw and state should remain unchanged
      expect(useNotificationStore.getState().permissionStatus).toBe('undetermined');
    });
  });

  describe('registerToken', () => {
    it('does nothing when no token is available', async () => {
      useNotificationStore.setState({ expoPushToken: null });

      await act(async () => {
        await useNotificationStore.getState().registerToken();
      });

      expect(mockSaveToken).not.toHaveBeenCalled();
    });

    it('does nothing when no user is authenticated', async () => {
      useNotificationStore.setState({ expoPushToken: 'ExponentPushToken[abc]' });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await act(async () => {
        await useNotificationStore.getState().registerToken();
      });

      expect(mockSaveToken).not.toHaveBeenCalled();
    });

    it('saves token when user and token are available', async () => {
      useNotificationStore.setState({ expoPushToken: 'ExponentPushToken[abc]' });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      mockSaveToken.mockResolvedValue(undefined);

      await act(async () => {
        await useNotificationStore.getState().registerToken();
      });

      expect(mockSaveToken).toHaveBeenCalledWith(
        'user-1',
        'ExponentPushToken[abc]',
        expect.any(String),
      );
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useNotificationStore.setState({
        error: { code: 'TEST', message: 'test error' },
      });

      act(() => {
        useNotificationStore.getState().clearError();
      });

      expect(useNotificationStore.getState().error).toBeNull();
    });
  });
});
