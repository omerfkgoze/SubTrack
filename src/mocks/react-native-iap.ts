// Metro-level mock for react-native-iap when running in Expo Go.
// react-native-iap v14+ uses react-native-nitro-modules which crashes on Expo Go load.
// Activated via EXPO_PUBLIC_MOCK_IAP=true (set automatically by npm start / start:local).

export const initConnection = async (): Promise<boolean> => true;
export const endConnection = async (): Promise<void> => {};
export const getSubscriptions = async (_params: unknown): Promise<never[]> => [];
export const getAvailablePurchases = async (): Promise<never[]> => [];
export const requestPurchase = async (_request: unknown): Promise<void> => {};
export const finishTransaction = async (_params: unknown): Promise<void> => {};
export const purchaseUpdatedListener = (_handler: unknown): { remove: () => void } => ({
  remove: () => {},
});
export const purchaseErrorListener = (_handler: unknown): { remove: () => void } => ({
  remove: () => {},
});

export type ProductPurchase = Record<string, unknown>;
export type PurchaseError = { code: string; message: string };
export type SubscriptionPurchase = Record<string, unknown>;
export type Subscription = Record<string, unknown>;
