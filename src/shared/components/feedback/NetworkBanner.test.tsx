import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';

const mockUseNetworkStatus = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    refresh: (...args: unknown[]) => mockRefresh(...args),
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(),
  },
  useNetInfo: jest.fn(),
}));

import { NetworkBanner } from './NetworkBanner';

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('NetworkBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders banner text when isOnline is false', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    renderWithProvider(<NetworkBanner />);
    await act(() => jest.runAllTimers());
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  it('renders Retry button when offline', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    renderWithProvider(<NetworkBanner />);
    await act(() => jest.runAllTimers());
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('calls NetInfo.refresh when Retry button is pressed', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    renderWithProvider(<NetworkBanner />);
    await act(() => jest.runAllTimers());
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRefresh).toHaveBeenCalled();
  });
});
