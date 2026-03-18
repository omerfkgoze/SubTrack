import { act } from '@testing-library/react-native';
import { usePremiumStore, MAX_FREE_SUBSCRIPTIONS } from './usePremiumStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@shared/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn().mockReturnValue({ user: { id: 'user-1' } }),
  },
}));

const { supabase } = jest.requireMock('@shared/services/supabase');

function buildSupabaseMock(data: unknown, error: unknown = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  };
}

describe('usePremiumStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePremiumStore.setState({ isPremium: false, isLoading: false });
  });

  describe('MAX_FREE_SUBSCRIPTIONS', () => {
    it('is 5', () => {
      expect(MAX_FREE_SUBSCRIPTIONS).toBe(5);
    });
  });

  describe('canAddSubscription', () => {
    it('returns true when activeCount is below the free limit', () => {
      usePremiumStore.setState({ isPremium: false });
      const { canAddSubscription } = usePremiumStore.getState();
      expect(canAddSubscription(4)).toBe(true);
    });

    it('returns false when activeCount equals the free limit and not premium', () => {
      usePremiumStore.setState({ isPremium: false });
      const { canAddSubscription } = usePremiumStore.getState();
      expect(canAddSubscription(5)).toBe(false);
    });

    it('returns false when activeCount exceeds the free limit and not premium', () => {
      usePremiumStore.setState({ isPremium: false });
      const { canAddSubscription } = usePremiumStore.getState();
      expect(canAddSubscription(6)).toBe(false);
    });

    it('returns true for premium user regardless of count', () => {
      usePremiumStore.setState({ isPremium: true });
      const { canAddSubscription } = usePremiumStore.getState();
      expect(canAddSubscription(100)).toBe(true);
    });
  });

  describe('checkPremiumStatus', () => {
    it('sets isPremium to true when user_settings.is_premium is true', async () => {
      supabase.from.mockReturnValue(buildSupabaseMock({ is_premium: true }));

      await act(async () => {
        await usePremiumStore.getState().checkPremiumStatus();
      });

      expect(usePremiumStore.getState().isPremium).toBe(true);
      expect(usePremiumStore.getState().isLoading).toBe(false);
    });

    it('sets isPremium to false when user_settings.is_premium is false', async () => {
      usePremiumStore.setState({ isPremium: true });
      supabase.from.mockReturnValue(buildSupabaseMock({ is_premium: false }));

      await act(async () => {
        await usePremiumStore.getState().checkPremiumStatus();
      });

      expect(usePremiumStore.getState().isPremium).toBe(false);
    });

    it('does not change isPremium on Supabase error', async () => {
      usePremiumStore.setState({ isPremium: false });
      supabase.from.mockReturnValue(buildSupabaseMock(null, { message: 'DB error' }));

      await act(async () => {
        await usePremiumStore.getState().checkPremiumStatus();
      });

      expect(usePremiumStore.getState().isPremium).toBe(false);
      expect(usePremiumStore.getState().isLoading).toBe(false);
    });

    it('does nothing when user is not authenticated', async () => {
      const { useAuthStore } = jest.requireMock('@shared/stores/useAuthStore');
      useAuthStore.getState.mockReturnValueOnce({ user: null });

      await act(async () => {
        await usePremiumStore.getState().checkPremiumStatus();
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('refreshPremiumStatus', () => {
    it('calls checkPremiumStatus', async () => {
      supabase.from.mockReturnValue(buildSupabaseMock({ is_premium: true }));

      await act(async () => {
        await usePremiumStore.getState().refreshPremiumStatus();
      });

      expect(usePremiumStore.getState().isPremium).toBe(true);
    });
  });
});
