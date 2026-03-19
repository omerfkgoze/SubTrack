import { useEffect } from 'react';
import { initIAP, cleanupIAP } from '@features/premium/services/purchaseService';
import { usePremiumStore } from '@shared/stores/usePremiumStore';

export function useIAPSetup() {
  useEffect(() => {
    initIAP(
      (purchase) => {
        usePremiumStore.getState().handlePurchaseSuccess(purchase);
      },
      (error) => {
        usePremiumStore.getState().handlePurchaseFailure(error);
      },
    ).catch(() => {
      // IAP init can fail in simulators/test environments — non-blocking
    });

    return () => {
      cleanupIAP();
    };
  }, []);
}
