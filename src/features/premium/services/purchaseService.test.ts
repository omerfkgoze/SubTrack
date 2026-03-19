import { Platform } from 'react-native';

// The global mock at __mocks__/react-native-iap.js is used automatically
// We access the mocks via jest.requireMock

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { valid: true, expiresAt: '2027-01-01T00:00:00Z' }, error: null }),
    },
  },
}));

jest.mock('@shared/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn().mockReturnValue({ user: { id: 'user-1' } }),
  },
}));

import * as iap from 'react-native-iap';

import {
  initIAP,
  fetchSubscriptions,
  buySubscription,
  handlePurchaseUpdate,
  handlePurchaseError,
  restorePurchases,
  cleanupIAP,
} from './purchaseService';

describe('purchaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set default mocks
    iap.initConnection.mockResolvedValue(true);
    iap.getSubscriptions.mockResolvedValue([]);
    iap.getAvailablePurchases.mockResolvedValue([]);
    iap.requestPurchase.mockResolvedValue(undefined);
    iap.finishTransaction.mockResolvedValue(undefined);
    iap.purchaseUpdatedListener.mockReturnValue({ remove: jest.fn() });
    iap.purchaseErrorListener.mockReturnValue({ remove: jest.fn() });
  });

  describe('initIAP', () => {
    it('calls initConnection and sets up listeners', async () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      await initIAP(onUpdate, onError);

      expect(iap.initConnection).toHaveBeenCalled();
      expect(iap.purchaseUpdatedListener).toHaveBeenCalledWith(onUpdate);
      expect(iap.purchaseErrorListener).toHaveBeenCalledWith(onError);
    });
  });

  describe('fetchSubscriptions', () => {
    it('calls getSubscriptions with correct SKUs', async () => {
      iap.getSubscriptions.mockResolvedValue([{ productId: 'com.subtrack.premium.monthly' }]);

      const result = await fetchSubscriptions();

      expect(iap.getSubscriptions).toHaveBeenCalledWith({
        skus: ['com.subtrack.premium.monthly', 'com.subtrack.premium.yearly'],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('buySubscription', () => {
    it('calls requestPurchase with sku on iOS', async () => {
      Platform.OS = 'ios';
      await buySubscription('com.subtrack.premium.monthly');

      expect(iap.requestPurchase).toHaveBeenCalledWith({
        sku: 'com.subtrack.premium.monthly',
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
    });

    it('calls requestPurchase with skus and subscriptionOffers on Android', async () => {
      Platform.OS = 'android';
      await buySubscription('com.subtrack.premium.monthly', 'offer-token-123');

      expect(iap.requestPurchase).toHaveBeenCalledWith({
        skus: ['com.subtrack.premium.monthly'],
        subscriptionOffers: [{ sku: 'com.subtrack.premium.monthly', offerToken: 'offer-token-123' }],
      });
    });

    it('throws error on Android without offerToken', async () => {
      Platform.OS = 'android';
      await expect(buySubscription('com.subtrack.premium.monthly')).rejects.toThrow(
        'offerToken is required for Android subscription purchases',
      );
    });
  });

  describe('handlePurchaseUpdate', () => {
    it('validates receipt and finishes transaction', async () => {
      const purchase = {
        transactionReceipt: 'receipt-data',
        purchaseToken: 'token-data',
      } as never;

      Platform.OS = 'ios';
      const result = await handlePurchaseUpdate(purchase);

      expect(result).toEqual({ valid: true, expiresAt: '2027-01-01T00:00:00Z' });
      expect(iap.finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
    });

    it('throws when user not authenticated', async () => {
      const { useAuthStore } = jest.requireMock('@shared/stores/useAuthStore');
      useAuthStore.getState.mockReturnValueOnce({ user: null });

      await expect(handlePurchaseUpdate({} as never)).rejects.toThrow('User not authenticated');
    });
  });

  describe('handlePurchaseError', () => {
    it('returns cancelled status for user cancellation', () => {
      const result = handlePurchaseError({ code: 'E_USER_CANCELLED' } as never);
      expect(result.isCancelled).toBe(true);
      expect(result.message).toContain("wasn't completed");
    });

    it('returns error status for other errors', () => {
      const result = handlePurchaseError({ code: 'E_UNKNOWN' } as never);
      expect(result.isCancelled).toBe(false);
      expect(result.message).toContain('went wrong');
    });
  });

  describe('restorePurchases', () => {
    const { supabase } = jest.requireMock('@shared/services/supabase');

    it('returns null when no purchases are available', async () => {
      iap.getAvailablePurchases.mockResolvedValue([]);

      const result = await restorePurchases();

      expect(result).toBeNull();
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('returns null when no purchases match SubTrack SKUs', async () => {
      iap.getAvailablePurchases.mockResolvedValue([
        { productId: 'com.other.app.subscription', transactionReceipt: 'receipt', transactionDate: 1000 },
      ]);

      const result = await restorePurchases();

      expect(result).toBeNull();
    });

    it('validates most recent purchase and returns server result on iOS', async () => {
      Platform.OS = 'ios';
      iap.getAvailablePurchases.mockResolvedValue([
        { productId: 'com.subtrack.premium.monthly', transactionReceipt: 'old-receipt', transactionDate: 1000 },
        { productId: 'com.subtrack.premium.yearly', transactionReceipt: 'new-receipt', transactionDate: 2000 },
      ]);
      supabase.functions.invoke.mockResolvedValueOnce({
        data: { valid: true, expiresAt: '2027-01-01T00:00:00Z', planType: 'yearly' },
        error: null,
      });

      const result = await restorePurchases();

      expect(iap.getAvailablePurchases).toHaveBeenCalled();
      expect(supabase.functions.invoke).toHaveBeenCalledWith('validate-premium', {
        body: { platform: 'ios', receipt: 'new-receipt', userId: 'user-1' },
      });
      expect(result).toEqual({ valid: true, expiresAt: '2027-01-01T00:00:00Z', planType: 'yearly' });
      expect(iap.finishTransaction).not.toHaveBeenCalled();
    });

    it('validates purchase using purchaseToken on Android', async () => {
      Platform.OS = 'android';
      iap.getAvailablePurchases.mockResolvedValue([
        { productId: 'com.subtrack.premium.monthly', purchaseToken: 'android-token', transactionDate: 1000 },
      ]);
      supabase.functions.invoke.mockResolvedValueOnce({
        data: { valid: true, expiresAt: '2027-06-01T00:00:00Z', planType: 'monthly' },
        error: null,
      });

      const result = await restorePurchases();

      expect(supabase.functions.invoke).toHaveBeenCalledWith('validate-premium', {
        body: { platform: 'android', receipt: 'android-token', userId: 'user-1' },
      });
      expect(result).toEqual({ valid: true, expiresAt: '2027-06-01T00:00:00Z', planType: 'monthly' });
    });

    it('returns null when purchase has no receipt', async () => {
      Platform.OS = 'ios';
      iap.getAvailablePurchases.mockResolvedValue([
        { productId: 'com.subtrack.premium.monthly', transactionDate: 1000 },
      ]);

      const result = await restorePurchases();

      expect(result).toBeNull();
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws when edge function returns error', async () => {
      Platform.OS = 'ios';
      iap.getAvailablePurchases.mockResolvedValue([
        { productId: 'com.subtrack.premium.monthly', transactionReceipt: 'receipt', transactionDate: 1000 },
      ]);
      supabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      });

      await expect(restorePurchases()).rejects.toThrow('Network error');
    });

    it('throws when user not authenticated', async () => {
      const { useAuthStore } = jest.requireMock('@shared/stores/useAuthStore');
      useAuthStore.getState.mockReturnValueOnce({ user: null });

      await expect(restorePurchases()).rejects.toThrow('User not authenticated');
    });
  });

  describe('cleanupIAP', () => {
    it('removes listeners and ends connection', async () => {
      const removeUpdate = jest.fn();
      const removeError = jest.fn();
      iap.purchaseUpdatedListener.mockReturnValue({ remove: removeUpdate });
      iap.purchaseErrorListener.mockReturnValue({ remove: removeError });

      await initIAP(jest.fn(), jest.fn());
      cleanupIAP();

      expect(removeUpdate).toHaveBeenCalled();
      expect(removeError).toHaveBeenCalled();
      expect(iap.endConnection).toHaveBeenCalled();
    });
  });
});
