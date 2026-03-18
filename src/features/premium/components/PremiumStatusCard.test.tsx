import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { PremiumStatusCard } from './PremiumStatusCard';
import { openSubscriptionManagement } from '@features/premium/services/subscriptionManagement';
import { theme } from '@config/theme';

jest.mock('@features/premium/services/subscriptionManagement', () => ({
  openSubscriptionManagement: jest.fn(),
}));

const mockOpenSubscriptionManagement = openSubscriptionManagement as jest.MockedFunction<typeof openSubscriptionManagement>;

function renderWithTheme(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('PremiumStatusCard', () => {
  const mockOnManageError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Premium Active" badge', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Premium Active')).toBeTruthy();
  });

  it('renders "Premium Subscription" plan type', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Premium Subscription')).toBeTruthy();
  });

  it('renders renewal info placeholder', () => {
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
    await Promise.resolve(); // flush microtasks
    expect(mockOnManageError).toHaveBeenCalledWith(
      'Could not open subscription management. Please manage your subscription through the App Store or Google Play.',
    );
  });

  it('renders all premium features with unlocked styling', () => {
    const { getByText } = renderWithTheme(<PremiumStatusCard onManageError={mockOnManageError} />);
    expect(getByText('Unlimited subscriptions')).toBeTruthy();
    expect(getByText('Advanced reminder options')).toBeTruthy();
    expect(getByText('Calendar sync')).toBeTruthy();
    expect(getByText('Data export (CSV/JSON)')).toBeTruthy();
    expect(getByText('Full analytics & insights')).toBeTruthy();
  });
});
