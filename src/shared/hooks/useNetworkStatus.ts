import { useNetInfo } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const netInfo = useNetInfo();
  // Treat null (initial/unknown) as connected to avoid false offline banners on app start
  const isOnline = netInfo.isConnected !== false && netInfo.isInternetReachable !== false;
  return { isOnline, netInfo };
}
