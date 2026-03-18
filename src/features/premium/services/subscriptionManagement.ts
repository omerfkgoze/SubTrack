import { Linking, Platform } from 'react-native';

const SUBSCRIPTION_MANAGEMENT_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

export async function openSubscriptionManagement(): Promise<void> {
  const canOpen = await Linking.canOpenURL(SUBSCRIPTION_MANAGEMENT_URL);
  if (!canOpen) {
    throw new Error('Cannot open subscription management URL');
  }
  await Linking.openURL(SUBSCRIPTION_MANAGEMENT_URL);
}
