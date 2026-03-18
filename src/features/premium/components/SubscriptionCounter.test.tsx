import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SubscriptionCounter } from './SubscriptionCounter';
import { usePremiumStore } from '@shared/stores/usePremiumStore';
import { theme } from '@config/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/stores/usePremiumStore', () => ({
  usePremiumStore: jest.fn(),
  MAX_FREE_SUBSCRIPTIONS: 5,
}));

const mockUsePremiumStore = usePremiumStore as jest.MockedFunction<typeof usePremiumStore>;

function renderWithTheme(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('SubscriptionCounter', () => {
  it('renders "X/5 subscriptions used" for free users', () => {
    mockUsePremiumStore.mockReturnValue(false as never);

    const { getByText } = renderWithTheme(<SubscriptionCounter activeCount={3} />);
    expect(getByText('3/5 subscriptions used')).toBeTruthy();
  });

  it('renders nothing for premium users', () => {
    mockUsePremiumStore.mockReturnValue(true as never);

    const { queryByText } = renderWithTheme(<SubscriptionCounter activeCount={3} />);
    expect(queryByText(/subscriptions used/)).toBeNull();
  });

  it('renders count of 0 correctly', () => {
    mockUsePremiumStore.mockReturnValue(false as never);

    const { getByText } = renderWithTheme(<SubscriptionCounter activeCount={0} />);
    expect(getByText('0/5 subscriptions used')).toBeTruthy();
  });

  it('renders count of 5 (at limit) correctly', () => {
    mockUsePremiumStore.mockReturnValue(false as never);

    const { getByText } = renderWithTheme(<SubscriptionCounter activeCount={5} />);
    expect(getByText('5/5 subscriptions used')).toBeTruthy();
  });
});
