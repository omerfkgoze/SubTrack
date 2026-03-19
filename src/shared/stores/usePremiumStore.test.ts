import { act } from '@testing-library/react-native';
import { usePremiumStore, MAX_FREE_SUBSCRIPTIONS } from './usePremiumStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { valid: true }, error: null }),
    },
  },
}));

jest.mock('@shared/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn().mockReturnValue({ user: { id: 'user-1' } }),
  },
}));

jest.mock('@features/premium/services/purchaseService', () => ({
  buySubscription: jest.fn().mockResolvedValue(undefined),
  handlePurchaseUpdate: jest.fn().mockResolvedValue({ valid: true, planType: 'monthly', expiresAt: '2027-01-01T00:00:00Z' }),
  handlePurchaseError: jest.fn().mockReturnValue({ isCancelled: false, message: 'Error' }),
  restorePurchases: jest.fn().mockResolvedValue(null), // default: no purchases found
}));

jest.mock('react-native-iap', () => ({}));

const { supabase } = jest.requireMock('@shared/services/supabase');
const purchaseService = jest.requireMock('@features/premium/services/purchaseService');

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
    usePremiumStore.setState({
      isPremium: false,
      isLoading: false,
      planType: null,
      expiresAt: null,
      purchaseInProgress: false,
      restoreInProgress: false,
      purchaseErrorMessage: null,
    });
    // Reset restorePurchases default mock
    purchaseService.restorePurchases.mockResolvedValue(null);
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
      supabase.from.mockReturnValue(buildSupabaseMock({ is_premium: true, premium_plan_type: 'monthly', premium_expires_at: '2027-01-01' }));

      await act(async () => {
        await usePremiumStore.getState().checkPremiumStatus();
      });

      expect(usePremiumStore.getState().isPremium).toBe(true);
      expect(usePremiumStore.getState().planType).toBe('monthly');
      expect(usePremiumStore.getState().isLoading).toBe(false);
    });

    it('sets isPremium to false when user_settings.is_premium is false', async () => {
      usePremiumStore.setState({ isPremium: true });
      supabase.from.mockReturnValue(buildSupabaseMock({ is_premium: false, premium_plan_type: null, premium_expires_at: null }));

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

    it('calls restorePurchases when premium is expired (instead of immediate downgrade)', async () => {
      usePremiumStore.setState({ isPremium: true });
      supabase.from.mockReturnValue(buildSupabaseMock({
        is_premium: true,
        premium_plan_type: 'monthly',
        premium_expires_at: '2020-01-01T00:00:00Z', // past date
      }));
      // Default mock returns null (no purchases)

      await act(async () => {
        await usePremiumStore.getState().checkPremiumStatus();
      });

      expect(purchaseService.restorePurchases).toHaveBeenCalled();
      expect(usePremiumStore.getState().isPremium).toBe(false);
      expect(usePremiumStore.getState().planType).toBeNull();
    });

    it('keeps premium with updated expiry when restore confirms valid subscription', async () => {
      usePremiumStore.setState({ isPremium: true });
      supabase.from.mockReturnValue(buildSupabaseMock({
        is_premium: true,
        premium_plan_type: 'monthly',
        premium_expires_at: '2020-01-01T00:00:00Z', // past date
      }));
      purchaseService.restorePurchases.mockResolvedValueOnce({
        valid: true,
        planType: 'monthly',
        expiresAt: '2027-06-01T00:00:00Z',
      });

      await act(async () => {
        await usePremiumStore.getState().checkPremiumStatus();
      });

      expect(usePremiumStore.getState().isPremium).toBe(true);
      expect(usePremiumStore.getState().planType).toBe('monthly');
      expect(usePremiumStore.getState().expiresAt).toBe('2027-06-01T00:00:00Z');
    });

    it('downgrades when restore throws an error during expiry check', async () => {
      usePremiumStore.setState({ isPremium: true });
      supabase.from.mockReturnValue(buildSupabaseMock({
        is_premium: true,
        premium_plan_type: 'yearly',
        premium_expires_at: '2020-01-01T00:00:00Z', // past date
      }));
      purchaseService.restorePurchases.mockRejectedValueOnce(new Error('Store error'));

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
      supabase.from.mockReturnValue(buildSupabaseMock({ is_premium: true, premium_plan_type: 'yearly', premium_expires_at: '2027-06-01' }));

      await act(async () => {
        await usePremiumStore.getState().refreshPremiumStatus();
      });

      expect(usePremiumStore.getState().isPremium).toBe(true);
    });
  });

  describe('purchaseSubscription', () => {
    it('sets purchaseInProgress and calls buySubscription', async () => {
      await act(async () => {
        await usePremiumStore.getState().purchaseSubscription('com.subtrack.premium.monthly');
      });

      expect(purchaseService.buySubscription).toHaveBeenCalledWith('com.subtrack.premium.monthly', undefined);
    });

    it('resets purchaseInProgress on error', async () => {
      purchaseService.buySubscription.mockRejectedValueOnce(new Error('fail'));

      await act(async () => {
        try {
          await usePremiumStore.getState().purchaseSubscription('sku');
        } catch {
          // expected
        }
      });

      expect(usePremiumStore.getState().purchaseInProgress).toBe(false);
    });
  });

  describe('handlePurchaseSuccess', () => {
    it('validates purchase and updates state on success', async () => {
      const purchase = { transactionReceipt: 'receipt' } as never;

      await act(async () => {
        await usePremiumStore.getState().handlePurchaseSuccess(purchase);
      });

      expect(usePremiumStore.getState().isPremium).toBe(true);
      expect(usePremiumStore.getState().planType).toBe('monthly');
      expect(usePremiumStore.getState().expiresAt).toBe('2027-01-01T00:00:00Z');
      expect(usePremiumStore.getState().purchaseInProgress).toBe(false);
    });

    it('resets purchaseInProgress on validation failure', async () => {
      purchaseService.handlePurchaseUpdate.mockResolvedValueOnce({ valid: false });
      usePremiumStore.setState({ purchaseInProgress: true });

      await act(async () => {
        await usePremiumStore.getState().handlePurchaseSuccess({} as never);
      });

      expect(usePremiumStore.getState().isPremium).toBe(false);
      expect(usePremiumStore.getState().purchaseInProgress).toBe(false);
    });
  });

  describe('handlePurchaseFailure', () => {
    it('resets purchaseInProgress, sets purchaseErrorMessage, and returns error info', () => {
      usePremiumStore.setState({ purchaseInProgress: true });

      const result = usePremiumStore.getState().handlePurchaseFailure({ code: 'E_UNKNOWN' } as never);

      expect(usePremiumStore.getState().purchaseInProgress).toBe(false);
      expect(usePremiumStore.getState().purchaseErrorMessage).toBe('Error');
      expect(result).toEqual({ isCancelled: false, message: 'Error' });
    });
  });

  describe('restorePurchases', () => {
    it('sets restoreInProgress to true then false on success', async () => {
      purchaseService.restorePurchases.mockResolvedValueOnce({
        valid: true,
        planType: 'yearly',
        expiresAt: '2027-01-01T00:00:00Z',
      });

      await act(async () => {
        await usePremiumStore.getState().restorePurchases();
      });

      expect(usePremiumStore.getState().restoreInProgress).toBe(false);
    });

    it('returns "success" and updates premium state when valid purchase is found', async () => {
      purchaseService.restorePurchases.mockResolvedValueOnce({
        valid: true,
        planType: 'yearly',
        expiresAt: '2027-01-01T00:00:00Z',
      });

      let result: string | undefined;
      await act(async () => {
        result = await usePremiumStore.getState().restorePurchases();
      });

      expect(result).toBe('success');
      expect(usePremiumStore.getState().isPremium).toBe(true);
      expect(usePremiumStore.getState().planType).toBe('yearly');
      expect(usePremiumStore.getState().expiresAt).toBe('2027-01-01T00:00:00Z');
      expect(usePremiumStore.getState().restoreInProgress).toBe(false);
    });

    it('returns "no_purchases" when service returns null', async () => {
      purchaseService.restorePurchases.mockResolvedValueOnce(null);

      let result: string | undefined;
      await act(async () => {
        result = await usePremiumStore.getState().restorePurchases();
      });

      expect(result).toBe('no_purchases');
      expect(usePremiumStore.getState().isPremium).toBe(false);
      expect(usePremiumStore.getState().restoreInProgress).toBe(false);
    });

    it('returns "no_purchases" when service returns invalid result', async () => {
      purchaseService.restorePurchases.mockResolvedValueOnce({ valid: false });

      let result: string | undefined;
      await act(async () => {
        result = await usePremiumStore.getState().restorePurchases();
      });

      expect(result).toBe('no_purchases');
      expect(usePremiumStore.getState().restoreInProgress).toBe(false);
    });

    it('returns "error" and sets purchaseErrorMessage when service throws', async () => {
      purchaseService.restorePurchases.mockRejectedValueOnce(new Error('Store unavailable'));

      let result: string | undefined;
      await act(async () => {
        result = await usePremiumStore.getState().restorePurchases();
      });

      expect(result).toBe('error');
      expect(usePremiumStore.getState().restoreInProgress).toBe(false);
      expect(usePremiumStore.getState().purchaseErrorMessage).toBe('Store unavailable');
    });

    it('resets restoreInProgress on error', async () => {
      purchaseService.restorePurchases.mockRejectedValueOnce(new Error('fail'));
      usePremiumStore.setState({ restoreInProgress: true });

      await act(async () => {
        await usePremiumStore.getState().restorePurchases();
      });

      expect(usePremiumStore.getState().restoreInProgress).toBe(false);
    });
  });

  describe('clearPurchaseError', () => {
    it('clears purchaseErrorMessage', () => {
      usePremiumStore.setState({ purchaseErrorMessage: 'Some error' });

      usePremiumStore.getState().clearPurchaseError();

      expect(usePremiumStore.getState().purchaseErrorMessage).toBeNull();
    });
  });
});
