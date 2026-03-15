import {
  registerForPushNotificationsAsync,
  savePushToken,
  getPermissionStatus,
  openNotificationSettings,
  removePushToken,
} from './notificationService';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4, MAX: 5 },
}));

const mockIsDevice = { value: true };
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice.value;
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    easConfig: { projectId: 'test-project-id' },
  },
}));

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const Notifications = jest.requireMock('expo-notifications') as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  getExpoPushTokenAsync: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
};

function getSupabaseMock() {
  return jest.requireMock('@shared/services/supabase').supabase as {
    from: jest.Mock;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notificationService', () => {
  describe('registerForPushNotificationsAsync', () => {
    it('returns null when not a physical device', async () => {
      mockIsDevice.value = false;

      const result = await registerForPushNotificationsAsync();
      expect(result).toBeNull();
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();

      mockIsDevice.value = true;
    });

    it('returns token when permission already granted', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'ExponentPushToken[test123]',
      });

      const result = await registerForPushNotificationsAsync();
      expect(result).toBe('ExponentPushToken[test123]');
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission when not granted and returns token on grant', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Notifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'ExponentPushToken[test456]',
      });

      const result = await registerForPushNotificationsAsync();
      expect(result).toBe('ExponentPushToken[test456]');
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns null when permission is denied', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await registerForPushNotificationsAsync();
      expect(result).toBeNull();
    });

    it('throws error when EAS Project ID is not found', async () => {
      const ConstantsMock = jest.requireMock('expo-constants') as {
        default: { expoConfig: null; easConfig: null };
      };
      ConstantsMock.default = { expoConfig: null, easConfig: null };

      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      await expect(registerForPushNotificationsAsync()).rejects.toThrow(
        'EAS Project ID not found',
      );

      ConstantsMock.default = {
        expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
        easConfig: { projectId: 'test-project-id' },
      } as unknown as typeof ConstantsMock.default;
    });
  });

  describe('savePushToken', () => {
    it('upserts token to Supabase push_tokens table', async () => {
      const supabase = getSupabaseMock();
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      await savePushToken('user-1', 'ExponentPushToken[abc]', 'android');

      expect(supabase.from).toHaveBeenCalledWith('push_tokens');
      expect(mockUpsert).toHaveBeenCalledWith(
        { user_id: 'user-1', token: 'ExponentPushToken[abc]', platform: 'android' },
        { onConflict: 'user_id,token' },
      );
    });

    it('throws when Supabase returns an error', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Insert failed' };
      const mockUpsert = jest.fn().mockResolvedValue({ error: dbError });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      await expect(
        savePushToken('user-1', 'ExponentPushToken[abc]', 'ios'),
      ).rejects.toEqual(dbError);
    });
  });

  describe('getPermissionStatus', () => {
    it('returns current permission status', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const status = await getPermissionStatus();
      expect(status).toBe('granted');
    });

    it('returns denied when permission not granted', async () => {
      Notifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const status = await getPermissionStatus();
      expect(status).toBe('denied');
    });
  });

  describe('openNotificationSettings', () => {
    it('opens device settings via Linking', async () => {
      const RN = require('react-native');
      const spy = jest.spyOn(RN.Linking, 'openSettings').mockResolvedValue(undefined);

      await openNotificationSettings();
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('removePushToken', () => {
    it('deletes token from Supabase', async () => {
      const supabase = getSupabaseMock();
      const mockEqToken = jest.fn().mockResolvedValue({ error: null });
      const mockEqUserId = jest.fn().mockReturnValue({ eq: mockEqToken });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqUserId });
      supabase.from.mockReturnValue({ delete: mockDelete });

      await removePushToken('user-1', 'ExponentPushToken[abc]');

      expect(supabase.from).toHaveBeenCalledWith('push_tokens');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockEqToken).toHaveBeenCalledWith('token', 'ExponentPushToken[abc]');
    });

    it('throws when Supabase returns an error', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Delete failed' };
      const mockEqToken = jest.fn().mockResolvedValue({ error: dbError });
      const mockEqUserId = jest.fn().mockReturnValue({ eq: mockEqToken });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqUserId });
      supabase.from.mockReturnValue({ delete: mockDelete });

      await expect(
        removePushToken('user-1', 'ExponentPushToken[abc]'),
      ).rejects.toEqual(dbError);
    });
  });
});
