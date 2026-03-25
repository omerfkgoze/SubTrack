import { act } from '@testing-library/react-native';
import { useBankStore } from './useBankStore';
import type { MatchResult } from './useBankStore';

jest.mock('@config/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
    TINK_CLIENT_ID: 'test-tink-client-id',
    DEMO_BANK_MODE: false,
  },
}));

jest.mock('@features/bank/mocks/mockBankData', () => ({
  MOCK_CONNECTION: {},
  MOCK_DETECTED_SUBSCRIPTIONS: [],
  MOCK_SUPPORTED_BANKS: [],
  MOCK_DETECTION_RESULT: { success: true, detectedCount: 0, newCount: 0 },
  mockDelay: jest.fn().mockResolvedValue(undefined),
}));

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

const mockUpdateSubscription = jest.fn().mockResolvedValue(true);
const mockFetchSubscriptions = jest.fn().mockResolvedValue(undefined);

jest.mock('@shared/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: {
    getState: jest.fn(() => ({
      subscriptions: [],
      updateSubscription: mockUpdateSubscription,
      fetchSubscriptions: mockFetchSubscriptions,
    })),
  },
}));

jest.mock('@features/bank/utils/matchingUtils', () => ({
  findMatches: jest.fn().mockReturnValue(new Map()),
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
      matchResults: new Map(),
      isMatching: false,
      dismissedMerchants: [],
      isFetchingDismissed: false,
      dismissedItems: [],
      isFetchingDismissedItems: false,
    });
    mockUpdateSubscription.mockResolvedValue(true);
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
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
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
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockDetected, error: null }),
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
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockRows, error: null }),
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
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
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

    it('fetchDetectedSubscriptions filters by status detected', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDetectedSubscriptions();
      });

      const fromCall = supabase.from.mock.calls[0];
      expect(fromCall[0]).toBe('detected_subscriptions');
    });
  });

  describe('approveDetectedSubscription', () => {
    const mockDetected = {
      id: 'det-1', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g1',
      merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly' as const,
      confidenceScore: 0.9, status: 'detected' as const, firstSeen: '2025-09-15', lastSeen: '2026-02-15',
    };

    beforeEach(() => {
      useBankStore.setState({ detectedSubscriptions: [mockDetected] });
    });

    it('updates DB status to approved and removes item from local array', async () => {
      const mockEq = jest.fn();
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: null });
      supabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: mockEq }) });

      await act(async () => {
        await useBankStore.getState().approveDetectedSubscription('det-1');
      });

      const { detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(0);
      expect(detectionError).toBeNull();
    });

    it('sets NETWORK_ERROR on approve exception', async () => {
      supabase.from.mockImplementation(() => { throw new Error('Network down'); });

      await act(async () => {
        await useBankStore.getState().approveDetectedSubscription('det-1');
      });

      const { detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(1);
      expect(detectionError?.code).toBe('NETWORK_ERROR');
    });

    it('sets error on approve failure', async () => {
      const mockEq = jest.fn();
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } });
      supabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: mockEq }) });

      await act(async () => {
        await useBankStore.getState().approveDetectedSubscription('det-1');
      });

      const { detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(1); // not removed on error
      expect(detectionError?.code).toBe('APPROVE_FAILED');
    });
  });

  describe('dismissDetectedSubscription', () => {
    const mockDetected = {
      id: 'det-2', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g2',
      merchantName: 'Spotify', amount: 9.99, currency: 'EUR', frequency: 'monthly' as const,
      confidenceScore: 0.75, status: 'detected' as const, firstSeen: '2025-10-01', lastSeen: '2026-03-01',
    };

    const mockMerchantRow = {
      id: 'dm-1', user_id: 'user-1', merchant_name: 'Spotify', dismissed_at: '2026-03-25T00:00:00Z',
    };

    function buildDismissMock(updateError: unknown = null, merchantRow: unknown = mockMerchantRow, merchantError: unknown = null) {
      return jest.fn().mockImplementation((table: string) => {
        if (table === 'detected_subscriptions') {
          const mockEq = jest.fn();
          mockEq.mockReturnValueOnce({ eq: mockEq });
          mockEq.mockResolvedValueOnce({ error: updateError });
          return { update: jest.fn().mockReturnValue({ eq: mockEq }) };
        }
        // dismissed_merchants
        return {
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: merchantRow, error: merchantError }),
            }),
          }),
        };
      });
    }

    beforeEach(() => {
      useBankStore.setState({ detectedSubscriptions: [mockDetected] });
    });

    it('updates DB status to dismissed and removes item from local array', async () => {
      supabase.from.mockImplementation(buildDismissMock());

      await act(async () => {
        await useBankStore.getState().dismissDetectedSubscription('det-2');
      });

      const { detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(0);
      expect(detectionError).toBeNull();
    });

    it('adds merchant to dismissedMerchants on successful dismiss', async () => {
      supabase.from.mockImplementation(buildDismissMock());

      await act(async () => {
        await useBankStore.getState().dismissDetectedSubscription('det-2');
      });

      const { dismissedMerchants } = useBankStore.getState();
      expect(dismissedMerchants).toHaveLength(1);
      expect(dismissedMerchants[0].merchantName).toBe('Spotify');
    });

    it('still removes item from detectedSubscriptions even when merchant upsert fails', async () => {
      supabase.from.mockImplementation(buildDismissMock(null, null, { message: 'Upsert failed' }));

      await act(async () => {
        await useBankStore.getState().dismissDetectedSubscription('det-2');
      });

      const { detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(0);
      expect(detectionError).toBeNull();
    });

    it('sets NETWORK_ERROR on dismiss exception', async () => {
      supabase.from.mockImplementation(() => { throw new Error('Network down'); });

      await act(async () => {
        await useBankStore.getState().dismissDetectedSubscription('det-2');
      });

      const { detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(1);
      expect(detectionError?.code).toBe('NETWORK_ERROR');
    });

    it('sets error on dismiss failure', async () => {
      supabase.from.mockImplementation(buildDismissMock({ message: 'DB error' }));

      await act(async () => {
        await useBankStore.getState().dismissDetectedSubscription('det-2');
      });

      const { detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(1);
      expect(detectionError?.code).toBe('DISMISS_FAILED');
    });

    it('clears detectionError at start', async () => {
      useBankStore.setState({ detectionError: { code: 'OLD_ERROR', message: 'old' } });
      supabase.from.mockImplementation(buildDismissMock());

      await act(async () => {
        await useBankStore.getState().dismissDetectedSubscription('det-2');
      });

      expect(useBankStore.getState().detectionError).toBeNull();
    });
  });

  describe('fetchDismissedMerchants', () => {
    const mockMerchantRows = [
      { id: 'dm-1', user_id: 'user-1', merchant_name: 'Spotify', dismissed_at: '2026-03-20T00:00:00Z' },
      { id: 'dm-2', user_id: 'user-1', merchant_name: 'Netflix', dismissed_at: '2026-03-15T00:00:00Z' },
    ];

    it('fetches dismissed merchants from DB', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockMerchantRows, error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedMerchants();
      });

      const { dismissedMerchants, isFetchingDismissed } = useBankStore.getState();
      expect(dismissedMerchants).toHaveLength(2);
      expect(dismissedMerchants[0].merchantName).toBe('Spotify');
      expect(dismissedMerchants[1].merchantName).toBe('Netflix');
      expect(isFetchingDismissed).toBe(false);
    });

    it('handles empty dismissed merchants', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedMerchants();
      });

      const { dismissedMerchants, isFetchingDismissed } = useBankStore.getState();
      expect(dismissedMerchants).toEqual([]);
      expect(isFetchingDismissed).toBe(false);
    });

    it('handles DB error gracefully', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedMerchants();
      });

      const { dismissedMerchants, isFetchingDismissed } = useBankStore.getState();
      expect(dismissedMerchants).toEqual([]);
      expect(isFetchingDismissed).toBe(false);
    });

    it('returns early without user', async () => {
      const { useAuthStore } = jest.requireMock('@shared/stores/useAuthStore');
      useAuthStore.getState.mockReturnValueOnce({ user: null });

      await act(async () => {
        await useBankStore.getState().fetchDismissedMerchants();
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('clears detectionError at start', async () => {
      useBankStore.setState({ detectionError: { code: 'OLD_ERROR', message: 'old' } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedMerchants();
      });

      expect(useBankStore.getState().detectionError).toBeNull();
    });
  });

  describe('fetchDismissedItems', () => {
    const mockDismissedRows = [
      {
        id: 'det-5', user_id: 'user-1', bank_connection_id: 'conn-1', tink_group_id: 'g5',
        merchant_name: 'Coffee Shop', amount: 4.50, currency: 'EUR', frequency: 'weekly',
        confidence_score: 0.55, status: 'dismissed', first_seen: '2026-01-01', last_seen: '2026-03-20',
      },
    ];

    it('fetches dismissed items from DB', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockDismissedRows, error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedItems();
      });

      const { dismissedItems, isFetchingDismissedItems } = useBankStore.getState();
      expect(dismissedItems).toHaveLength(1);
      expect(dismissedItems[0].merchantName).toBe('Coffee Shop');
      expect(dismissedItems[0].status).toBe('dismissed');
      expect(isFetchingDismissedItems).toBe(false);
    });

    it('handles empty dismissed items', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedItems();
      });

      expect(useBankStore.getState().dismissedItems).toEqual([]);
    });

    it('handles DB error gracefully', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedItems();
      });

      const { dismissedItems, isFetchingDismissedItems } = useBankStore.getState();
      expect(dismissedItems).toEqual([]);
      expect(isFetchingDismissedItems).toBe(false);
    });

    it('clears detectionError at start', async () => {
      useBankStore.setState({ detectionError: { code: 'OLD_ERROR', message: 'old' } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDismissedItems();
      });

      expect(useBankStore.getState().detectionError).toBeNull();
    });
  });

  describe('undismissDetectedSubscription', () => {
    const mockDismissedItem = {
      id: 'det-5', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g5',
      merchantName: 'Coffee Shop', amount: 4.50, currency: 'EUR', frequency: 'weekly' as const,
      confidenceScore: 0.55, status: 'dismissed' as const, firstSeen: '2026-01-01', lastSeen: '2026-03-20',
    };

    const mockDismissedMerchant = {
      id: 'dm-5', userId: 'user-1', merchantName: 'Coffee Shop', dismissedAt: '2026-03-20T00:00:00Z',
    };

    function buildUndismissMock(updateError: unknown = null, deleteError: unknown = null) {
      return jest.fn().mockImplementation((table: string) => {
        if (table === 'detected_subscriptions') {
          const mockEq = jest.fn();
          mockEq.mockReturnValueOnce({ eq: mockEq });
          mockEq.mockResolvedValueOnce({ error: updateError });
          return { update: jest.fn().mockReturnValue({ eq: mockEq }) };
        }
        // dismissed_merchants
        const mockEq = jest.fn();
        mockEq.mockReturnValueOnce({ eq: mockEq });
        mockEq.mockResolvedValueOnce({ error: deleteError });
        return { delete: jest.fn().mockReturnValue({ eq: mockEq }) };
      });
    }

    beforeEach(() => {
      useBankStore.setState({
        dismissedItems: [mockDismissedItem],
        dismissedMerchants: [mockDismissedMerchant],
      });
    });

    it('reverts status to detected in DB and moves item to detectedSubscriptions', async () => {
      supabase.from.mockImplementation(buildUndismissMock());

      await act(async () => {
        await useBankStore.getState().undismissDetectedSubscription('det-5');
      });

      const { dismissedItems, detectedSubscriptions, detectionError } = useBankStore.getState();
      expect(dismissedItems).toHaveLength(0);
      expect(detectedSubscriptions).toHaveLength(1);
      expect(detectedSubscriptions[0].status).toBe('detected');
      expect(detectionError).toBeNull();
    });

    it('removes merchant from dismissedMerchants on undismiss', async () => {
      supabase.from.mockImplementation(buildUndismissMock());

      await act(async () => {
        await useBankStore.getState().undismissDetectedSubscription('det-5');
      });

      expect(useBankStore.getState().dismissedMerchants).toHaveLength(0);
    });

    it('sets UNDISMISS_FAILED error when DB update fails', async () => {
      supabase.from.mockImplementation(buildUndismissMock({ message: 'DB error' }));

      await act(async () => {
        await useBankStore.getState().undismissDetectedSubscription('det-5');
      });

      const { dismissedItems, detectionError } = useBankStore.getState();
      expect(dismissedItems).toHaveLength(1); // not removed
      expect(detectionError?.code).toBe('UNDISMISS_FAILED');
    });

    it('sets NETWORK_ERROR on exception', async () => {
      supabase.from.mockImplementation(() => { throw new Error('Network down'); });

      await act(async () => {
        await useBankStore.getState().undismissDetectedSubscription('det-5');
      });

      expect(useBankStore.getState().detectionError?.code).toBe('NETWORK_ERROR');
    });

    it('clears detectionError at start', async () => {
      useBankStore.setState({ detectionError: { code: 'OLD_ERROR', message: 'old' } });
      supabase.from.mockImplementation(buildUndismissMock());

      await act(async () => {
        await useBankStore.getState().undismissDetectedSubscription('det-5');
      });

      expect(useBankStore.getState().detectionError).toBeNull();
    });
  });

  describe('fetchDetectedSubscriptions merchant filtering', () => {
    const mockRows = [
      {
        id: 'det-1', user_id: 'user-1', bank_connection_id: 'conn-1', tink_group_id: 'g1',
        merchant_name: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly',
        confidence_score: 0.9, status: 'detected', first_seen: '2025-09-15', last_seen: '2026-02-15',
      },
      {
        id: 'det-2', user_id: 'user-1', bank_connection_id: 'conn-1', tink_group_id: 'g2',
        merchant_name: 'Coffee Shop', amount: 4.50, currency: 'EUR', frequency: 'weekly',
        confidence_score: 0.55, status: 'detected', first_seen: '2026-01-01', last_seen: '2026-03-20',
      },
    ];

    it('filters out merchants in dismissedMerchants list', async () => {
      useBankStore.setState({
        dismissedMerchants: [
          { id: 'dm-1', userId: 'user-1', merchantName: 'Coffee Shop', dismissedAt: '2026-03-20T00:00:00Z' },
        ],
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockRows, error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDetectedSubscriptions();
      });

      const { detectedSubscriptions } = useBankStore.getState();
      expect(detectedSubscriptions).toHaveLength(1);
      expect(detectedSubscriptions[0].merchantName).toBe('Netflix');
    });

    it('returns all items when no merchants are dismissed', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockRows, error: null }),
      });

      await act(async () => {
        await useBankStore.getState().fetchDetectedSubscriptions();
      });

      expect(useBankStore.getState().detectedSubscriptions).toHaveLength(2);
    });
  });

  describe('dismissedMerchants persistence', () => {
    it('persists dismissedMerchants to storage', () => {
      useBankStore.setState({
        connections: [],
        dismissedMerchants: [
          { id: 'dm-1', userId: 'user-1', merchantName: 'Coffee Shop', dismissedAt: '2026-03-20T00:00:00Z' },
        ],
      });

      const store = useBankStore as unknown as { persist: { getOptions: () => { partialize: (s: Record<string, unknown>) => Record<string, unknown> } } };
      const partialize = store.persist.getOptions().partialize;
      const persisted = partialize(useBankStore.getState());
      expect(persisted).toHaveProperty('dismissedMerchants');
      expect((persisted.dismissedMerchants as unknown[]).length).toBe(1);
    });

    it('does NOT persist dismissedItems to storage', () => {
      useBankStore.setState({
        connections: [],
        dismissedItems: [
          {
            id: 'det-5', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g5',
            merchantName: 'Coffee Shop', amount: 4.50, currency: 'EUR', frequency: 'weekly',
            confidenceScore: 0.55, status: 'dismissed', firstSeen: '2026-01-01', lastSeen: '2026-03-20',
          },
        ],
      });

      const store = useBankStore as unknown as { persist: { getOptions: () => { partialize: (s: Record<string, unknown>) => Record<string, unknown> } } };
      const partialize = store.persist.getOptions().partialize;
      const persisted = partialize(useBankStore.getState());
      expect(persisted).not.toHaveProperty('dismissedItems');
    });
  });

  describe('computeMatches', () => {
    const { findMatches } = jest.requireMock('@features/bank/utils/matchingUtils');
    const { useSubscriptionStore } = jest.requireMock('@shared/stores/useSubscriptionStore');

    const mockDetectedSub = {
      id: 'det-1', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g1',
      merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly' as const,
      confidenceScore: 0.9, status: 'detected' as const, firstSeen: '2025-09-15', lastSeen: '2026-02-15',
    };

    const mockManualSub = {
      id: 'sub-1', user_id: 'user-1', name: 'Netflix', price: 12.99, currency: 'EUR',
      billing_cycle: 'monthly', renewal_date: '2026-04-01', is_active: true,
      is_trial: false, trial_expiry_date: null, category: null, notes: null,
      calendar_event_id: null, created_at: '2025-09-01', updated_at: '2025-09-01',
    };

    const mockMatchResult: MatchResult = {
      detectedId: 'det-1', subscriptionId: 'sub-1', subscriptionName: 'Netflix',
      subscriptionPrice: 12.99, subscriptionBillingCycle: 'monthly', subscriptionCurrency: 'EUR',
      matchScore: 1.0, matchReasons: ['name_similar', 'amount_close', 'cycle_match'],
    };

    it('calls findMatches with detected subs and subscription store subs', () => {
      useBankStore.setState({ detectedSubscriptions: [mockDetectedSub] });
      useSubscriptionStore.getState.mockReturnValue({
        subscriptions: [mockManualSub],
        updateSubscription: mockUpdateSubscription,
        fetchSubscriptions: mockFetchSubscriptions,
      });
      findMatches.mockReturnValue(new Map([['det-1', mockMatchResult]]));

      useBankStore.getState().computeMatches();

      expect(findMatches).toHaveBeenCalledWith([mockDetectedSub], [mockManualSub]);
    });

    it('sets matchResults in store', () => {
      useBankStore.setState({ detectedSubscriptions: [mockDetectedSub] });
      findMatches.mockReturnValue(new Map([['det-1', mockMatchResult]]));

      useBankStore.getState().computeMatches();

      const { matchResults } = useBankStore.getState();
      expect(matchResults.size).toBe(1);
      expect(matchResults.get('det-1')).toEqual(mockMatchResult);
    });

    it('sets empty matchResults when no matches found', () => {
      useBankStore.setState({ detectedSubscriptions: [mockDetectedSub] });
      findMatches.mockReturnValue(new Map());

      useBankStore.getState().computeMatches();

      expect(useBankStore.getState().matchResults.size).toBe(0);
    });
  });

  describe('confirmMatch', () => {
    const mockDetectedSub = {
      id: 'det-1', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g1',
      merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly' as const,
      confidenceScore: 0.9, status: 'detected' as const, firstSeen: '2025-09-15', lastSeen: '2026-02-15',
    };

    const mockMatchResult: MatchResult = {
      detectedId: 'det-1', subscriptionId: 'sub-1', subscriptionName: 'Netflix',
      subscriptionPrice: 12.99, subscriptionBillingCycle: 'monthly', subscriptionCurrency: 'EUR',
      matchScore: 1.0, matchReasons: ['name_similar', 'amount_close', 'cycle_match'],
    };

    beforeEach(() => {
      useBankStore.setState({
        detectedSubscriptions: [mockDetectedSub],
        matchResults: new Map([['det-1', mockMatchResult]]),
      });

      const mockEq = jest.fn();
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: null });
      supabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: mockEq }) });
    });

    it('calls updateSubscription with detected price and currency', async () => {
      await act(async () => {
        await useBankStore.getState().confirmMatch('det-1');
      });

      expect(mockUpdateSubscription).toHaveBeenCalledWith('sub-1', {
        price: 12.99,
        currency: 'EUR',
      });
    });

    it('updates detected status to matched in DB', async () => {
      await act(async () => {
        await useBankStore.getState().confirmMatch('det-1');
      });

      expect(supabase.from).toHaveBeenCalledWith('detected_subscriptions');
    });

    it('removes detected sub from detectedSubscriptions array on success', async () => {
      await act(async () => {
        await useBankStore.getState().confirmMatch('det-1');
      });

      expect(useBankStore.getState().detectedSubscriptions).toHaveLength(0);
    });

    it('removes entry from matchResults on success', async () => {
      await act(async () => {
        await useBankStore.getState().confirmMatch('det-1');
      });

      expect(useBankStore.getState().matchResults.size).toBe(0);
    });

    it('sets CONFIRM_MATCH_FAILED error when updateSubscription fails', async () => {
      mockUpdateSubscription.mockResolvedValueOnce(false);

      await act(async () => {
        await useBankStore.getState().confirmMatch('det-1');
      });

      expect(useBankStore.getState().detectionError?.code).toBe('CONFIRM_MATCH_FAILED');
      expect(useBankStore.getState().detectedSubscriptions).toHaveLength(1);
    });

    it('sets CONFIRM_MATCH_FAILED error when DB update fails', async () => {
      const mockEq = jest.fn();
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } });
      supabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: mockEq }) });

      await act(async () => {
        await useBankStore.getState().confirmMatch('det-1');
      });

      expect(useBankStore.getState().detectionError?.code).toBe('CONFIRM_MATCH_FAILED');
      expect(useBankStore.getState().detectedSubscriptions).toHaveLength(1);
    });

    it('sets NETWORK_ERROR on exception', async () => {
      mockUpdateSubscription.mockRejectedValueOnce(new Error('Network down'));

      await act(async () => {
        await useBankStore.getState().confirmMatch('det-1');
      });

      expect(useBankStore.getState().detectionError?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('replaceWithDetected', () => {
    const mockDetectedSub = {
      id: 'det-1', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g1',
      merchantName: 'Netflix HD', amount: 15.49, currency: 'EUR', frequency: 'monthly' as const,
      confidenceScore: 0.9, status: 'detected' as const, firstSeen: '2025-09-15', lastSeen: '2026-02-15',
    };

    const mockMatchResult: MatchResult = {
      detectedId: 'det-1', subscriptionId: 'sub-1', subscriptionName: 'Netflix',
      subscriptionPrice: 12.99, subscriptionBillingCycle: 'monthly', subscriptionCurrency: 'EUR',
      matchScore: 0.7, matchReasons: ['name_similar', 'cycle_match'],
    };

    beforeEach(() => {
      useBankStore.setState({
        detectedSubscriptions: [mockDetectedSub],
        matchResults: new Map([['det-1', mockMatchResult]]),
      });

      const mockEq = jest.fn();
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: null });
      supabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: mockEq }) });
    });

    it('calls updateSubscription with ALL detected data (name, price, billing_cycle, currency)', async () => {
      await act(async () => {
        await useBankStore.getState().replaceWithDetected('det-1');
      });

      expect(mockUpdateSubscription).toHaveBeenCalledWith('sub-1', {
        name: 'Netflix HD',
        price: 15.49,
        billing_cycle: 'monthly',
        currency: 'EUR',
      });
    });

    it('removes detected sub from array and matchResults on success', async () => {
      await act(async () => {
        await useBankStore.getState().replaceWithDetected('det-1');
      });

      expect(useBankStore.getState().detectedSubscriptions).toHaveLength(0);
      expect(useBankStore.getState().matchResults.size).toBe(0);
    });

    it('sets REPLACE_FAILED error when updateSubscription fails', async () => {
      mockUpdateSubscription.mockResolvedValueOnce(false);

      await act(async () => {
        await useBankStore.getState().replaceWithDetected('det-1');
      });

      expect(useBankStore.getState().detectionError?.code).toBe('REPLACE_FAILED');
      expect(useBankStore.getState().detectedSubscriptions).toHaveLength(1);
    });

    it('sets REPLACE_FAILED error when DB update fails', async () => {
      const mockEq = jest.fn();
      mockEq.mockReturnValueOnce({ eq: mockEq });
      mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } });
      supabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: mockEq }) });

      await act(async () => {
        await useBankStore.getState().replaceWithDetected('det-1');
      });

      expect(useBankStore.getState().detectionError?.code).toBe('REPLACE_FAILED');
    });

    it('sets NETWORK_ERROR on exception', async () => {
      mockUpdateSubscription.mockRejectedValueOnce(new Error('Network down'));

      await act(async () => {
        await useBankStore.getState().replaceWithDetected('det-1');
      });

      expect(useBankStore.getState().detectionError?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('dismissMatch', () => {
    const mockDetectedSub = {
      id: 'det-1', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'g1',
      merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly' as const,
      confidenceScore: 0.9, status: 'detected' as const, firstSeen: '2025-09-15', lastSeen: '2026-02-15',
    };

    const mockMatchResult: MatchResult = {
      detectedId: 'det-1', subscriptionId: 'sub-1', subscriptionName: 'Netflix',
      subscriptionPrice: 12.99, subscriptionBillingCycle: 'monthly', subscriptionCurrency: 'EUR',
      matchScore: 1.0, matchReasons: ['name_similar'],
    };

    beforeEach(() => {
      useBankStore.setState({
        detectedSubscriptions: [mockDetectedSub],
        matchResults: new Map([['det-1', mockMatchResult]]),
      });
    });

    it('removes entry from matchResults', () => {
      useBankStore.getState().dismissMatch('det-1');
      expect(useBankStore.getState().matchResults.size).toBe(0);
    });

    it('keeps detected subscription in detectedSubscriptions array', () => {
      useBankStore.getState().dismissMatch('det-1');
      expect(useBankStore.getState().detectedSubscriptions).toHaveLength(1);
      expect(useBankStore.getState().detectedSubscriptions[0].id).toBe('det-1');
    });

    it('is a no-op if detectedId not in matchResults', () => {
      useBankStore.getState().dismissMatch('non-existent-id');
      expect(useBankStore.getState().matchResults.size).toBe(1); // unchanged
    });
  });

  describe('partialize exclusions', () => {
    it('does NOT persist matchResults or isMatching to storage', () => {
      const matchResult: MatchResult = {
        detectedId: 'det-1', subscriptionId: 'sub-1', subscriptionName: 'Netflix',
        subscriptionPrice: 12.99, subscriptionBillingCycle: 'monthly', subscriptionCurrency: 'EUR',
        matchScore: 1.0, matchReasons: ['name_similar'],
      };
      useBankStore.setState({
        connections: [{ id: 'c1', userId: 'u1', provider: 'tink', bankName: '', status: 'active', connectedAt: '', consentGrantedAt: '', consentExpiresAt: '', lastSyncedAt: null, tinkCredentialsId: '' }],
        matchResults: new Map([['det-1', matchResult]]),
        isMatching: true,
      });

      const store = useBankStore as unknown as { persist: { getOptions: () => { partialize: (s: Record<string, unknown>) => Record<string, unknown> } } };
      const partialize = store.persist.getOptions().partialize;
      const persisted = partialize(useBankStore.getState());
      expect(persisted).toHaveProperty('connections');
      expect(persisted).not.toHaveProperty('matchResults');
      expect(persisted).not.toHaveProperty('isMatching');
    });
  });

  describe('disconnectConnection', () => {
    function mockDisconnectSuccess() {
      const eq2Mock = jest.fn().mockResolvedValue({ data: null, error: null });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: eq1Mock }),
      });
    }

    function mockDisconnectError(dbError: object) {
      const eq2Mock = jest.fn().mockResolvedValue({ data: null, error: dbError });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: eq1Mock }),
      });
    }

    beforeEach(() => {
      useBankStore.setState({
        connections: [
          { id: 'conn-1', userId: 'user-1', provider: 'tink', bankName: 'Demo Bank', status: 'active', connectedAt: '', consentGrantedAt: '', consentExpiresAt: '', lastSyncedAt: null, tinkCredentialsId: '' },
        ],
        detectedSubscriptions: [{ id: 'det-1', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'grp-1', merchantName: 'Netflix', amount: 9.99, currency: 'EUR', frequency: 'monthly', confidenceScore: 0.9, status: 'detected', firstSeen: '', lastSeen: '' }],
        dismissedMerchants: [{ id: 'dm-1', userId: 'user-1', merchantName: 'Coffee', dismissedAt: '' }],
        dismissedItems: [{ id: 'det-2', userId: 'user-1', bankConnectionId: 'conn-1', tinkGroupId: 'grp-2', merchantName: 'Coffee', amount: 4.5, currency: 'EUR', frequency: 'weekly', confidenceScore: 0.5, status: 'dismissed', firstSeen: '', lastSeen: '' }],
        lastDetectionResult: { success: true, detectedCount: 1, newCount: 1 },
        isDisconnecting: false,
        connectionError: null,
      });
    });

    it('disconnects successfully and clears bank state', async () => {
      mockDisconnectSuccess();

      await act(async () => {
        await useBankStore.getState().disconnectConnection('conn-1');
      });

      const state = useBankStore.getState();
      expect(state.connections).toHaveLength(0);
      expect(state.isDisconnecting).toBe(false);
      expect(state.connectionError).toBeNull();
      expect(state.detectedSubscriptions).toHaveLength(0);
      expect(state.dismissedMerchants).toHaveLength(0);
      expect(state.dismissedItems).toHaveLength(0);
      expect(state.lastDetectionResult).toBeNull();
    });

    it('sets connectionError on Supabase failure', async () => {
      mockDisconnectError({ message: 'DB error' });

      await act(async () => {
        await useBankStore.getState().disconnectConnection('conn-1');
      });

      const state = useBankStore.getState();
      expect(state.connections).toHaveLength(1); // not removed
      expect(state.isDisconnecting).toBe(false);
      expect(state.connectionError?.code).toBe('DISCONNECT_FAILED');
    });

    it('sets NETWORK_ERROR on thrown exception', async () => {
      supabase.from.mockImplementation(() => { throw new Error('Network error'); });

      await act(async () => {
        await useBankStore.getState().disconnectConnection('conn-1');
      });

      const state = useBankStore.getState();
      expect(state.isDisconnecting).toBe(false);
      expect(state.connectionError?.code).toBe('NETWORK_ERROR');
    });

    it('clears error state at action start', async () => {
      useBankStore.setState({ connectionError: { code: 'OLD_ERROR', message: 'old error' } });
      mockDisconnectSuccess();

      await act(async () => {
        await useBankStore.getState().disconnectConnection('conn-1');
      });

      // Error is cleared at start and no new error on success
      expect(useBankStore.getState().connectionError).toBeNull();
    });

    it('disconnects in demo mode using local state only', async () => {
      const { env: mockEnv } = jest.requireMock('@config/env');
      mockEnv.DEMO_BANK_MODE = true;

      await act(async () => {
        await useBankStore.getState().disconnectConnection('conn-1');
      });

      mockEnv.DEMO_BANK_MODE = false;

      const state = useBankStore.getState();
      expect(state.connections).toHaveLength(0);
      expect(state.isDisconnecting).toBe(false);
      expect(state.detectedSubscriptions).toHaveLength(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

});
