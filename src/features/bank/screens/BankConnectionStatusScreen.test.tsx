import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { BankConnectionStatusScreen } from './BankConnectionStatusScreen';
import type { BankConnection } from '../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => (() => void) | void) => { cb(); },
}));

const mockFetchConnections = jest.fn();
const mockDisconnectConnection = jest.fn();
const mockRefreshBankData = jest.fn();

const mockConnections: BankConnection[] = [
  {
    id: 'conn-1',
    userId: 'user-1',
    provider: 'tink',
    bankName: 'Test Bank',
    status: 'active',
    connectedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    consentGrantedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    consentExpiresAt: new Date(Date.now() + 166 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tinkCredentialsId: 'cred-1',
  },
];

let mockStoreState = {
  connections: mockConnections,
  isFetchingConnections: false,
  fetchConnections: mockFetchConnections,
  disconnectConnection: mockDisconnectConnection,
  refreshBankData: mockRefreshBankData,
  isDisconnecting: false,
  isDetecting: false,
  isRefreshing: false,
  detectionError: null as { code: string; message: string } | null,
  lastDetectionResult: null as { detectedCount: number; newCount: number } | null,
};

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn((selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState)),
}));

function renderScreen() {
  return render(
    <PaperProvider theme={theme}>
      <BankConnectionStatusScreen />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState = {
    connections: mockConnections,
    isFetchingConnections: false,
    fetchConnections: mockFetchConnections,
    disconnectConnection: mockDisconnectConnection,
    refreshBankData: mockRefreshBankData,
    isDisconnecting: false,
    isDetecting: false,
    isRefreshing: false,
    detectionError: null,
    lastDetectionResult: null,
  };
  mockDisconnectConnection.mockResolvedValue(undefined);
  mockRefreshBankData.mockResolvedValue(undefined);

  // Mock useBankStore.getState for post-action error checking
  const { useBankStore } = jest.requireMock('@shared/stores/useBankStore');
  useBankStore.getState = jest.fn(() => ({
    connectionError: null,
    detectionError: null,
    lastDetectionResult: null,
  }));
});

describe('BankConnectionStatusScreen', () => {
  describe('loading state', () => {
    it('shows loading indicator when fetching', () => {
      mockStoreState.isFetchingConnections = true;
      mockStoreState.connections = [];
      renderScreen();
      expect(screen.getByLabelText('Loading bank connections')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no connections', () => {
      mockStoreState.connections = [];
      renderScreen();
      expect(screen.getByText('No bank connections')).toBeTruthy();
    });

    it('shows Connect Bank button in empty state', () => {
      mockStoreState.connections = [];
      renderScreen();
      expect(screen.getByLabelText('Connect Bank')).toBeTruthy();
    });

    it('navigates to BankConnection when Connect Bank pressed', () => {
      mockStoreState.connections = [];
      renderScreen();
      fireEvent.press(screen.getByLabelText('Connect Bank'));
      expect(mockNavigate).toHaveBeenCalledWith('BankConnection');
    });
  });

  describe('connections list', () => {
    it('renders connection card for each connection', () => {
      renderScreen();
      expect(screen.getByText('Test Bank')).toBeTruthy();
    });

    it('calls fetchConnections on focus', () => {
      renderScreen();
      expect(mockFetchConnections).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect flow', () => {
    it('shows confirmation dialog when Disconnect pressed', () => {
      renderScreen();
      fireEvent.press(screen.getByLabelText('Disconnect bank'));
      expect(screen.getByText('Disconnect Bank?')).toBeTruthy();
      expect(screen.getByText('Are you sure? This will stop auto-detection for this bank.')).toBeTruthy();
    });

    it('cancels disconnect when Cancel pressed in dialog', () => {
      renderScreen();
      fireEvent.press(screen.getByLabelText('Disconnect bank'));
      fireEvent.press(screen.getByLabelText('Cancel disconnect'));
      expect(mockDisconnectConnection).not.toHaveBeenCalled();
    });

    it('calls disconnectConnection when confirmed', async () => {
      renderScreen();
      fireEvent.press(screen.getByLabelText('Disconnect bank'));
      fireEvent.press(screen.getByLabelText('Confirm disconnect'));
      await waitFor(() => {
        expect(mockDisconnectConnection).toHaveBeenCalledWith('conn-1');
      });
    });

    it('shows success snackbar after disconnect', async () => {
      renderScreen();
      fireEvent.press(screen.getByLabelText('Disconnect bank'));
      fireEvent.press(screen.getByLabelText('Confirm disconnect'));
      await waitFor(() => {
        expect(screen.getByText('Bank disconnected successfully')).toBeTruthy();
      });
    });
  });

  describe('reconnect navigation', () => {
    it('navigates to BankConnection with autoConnect when Reconnect pressed', () => {
      mockStoreState.connections = [{
        ...mockConnections[0],
        status: 'expired',
        consentExpiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      }];
      renderScreen();
      fireEvent.press(screen.getByLabelText('Reconnect bank'));
      expect(mockNavigate).toHaveBeenCalledWith('BankConnection', { autoConnect: true });
    });
  });

  describe('pull-to-refresh', () => {
    it('renders RefreshControl on the connections list', () => {
      renderScreen();
      // FlatList with refreshControl should render without error
      expect(screen.getByText('Test Bank')).toBeTruthy();
    });

    it('calls refreshBankData for active connection on pull-to-refresh', async () => {
      renderScreen();
      const flatList = screen.UNSAFE_getByType(require('react-native').FlatList);
      await waitFor(async () => {
        flatList.props.refreshControl.props.onRefresh();
      });
      await waitFor(() => {
        expect(mockRefreshBankData).toHaveBeenCalledWith('conn-1');
      });
    });

    it('calls fetchConnections when no active connection on pull-to-refresh', async () => {
      mockStoreState.connections = [{
        ...mockConnections[0],
        status: 'expired',
      }];
      renderScreen();
      const flatList = screen.UNSAFE_getByType(require('react-native').FlatList);
      await waitFor(async () => {
        flatList.props.refreshControl.props.onRefresh();
      });
      await waitFor(() => {
        expect(mockFetchConnections).toHaveBeenCalled();
        expect(mockRefreshBankData).not.toHaveBeenCalled();
      });
    });

    it('shows error snackbar when refresh fails', async () => {
      const { useBankStore } = jest.requireMock('@shared/stores/useBankStore');
      useBankStore.getState = jest.fn(() => ({
        connectionError: null,
        detectionError: { code: 'DETECTION_FAILED', message: 'Refresh failed' },
        lastDetectionResult: null,
      }));

      renderScreen();
      const flatList = screen.UNSAFE_getByType(require('react-native').FlatList);
      await waitFor(async () => {
        flatList.props.refreshControl.props.onRefresh();
      });
      await waitFor(() => {
        expect(screen.getByText('Refresh failed')).toBeTruthy();
      });
    });

    it('per-card Refresh Now uses refreshBankData', async () => {
      renderScreen();
      fireEvent.press(screen.getByLabelText('Refresh bank data'));
      await waitFor(() => {
        expect(mockRefreshBankData).toHaveBeenCalledWith('conn-1');
      });
    });
  });
});
