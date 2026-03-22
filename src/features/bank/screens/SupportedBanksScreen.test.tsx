import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useBankStore } from '@shared/stores/useBankStore';
import { SupportedBanksScreen } from './SupportedBanksScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn(),
}));

const mockUseBankStore = useBankStore as jest.MockedFunction<typeof useBankStore>;
const mockFetchSupportedBanks = jest.fn();

const mockBanks = [
  { id: 'bank-1', displayName: 'Alpha Bank', market: 'SE', iconUrl: null, popular: true, rank: 1 },
  { id: 'bank-2', displayName: 'Beta Bank', market: 'DE', iconUrl: null, popular: false, rank: 5 },
  { id: 'bank-3', displayName: 'Gamma Bank', market: 'SE', iconUrl: null, popular: false, rank: 3 },
];

function setupStoreMock(overrides: Record<string, unknown> = {}) {
  const defaultState = {
    supportedBanks: mockBanks,
    isFetchingBanks: false,
    fetchBanksError: null,
    fetchSupportedBanks: mockFetchSupportedBanks,
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
      <SupportedBanksScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupStoreMock();
});

describe('SupportedBanksScreen', () => {
  describe('Loading state', () => {
    it('shows loading indicator when fetching with no data', () => {
      setupStoreMock({ supportedBanks: [], isFetchingBanks: true });
      renderWithProvider();
      expect(screen.getByLabelText('Loading supported banks')).toBeTruthy();
    });
  });

  describe('Bank list', () => {
    it('renders bank names', () => {
      renderWithProvider();
      expect(screen.getByText('Alpha Bank')).toBeTruthy();
      expect(screen.getByText('Beta Bank')).toBeTruthy();
      expect(screen.getByText('Gamma Bank')).toBeTruthy();
    });

    it('calls fetchSupportedBanks on focus', () => {
      renderWithProvider();
      expect(mockFetchSupportedBanks).toHaveBeenCalled();
    });
  });

  describe('Search', () => {
    it('filters banks by search query', () => {
      renderWithProvider();
      fireEvent.changeText(screen.getByLabelText('Search banks'), 'Alpha');
      expect(screen.getByText('Alpha Bank')).toBeTruthy();
      expect(screen.queryByText('Beta Bank')).toBeNull();
    });

    it('shows empty message when no results', () => {
      renderWithProvider();
      fireEvent.changeText(screen.getByLabelText('Search banks'), 'Nonexistent');
      expect(screen.getByText(/Your bank isn't supported yet/)).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('shows error message with retry button', () => {
      setupStoreMock({
        supportedBanks: [],
        fetchBanksError: { code: 'FETCH_BANKS_FAILED', message: "Couldn't load supported banks." },
      });
      renderWithProvider();
      expect(screen.getByText("Couldn't load supported banks.")).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('retries fetch on retry button press', () => {
      setupStoreMock({
        supportedBanks: [],
        fetchBanksError: { code: 'FETCH_BANKS_FAILED', message: 'Error' },
      });
      renderWithProvider();
      fireEvent.press(screen.getByText('Retry'));
      expect(mockFetchSupportedBanks).toHaveBeenCalled();
    });
  });

  describe('Bank tap navigation', () => {
    it('navigates to BankConnection with autoConnect on bank tap', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Alpha Bank - SE'));
      expect(mockNavigate).toHaveBeenCalledWith('BankConnection', { autoConnect: true });
    });
  });
});
