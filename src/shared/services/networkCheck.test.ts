const mockFetch = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockFetch(...args),
  },
}));

import { checkConnectivity } from './networkCheck';

describe('checkConnectivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no error when connected', async () => {
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    const result = await checkConnectivity();
    expect(result.error).toBeNull();
  });

  it('returns NETWORK_ERROR when disconnected', async () => {
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const result = await checkConnectivity();
    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toContain('No internet connection');
  });

  it('returns no error when isConnected is null (initial state)', async () => {
    mockFetch.mockResolvedValue({ isConnected: null, isInternetReachable: null });
    const result = await checkConnectivity();
    expect(result.error).toBeNull();
  });
});
