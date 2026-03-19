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
  cleanupIAP,
} from './purchaseService';

describe('purchaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set default mocks
    iap.initConnection.mockResolvedValue(true);
    iap.getSubscriptions.mockResolvedValue([]);
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
