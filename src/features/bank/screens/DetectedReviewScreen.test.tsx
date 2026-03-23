import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useBankStore } from '@shared/stores/useBankStore';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { DetectedReviewScreen } from './DetectedReviewScreen';

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
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: (cb: () => (() => void) | void) => { cb(); },
}));

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn(),
}));

jest.mock('@shared/stores/usePremiumStore', () => ({
  usePremiumStore: jest.fn(),
}));

jest.mock('@shared/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: jest.fn(),
}));

const mockUseBankStore = useBankStore as jest.MockedFunction<typeof useBankStore>;
const mockUsePremiumStore = usePremiumStore as jest.MockedFunction<typeof usePremiumStore>;
const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;

const mockFetchDetectedSubscriptions = jest.fn();
const mockDismissDetectedSubscription = jest.fn();
const mockApproveDetectedSubscription = jest.fn();

const mockDetected = [
  {
    id: 'det-1', userId: 'u1', bankConnectionId: 'c1', tinkGroupId: 'g1',
    merchantName: 'Netflix', amount: 12.99, currency: 'EUR', frequency: 'monthly' as const,
    confidenceScore: 0.9, status: 'detected' as const, firstSeen: '2025-09-15', lastSeen: '2026-02-15',
  },
  {
    id: 'det-2', userId: 'u1', bankConnectionId: 'c1', tinkGroupId: 'g2',
    merchantName: 'Spotify', amount: 9.99, currency: 'EUR', frequency: 'monthly' as const,
    confidenceScore: 0.75, status: 'detected' as const, firstSeen: '2025-10-01', lastSeen: '2026-03-01',
  },
];

function setupMocks(overrides: {
  detectedSubscriptions?: typeof mockDetected;
  isFetchingDetected?: boolean;
  detectionError?: { code: string; message: string } | null;
  canAddSubscription?: boolean;
  activeCount?: number;
} = {}) {
  const {
    detectedSubscriptions = mockDetected,
    isFetchingDetected = false,
    detectionError = null,
    canAddSubscription = true,
    activeCount = 2,
  } = overrides;

  const bankState = {
    detectedSubscriptions,
    isFetchingDetected,
    detectionError,
    fetchDetectedSubscriptions: mockFetchDetectedSubscriptions,
    dismissDetectedSubscription: mockDismissDetectedSubscription,
    approveDetectedSubscription: mockApproveDetectedSubscription,
  };

  mockUseBankStore.mockImplementation(
    (selector: (s: typeof bankState) => unknown) => selector(bankState) as never,
  );
  (useBankStore as jest.MockedFunction<typeof useBankStore> & { getState: () => typeof bankState }).getState =
    jest.fn().mockReturnValue(bankState);

  const premiumState = {
    canAddSubscription: jest.fn().mockReturnValue(canAddSubscription),
  };
  mockUsePremiumStore.mockImplementation(
    (selector: (s: typeof premiumState) => unknown) => selector(premiumState) as never,
  );

  const subscriptionState = {
    subscriptions: Array.from({ length: activeCount }, (_, i) => ({
      id: `sub-${i}`, is_active: true,
    })),
  };
  mockUseSubscriptionStore.mockImplementation(
    (selector: (s: typeof subscriptionState) => unknown) => selector(subscriptionState) as never,
  );
}

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <DetectedReviewScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

describe('DetectedReviewScreen', () => {
  describe('Loading state', () => {
    it('shows loading indicator when fetching', () => {
      setupMocks({ isFetchingDetected: true, detectedSubscriptions: [] });
      renderWithProvider();
      expect(screen.getByLabelText('Loading detected subscriptions')).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('shows empty state message when no detected subscriptions', () => {
      setupMocks({ detectedSubscriptions: [] });
      renderWithProvider();
      expect(screen.getByText('No subscriptions to review')).toBeTruthy();
      expect(screen.getByText(/Scan your bank transactions/)).toBeTruthy();
    });

    it('shows Go to Bank Connection button in empty state', () => {
      setupMocks({ detectedSubscriptions: [] });
      renderWithProvider();
      expect(screen.getByLabelText('Go to Bank Connection')).toBeTruthy();
    });

    it('navigates to BankConnection on empty state button press', () => {
      setupMocks({ detectedSubscriptions: [] });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Go to Bank Connection'));
      expect(mockNavigate).toHaveBeenCalledWith('BankConnection', undefined);
    });
  });

  describe('List rendering', () => {
    it('renders list of detected subscription cards', () => {
      renderWithProvider();
      expect(screen.getByText('Netflix')).toBeTruthy();
      expect(screen.getByText('Spotify')).toBeTruthy();
    });

    it('shows subscription count header', () => {
      renderWithProvider();
      expect(screen.getByText('2 subscriptions to review')).toBeTruthy();
    });

    it('shows singular count when only one item', () => {
      setupMocks({ detectedSubscriptions: [mockDetected[0]] });
      renderWithProvider();
      expect(screen.getByText('1 subscription to review')).toBeTruthy();
    });

    it('calls fetchDetectedSubscriptions on focus', () => {
      renderWithProvider();
      expect(mockFetchDetectedSubscriptions).toHaveBeenCalled();
    });
  });

  describe('Approve action', () => {
    it('navigates to Add tab with prefill params when Add is pressed', () => {
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Add Netflix to My Subscriptions'));
      expect(mockNavigate).toHaveBeenCalledWith('Add', {
        prefill: {
          name: 'Netflix',
          price: 12.99,
          billing_cycle: 'monthly',
          currency: 'EUR',
          detectedId: 'det-1',
        },
      });
    });

    it('redirects to Premium screen when at subscription limit', () => {
      setupMocks({ canAddSubscription: false });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Add Netflix to My Subscriptions'));
      expect(mockNavigate).toHaveBeenCalledWith('Premium', { source: 'upsell' });
    });
  });

  describe('Dismiss action', () => {
    it('calls dismissDetectedSubscription when Ignore is pressed', async () => {
      mockDismissDetectedSubscription.mockResolvedValue(undefined);
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Ignore Netflix'));
      await waitFor(() => {
        expect(mockDismissDetectedSubscription).toHaveBeenCalledWith('det-1');
      });
    });

    it('calls dismissDetectedSubscription when Not a Sub is pressed', async () => {
      mockDismissDetectedSubscription.mockResolvedValue(undefined);
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Netflix is not a subscription'));
      await waitFor(() => {
        expect(mockDismissDetectedSubscription).toHaveBeenCalledWith('det-1');
      });
    });
  });
});
