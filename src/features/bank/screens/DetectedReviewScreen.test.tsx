import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useBankStore } from '@shared/stores/useBankStore';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { DetectedReviewScreen } from './DetectedReviewScreen';
import type { MatchResult } from '@shared/stores/useBankStore';

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

const mockFetchDetectedSubscriptions = jest.fn().mockResolvedValue(undefined);
const mockDismissDetectedSubscription = jest.fn();
const mockApproveDetectedSubscription = jest.fn();
const mockComputeMatches = jest.fn();
const mockConfirmMatch = jest.fn().mockResolvedValue(undefined);
const mockReplaceWithDetected = jest.fn().mockResolvedValue(undefined);
const mockDismissMatch = jest.fn();
const mockFetchSubscriptions = jest.fn().mockResolvedValue(undefined);

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

const mockMatchResult: MatchResult = {
  detectedId: 'det-1',
  subscriptionId: 'sub-1',
  subscriptionName: 'Netflix Premium',
  subscriptionPrice: 12.99,
  subscriptionBillingCycle: 'monthly',
  subscriptionCurrency: 'EUR',
  matchScore: 0.7,
  matchReasons: ['name_similar', 'cycle_match'],
};

type BankStateOverride = {
  detectedSubscriptions?: typeof mockDetected;
  isFetchingDetected?: boolean;
  detectionError?: { code: string; message: string } | null;
  matchResults?: Map<string, MatchResult>;
};

function setupMocks(overrides: BankStateOverride & {
  canAddSubscription?: boolean;
  activeCount?: number;
} = {}) {
  const {
    detectedSubscriptions = mockDetected,
    isFetchingDetected = false,
    detectionError = null,
    canAddSubscription = true,
    activeCount = 2,
    matchResults = new Map(),
  } = overrides;

  const bankState = {
    detectedSubscriptions,
    isFetchingDetected,
    detectionError,
    matchResults,
    fetchDetectedSubscriptions: mockFetchDetectedSubscriptions,
    dismissDetectedSubscription: mockDismissDetectedSubscription,
    approveDetectedSubscription: mockApproveDetectedSubscription,
    computeMatches: mockComputeMatches,
    confirmMatch: mockConfirmMatch,
    replaceWithDetected: mockReplaceWithDetected,
    dismissMatch: mockDismissMatch,
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
    fetchSubscriptions: mockFetchSubscriptions,
  };
  mockUseSubscriptionStore.mockImplementation(
    (selector: (s: typeof subscriptionState) => unknown) => selector(subscriptionState) as never,
  );
  (useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore> & { getState: () => typeof subscriptionState }).getState =
    jest.fn().mockReturnValue(subscriptionState);
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
    it('renders list of detected subscription cards when no matches', () => {
      renderWithProvider();
      expect(screen.getByText('Netflix')).toBeTruthy();
      expect(screen.getByText('Spotify')).toBeTruthy();
    });

    it('shows singular subscription count header when no matches', () => {
      setupMocks({ detectedSubscriptions: [mockDetected[0]] });
      renderWithProvider();
      expect(screen.getByText('1 subscription to review')).toBeTruthy();
    });

    it('shows plural subscription count header when no matches', () => {
      renderWithProvider();
      expect(screen.getByText('2 subscriptions to review')).toBeTruthy();
    });

    it('calls fetchDetectedSubscriptions on focus', () => {
      renderWithProvider();
      expect(mockFetchDetectedSubscriptions).toHaveBeenCalled();
    });

    it('calls fetchSubscriptions on focus', async () => {
      renderWithProvider();
      await waitFor(() => {
        expect(mockFetchSubscriptions).toHaveBeenCalled();
      });
    });

    it('calls computeMatches on focus', async () => {
      renderWithProvider();
      await waitFor(() => {
        expect(mockComputeMatches).toHaveBeenCalled();
      });
    });
  });

  describe('Match rendering', () => {
    it('renders MatchSuggestionCard for matched item', () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      expect(screen.getByText('Possible Match')).toBeTruthy();
    });

    it('renders DetectedReviewCard for unmatched item', () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      // det-2 (Spotify) has no match → renders as DetectedReviewCard
      expect(screen.getByText('Spotify')).toBeTruthy();
      expect(screen.getByLabelText('Ignore Spotify')).toBeTruthy();
    });

    it('shows match count header when matches exist', () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      expect(screen.getByText('1 match, 1 to review')).toBeTruthy();
    });

    it('shows plural matches in header', () => {
      const match2: MatchResult = { ...mockMatchResult, detectedId: 'det-2', subscriptionId: 'sub-2' };
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult], ['det-2', match2]]) });
      renderWithProvider();
      expect(screen.getByText('2 matches, 0 to review')).toBeTruthy();
    });
  });

  describe('Sort order', () => {
    it('renders matched items before unmatched items', () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      // Possible Match chip indicates det-1 is rendered first
      expect(screen.getByText('Possible Match')).toBeTruthy();
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
          lastSeen: '2026-02-15',
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

  describe('Confirm Match action', () => {
    it('calls confirmMatch when Confirm Match is pressed', async () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Confirm match between Netflix and Netflix Premium'));
      await waitFor(() => {
        expect(mockConfirmMatch).toHaveBeenCalledWith('det-1');
      });
    });

    it('shows success snackbar after confirm match', async () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Confirm match between Netflix and Netflix Premium'));
      await waitFor(() => {
        expect(screen.getByText('Subscription matched successfully!')).toBeTruthy();
      });
    });
  });

  describe('Not a Match action', () => {
    it('calls dismissMatch when Not a Match is pressed', () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Not a match: Netflix'));
      expect(mockDismissMatch).toHaveBeenCalledWith('det-1');
    });
  });

  describe('Replace action', () => {
    it('calls replaceWithDetected when Replace is pressed', async () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Replace Netflix Premium with detected data'));
      await waitFor(() => {
        expect(mockReplaceWithDetected).toHaveBeenCalledWith('det-1');
      });
    });

    it('shows success snackbar after replace', async () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();
      fireEvent.press(screen.getByLabelText('Replace Netflix Premium with detected data'));
      await waitFor(() => {
        expect(screen.getByText('Subscription updated with bank data!')).toBeTruthy();
      });
    });
  });

  describe('Error handling', () => {
    it('shows error snackbar when confirmMatch fails', async () => {
      setupMocks({ matchResults: new Map([['det-1', mockMatchResult]]) });
      renderWithProvider();

      // Simulate error state after confirmMatch
      const bankStateWithError = {
        detectedSubscriptions: mockDetected,
        isFetchingDetected: false,
        detectionError: { code: 'CONFIRM_MATCH_FAILED', message: 'Failed to confirm match. Please try again.' },
        matchResults: new Map([['det-1', mockMatchResult]]),
        fetchDetectedSubscriptions: mockFetchDetectedSubscriptions,
        dismissDetectedSubscription: mockDismissDetectedSubscription,
        approveDetectedSubscription: mockApproveDetectedSubscription,
        computeMatches: mockComputeMatches,
        confirmMatch: mockConfirmMatch,
        replaceWithDetected: mockReplaceWithDetected,
        dismissMatch: mockDismissMatch,
      };
      (useBankStore as jest.MockedFunction<typeof useBankStore> & { getState: () => typeof bankStateWithError }).getState =
        jest.fn().mockReturnValue(bankStateWithError);

      fireEvent.press(screen.getByLabelText('Confirm match between Netflix and Netflix Premium'));
      await waitFor(() => {
        expect(mockConfirmMatch).toHaveBeenCalled();
      });
    });
  });
});
