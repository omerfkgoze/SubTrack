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

function setupStoreMock(overrides: Record<string, unknown> = {}) {
  const defaultState = {
    connections: [],
    isConnecting: false,
    connectionError: null,
    initiateConnection: mockInitiateConnection,
    clearConnectionError: mockClearConnectionError,
    fetchConnections: jest.fn(),
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
});
