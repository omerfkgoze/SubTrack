import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { AddSubscriptionScreen } from './AddSubscriptionScreen';

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

const mockGoBack = jest.fn();
const mockRouteParams: { prefill?: {
  name: string; price: number; billing_cycle: string; currency: string; detectedId: string;
} } = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockAddSubscription = jest.fn();
const mockClearError = jest.fn();
const mockApproveDetectedSubscription = jest.fn();

const mockSubscriptionStoreState = {
  subscriptions: [] as { id: string; is_active: boolean }[],
  isSubmitting: false,
  error: null as null | { message: string },
  addSubscription: mockAddSubscription,
  clearError: mockClearError,
};

jest.mock('@shared/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: Object.assign(
    jest.fn((selector: (s: typeof mockSubscriptionStoreState) => unknown) =>
      selector(mockSubscriptionStoreState),
    ),
    { getState: jest.fn(() => mockSubscriptionStoreState) },
  ),
}));

const mockBankStoreState = {
  approveDetectedSubscription: mockApproveDetectedSubscription,
};

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: Object.assign(
    jest.fn((selector: (s: typeof mockBankStoreState) => unknown) =>
      selector(mockBankStoreState),
    ),
    { getState: jest.fn(() => mockBankStoreState) },
  ),
}));

// Required mocks for date picker
jest.mock('react-native-paper-dates', () => ({
  DatePickerInput: ({ label }: { label: string }) => {
    const { TextInput } = require('react-native');
    return <TextInput testID={label} accessibilityLabel={label} />;
  },
  registerTranslation: jest.fn(),
  en: {},
}));

jest.mock('@config/categories', () => ({
  SUBSCRIPTION_CATEGORIES: [
    { id: 'entertainment', label: 'Entertainment', icon: 'play' },
  ],
}));

jest.mock('@config/popularServices', () => ({
  searchPopularServices: jest.fn().mockReturnValue([]),
}));

jest.mock('@shared/components/CelebrationOverlay', () => ({
  CelebrationOverlay: () => null,
}));

function renderWithProvider() {
  return render(
    <PaperProvider theme={theme}>
      <AddSubscriptionScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams.prefill = undefined;
  mockAddSubscription.mockResolvedValue(true);
  mockSubscriptionStoreState.subscriptions = [];
  mockSubscriptionStoreState.error = null;
});

describe('AddSubscriptionScreen', () => {
  describe('Normal rendering (no prefill)', () => {
    it('renders the form without prefill', () => {
      renderWithProvider();
      expect(screen.getByText('Add Subscription')).toBeTruthy();
    });

    it('has Save Subscription button', () => {
      renderWithProvider();
      expect(screen.getByLabelText('Save Subscription')).toBeTruthy();
    });
  });

  describe('Pre-fill from detected subscription params', () => {
    beforeEach(() => {
      mockRouteParams.prefill = {
        name: 'Netflix',
        price: 12.99,
        billing_cycle: 'monthly',
        currency: 'EUR',
        detectedId: 'det-1',
      };
    });

    it('pre-fills the name field from prefill params', async () => {
      renderWithProvider();
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Subscription name');
        expect(nameInput.props.value).toBe('Netflix');
      });
    });

    it('calls approveDetectedSubscription after successful save with detectedId', async () => {
      mockAddSubscription.mockResolvedValue(true);
      mockApproveDetectedSubscription.mockResolvedValue(undefined);

      renderWithProvider();

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Subscription name');
        expect(nameInput.props.value).toBe('Netflix');
      });

      fireEvent.press(screen.getByLabelText('Save Subscription'));

      await waitFor(() => {
        expect(mockAddSubscription).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockApproveDetectedSubscription).toHaveBeenCalledWith('det-1');
      });
    });

    it('does NOT call approveDetectedSubscription if save fails', async () => {
      mockAddSubscription.mockResolvedValue(false);
      mockSubscriptionStoreState.error = { message: 'Failed to save' };

      renderWithProvider();

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Subscription name');
        expect(nameInput.props.value).toBe('Netflix');
      });

      fireEvent.press(screen.getByLabelText('Save Subscription'));

      await waitFor(() => {
        expect(mockAddSubscription).toHaveBeenCalled();
      });

      expect(mockApproveDetectedSubscription).not.toHaveBeenCalled();
    });
  });
});
