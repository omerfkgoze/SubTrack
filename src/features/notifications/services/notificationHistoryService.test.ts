import {
  getNotificationHistory,
  getDeliveryCount,
  hasPartialNotifications,
} from './notificationHistoryService';

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function getSupabaseMock() {
  return jest.requireMock('@shared/services/supabase').supabase as {
    from: jest.Mock;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notificationHistoryService', () => {
  describe('getNotificationHistory', () => {
    it('returns mapped notification history items with subscription names', async () => {
      const supabase = getSupabaseMock();

      const mockLogs = [
        {
          id: 'log-1',
          subscription_id: 'sub-1',
          notification_type: 'renewal',
          renewal_date: '2026-03-20',
          sent_at: '2026-03-17T10:00:00Z',
          status: 'sent',
        },
        {
          id: 'log-2',
          subscription_id: 'sub-2',
          notification_type: 'trial_expiry',
          renewal_date: '2026-03-21',
          sent_at: '2026-03-16T08:00:00Z',
          status: 'failed',
        },
      ];

      const mockSubscriptions = [
        { id: 'sub-1', name: 'Netflix' },
        { id: 'sub-2', name: 'Spotify' },
      ];

      // First call: notification_log query
      const mockOrder = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: mockLogs, error: null }),
      });
      const mockEqLogs = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelectLogs = jest.fn().mockReturnValue({ eq: mockEqLogs });

      // Second call: subscriptions query
      const mockIn = jest.fn().mockResolvedValue({ data: mockSubscriptions, error: null });
      const mockSelectSubs = jest.fn().mockReturnValue({ in: mockIn });

      supabase.from
        .mockReturnValueOnce({ select: mockSelectLogs })
        .mockReturnValueOnce({ select: mockSelectSubs });

      const result = await getNotificationHistory('user-1');

      expect(supabase.from).toHaveBeenCalledWith('notification_log');
      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'log-1',
        subscription_name: 'Netflix',
        notification_type: 'renewal',
        renewal_date: '2026-03-20',
        sent_at: '2026-03-17T10:00:00Z',
        status: 'sent',
      });
      expect(result[1]).toEqual({
        id: 'log-2',
        subscription_name: 'Spotify',
        notification_type: 'trial_expiry',
        renewal_date: '2026-03-21',
        sent_at: '2026-03-16T08:00:00Z',
        status: 'failed',
      });
    });

    it('returns empty array when no logs exist', async () => {
      const supabase = getSupabaseMock();

      const mockOrder = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await getNotificationHistory('user-1');

      expect(result).toEqual([]);
      expect(supabase.from).toHaveBeenCalledTimes(1); // only notification_log, no subscriptions query
    });

    it('falls back to "Unknown" when subscription name not found', async () => {
      const supabase = getSupabaseMock();

      const mockLogs = [
        {
          id: 'log-1',
          subscription_id: 'sub-deleted',
          notification_type: 'renewal',
          renewal_date: '2026-03-20',
          sent_at: '2026-03-17T10:00:00Z',
          status: 'sent',
        },
      ];

      const mockOrder = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: mockLogs, error: null }),
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      const mockIn = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelectSubs = jest.fn().mockReturnValue({ in: mockIn });

      supabase.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ select: mockSelectSubs });

      const result = await getNotificationHistory('user-1');

      expect(result[0].subscription_name).toBe('Unknown');
    });

    it('throws when notification_log query fails', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Query failed' };

      const mockOrder = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: null, error: dbError }),
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ select: mockSelect });

      await expect(getNotificationHistory('user-1')).rejects.toEqual(dbError);
    });
  });

  describe('getDeliveryCount', () => {
    it('returns count of sent notifications', async () => {
      const supabase = getSupabaseMock();

      // chain: .from().select().eq('user_id').eq('status') → resolves { count, error }
      const mockEq2 = jest.fn().mockResolvedValue({ count: 12, error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await getDeliveryCount('user-1');

      expect(result).toBe(12);
      expect(supabase.from).toHaveBeenCalledWith('notification_log');
    });

    it('returns 0 when count is null', async () => {
      const supabase = getSupabaseMock();

      const mockEq2 = jest.fn().mockResolvedValue({ count: null, error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await getDeliveryCount('user-1');

      expect(result).toBe(0);
    });

    it('throws when query fails', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Count failed' };

      const mockEq2 = jest.fn().mockResolvedValue({ count: null, error: dbError });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ select: mockSelect });

      await expect(getDeliveryCount('user-1')).rejects.toEqual(dbError);
    });
  });

  describe('hasPartialNotifications', () => {
    it('returns true when some subscriptions have is_enabled=false', async () => {
      const supabase = getSupabaseMock();

      // chain: .from().select().eq('user_id').eq('is_enabled') → resolves { count, error }
      const mockEq2 = jest.fn().mockResolvedValue({ count: 2, error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await hasPartialNotifications('user-1');

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('reminder_settings');
    });

    it('returns false when all subscriptions have is_enabled=true', async () => {
      const supabase = getSupabaseMock();

      const mockEq2 = jest.fn().mockResolvedValue({ count: 0, error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await hasPartialNotifications('user-1');

      expect(result).toBe(false);
    });

    it('returns false when count is null', async () => {
      const supabase = getSupabaseMock();

      const mockEq2 = jest.fn().mockResolvedValue({ count: null, error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await hasPartialNotifications('user-1');

      expect(result).toBe(false);
    });

    it('throws when query fails', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Query failed' };

      const mockEq2 = jest.fn().mockResolvedValue({ count: null, error: dbError });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      supabase.from.mockReturnValue({ select: mockSelect });

      await expect(hasPartialNotifications('user-1')).rejects.toEqual(dbError);
    });
  });
});
