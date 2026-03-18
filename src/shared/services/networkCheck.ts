import NetInfo from '@react-native-community/netinfo';
import type { AppError } from '@features/subscriptions/types';

export async function checkConnectivity(): Promise<{ error: AppError | null }> {
  const state = await NetInfo.fetch();
  if (state.isConnected === false) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: 'No internet connection. Please check your connection and try again.',
      },
    };
  }
  return { error: null };
}
