import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type ProductPurchase,
  type PurchaseError,
  type SubscriptionPurchase,
  type Subscription,
} from 'react-native-iap';
import { ALL_SKUS } from '@features/premium/config/iapProducts';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';

type PurchaseUpdateHandler = (purchase: ProductPurchase | SubscriptionPurchase) => void;
type PurchaseErrorHandler = (error: PurchaseError) => void;

let purchaseUpdateSubscription: { remove: () => void } | null = null;
let purchaseErrorSubscription: { remove: () => void } | null = null;

export async function initIAP(
  onPurchaseUpdate: PurchaseUpdateHandler,
  onPurchaseError: PurchaseErrorHandler,
): Promise<void> {
  await initConnection();

  purchaseUpdateSubscription = purchaseUpdatedListener(onPurchaseUpdate);
  purchaseErrorSubscription = purchaseErrorListener(onPurchaseError);
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const subscriptions = await getSubscriptions({ skus: [...ALL_SKUS] });
  return subscriptions;
}

export async function buySubscription(sku: string, offerToken?: string): Promise<void> {
  if (Platform.OS === 'ios') {
    await requestPurchase({ sku, andDangerouslyFinishTransactionAutomaticallyIOS: false });
  } else {
    if (!offerToken) {
      throw new Error('offerToken is required for Android subscription purchases');
    }
    await requestPurchase({
      skus: [sku],
      subscriptionOffers: [{ sku, offerToken }],
    });
  }
}

export async function handlePurchaseUpdate(
  purchase: ProductPurchase | SubscriptionPurchase,
): Promise<{ valid: boolean; expiresAt?: string; planType?: string; error?: string }> {
  const user = useAuthStore.getState().user;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const receipt = Platform.OS === 'ios' ? purchase.transactionReceipt : purchase.purchaseToken;

  if (!receipt) {
    throw new Error('No receipt found in purchase');
  }

  const { data, error } = await supabase.functions.invoke('validate-premium', {
    body: {
      platform: Platform.OS as 'ios' | 'android',
      receipt,
      userId: user.id,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to validate purchase');
  }

  await finishTransaction({ purchase, isConsumable: false });

  return data as { valid: boolean; expiresAt?: string; planType?: string; error?: string };
}

export function handlePurchaseError(error: PurchaseError): {
  isCancelled: boolean;
  message: string;
} {
  // User cancelled — error code E_USER_CANCELLED
  if (error.code === 'E_USER_CANCELLED') {
    return {
      isCancelled: true,
      message: "Purchase wasn't completed. You can try again anytime.",
    };
  }

  return {
    isCancelled: false,
    message: 'Something went wrong with your purchase. Please try again.',
  };
}

export function cleanupIAP(): void {
  purchaseUpdateSubscription?.remove();
  purchaseErrorSubscription?.remove();
  purchaseUpdateSubscription = null;
  purchaseErrorSubscription = null;
  endConnection();
}
