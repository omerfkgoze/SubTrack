import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useBankStore } from '@shared/stores/useBankStore';
import { DismissedItemsScreen } from './DismissedItemsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => (() => void) | void) => { cb(); },
}));

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn(),
}));

const mockUseBankStore = useBankStore as jest.MockedFunction<typeof useBankStore>;

const mockFetchDismissedItems = jest.fn().mockResolvedValue(undefined);
const mockUndismissDetectedSubscription = jest.fn().mockResolvedValue(undefined);

const mockDismissedItem = {
  id: 'det-5',
  userId: 'user-1',
  bankConnectionId: 'conn-1',
  tinkGroupId: 'g5',
  merchantName: 'Coffee Shop',
  amount: 4.50,
  currency: 'EUR',
  frequency: 'weekly' as const,
  confidenceScore: 0.55,
  status: 'dismissed' as const,
  firstSeen: '2026-01-01',
  lastSeen: '2026-03-20',
};

type BankStateOverride = {
  dismissedItems?: typeof mockDismissedItem[];
  isFetchingDismissedItems?: boolean;
  detectionError?: { code: string; message: string } | null;
};

function setupMocks(overrides: BankStateOverride = {}) {
  const {
    dismissedItems = [mockDismissedItem],
    isFetchingDismissedItems = false,
    detectionError = null,
  } = overrides;

  const bankState = {
    dismissedItems,
    isFetchingDismissedItems,
    detectionError,
    fetchDismissedItems: mockFetchDismissedItems,
    undismissDetectedSubscription: mockUndismissDetectedSubscription,
  };

  mockUseBankStore.mockImplementation(
    (selector: (s: typeof bankState) => unknown) => selector(bankState) as never,
  );
  (useBankStore as jest.MockedFunction<typeof useBankStore> & { getState: () => typeof bankState }).getState =
    jest.fn().mockReturnValue({ ...bankState, detectionError: null });
}

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <DismissedItemsScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

describe('DismissedItemsScreen', () => {
  describe('Loading state', () => {
    it('shows loading indicator when fetching', () => {
      setupMocks({ isFetchingDismissedItems: true, dismissedItems: [] });
      renderWithProvider();
      expect(screen.getByLabelText('Loading dismissed items')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('shows empty state message when no dismissed items', () => {
      setupMocks({ dismissedItems: [] });
      renderWithProvider();
      expect(screen.getByText('No dismissed items')).toBeTruthy();
      expect(screen.getByText(/Not a Subscription/)).toBeTruthy();
    });
  });

  describe('List rendering', () => {
    it('renders dismissed items in list', () => {
      renderWithProvider();
      expect(screen.getByText('Coffee Shop')).toBeTruthy();
    });

    it('renders the Undo button for each item', () => {
      renderWithProvider();
      expect(screen.getByText('Undo')).toBeTruthy();
    });

    it('calls fetchDismissedItems on focus', () => {
      renderWithProvider();
      expect(mockFetchDismissedItems).toHaveBeenCalled();
    });
  });

  describe('Undo dismiss action', () => {
    it('calls undismissDetectedSubscription when Undo is pressed', async () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Undo dismiss for Coffee Shop'));
      await waitFor(() => {
        expect(mockUndismissDetectedSubscription).toHaveBeenCalledWith('det-5');
      });
    });

    it('shows success snackbar after undo', async () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Undo dismiss for Coffee Shop'));
      await waitFor(() => {
        expect(screen.getByText('Item restored to detected list.')).toBeTruthy();
      });
    });

    it('shows error snackbar on UNDISMISS_FAILED', async () => {
      (useBankStore as jest.MockedFunction<typeof useBankStore> & { getState: () => { detectionError: { code: string; message: string } | null } }).getState =
        jest.fn().mockReturnValue({ detectionError: { code: 'UNDISMISS_FAILED', message: 'Failed to restore.' } });

      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Undo dismiss for Coffee Shop'));
      await waitFor(() => {
        expect(screen.getByText('Failed to restore.')).toBeTruthy();
      });
    });
  });

  describe('Multiple items', () => {
    it('renders multiple dismissed items', () => {
      const secondItem = {
        ...mockDismissedItem,
        id: 'det-6',
        merchantName: 'Supermarket Weekly',
      };
      setupMocks({ dismissedItems: [mockDismissedItem, secondItem] });
      renderWithProvider();
      expect(screen.getByText('Coffee Shop')).toBeTruthy();
      expect(screen.getByText('Supermarket Weekly')).toBeTruthy();
    });
  });
});
