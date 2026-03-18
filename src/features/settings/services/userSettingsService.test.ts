const mockMaybeSingle = jest.fn();
const mockSelectEq = jest.fn().mockReturnValue({ maybeSingle: () => mockMaybeSingle() });
const mockSelect = jest.fn().mockReturnValue({ eq: mockSelectEq });
const mockUpsert = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: (...args: unknown[]) => mockSelect(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
  },
}));

const { getUserSettings, upsertPreferredCalendar, clearPreferredCalendar } =
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  require('./userSettingsService') as typeof import('./userSettingsService');

describe('userSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ maybeSingle: () => mockMaybeSingle() });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  });

  describe('getUserSettings', () => {
    it('returns settings when found', async () => {
      const mockSettings = {
        id: 'settings-1',
        user_id: 'user-1',
        preferred_calendar_id: 'cal-1',
        created_at: '2026-03-18',
        updated_at: '2026-03-18',
      };
      mockMaybeSingle.mockResolvedValue({ data: mockSettings, error: null });

      const result = await getUserSettings('user-1');
      expect(result).toEqual(mockSettings);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockSelectEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('returns null when no settings exist', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await getUserSettings('user-1');
      expect(result).toBeNull();
    });

    it('throws when Supabase returns an error', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(getUserSettings('user-1')).rejects.toEqual({ message: 'DB error' });
    });
  });

  describe('upsertPreferredCalendar', () => {
    it('calls Supabase upsert with correct parameters', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await upsertPreferredCalendar('user-1', 'cal-personal');

      expect(mockUpsert).toHaveBeenCalledWith(
        { user_id: 'user-1', preferred_calendar_id: 'cal-personal' },
        { onConflict: 'user_id' },
      );
    });

    it('throws when Supabase returns an error', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'Upsert failed' } });

      await expect(upsertPreferredCalendar('user-1', 'cal-1')).rejects.toEqual({ message: 'Upsert failed' });
    });
  });

  describe('clearPreferredCalendar', () => {
    it('calls Supabase update with null preferred_calendar_id', async () => {
      mockUpdateEq.mockResolvedValue({ error: null });

      await clearPreferredCalendar('user-1');

      expect(mockUpdate).toHaveBeenCalledWith({ preferred_calendar_id: null });
      expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('throws when Supabase returns an error', async () => {
      mockUpdateEq.mockResolvedValue({ error: { message: 'Update failed' } });

      await expect(clearPreferredCalendar('user-1')).rejects.toEqual({ message: 'Update failed' });
    });
  });
});
