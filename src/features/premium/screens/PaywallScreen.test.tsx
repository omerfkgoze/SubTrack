import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { PaywallScreen } from './PaywallScreen';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { theme } from '@config/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@shared/stores/usePremiumStore', () => ({
  usePremiumStore: jest.fn(),
}));

jest.mock('@features/premium/services/subscriptionManagement', () => ({
  openSubscriptionManagement: jest.fn(),
}));

const mockUsePremiumStore = usePremiumStore as jest.MockedFunction<typeof usePremiumStore>;

function renderWithTheme(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('PaywallScreen', () => {
  describe('free user view', () => {
    beforeEach(() => {
      mockUsePremiumStore.mockImplementation((selector: (s: { isPremium: boolean }) => unknown) =>
        selector({ isPremium: false }) as never,
      );
    });

    it('renders "Unlock Premium" header for free users', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Unlock Premium')).toBeTruthy();
    });

    it('renders feature comparison with Free and Premium columns', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Free')).toBeTruthy();
      expect(getByText('Premium')).toBeTruthy();
    });

    it('renders all free features', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Up to 5 subscriptions')).toBeTruthy();
      expect(getByText('Basic renewal reminders')).toBeTruthy();
      expect(getByText('Basic spending overview')).toBeTruthy();
    });

    it('renders all premium features', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Unlimited subscriptions')).toBeTruthy();
      expect(getByText('Advanced reminder options')).toBeTruthy();
      expect(getByText('Calendar sync')).toBeTruthy();
      expect(getByText('Data export (CSV/JSON)')).toBeTruthy();
      expect(getByText('Full analytics & insights')).toBeTruthy();
    });

    it('renders pricing options', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('€2.99/month')).toBeTruthy();
      expect(getByText('€24.99/year')).toBeTruthy();
    });

    it('shows "Coming soon" snackbar when upgrade button is pressed', async () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      fireEvent.press(getByText('Upgrade to Premium'));
      expect(getByText('Coming soon')).toBeTruthy();
    });

    it('renders legal links', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Restore Purchases')).toBeTruthy();
      expect(getByText('Terms of Use')).toBeTruthy();
      expect(getByText('Privacy Policy')).toBeTruthy();
    });

    it('does not render premium status view for free users', () => {
      const { queryByText } = renderWithTheme(<PaywallScreen />);
      expect(queryByText('Premium Active')).toBeNull();
    });
  });

  describe('premium user view', () => {
    beforeEach(() => {
      mockUsePremiumStore.mockImplementation((selector: (s: { isPremium: boolean }) => unknown) =>
        selector({ isPremium: true }) as never,
      );
    });

    it('renders premium status view for premium users', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Premium Active')).toBeTruthy();
    });

    it('renders "Premium Subscription" plan type', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Premium Subscription')).toBeTruthy();
    });

    it('renders "Manage Subscription" button', () => {
      const { getByText } = renderWithTheme(<PaywallScreen />);
      expect(getByText('Manage Subscription')).toBeTruthy();
    });

    it('does not render paywall UI for premium users', () => {
      const { queryByText } = renderWithTheme(<PaywallScreen />);
      expect(queryByText('Unlock Premium')).toBeNull();
      expect(queryByText('Upgrade to Premium')).toBeNull();
    });
  });
});
