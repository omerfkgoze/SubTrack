import { act } from '@testing-library/react-native';
import { useBankStore } from './useBankStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

jest.mock('@shared/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn().mockReturnValue({ user: { id: 'user-1' } }),
  },
}));

const { supabase } = jest.requireMock('@shared/services/supabase');

function buildSupabaseMock(data: unknown, error: unknown = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  };
}

const mockConnection = {
  id: 'conn-1',
  user_id: 'user-1',
  provider: 'tink',
  bank_name: 'Demo Bank',
  status: 'active',
  connected_at: '2026-03-21T12:00:00Z',
  consent_granted_at: '2026-03-21T12:00:00Z',
  consent_expires_at: '2026-09-17T12:00:00Z',
  last_synced_at: null,
  tink_credentials_id: 'cred-123',
};

describe('useBankStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBankStore.setState({
      connections: [],
      isConnecting: false,
      isFetchingConnections: false,
      connectionError: null,
      supportedBanks: [],
      isFetchingBanks: false,
      fetchBanksError: null,
      detectedSubscriptions: [],
      isDetecting: false,
      isFetchingDetected: false,
      detectionError: null,
      lastDetectionResult: null,
    });
  });

  describe('initial state', () => {
    it('has empty connections array', () => {
      const { connections } = useBankStore.getState();
      expect(connections).toEqual([]);
    });

    it('has isConnecting as false', () => {
      const { isConnecting } = useBankStore.getState();
      expect(isConnecting).toBe(false);
    });

    it('has connectionError as null', () => {
      const { connectionError } = useBankStore.getState();
      expect(connectionError).toBeNull();
    });
  });

  describe('fetchConnections', () => {
    it('fetches connections successfully', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [mockConnection], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchConnections();
      });

      const { connections, isConnecting, isFetchingConnections } = useBankStore.getState();
      expect(connections).toHaveLength(1);
      expect(connections[0].id).toBe('conn-1');
      expect(connections[0].bankName).toBe('Demo Bank');
      expect(connections[0].status).toBe('active');
      expect(isConnecting).toBe(false);
      expect(isFetchingConnections).toBe(false);
    });

    it('handles empty connections list', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchConnections();
      });

      const { connections, isConnecting, isFetchingConnections } = useBankStore.getState();
      expect(connections).toEqual([]);
      expect(isConnecting).toBe(false);
      expect(isFetchingConnections).toBe(false);
    });

    it('sets error on fetch failure', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

      await act(async () => {
        await useBankStore.getState().fetchConnections();
      });

      const { connectionError, isConnecting, isFetchingConnections } = useBankStore.getState();
      expect(connectionError).toEqual({
        code: 'FETCH_FAILED',
        message: 'Failed to load bank connections',
      });
      expect(isConnecting).toBe(false);
      expect(isFetchingConnections).toBe(false);
    });
  });

  describe('initiateConnection', () => {
    it('calls tink-connect Edge Function and updates state on success', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { success: true, connection: mockConnection },
        error: null,
      });

      await act(async () => {
        await useBankStore.getState().initiateConnection('test-auth-code');
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('tink-connect', {
        body: {
          authorizationCode: 'test-auth-code',
          userId: 'user-1',
        },
      });

      const { connections, isConnecting, connectionError } = useBankStore.getState();
      expect(connections).toHaveLength(1);
      expect(connections[0].bankName).toBe('Demo Bank');
      expect(isConnecting).toBe(false);
      expect(connectionError).toBeNull();
    });

    it('sets error on Edge Function failure', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      });

      await act(async () => {
        await useBankStore.getState().initiateConnection('bad-auth-code');
      });

      const { connections, isConnecting, connectionError } = useBankStore.getState();
      expect(connections).toEqual([]);
      expect(isConnecting).toBe(false);
      expect(connectionError?.code).toBe('CONNECTION_FAILED');
      expect(connectionError?.message).toBeTruthy();
    });

    it('clears partial state on failure', async () => {
      // Pre-set some state
      useBankStore.setState({ isConnecting: true });

      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      await act(async () => {
        await useBankStore.getState().initiateConnection('test-code');
      });

      const { isConnecting, connections } = useBankStore.getState();
      expect(isConnecting).toBe(false);
      expect(connections).toEqual([]);
    });
  });

  describe('fetchSupportedBanks', () => {
    const mockProviders = [
      { id: 'bank-1', displayName: 'Test Bank', market: 'SE', iconUrl: 'https://cdn.tink.se/icon.png', popular: true, rank: 1 },
      { id: 'bank-2', displayName: 'Another Bank', market: 'DE', iconUrl: null, popular: false, rank: 5 },
    ];

    it('fetches supported banks successfully', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { providers: mockProviders },
        error: null,
      });

      await act(async () => {
        await useBankStore.getState().fetchSupportedBanks();
      });

      const { supportedBanks, isFetchingBanks, fetchBanksError } = useBankStore.getState();
      expect(supportedBanks).toHaveLength(2);
      expect(supportedBanks[0].displayName).toBe('Test Bank');
      expect(isFetchingBanks).toBe(false);
      expect(fetchBanksError).toBeNull();
    });

    it('calls tink-providers with market param', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { providers: [] },
        error: null,
      });

      await act(async () => {
        await useBankStore.getState().fetchSupportedBanks('SE');
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('tink-providers', {
        body: { market: 'SE' },
      });
    });

    it('sets error on failure', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      });

      await act(async () => {
        await useBankStore.getState().fetchSupportedBanks();
      });

      const { supportedBanks, isFetchingBanks, fetchBanksError } = useBankStore.getState();
      expect(supportedBanks).toEqual([]);
      expect(isFetchingBanks).toBe(false);
      expect(fetchBanksError?.code).toBe('FETCH_BANKS_FAILED');
    });

    it('does NOT persist supportedBanks to storage', () => {
      useBankStore.setState({
        connections: [{ id: 'c1', userId: 'u1', provider: 'tink', bankName: '', status: 'active', connectedAt: '', consentGrantedAt: '', consentExpiresAt: '', lastSyncedAt: null, tinkCredentialsId: '' }],
        supportedBanks: mockProviders,
      });

      // partialize should only include connections
      const store = useBankStore as unknown as { persist: { getOptions: () => { partialize: (s: Record<string, unknown>) => Record<string, unknown> } } };
      const partialize = store.persist.getOptions().partialize;
      const persisted = partialize(useBankStore.getState());
      expect(persisted).toHaveProperty('connections');
      expect(persisted).not.toHaveProperty('supportedBanks');
    });
  });

  describe('clearConnectionError', () => {
    it('clears the connection error', () => {
      useBankStore.setState({
        connectionError: { code: 'TEST', message: 'Test error' },
      });

      useBankStore.getState().clearConnectionError();

      expect(useBankStore.getState().connectionError).toBeNull();
    });
  });

  describe('detectSubscriptions', () => {
    it('calls tink-detect-subscriptions Edge Function and stores result on success', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { success: true, detectedCount: 3, newCount: 2 },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().detectSubscriptions('conn-1');
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('tink-detect-subscriptions', {
        body: { connectionId: 'conn-1' },
      });

      const { lastDetectionResult, isDetecting, detectionError } = useBankStore.getState();
      expect(lastDetectionResult).toEqual({ success: true, detectedCount: 3, newCount: 2 });
      expect(isDetecting).toBe(false);
      expect(detectionError).toBeNull();
    });

    it('fetches detected subscriptions after successful detection', async () => {
      const mockDetected = [{
        id: 'det-1',
        user_id: 'user-1',
        bank_connection_id: 'conn-1',
        tink_group_id: 'group-1',
        merchant_name: 'Netflix',
        amount: 12.99,
        currency: 'EUR',
        frequency: 'monthly',
        confidence_score: 0.9,
        status: 'detected',
        first_seen: '2025-09-15',
        last_seen: '2026-02-15',
      }];

      supabase.functions.invoke.mockResolvedValue({
        data: { success: true, detectedCount: 1, newCount: 1 },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockDetected, error: null }),
      });

      await act(async () => {
        await useBankStore.getState().detectSubscriptions('conn-1');
      });

      const { detectedSubscriptions } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(1);
      expect(detectedSubscriptions[0].merchantName).toBe('Netflix');
      expect(detectedSubscriptions[0].confidenceScore).toBe(0.9);
    });

    it('sets detectionError on Edge Function failure', async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      });

      await act(async () => {
        await useBankStore.getState().detectSubscriptions('conn-1');
      });

      const { detectionError, isDetecting, lastDetectionResult } = useBankStore.getState();
      expect(detectionError).not.toBeNull();
      expect(detectionError?.code).toBe('DETECTION_FAILED');
      expect(isDetecting).toBe(false);
      expect(lastDetectionResult).toBeNull();
    });

    it('updates local connection status to expired on TOKEN_REFRESH_FAILED', async () => {
      // Pre-set an active connection
      useBankStore.setState({
        connections: [{
          id: 'conn-1', userId: 'user-1', provider: 'tink', bankName: 'Demo Bank',
          status: 'active', connectedAt: '2026-03-21T12:00:00Z',
          consentGrantedAt: '2026-03-21T12:00:00Z', consentExpiresAt: '2026-09-17T12:00:00Z',
          lastSyncedAt: null, tinkCredentialsId: 'cred-1',
        }],
      });

      const mockContextJson = jest.fn().mockResolvedValue({ error: 'TOKEN_REFRESH_FAILED' });
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Token refresh failed',
          context: { json: mockContextJson },
        },
      });

      await act(async () => {
        await useBankStore.getState().detectSubscriptions('conn-1');
      });

      const { connections, detectionError } = useBankStore.getState();
      expect(connections[0].status).toBe('expired');
      expect(detectionError?.code).toBe('TOKEN_REFRESH_FAILED');
      expect(detectionError?.message).toContain('expired');
    });

    it('sets NETWORK_ERROR on exception', async () => {
      supabase.functions.invoke.mockRejectedValue(new Error('Network down'));

      await act(async () => {
        await useBankStore.getState().detectSubscriptions('conn-1');
      });

      const { detectionError, isDetecting } = useBankStore.getState();
      expect(detectionError?.code).toBe('NETWORK_ERROR');
      expect(isDetecting).toBe(false);
    });
  });

  describe('fetchDetectedSubscriptions', () => {
    it('fetches and maps detected subscriptions from DB', async () => {
      const mockRows = [
        {
          id: 'det-1',
          user_id: 'user-1',
          bank_connection_id: 'conn-1',
          tink_group_id: 'group-1',
          merchant_name: 'Netflix',
          amount: 12.99,
          currency: 'EUR',
          frequency: 'monthly',
          confidence_score: 0.9,
          status: 'detected',
          first_seen: '2025-09-15',
          last_seen: '2026-02-15',
        },
        {
          id: 'det-2',
          user_id: 'user-1',
          bank_connection_id: 'conn-1',
          tink_group_id: 'group-2',
          merchant_name: 'Spotify',
          amount: 9.99,
          currency: 'EUR',
          frequency: 'monthly',
          confidence_score: 0.75,
          status: 'detected',
          first_seen: '2025-10-01',
          last_seen: '2026-03-01',
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockRows, error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDetectedSubscriptions();
      });

      const { detectedSubscriptions, isFetchingDetected } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(2);
      expect(detectedSubscriptions[0].merchantName).toBe('Netflix');
      expect(detectedSubscriptions[1].merchantName).toBe('Spotify');
      expect(detectedSubscriptions[0].confidenceScore).toBe(0.9);
      expect(isFetchingDetected).toBe(false);
    });

    it('handles empty detected subscriptions', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDetectedSubscriptions();
      });

      const { detectedSubscriptions } = useBankStore.getState();
      expect(detectedSubscriptions).toEqual([]);
    });

    it('does NOT persist detectedSubscriptions to storage', () => {
      useBankStore.setState({
        connections: [{ id: 'c1', userId: 'u1', provider: 'tink', bankName: '', status: 'active', connectedAt: '', consentGrantedAt: '', consentExpiresAt: '', lastSyncedAt: null, tinkCredentialsId: '' }],
        detectedSubscriptions: [{ id: 'det-1', userId: 'u1', bankConnectionId: 'c1', tinkGroupId: 'g1', merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly', confidenceScore: 0.9, status: 'detected', firstSeen: '2025-09-15', lastSeen: '2026-02-15' }],
        lastDetectionResult: { success: true, detectedCount: 1, newCount: 1 },
      });

      const store = useBankStore as unknown as { persist: { getOptions: () => { partialize: (s: Record<string, unknown>) => Record<string, unknown> } } };
      const partialize = store.persist.getOptions().partialize;
      const persisted = partialize(useBankStore.getState());
      expect(persisted).toHaveProperty('connections');
      expect(persisted).not.toHaveProperty('detectedSubscriptions');
      expect(persisted).not.toHaveProperty('lastDetectionResult');
    });
  });
});
