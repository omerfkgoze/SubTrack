import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';
import type { BankConnection, SupportedBank, DetectedSubscription, DetectionResult } from '@features/bank/types';
import type { AppError } from '@features/subscriptions/types';

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
}

interface BankActions {
  fetchConnections: () => Promise<void>;
  createLinkSession: (market?: string) => Promise<string | null>;
  initiateConnection: (authCode: string, credentialsId?: string | null) => Promise<void>;
  clearConnectionError: () => void;
  fetchSupportedBanks: (market?: string) => Promise<void>;
  detectSubscriptions: (connectionId: string) => Promise<void>;
  fetchDetectedSubscriptions: () => Promise<void>;
}

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

      fetchConnections: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isFetchingConnections: true, connectionError: null });

        try {
          const { data, error } = await supabase
            .from('bank_connections')
            .select('*')
            .eq('user_id', user.id);

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
        try {
          const { data, error } = await supabase.functions.invoke('tink-link-session', {
            body: { market },
          });

          if (error) {
            // Debug: log raw error shape
            console.error('[useBankStore] Link session RAW error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            console.error('[useBankStore] Link session data:', JSON.stringify(data));
            let detail = 'Failed to prepare bank connection session.';
            try {
              if (error.context && typeof error.context.json === 'function') {
                const body = await error.context.json();
                console.error('[useBankStore] Link session body:', JSON.stringify(body));
                detail = body?.error ?? detail;
              } else if (error.message) {
                detail = error.message;
              }
            } catch (parseErr) {
              console.error('[useBankStore] Link session parse error:', parseErr);
              if (error.message) detail = error.message;
            }
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
            // Extract the actual error detail from the Edge Function response
            let detail = 'Connection setup failed. Please try again.';
            try {
              // FunctionsHttpError: error.context is the raw Response
              if (error.context && typeof error.context.json === 'function') {
                const body = await error.context.json();
                detail = body?.error ?? detail;
              } else if (error.message) {
                detail = error.message;
              }
            } catch {
              if (error.message) detail = error.message;
            }
            console.error('[useBankStore] Edge Function error:', detail, '| Raw:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
        set({ isDetecting: true, detectionError: null, lastDetectionResult: null });

        try {
          const { data, error } = await supabase.functions.invoke('tink-detect-subscriptions', {
            body: { connectionId },
          });

          if (error) {
            let detail = 'Subscription detection failed. Please try again.';
            let errorCode = 'DETECTION_FAILED';
            try {
              if (error.context && typeof error.context.json === 'function') {
                const body = await error.context.json();
                const errorField = body?.error ?? '';
                if (errorField === 'TOKEN_REFRESH_FAILED') {
                  // Update local connection status to expired (AC9)
                  set((state) => ({
                    connections: state.connections.map((c) =>
                      c.id === connectionId ? { ...c, status: 'expired' as const } : c,
                    ),
                  }));
                  detail = 'Bank connection expired. Please reconnect.';
                  errorCode = 'TOKEN_REFRESH_FAILED';
                } else if (errorField === 'ENRICHMENT_SCOPE_MISSING') {
                  detail = 'Your bank connection needs updated permissions. Please reconnect to enable subscription detection.';
                  errorCode = 'ENRICHMENT_SCOPE_MISSING';
                } else if (errorField === 'CONNECTION_NOT_ACTIVE') {
                  detail = 'Bank connection is not active. Please reconnect your bank.';
                  errorCode = 'CONNECTION_NOT_ACTIVE';
                } else {
                  detail = body?.detail ?? body?.error ?? detail;
                }
              } else if (error.message) {
                detail = error.message;
              }
            } catch {
              if (error.message) detail = error.message;
            }
            set({
              detectionError: { code: errorCode, message: detail },
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
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isFetchingDetected: true });

        try {
          const { data, error } = await supabase
            .from('detected_subscriptions')
            .select('*')
            .eq('user_id', user.id);

          if (error) {
            set({ isFetchingDetected: false });
            return;
          }

          const detectedSubscriptions = (data ?? []).map(mapRowToDetectedSubscription);
          set({ detectedSubscriptions, isFetchingDetected: false });
        } catch {
          set({ isFetchingDetected: false });
        }
      },

      fetchSupportedBanks: async (market?: string) => {
        set({ isFetchingBanks: true, fetchBanksError: null });

        try {
          const { data, error } = await supabase.functions.invoke('tink-providers', {
            body: { market },
          });

          if (error) {
            let detail = "Couldn't load supported banks. Please check your connection and try again.";
            try {
              if (error.context && typeof error.context.json === 'function') {
                const body = await error.context.json();
                detail = body?.error ?? detail;
              } else if (error.message) {
                detail = error.message;
              }
            } catch {
              if (error.message) detail = error.message;
            }
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
        // detectedSubscriptions and lastDetectionResult are NOT persisted — transient server data
      }),
    },
  ),
);
