import type { Subscription } from '@features/subscriptions/types';

jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  __esModule: true,
  default: {},
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import NetInfo from '@react-native-community/netinfo';
import { exportPersonalData } from './personalDataService';

const mockWriteAsStringAsync = FileSystem.writeAsStringAsync as jest.MockedFunction<
  typeof FileSystem.writeAsStringAsync
>;
const mockShareAsync = Sharing.shareAsync as jest.MockedFunction<typeof Sharing.shareAsync>;
const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    id: 'sub-1',
    user_id: 'user-1',
    name: 'Netflix',
    price: 17.99,
    currency: 'USD',
    billing_cycle: 'monthly',
    renewal_date: '2026-04-01',
    category: 'Entertainment',
    is_active: true,
    is_trial: false,
    trial_expiry_date: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    calendar_event_id: 'evt-1',
    ...overrides,
  } as unknown as Subscription);

const notificationSettings = {
  permissionStatus: 'granted',
  expoPushToken: 'ExponentPushToken[xxx]',
};

const calendarPreferences = { preferred_calendar_id: 'cal-123' };

describe('exportPersonalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
  });

  it('generates correct JSON structure with all data categories', async () => {
    const sub = makeSubscription();
    await exportPersonalData(
      'user-1',
      'test@example.com',
      '2026-01-15T00:00:00Z',
      [sub],
      notificationSettings,
      calendarPreferences,
    );

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [fileUri, content] = mockWriteAsStringAsync.mock.calls[0];

    // File naming pattern
    expect(fileUri).toMatch(/file:\/\/\/cache\/subtrack-my-data-\d{4}-\d{2}-\d{2}\.json/);

    const parsed = JSON.parse(content);

    // Top-level keys
    expect(parsed).toHaveProperty('export_date');
    expect(parsed).toHaveProperty('user');
    expect(parsed).toHaveProperty('subscriptions');
    expect(parsed).toHaveProperty('settings');

    // User data
    expect(parsed.user.email).toBe('test@example.com');
    expect(parsed.user.id).toBe('user-1');
    expect(parsed.user.created_at).toBe('2026-01-15T00:00:00Z');

    // Subscriptions — ALL fields included (GDPR requires all stored data)
    expect(parsed.subscriptions).toHaveLength(1);
    expect(parsed.subscriptions[0]).toHaveProperty('id', 'sub-1');
    expect(parsed.subscriptions[0]).toHaveProperty('user_id', 'user-1');
    expect(parsed.subscriptions[0]).toHaveProperty('name', 'Netflix');
    expect(parsed.subscriptions[0]).toHaveProperty('created_at');
    expect(parsed.subscriptions[0]).toHaveProperty('calendar_event_id');

    // Settings
    expect(parsed.settings.preferred_calendar_id).toBe('cal-123');
    expect(parsed.settings.notification_preferences.permissionStatus).toBe('granted');
    expect(parsed.settings.notification_preferences.expoPushToken).toBe('ExponentPushToken[xxx]');
  });

  it('writes file and calls shareAsync', async () => {
    await exportPersonalData(
      'user-1',
      'test@example.com',
      '2026-01-15T00:00:00Z',
      [],
      notificationSettings,
      calendarPreferences,
    );

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    const [fileUri, options] = mockShareAsync.mock.calls[0];
    expect(fileUri).toMatch(/\.json$/);
    expect(options).toMatchObject({ mimeType: 'application/json' });
  });

  it('handles connectivity failure — throws error without writing file', async () => {
    mockNetInfoFetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    } as never);

    await expect(
      exportPersonalData(
        'user-1',
        'test@example.com',
        '2026-01-15T00:00:00Z',
        [],
        notificationSettings,
        calendarPreferences,
      )
    ).rejects.toThrow('No internet connection');

    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('uses correct file naming pattern subtrack-my-data-YYYY-MM-DD.json', async () => {
    await exportPersonalData(
      'user-1',
      'test@example.com',
      '2026-01-15T00:00:00Z',
      [],
      notificationSettings,
      { preferred_calendar_id: null },
    );

    const [fileUri] = mockWriteAsStringAsync.mock.calls[0];
    expect(fileUri).toMatch(/subtrack-my-data-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
