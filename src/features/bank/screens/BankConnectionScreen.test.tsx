import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useBankStore } from '@shared/stores/useBankStore';
import { BankConnectionScreen } from './BankConnectionScreen';

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

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    WebView: View,
  };
});

jest.mock('expo-linking', () => ({
  parse: jest.fn().mockReturnValue({ hostname: null, path: null, queryParams: {} }),
  useURL: jest.fn().mockReturnValue(null),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRouteParams: { autoConnect?: boolean } = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useFocusEffect: (cb: () => void) => { cb(); },
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn(),
}));

jest.mock('@config/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
    TINK_CLIENT_ID: 'test-tink-client-id',
  },
}));

const mockUseBankStore = useBankStore as jest.MockedFunction<typeof useBankStore>;

const mockInitiateConnection = jest.fn();
const mockClearConnectionError = jest.fn();
const mockDetectSubscriptions = jest.fn();

const mockActiveConnection = {
  id: 'conn-1', userId: 'user-1', provider: 'tink', bankName: 'Demo Bank',
  status: 'active', connectedAt: '2026-03-21T12:00:00Z',
  consentGrantedAt: '2026-03-21T12:00:00Z', consentExpiresAt: '2026-09-17T12:00:00Z',
  lastSyncedAt: null, tinkCredentialsId: 'cred-1',
};

function setupStoreMock(overrides: Record<string, unknown> = {}) {
  const defaultState = {
    connections: [],
    isConnecting: false,
    isFetchingConnections: false,
    connectionError: null,
    supportedBanks: [],
    isFetchingBanks: false,
    fetchBanksError: null,
    isDetecting: false,
    isFetchingDetected: false,
    detectionError: null,
    lastDetectionResult: null,
    detectedSubscriptions: [],
    createLinkSession: jest.fn().mockResolvedValue('mock-delegated-code'),
    initiateConnection: mockInitiateConnection,
    clearConnectionError: mockClearConnectionError,
    fetchConnections: jest.fn(),
    detectSubscriptions: mockDetectSubscriptions,
    fetchDetectedSubscriptions: jest.fn(),
    fetchSupportedBanks: jest.fn(),
    ...overrides,
  };

  mockUseBankStore.mockImplementation(
    (selector: (s: typeof defaultState) => unknown) =>
      selector(defaultState) as never,
  );
}

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <BankConnectionScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams.autoConnect = undefined;
  setupStoreMock();
});

describe('BankConnectionScreen', () => {
  describe('Info screen', () => {
    it('renders the Open Banking explanation', () => {
      renderWithProvider();
      expect(screen.getByText('Connect Your Bank')).toBeTruthy();
      expect(screen.getByText(/Open Banking/)).toBeTruthy();
    });

    it('renders security guarantees', () => {
      renderWithProvider();
      expect(screen.getByText(/SubTrack never sees your credentials/)).toBeTruthy();
      expect(screen.getByText(/No payments or transfers/)).toBeTruthy();
      expect(screen.getByText(/disconnect at any time/)).toBeTruthy();
    });

    it('renders Connect Bank Account CTA button', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Connect Bank Account')).toBeTruthy();
    });
  });

  describe('GDPR consent dialog', () => {
    it('shows GDPR consent dialog before Tink Link', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Connect Bank Account'));

      expect(screen.getByText('Bank Connection Consent')).toBeTruthy();
      expect(screen.getByText(/Access your account information/)).toBeTruthy();
      expect(screen.getByText(/Access your transaction history/)).toBeTruthy();
      expect(screen.getByText(/Analyze transactions/)).toBeTruthy();
      expect(screen.getByText(/Store detected subscription data/)).toBeTruthy();
    });

    it('shows what SubTrack will NOT do in consent dialog', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Connect Bank Account'));

      expect(screen.getByText(/Access your bank login credentials/)).toBeTruthy();
      expect(screen.getByText(/Make payments or transfers/)).toBeTruthy();
      expect(screen.getByText(/Share your financial data/)).toBeTruthy();
      expect(screen.getByText(/Store raw transaction data longer than 30 days/)).toBeTruthy();
    });

    it('cancel keeps user on the info screen', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Connect Bank Account'));

      fireEvent.press(screen.getByLabelText('Cancel bank connection'));

      // Should still see the info screen
      expect(screen.getByText('Connect Your Bank')).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('shows error message with retry option', () => {
      setupStoreMock({
        connectionError: { code: 'CONNECTION_FAILED', message: 'Connection setup failed. Please try again.' },
      });

      renderWithProvider();

      expect(screen.getByText('Connection setup failed. Please try again.')).toBeTruthy();
      expect(screen.getByLabelText('Retry bank connection')).toBeTruthy();
    });

    it('retry clears error and shows consent dialog', () => {
      setupStoreMock({
        connectionError: { code: 'CONNECTION_FAILED', message: 'Connection failed' },
      });

      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Retry bank connection'));

      expect(mockClearConnectionError).toHaveBeenCalled();
    });
  });

  describe('View Supported Banks', () => {
    it('renders View Supported Banks button', () => {
      renderWithProvider();
      expect(screen.getByLabelText('View Supported Banks')).toBeTruthy();
    });

    it('navigates to SupportedBanks screen on press', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('View Supported Banks'));
      expect(mockNavigate).toHaveBeenCalledWith('SupportedBanks');
    });

    it('shows View Supported Banks button even when bank is connected', () => {
      setupStoreMock({
        connections: [{
          id: 'conn-1', userId: 'u1', provider: 'tink', bankName: 'Demo Bank',
          status: 'active', connectedAt: '2026-03-21T12:00:00Z',
          consentGrantedAt: '2026-03-21T12:00:00Z', consentExpiresAt: '2026-09-17T12:00:00Z',
          lastSyncedAt: null, tinkCredentialsId: 'cred-1',
        }],
      });
      renderWithProvider();
      expect(screen.getByLabelText('View Supported Banks')).toBeTruthy();
    });
  });

  describe('autoConnect param', () => {
    it('shows consent dialog immediately when autoConnect is true', () => {
      mockRouteParams.autoConnect = true;
      renderWithProvider();
      expect(screen.getByText('Bank Connection Consent')).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('disables Connect button when isConnecting is true', () => {
      setupStoreMock({ isConnecting: true });

      renderWithProvider();

      // The screen shows the processing state when isConnecting is true
      expect(screen.getByText('Setting up your bank connection...')).toBeTruthy();
    });
  });

  describe('Scan for Subscriptions button', () => {
    it('shows Scan for Subscriptions button when there is an active connection', () => {
      setupStoreMock({ connections: [mockActiveConnection] });

      renderWithProvider();

      expect(screen.getByLabelText('Scan for Subscriptions')).toBeTruthy();
    });

    it('does NOT show Scan button when no connections', () => {
      setupStoreMock({ connections: [] });

      renderWithProvider();

      expect(screen.queryByLabelText('Scan for Subscriptions')).toBeNull();
    });

    it('shows Reconnect required text for expired connection instead of scan button', () => {
      setupStoreMock({
        connections: [{ ...mockActiveConnection, status: 'expired' }],
      });

      renderWithProvider();

      expect(screen.getByLabelText('Reconnect required')).toBeTruthy();
      expect(screen.queryByLabelText('Scan for Subscriptions')).toBeNull();
    });

    it('calls detectSubscriptions with correct connectionId on press', () => {
      setupStoreMock({ connections: [mockActiveConnection] });

      renderWithProvider();

      fireEvent.press(screen.getByLabelText('Scan for Subscriptions'));

      expect(mockDetectSubscriptions).toHaveBeenCalledWith('conn-1');
    });
  });

  describe('Detection loading state', () => {
    it('shows scanning indicator when isDetecting is true', () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        isDetecting: true,
      });

      renderWithProvider();

      expect(screen.getByText('Scanning your transactions...')).toBeTruthy();
    });

    it('hides Scan button during detection', () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        isDetecting: true,
      });

      renderWithProvider();

      expect(screen.queryByLabelText('Scan for Subscriptions')).toBeNull();
    });
  });

  describe('Detection success snackbar', () => {
    it('shows subscriptions detected snackbar on success', async () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        lastDetectionResult: { success: true, detectedCount: 3, newCount: 2 },
        isDetecting: false,
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('3 subscriptions detected!')).toBeTruthy();
      });
    });

    it('shows no subscriptions detected message when count is 0', async () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        lastDetectionResult: { success: true, detectedCount: 0, newCount: 0 },
        isDetecting: false,
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText(/No recurring subscriptions detected yet/)).toBeTruthy();
      });
    });
  });

  describe('Last synced display', () => {
    it('shows Never scanned when lastSyncedAt is null', () => {
      setupStoreMock({
        connections: [{ ...mockActiveConnection, lastSyncedAt: null }],
      });

      renderWithProvider();

      expect(screen.getByText('Never scanned')).toBeTruthy();
    });

    it('shows last scanned date when lastSyncedAt is set', () => {
      setupStoreMock({
        connections: [{ ...mockActiveConnection, lastSyncedAt: '2026-03-22T10:00:00Z' }],
      });

      renderWithProvider();

      expect(screen.getByText(/Last scanned:/)).toBeTruthy();
    });
  });

  describe('Review Detected button (AC7)', () => {
    it('shows Review Detected button when detected subscriptions exist', () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        detectedSubscriptions: [
          { id: 'det-1', userId: 'u1', bankConnectionId: 'c1', tinkGroupId: 'g1', merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly', confidenceScore: 0.9, status: 'detected', firstSeen: '2025-09-15', lastSeen: '2026-02-15' },
        ],
      });

      renderWithProvider();

      expect(screen.getByLabelText('Review 1 detected subscription')).toBeTruthy();
    });

    it('does NOT show Review Detected button when no detected subscriptions', () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        detectedSubscriptions: [],
      });

      renderWithProvider();

      expect(screen.queryByLabelText(/Review.*detected/)).toBeNull();
    });

    it('navigates to DetectedReview on Review button press', () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        detectedSubscriptions: [
          { id: 'det-1', userId: 'u1', bankConnectionId: 'c1', tinkGroupId: 'g1', merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly', confidenceScore: 0.9, status: 'detected', firstSeen: '2025-09-15', lastSeen: '2026-02-15' },
        ],
      });

      renderWithProvider();

      fireEvent.press(screen.getByLabelText('Review 1 detected subscription'));
      expect(mockNavigate).toHaveBeenCalledWith('DetectedReview');
    });

    it('shows detection snackbar with Review action when subscriptions found', async () => {
      setupStoreMock({
        connections: [mockActiveConnection],
        lastDetectionResult: { success: true, detectedCount: 3, newCount: 2 },
        isDetecting: false,
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('3 subscriptions detected!')).toBeTruthy();
      });
    });
  });
});
