import {
  getReminderSettings,
  createDefaultReminder,
  updateReminder,
  deleteReminder,
} from './reminderService';

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

describe('reminderService', () => {
  describe('getReminderSettings', () => {
    it('returns reminder setting when it exists', async () => {
      const supabase = getSupabaseMock();
      const mockSetting = {
        id: 'rem-1',
        user_id: 'user-1',
        subscription_id: 'sub-1',
        remind_days_before: 3,
        is_enabled: true,
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
      };
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: mockSetting, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await getReminderSettings('sub-1');

      expect(supabase.from).toHaveBeenCalledWith('reminder_settings');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('subscription_id', 'sub-1');
      expect(result).toEqual(mockSetting);
    });

    it('returns null when no reminder setting exists', async () => {
      const supabase = getSupabaseMock();
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await getReminderSettings('sub-nonexistent');

      expect(result).toBeNull();
    });

    it('throws when Supabase returns an error', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Query failed' };
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ select: mockSelect });

      await expect(getReminderSettings('sub-1')).rejects.toEqual(dbError);
    });
  });

  describe('createDefaultReminder', () => {
    it('upserts a default reminder with 3-day setting', async () => {
      const supabase = getSupabaseMock();
      const mockSetting = {
        id: 'rem-1',
        user_id: 'user-1',
        subscription_id: 'sub-1',
        remind_days_before: 3,
        is_enabled: true,
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
      };
      const mockSingle = jest.fn().mockResolvedValue({ data: mockSetting, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      const result = await createDefaultReminder('user-1', 'sub-1');

      expect(supabase.from).toHaveBeenCalledWith('reminder_settings');
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          subscription_id: 'sub-1',
          remind_days_before: 3,
          is_enabled: true,
        },
        { onConflict: 'user_id,subscription_id' },
      );
      expect(result).toEqual(mockSetting);
    });

    it('uses custom remindDaysBefore when provided', async () => {
      const supabase = getSupabaseMock();
      const mockSetting = {
        id: 'rem-1',
        user_id: 'user-1',
        subscription_id: 'sub-1',
        remind_days_before: 7,
        is_enabled: true,
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
      };
      const mockSingle = jest.fn().mockResolvedValue({ data: mockSetting, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      const result = await createDefaultReminder('user-1', 'sub-1', 7);

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          subscription_id: 'sub-1',
          remind_days_before: 7,
          is_enabled: true,
        },
        { onConflict: 'user_id,subscription_id' },
      );
      expect(result).toEqual(mockSetting);
    });

    it('throws when Supabase returns an error', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Upsert failed' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect });
      supabase.from.mockReturnValue({ upsert: mockUpsert });

      await expect(createDefaultReminder('user-1', 'sub-1')).rejects.toEqual(dbError);
    });
  });

  describe('updateReminder', () => {
    it('updates remind_days_before', async () => {
      const supabase = getSupabaseMock();
      const mockSetting = {
        id: 'rem-1',
        user_id: 'user-1',
        subscription_id: 'sub-1',
        remind_days_before: 7,
        is_enabled: true,
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
      };
      const mockSingle = jest.fn().mockResolvedValue({ data: mockSetting, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ update: mockUpdate });

      const result = await updateReminder('rem-1', { remind_days_before: 7 });

      expect(supabase.from).toHaveBeenCalledWith('reminder_settings');
      expect(mockUpdate).toHaveBeenCalledWith({ remind_days_before: 7 });
      expect(mockEq).toHaveBeenCalledWith('id', 'rem-1');
      expect(result).toEqual(mockSetting);
    });

    it('updates is_enabled', async () => {
      const supabase = getSupabaseMock();
      const mockSetting = {
        id: 'rem-1',
        user_id: 'user-1',
        subscription_id: 'sub-1',
        remind_days_before: 3,
        is_enabled: false,
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
      };
      const mockSingle = jest.fn().mockResolvedValue({ data: mockSetting, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ update: mockUpdate });

      const result = await updateReminder('rem-1', { is_enabled: false });

      expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: false });
      expect(result).toEqual(mockSetting);
    });

    it('throws when Supabase returns an error', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Update failed' };
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ update: mockUpdate });

      await expect(updateReminder('rem-1', { remind_days_before: 7 })).rejects.toEqual(dbError);
    });
  });

  describe('deleteReminder', () => {
    it('deletes reminder from Supabase', async () => {
      const supabase = getSupabaseMock();
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ delete: mockDelete });

      await deleteReminder('rem-1');

      expect(supabase.from).toHaveBeenCalledWith('reminder_settings');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'rem-1');
    });

    it('throws when Supabase returns an error', async () => {
      const supabase = getSupabaseMock();
      const dbError = { code: 'DB_ERROR', message: 'Delete failed' };
      const mockEq = jest.fn().mockResolvedValue({ error: dbError });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ delete: mockDelete });

      await expect(deleteReminder('rem-1')).rejects.toEqual(dbError);
    });
  });
});
