import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { PremiumStatusCard } from './PremiumStatusCard';
import { openSubscriptionManagement } from '@features/premium/services/subscriptionManagement';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { theme } from '@config/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@features/premium/services/subscriptionManagement', () => ({
  openSubscriptionManagement: jest.fn(),
}));

jest.mock('@shared/stores/usePremiumStore', () => ({
  usePremiumStore: jest.fn(),
}));

jest.mock('react-native-iap', () => ({}));

const mockOpenSubscriptionManagement = openSubscriptionManagement as jest.MockedFunction<typeof openSubscriptionManagement>;
const mockUsePremiumStore = usePremiumStore as jest.MockedFunction<typeof usePremiumStore>;

function renderWithTheme(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('PremiumStatusCard', () => {
  const mockOnManageError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePremiumStore.mockImplementation((selector: (s: { planType: string | null; expiresAt: string | null }) => unknown) =>
      selector({ planType: null, expiresAt: null }) as never,
    );
  });

  it('renders "Premium Active" badge', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Premium Active')).toBeTruthy();
  });

  it('renders "Premium Subscription" when no planType', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Premium Subscription')).toBeTruthy();
  });

  it('renders "Monthly Plan" when planType is monthly', () => {
    mockUsePremiumStore.mockImplementation((selector: (s: { planType: string | null; expiresAt: string | null }) => unknown) =>
      selector({ planType: 'monthly', expiresAt: '2027-01-15T00:00:00Z' }) as never,
    );

    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Monthly Plan')).toBeTruthy();
  });

  it('renders "Yearly Plan" when planType is yearly', () => {
    mockUsePremiumStore.mockImplementation((selector: (s: { planType: string | null; expiresAt: string | null }) => unknown) =>
      selector({ planType: 'yearly', expiresAt: null }) as never,
    );

    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Yearly Plan')).toBeTruthy();
  });

  it('renders formatted renewal date when expiresAt is provided', () => {
    mockUsePremiumStore.mockImplementation((selector: (s: { planType: string | null; expiresAt: string | null }) => unknown) =>
      selector({ planType: 'monthly', expiresAt: '2027-01-15T00:00:00Z' }) as never,
    );

    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Renews on 15 Jan 2027')).toBeTruthy();
  });

  it('renders fallback text when no expiresAt', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Managed via App Store / Play Store')).toBeTruthy();
  });

  it('renders "Manage Subscription" button', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Manage Subscription')).toBeTruthy();
  });

  it('calls openSubscriptionManagement when manage button is pressed', async () => {
    mockOpenSubscriptionManagement.mockResolvedValueOnce(undefined);
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    await fireEvent.press(getByText('Manage Subscription'));
    expect(mockOpenSubscriptionManagement).toHaveBeenCalledTimes(1);
  });

  it('calls onManageError when openSubscriptionManagement throws', async () => {
    mockOpenSubscriptionManagement.mockRejectedValueOnce(new Error('Cannot open URL'));
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    await fireEvent.press(getByText('Manage Subscription'));
    await Promise.resolve();
    expect(mockOnManageError).toHaveBeenCalledWith(
      'Could not open subscription management. Please manage your subscription through the App Store or Google Play.',
    );
  });

  it('renders all premium features', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Unlimited subscriptions')).toBeTruthy();
    expect(getByText('Advanced reminder options')).toBeTruthy();
    expect(getByText('Calendar sync')).toBeTruthy();
    expect(getByText('Data export (CSV/JSON)')).toBeTruthy();
    expect(getByText('Full analytics & insights')).toBeTruthy();
  });
});
