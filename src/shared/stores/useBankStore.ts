import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@shared/services/supabase';
import { useAuthStore } from '@shared/stores/useAuthStore';
import type { BankConnection } from '@features/bank/types';
import type { AppError } from '@features/subscriptions/types';

interface BankState {
  connections: BankConnection[];
  isConnecting: boolean;
  isFetchingConnections: boolean;
  connectionError: AppError | null;
}

interface BankActions {
  fetchConnections: () => Promise<void>;
  initiateConnection: (authCode: string, credentialsId?: string | null) => Promise<void>;
  clearConnectionError: () => void;
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

export const useBankStore = create<BankStore>()(
  persist(
    (set) => ({
      connections: [],
      isConnecting: false,
      isFetchingConnections: false,
      connectionError: null,

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
    }),
    {
      name: 'bank-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ connections: state.connections }),
    },
  ),
);
