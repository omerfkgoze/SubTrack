import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { env } from '@config/env';
import type { BankConnection, SupportedBank, DetectedSubscription, DetectionResult, DismissedMerchant } from '@features/bank/types';
import type { AppError } from '@features/subscriptions/types';
import {
  MOCK_CONNECTION,
  MOCK_DETECTED_SUBSCRIPTIONS,
  MOCK_SUPPORTED_BANKS,
  MOCK_DETECTION_RESULT,
  MOCK_DISMISSED_MERCHANTS,
  mockDelay,
} from '@features/bank/mocks/mockBankData';
import { findMatches, type MatchResult } from '@features/bank/utils/matchingUtils';

interface BankState {
  connections: BankConnection[];
  isConnecting: boolean;
  isFetchingConnections: boolean;
  connectionError: AppError | null;
  supportedBanks: SupportedBank[];
  isFetchingBanks: boolean;
  fetchBanksError: AppError | null;
  detectedSubscriptions: DetectedSubscription[];
  isDetecting: boolean;
  isFetchingDetected: boolean;
  detectionError: AppError | null;
  lastDetectionResult: DetectionResult | null;
  matchResults: Map<string, MatchResult>; // transient, recomputed on focus
  isMatching: boolean;
  dismissedMerchants: DismissedMerchant[];
  isFetchingDismissed: boolean;
  dismissedItems: DetectedSubscription[];
  isFetchingDismissedItems: boolean;
  isDisconnecting: boolean;
  isRefreshing: boolean;
  _demoDisconnectedIds: string[]; // tracks demo-mode disconnects so fetchConnections respects them
}

interface BankActions {
  fetchConnections: () => Promise<void>;
  createLinkSession: (market?: string) => Promise<string | null>;
  initiateConnection: (authCode: string, credentialsId?: string | null) => Promise<void>;
  clearConnectionError: () => void;
  fetchSupportedBanks: (market?: string) => Promise<void>;
  detectSubscriptions: (connectionId: string) => Promise<void>;
  fetchDetectedSubscriptions: () => Promise<void>;
  approveDetectedSubscription: (id: string) => Promise<void>;
  dismissDetectedSubscription: (id: string) => Promise<void>;
  fetchDismissedMerchants: () => Promise<void>;
  fetchDismissedItems: () => Promise<void>;
  undismissDetectedSubscription: (id: string) => Promise<void>;
  disconnectConnection: (connectionId: string) => Promise<void>;
  refreshBankData: (connectionId: string) => Promise<void>;
  computeMatches: () => void;
  confirmMatch: (detectedId: string) => Promise<void>;
  replaceWithDetected: (detectedId: string) => Promise<void>;
  dismissMatch: (detectedId: string) => void;
}

export type { MatchResult };

export type BankStore = BankState & BankActions;

function mapRowToConnection(row: Record<string, unknown>): BankConnection {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    provider: 'tink',
    bankName: (row.bank_name as string | null) ?? '',
    status: row.status as BankConnection['status'],
    connectedAt: row.connected_at as string,
    consentGrantedAt: (row.consent_granted_at as string | null) ?? '',
    consentExpiresAt: (row.consent_expires_at as string | null) ?? '',
    lastSyncedAt: (row.last_synced_at as string | null) ?? null,
    tinkCredentialsId: (row.tink_credentials_id as string | null) ?? '',
  };
}

function mapRowToDetectedSubscription(row: Record<string, unknown>): DetectedSubscription {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    bankConnectionId: row.bank_connection_id as string,
    tinkGroupId: row.tink_group_id as string,
    merchantName: row.merchant_name as string,
    amount: row.amount as number,
    currency: row.currency as string,
    frequency: row.frequency as DetectedSubscription['frequency'],
    confidenceScore: row.confidence_score as number,
    status: row.status as DetectedSubscription['status'],
    firstSeen: row.first_seen as string,
    lastSeen: row.last_seen as string,
  };
}

/**
 * Extracts a user-facing error message from a Supabase FunctionsHttpError.
 * Handles error.context.json() (raw Response body), error.message fallback.
 */
async function extractEdgeFunctionError(error: Record<string, unknown>, fallback: string): Promise<string> {
  try {
    if (error.context && typeof (error.context as Record<string, unknown>).json === 'function') {
      const body = await (error.context as Response).json();
      return body?.error ?? body?.detail ?? fallback;
    }
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
  } catch {
    if (error.message && typeof error.message === 'string') return error.message;
  }
  return fallback;
}

/**
 * Same as extractEdgeFunctionError but also returns the raw parsed body for inspecting error codes.
 */
async function extractEdgeFunctionErrorWithBody(
  error: Record<string, unknown>,
  fallback: string,
): Promise<{ detail: string; body: Record<string, unknown> | null }> {
  try {
    if (error.context && typeof (error.context as Record<string, unknown>).json === 'function') {
      const body = await (error.context as Response).json();
      return { detail: body?.error ?? body?.detail ?? fallback, body };
    }
    if (error.message && typeof error.message === 'string') {
      return { detail: error.message, body: null };
    }
  } catch {
    if (error.message && typeof error.message === 'string') return { detail: error.message, body: null };
  }
  return { detail: fallback, body: null };
}

export const useBankStore = create<BankStore>()(
  persist(
    (set) => ({
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
      matchResults: new Map<string, MatchResult>(),
      isMatching: false,
      dismissedMerchants: [],
      isFetchingDismissed: false,
      dismissedItems: [],
      isFetchingDismissedItems: false,
      isDisconnecting: false,
      isRefreshing: false,
      _demoDisconnectedIds: [] as string[],

      fetchConnections: async () => {
        if (env.DEMO_BANK_MODE) {
          set({ isFetchingConnections: true, connectionError: null });
          await mockDelay(300);
          const disconnectedIds = useBankStore.getState()._demoDisconnectedIds;
          const mockConnections = [MOCK_CONNECTION].filter((c) => !disconnectedIds.includes(c.id));
          set({ connections: mockConnections, isFetchingConnections: false });
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isFetchingConnections: true, connectionError: null });

        try {
          const { data, error } = await supabase
            .from('bank_connections')
            .select('*')
            .eq('user_id', user.id)
            .neq('status', 'disconnected');

          if (error) {
            set({
              connectionError: { code: 'FETCH_FAILED', message: 'Failed to load bank connections' },
              isFetchingConnections: false,
            });
            return;
          }

          const connections = (data ?? []).map(mapRowToConnection);
          set({ connections, isFetchingConnections: false });
        } catch {
          set({
            connectionError: { code: 'NETWORK_ERROR', message: 'Network error loading bank connections' },
            isFetchingConnections: false,
          });
        }
      },

      createLinkSession: async (market?: string): Promise<string | null> => {
        if (env.DEMO_BANK_MODE) {
          await mockDelay(500);
          return 'demo-auth-code-mock';
        }

        try {
          const { data, error } = await supabase.functions.invoke('tink-link-session', {
            body: { market },
          });

          if (error) {
            const detail = await extractEdgeFunctionError(
              error as Record<string, unknown>,
              'Failed to prepare bank connection session.',
            );
            console.error('[useBankStore] Link session error:', detail);
            set({
              connectionError: { code: 'SESSION_FAILED', message: detail },
            });
            return null;
          }

          if (data?.success && data?.authorizationCode) {
            return data.authorizationCode as string;
          }

          console.error('[useBankStore] Unexpected link session response:', JSON.stringify(data));
          set({
            connectionError: { code: 'SESSION_FAILED', message: 'Failed to prepare bank connection session.' },
          });
          return null;
        } catch (err) {
          const detail = err instanceof Error ? err.message : 'Failed to prepare bank connection session.';
          console.error('[useBankStore] Link session catch:', detail);
          set({
            connectionError: { code: 'NETWORK_ERROR', message: detail },
          });
          return null;
        }
      },

      initiateConnection: async (authCode: string, credentialsId?: string | null) => {
        if (env.DEMO_BANK_MODE) {
          set({ isConnecting: true, connectionError: null });
          await mockDelay(1000);
          set((state) => ({
            connections: [...state.connections.filter((c) => c.id !== MOCK_CONNECTION.id), MOCK_CONNECTION],
            isConnecting: false,
            _demoDisconnectedIds: state._demoDisconnectedIds.filter((id) => id !== MOCK_CONNECTION.id),
          }));
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isConnecting: true, connectionError: null });

        // Retry helper for transient network failures (e.g. iOS post-WebView)
        const invokeWithRetry = async (retries = 2): Promise<{ data: unknown; error: unknown }> => {
          try {
            return await supabase.functions.invoke('tink-connect', {
              body: {
                authorizationCode: authCode,
                userId: user.id,
                credentialsId: credentialsId ?? undefined,
              },
            });
          } catch (err) {
            if (retries > 0 && err instanceof TypeError) {
              await new Promise((r) => setTimeout(r, 1000));
              return invokeWithRetry(retries - 1);
            }
            throw err;
          }
        };

        try {
          const { data, error } = await invokeWithRetry();

          if (error) {
            const detail = await extractEdgeFunctionError(
              error as Record<string, unknown>,
              'Connection setup failed. Please try again.',
            );
            console.error('[useBankStore] Edge Function error:', detail);
            set({
              connectionError: { code: 'CONNECTION_FAILED', message: detail },
              isConnecting: false,
            });
            return;
          }

          if (data?.success && data?.connection) {
            const newConnection = mapRowToConnection(data.connection);
            set((state) => ({
              connections: [...state.connections, newConnection],
              isConnecting: false,
            }));
            // One-time flow: tink-connect now also detects subscriptions.
            // Refresh the detected list from DB to pick up any new detections.
            if (data.detectedCount && data.detectedCount > 0) {
              const { fetchDetectedSubscriptions } = useBankStore.getState();
              await fetchDetectedSubscriptions();
            }
          } else {
            const detail = data?.error ?? 'Connection setup failed. Please try again.';
            console.error('[useBankStore] Unexpected response:', JSON.stringify(data));
            set({
              connectionError: { code: 'CONNECTION_FAILED', message: detail },
              isConnecting: false,
            });
          }
        } catch (err) {
          const detail = err instanceof Error ? err.message : 'Connection setup failed. Please try again.';
          console.error('[useBankStore] Network/catch error:', detail);
          set({
            connectionError: { code: 'NETWORK_ERROR', message: detail },
            isConnecting: false,
          });
        }
      },

      clearConnectionError: () => set({ connectionError: null }),

      detectSubscriptions: async (connectionId: string) => {
        if (env.DEMO_BANK_MODE) {
          set({ isDetecting: true, detectionError: null, lastDetectionResult: null });
          await mockDelay(2000);
          set({
            detectedSubscriptions: MOCK_DETECTED_SUBSCRIPTIONS.filter((s) => s.status === 'detected'),
            lastDetectionResult: MOCK_DETECTION_RESULT,
            isDetecting: false,
          });
          return;
        }

        set({ isDetecting: true, detectionError: null, lastDetectionResult: null });

        try {
          const { data, error } = await supabase.functions.invoke('tink-detect-subscriptions', {
            body: { connectionId },
          });

          if (error) {
            const { detail, body } = await extractEdgeFunctionErrorWithBody(
              error as Record<string, unknown>,
              'Subscription detection failed. Please try again.',
            );
            const errorField = body?.error ?? '';
            let errorCode = 'DETECTION_FAILED';
            let message = detail;

            if (errorField === 'TOKEN_REFRESH_FAILED') {
              // Update local connection status to expired (AC9)
              set((state) => ({
                connections: state.connections.map((c) =>
                  c.id === connectionId ? { ...c, status: 'expired' as const } : c,
                ),
              }));
              message = 'Bank connection expired. Please reconnect.';
              errorCode = 'TOKEN_REFRESH_FAILED';
            } else if (errorField === 'RECONNECT_REQUIRED') {
              // Continuous Access not yet approved — connection is still valid,
              // user must reconnect (one-time flow) to get a fresh access token.
              message = 'Reconnect your bank to scan for new subscriptions.';
              errorCode = 'RECONNECT_REQUIRED';
            } else if (errorField === 'CONNECTION_NOT_ACTIVE') {
              message = 'Bank connection is not active. Please reconnect your bank.';
              errorCode = 'CONNECTION_NOT_ACTIVE';
            }

            set({
              detectionError: { code: errorCode, message },
              isDetecting: false,
            });
            return;
          }

          if (data?.success) {
            const result: DetectionResult = {
              success: true,
              detectedCount: data.detectedCount ?? 0,
              newCount: data.newCount ?? 0,
            };
            set({ lastDetectionResult: result, isDetecting: false });
            // Refresh detected subscriptions from DB
            const { fetchDetectedSubscriptions } = useBankStore.getState();
            await fetchDetectedSubscriptions();
          } else {
            const detail = data?.error ?? 'Subscription detection failed. Please try again.';
            set({
              detectionError: { code: 'DETECTION_FAILED', message: detail },
              isDetecting: false,
            });
          }
        } catch {
          set({
            detectionError: { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' },
            isDetecting: false,
          });
        }
      },

      fetchDetectedSubscriptions: async () => {
        if (env.DEMO_BANK_MODE) {
          set({ isFetchingDetected: true });
          await mockDelay(300);
          // Return only items that haven't been acted on (still in local state)
          const current = useBankStore.getState().detectedSubscriptions;
          // If already populated, keep current state (user may have approved/dismissed some)
          if (current.length > 0) {
            set({ isFetchingDetected: false });
            useBankStore.getState().computeMatches();
            return;
          }
          const { dismissedMerchants } = useBankStore.getState();
          const dismissedNames = new Set(dismissedMerchants.map((m) => m.merchantName));
          set({
            detectedSubscriptions: MOCK_DETECTED_SUBSCRIPTIONS.filter(
              (s) => s.status === 'detected' && !dismissedNames.has(s.merchantName),
            ),
            isFetchingDetected: false,
          });
          useBankStore.getState().computeMatches();
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isFetchingDetected: true });

        try {
          const { data, error } = await supabase
            .from('detected_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'detected')
            .order('confidence_score', { ascending: false });

          if (error) {
            set({
              isFetchingDetected: false,
              detectionError: { code: 'FETCH_DETECTED_FAILED', message: 'Failed to load detected subscriptions.' },
            });
            return;
          }

          const { dismissedMerchants } = useBankStore.getState();
          const dismissedNames = new Set(dismissedMerchants.map((m) => m.merchantName));
          const detectedSubscriptions = (data ?? [])
            .map(mapRowToDetectedSubscription)
            .filter((s) => !dismissedNames.has(s.merchantName));
          set({ detectedSubscriptions, isFetchingDetected: false });
          useBankStore.getState().computeMatches();
        } catch {
          set({
            isFetchingDetected: false,
            detectionError: { code: 'NETWORK_ERROR', message: 'Network error loading detected subscriptions.' },
          });
        }
      },

      approveDetectedSubscription: async (id: string) => {
        if (env.DEMO_BANK_MODE) {
          await mockDelay(300);
          set((state) => ({
            detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== id),
          }));
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          const { error } = await supabase
            .from('detected_subscriptions')
            .update({ status: 'approved' })
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) {
            set({ detectionError: { code: 'APPROVE_FAILED', message: 'Failed to update. Please try again.' } });
            return;
          }

          set((state) => ({
            detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== id),
          }));
        } catch {
          set({ detectionError: { code: 'NETWORK_ERROR', message: 'Network error. Please try again.' } });
        }
      },

      dismissDetectedSubscription: async (id: string) => {
        set({ detectionError: null });

        const detected = useBankStore.getState().detectedSubscriptions.find((s) => s.id === id);

        if (env.DEMO_BANK_MODE) {
          await mockDelay(200);
          if (detected) {
            const newMerchant: DismissedMerchant = {
              id: `demo-dm-${Date.now()}`,
              userId: detected.userId,
              merchantName: detected.merchantName,
              dismissedAt: new Date().toISOString(),
            };
            set((state) => ({
              detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== id),
              dismissedMerchants: [...state.dismissedMerchants.filter((m) => m.merchantName !== detected.merchantName), newMerchant],
            }));
          } else {
            set((state) => ({
              detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== id),
            }));
          }
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          const { error } = await supabase
            .from('detected_subscriptions')
            .update({ status: 'dismissed' })
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) {
            set({ detectionError: { code: 'DISMISS_FAILED', message: 'Failed to dismiss. Please try again.' } });
            return;
          }

          // Remove from local detectedSubscriptions
          set((state) => ({
            detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== id),
          }));

          // Best-effort: store merchant exclusion (non-fatal if fails)
          if (detected) {
            try {
              const { data: merchantRow, error: merchantError } = await supabase
                .from('dismissed_merchants')
                .upsert(
                  { user_id: user.id, merchant_name: detected.merchantName },
                  { onConflict: 'user_id,merchant_name' },
                )
                .select()
                .single();

              if (!merchantError && merchantRow) {
                const newMerchant: DismissedMerchant = {
                  id: merchantRow.id as string,
                  userId: merchantRow.user_id as string,
                  merchantName: merchantRow.merchant_name as string,
                  dismissedAt: merchantRow.dismissed_at as string,
                };
                set((state) => ({
                  dismissedMerchants: [...state.dismissedMerchants.filter((m) => m.merchantName !== detected.merchantName), newMerchant],
                }));
              }
            } catch {
              // Non-fatal: merchant exclusion failed but item was dismissed
            }
          }
        } catch {
          set({ detectionError: { code: 'NETWORK_ERROR', message: 'Network error. Please try again.' } });
        }
      },

      fetchDismissedMerchants: async () => {
        set({ isFetchingDismissed: true, detectionError: null });

        if (env.DEMO_BANK_MODE) {
          await mockDelay(300);
          set({ dismissedMerchants: MOCK_DISMISSED_MERCHANTS, isFetchingDismissed: false });
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) {
          set({ isFetchingDismissed: false });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('dismissed_merchants')
            .select('*')
            .eq('user_id', user.id)
            .order('dismissed_at', { ascending: false });

          if (error) {
            set({ isFetchingDismissed: false });
            return;
          }

          const dismissedMerchants: DismissedMerchant[] = (data ?? []).map((row) => ({
            id: row.id as string,
            userId: row.user_id as string,
            merchantName: row.merchant_name as string,
            dismissedAt: row.dismissed_at as string,
          }));
          set({ dismissedMerchants, isFetchingDismissed: false });
        } catch {
          set({ isFetchingDismissed: false });
        }
      },

      fetchDismissedItems: async () => {
        set({ isFetchingDismissedItems: true, detectionError: null });

        if (env.DEMO_BANK_MODE) {
          await mockDelay(300);
          const dismissedItems = MOCK_DETECTED_SUBSCRIPTIONS.filter((s) => s.status === 'dismissed');
          set({ dismissedItems, isFetchingDismissedItems: false });
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) {
          set({ isFetchingDismissedItems: false });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('detected_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'dismissed')
            .order('last_seen', { ascending: false });

          if (error) {
            set({ isFetchingDismissedItems: false });
            return;
          }

          const dismissedItems = (data ?? []).map(mapRowToDetectedSubscription);
          set({ dismissedItems, isFetchingDismissedItems: false });
        } catch {
          set({ isFetchingDismissedItems: false });
        }
      },

      undismissDetectedSubscription: async (id: string) => {
        set({ detectionError: null });

        const { dismissedItems, dismissedMerchants } = useBankStore.getState();
        const item = dismissedItems.find((s) => s.id === id);

        if (env.DEMO_BANK_MODE) {
          await mockDelay(200);
          if (item) {
            set((state) => ({
              dismissedItems: state.dismissedItems.filter((s) => s.id !== id),
              dismissedMerchants: state.dismissedMerchants.filter((m) => m.merchantName !== item.merchantName),
              detectedSubscriptions: [...state.detectedSubscriptions, { ...item, status: 'detected' as const }],
            }));
          }
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          const { error } = await supabase
            .from('detected_subscriptions')
            .update({ status: 'detected' })
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) {
            set({ detectionError: { code: 'UNDISMISS_FAILED', message: 'Failed to restore. Please try again.' } });
            return;
          }

          if (item) {
            // Remove from dismissed_merchants so future detection includes this merchant
            await supabase
              .from('dismissed_merchants')
              .delete()
              .eq('user_id', user.id)
              .eq('merchant_name', item.merchantName);

            const merchantToRemove = dismissedMerchants.find((m) => m.merchantName === item.merchantName);
            set((state) => ({
              dismissedItems: state.dismissedItems.filter((s) => s.id !== id),
              dismissedMerchants: merchantToRemove
                ? state.dismissedMerchants.filter((m) => m.merchantName !== item.merchantName)
                : state.dismissedMerchants,
              detectedSubscriptions: [...state.detectedSubscriptions, { ...item, status: 'detected' as const }],
            }));
          } else {
            set((state) => ({
              dismissedItems: state.dismissedItems.filter((s) => s.id !== id),
            }));
          }
        } catch {
          set({ detectionError: { code: 'NETWORK_ERROR', message: 'Network error. Please try again.' } });
        }
      },

      disconnectConnection: async (connectionId: string) => {
        set({ isDisconnecting: true, connectionError: null });

        if (env.DEMO_BANK_MODE) {
          await mockDelay(500);
          set((state) => ({
            connections: state.connections.filter((c) => c.id !== connectionId),
            isDisconnecting: false,
            detectedSubscriptions: [],
            dismissedMerchants: [],
            dismissedItems: [],
            matchResults: new Map(),
            lastDetectionResult: null,
            _demoDisconnectedIds: state._demoDisconnectedIds.includes(connectionId)
              ? state._demoDisconnectedIds
              : [...state._demoDisconnectedIds, connectionId],
          }));
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) {
          set({ isDisconnecting: false });
          return;
        }

        try {
          const { error } = await supabase
            .from('bank_connections')
            .update({ status: 'disconnected' })
            .eq('id', connectionId)
            .eq('user_id', user.id);

          if (error) {
            set({
              connectionError: { code: 'DISCONNECT_FAILED', message: 'Failed to disconnect. Please try again.' },
              isDisconnecting: false,
            });
            return;
          }

          set((state) => ({
            connections: state.connections.filter((c) => c.id !== connectionId),
            isDisconnecting: false,
            detectedSubscriptions: [],
            dismissedMerchants: [],
            dismissedItems: [],
            matchResults: new Map(),
            lastDetectionResult: null,
          }));
        } catch {
          set({
            connectionError: { code: 'NETWORK_ERROR', message: 'Network error. Please try again.' },
            isDisconnecting: false,
          });
        }
      },

      refreshBankData: async (connectionId: string) => {
        const { isRefreshing, isDetecting } = useBankStore.getState();
        if (isRefreshing || isDetecting) return; // concurrent guard

        set({ isRefreshing: true, detectionError: null });

        if (env.DEMO_BANK_MODE) {
          const disconnectedIds = useBankStore.getState()._demoDisconnectedIds;
          if (!disconnectedIds.includes(connectionId)) {
            await mockDelay(2000);
            const now = new Date().toISOString();
            set((state) => ({
              connections: state.connections.map((c) =>
                c.id === connectionId ? { ...c, lastSyncedAt: now } : c,
              ),
              detectedSubscriptions: MOCK_DETECTED_SUBSCRIPTIONS.filter((s) => s.status === 'detected'),
              lastDetectionResult: MOCK_DETECTION_RESULT,
            }));
          }
          set({ isRefreshing: false });
          return;
        }

        try {
          await useBankStore.getState().detectSubscriptions(connectionId);

          const { detectionError } = useBankStore.getState();
          if (!detectionError) {
            const now = new Date().toISOString();
            set((state) => ({
              connections: state.connections.map((c) =>
                c.id === connectionId ? { ...c, lastSyncedAt: now } : c,
              ),
            }));
            supabase
              .from('bank_connections')
              .update({ last_synced_at: now })
              .eq('id', connectionId)
              .then();
          }
        } finally {
          set({ isRefreshing: false });
        }
      },

      computeMatches: () => {
        const { detectedSubscriptions } = useBankStore.getState();
        const subscriptions = useSubscriptionStore.getState().subscriptions;
        set({ isMatching: true });
        const matchResults = findMatches(detectedSubscriptions, subscriptions);
        set({ matchResults, isMatching: false });
      },

      confirmMatch: async (detectedId: string) => {
        set({ detectionError: null });

        if (env.DEMO_BANK_MODE) {
          await mockDelay(300);
          const { matchResults: currentMatchResults, detectedSubscriptions: currentDetected } = useBankStore.getState();
          const matchResult = currentMatchResults.get(detectedId);
          const detected = currentDetected.find((s) => s.id === detectedId);
          if (matchResult && detected) {
            await useSubscriptionStore.getState().updateSubscription(matchResult.subscriptionId, {
              price: detected.amount,
              currency: detected.currency,
            });
          }
          set((state) => {
            const newMatchResults = new Map(state.matchResults);
            newMatchResults.delete(detectedId);
            return {
              detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== detectedId),
              matchResults: newMatchResults,
            };
          });
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        const { matchResults, detectedSubscriptions } = useBankStore.getState();
        const matchResult = matchResults.get(detectedId);
        const detected = detectedSubscriptions.find((s) => s.id === detectedId);

        if (!matchResult || !detected) return;

        try {
          const success = await useSubscriptionStore.getState().updateSubscription(
            matchResult.subscriptionId,
            { price: detected.amount, currency: detected.currency },
          );

          if (!success) {
            set({ detectionError: { code: 'CONFIRM_MATCH_FAILED', message: 'Failed to confirm match. Please try again.' } });
            return;
          }

          const { error } = await supabase
            .from('detected_subscriptions')
            .update({ status: 'matched' })
            .eq('id', detectedId)
            .eq('user_id', user.id);

          if (error) {
            set({ detectionError: { code: 'CONFIRM_MATCH_FAILED', message: 'Failed to confirm match. Please try again.' } });
            return;
          }

          set((state) => {
            const newMatchResults = new Map(state.matchResults);
            newMatchResults.delete(detectedId);
            return {
              detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== detectedId),
              matchResults: newMatchResults,
            };
          });
        } catch {
          set({ detectionError: { code: 'NETWORK_ERROR', message: 'Failed to confirm match. Please try again.' } });
        }
      },

      replaceWithDetected: async (detectedId: string) => {
        set({ detectionError: null });

        if (env.DEMO_BANK_MODE) {
          await mockDelay(300);
          const { matchResults: currentMatchResults, detectedSubscriptions: currentDetected } = useBankStore.getState();
          const matchResult = currentMatchResults.get(detectedId);
          const detected = currentDetected.find((s) => s.id === detectedId);
          if (matchResult && detected) {
            await useSubscriptionStore.getState().updateSubscription(matchResult.subscriptionId, {
              name: detected.merchantName,
              price: detected.amount,
              billing_cycle: detected.frequency,
              currency: detected.currency,
            });
          }
          set((state) => {
            const newMatchResults = new Map(state.matchResults);
            newMatchResults.delete(detectedId);
            return {
              detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== detectedId),
              matchResults: newMatchResults,
            };
          });
          return;
        }

        const user = useAuthStore.getState().user;
        if (!user) return;

        const { matchResults, detectedSubscriptions } = useBankStore.getState();
        const matchResult = matchResults.get(detectedId);
        const detected = detectedSubscriptions.find((s) => s.id === detectedId);

        if (!matchResult || !detected) return;

        try {
          const success = await useSubscriptionStore.getState().updateSubscription(
            matchResult.subscriptionId,
            {
              name: detected.merchantName,
              price: detected.amount,
              billing_cycle: detected.frequency,
              currency: detected.currency,
            },
          );

          if (!success) {
            set({ detectionError: { code: 'REPLACE_FAILED', message: 'Failed to update. Please try again.' } });
            return;
          }

          const { error } = await supabase
            .from('detected_subscriptions')
            .update({ status: 'matched' })
            .eq('id', detectedId)
            .eq('user_id', user.id);

          if (error) {
            set({ detectionError: { code: 'REPLACE_FAILED', message: 'Failed to update. Please try again.' } });
            return;
          }

          set((state) => {
            const newMatchResults = new Map(state.matchResults);
            newMatchResults.delete(detectedId);
            return {
              detectedSubscriptions: state.detectedSubscriptions.filter((s) => s.id !== detectedId),
              matchResults: newMatchResults,
            };
          });
        } catch {
          set({ detectionError: { code: 'NETWORK_ERROR', message: 'Failed to update. Please try again.' } });
        }
      },

      dismissMatch: (detectedId: string) => {
        set((state) => {
          const newMatchResults = new Map(state.matchResults);
          newMatchResults.delete(detectedId);
          return { matchResults: newMatchResults };
        });
      },

      fetchSupportedBanks: async (market?: string) => {
        if (env.DEMO_BANK_MODE) {
          set({ isFetchingBanks: true, fetchBanksError: null });
          await mockDelay(400);
          const filtered = market && market !== 'ALL'
            ? MOCK_SUPPORTED_BANKS.filter((b) => b.market === market)
            : MOCK_SUPPORTED_BANKS;
          set({ supportedBanks: filtered, isFetchingBanks: false });
          return;
        }

        set({ isFetchingBanks: true, fetchBanksError: null });

        try {
          const { data, error } = await supabase.functions.invoke('tink-providers', {
            body: { market },
          });

          if (error) {
            const detail = await extractEdgeFunctionError(
              error as Record<string, unknown>,
              "Couldn't load supported banks. Please check your connection and try again.",
            );
            set({
              fetchBanksError: { code: 'FETCH_BANKS_FAILED', message: detail },
              isFetchingBanks: false,
            });
            return;
          }

          set({ supportedBanks: data?.providers ?? [], isFetchingBanks: false });
        } catch {
          set({
            fetchBanksError: {
              code: 'NETWORK_ERROR',
              message: "Couldn't load supported banks. Please check your connection and try again.",
            },
            isFetchingBanks: false,
          });
        }
      },
    }),
    {
      name: 'bank-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        connections: state.connections,
        dismissedMerchants: state.dismissedMerchants, // persisted — permanent user preference
        _demoDisconnectedIds: state._demoDisconnectedIds, // persisted — survives app restart in demo mode
        // detectedSubscriptions, lastDetectionResult, matchResults, isMatching are NOT persisted — transient data
      }),
    },
  ),
);
