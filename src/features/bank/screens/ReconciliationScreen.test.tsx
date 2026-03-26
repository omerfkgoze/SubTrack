import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useBankStore } from '@shared/stores/useBankStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { ReconciliationScreen } from './ReconciliationScreen';
import type { BankConnection } from '../types';
import type { Subscription } from '@features/subscriptions/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => (() => void) | void) => { cb(); },
}));

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn(),
}));

jest.mock('@shared/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: jest.fn(),
}));

const mockUseBankStore = useBankStore as jest.MockedFunction<typeof useBankStore>;
const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;

const mockFetchDetectedSubscriptions = jest.fn().mockResolvedValue(undefined);
const mockFetchConnections = jest.fn().mockResolvedValue(undefined);
const mockDismissDetectedSubscription = jest.fn().mockResolvedValue(undefined);
const mockFetchSubscriptions = jest.fn().mockResolvedValue(undefined);

const activeConnection: BankConnection = {
  id: 'conn-1',
  userId: 'user-1',
  provider: 'tink',
  bankName: 'Test Bank',
  status: 'active',
  connectedAt: '2026-01-01',
  consentGrantedAt: '2026-01-01',
  consentExpiresAt: '2026-07-01',
  lastSyncedAt: '2026-03-01',
  tinkCredentialsId: 'cred-1',
};

const mockSub: Subscription = {
  id: 'sub-1',
  user_id: 'user-1',
  name: 'Netflix',
  price: 12.99,
  currency: 'EUR',
  billing_cycle: 'monthly',
  renewal_date: '2026-04-01',
  is_active: true,
  is_trial: false,
  trial_expiry_date: null,
  category: null,
  notes: null,
  calendar_event_id: null,
  created_at: '2025-09-01',
  updated_at: '2025-09-01',
} as Subscription;

const mockDetected = {
  id: 'det-1',
  userId: 'user-1',
  bankConnectionId: 'conn-1',
  tinkGroupId: 'grp-1',
  merchantName: 'Spotify',
  amount: 9.99,
  currency: 'EUR',
  frequency: 'monthly' as const,
  confidenceScore: 0.85,
  status: 'detected' as const,
  firstSeen: '2025-10-01',
  lastSeen: '2026-03-01',
};

function setupBankStore(overrides: Record<string, unknown> = {}) {
  const defaultState = {
    connections: [activeConnection],
    detectedSubscriptions: [mockDetected],
    isFetchingDetected: false,
    detectionError: null,
    fetchDetectedSubscriptions: mockFetchDetectedSubscriptions,
    fetchConnections: mockFetchConnections,
    dismissDetectedSubscription: mockDismissDetectedSubscription,
  };

  mockUseBankStore.mockImplementation((selector: (s: typeof defaultState) => unknown) =>
    selector({ ...defaultState, ...overrides } as typeof defaultState),
  );

  (useBankStore as unknown as { getState: () => typeof defaultState }).getState = () => ({
    ...defaultState,
    ...overrides,
  } as typeof defaultState);
}

function setupSubscriptionStore(overrides: Record<string, unknown> = {}) {
  const defaultState = {
    subscriptions: [mockSub],
    isLoading: false,
    fetchSubscriptions: mockFetchSubscriptions,
  };

  mockUseSubscriptionStore.mockImplementation((selector: (s: typeof defaultState) => unknown) =>
    selector({ ...defaultState, ...overrides } as typeof defaultState),
  );

  (useSubscriptionStore as unknown as { getState: () => typeof defaultState }).getState = () => ({
    ...defaultState,
    ...overrides,
  } as typeof defaultState);
}

function renderScreen() {
  return render(
    <PaperProvider theme={theme}>
      <ReconciliationScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupBankStore();
  setupSubscriptionStore();
});

describe('ReconciliationScreen', () => {
  describe('loading state', () => {
    it('shows loading indicator when fetching detected subscriptions', () => {
      setupBankStore({ isFetchingDetected: true });
      renderScreen();
      expect(screen.getByLabelText('Loading reconciliation data')).toBeTruthy();
    });

    it('shows loading indicator when fetching subscriptions', () => {
      setupSubscriptionStore({ isLoading: true });
      renderScreen();
      expect(screen.getByLabelText('Loading reconciliation data')).toBeTruthy();
    });
  });

  describe('no bank connection state', () => {
    it('shows no connection message when connections array is empty', () => {
      setupBankStore({ connections: [] });
      renderScreen();
      expect(screen.getByText('No bank connection')).toBeTruthy();
    });

    it('shows connect bank button', () => {
      setupBankStore({ connections: [] });
      renderScreen();
      expect(screen.getByLabelText('Connect Bank')).toBeTruthy();
    });

    it('navigates to BankConnection when Connect Bank pressed', () => {
      setupBankStore({ connections: [] });
      renderScreen();
      fireEvent.press(screen.getByLabelText('Connect Bank'));
      expect(mockNavigate).toHaveBeenCalledWith('BankConnection', undefined);
    });
  });

  describe('no detected subscriptions state', () => {
    it('shows no transactions detected message', () => {
      setupBankStore({ detectedSubscriptions: [] });
      renderScreen();
      expect(screen.getByText('No transactions detected yet')).toBeTruthy();
    });
  });

  describe('populated state', () => {
    it('renders reconciliation summary card', () => {
      renderScreen();
      expect(screen.getByLabelText('Reconciliation summary')).toBeTruthy();
    });

    it('shows unmatched transaction cards', () => {
      renderScreen();
      expect(screen.getByLabelText('Unmatched transaction: Spotify')).toBeTruthy();
    });

    it('calls dismiss when Dismiss button pressed', async () => {
      renderScreen();
      fireEvent.press(screen.getByLabelText('Dismiss Spotify'));
      await waitFor(() => {
        expect(mockDismissDetectedSubscription).toHaveBeenCalledWith('det-1');
      });
    });

    it('navigates to Add with prefill when Add to Subscriptions pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByLabelText('Add Spotify to subscriptions'));
      expect(mockNavigate).toHaveBeenCalledWith('Add', {
        prefill: {
          name: 'Spotify',
          price: 9.99,
          billing_cycle: 'monthly',
          currency: 'EUR',
          detectedId: 'det-1',
          lastSeen: '2026-03-01',
        },
      });
    });
  });

  describe('reconciled state', () => {
    it('shows 100% accurate message when fully reconciled', () => {
      setupBankStore({
        detectedSubscriptions: [
          { ...mockDetected, status: 'matched' as const },
        ],
      });
      setupSubscriptionStore({
        subscriptions: [{ ...mockSub, price: 9.99 }],
      });
      renderScreen();
      expect(screen.getByLabelText('Your tracking is 100% accurate!')).toBeTruthy();
    });
  });
});
