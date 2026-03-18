import { renderHook } from '@testing-library/react-native';

const mockUseNetInfo = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  ...jest.requireActual('@react-native-community/netinfo'),
  useNetInfo: (...args: unknown[]) => mockUseNetInfo(...args),
}));

import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isOnline true when connected and internet reachable', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('returns isOnline false when disconnected', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it('returns isOnline true when isInternetReachable is null (initial state)', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: null });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('returns isOnline true when isConnected is null (initial state)', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: null, isInternetReachable: null });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('returns isOnline false when connected but internet not reachable', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
  });
});
