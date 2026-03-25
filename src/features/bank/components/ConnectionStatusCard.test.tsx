import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { ConnectionStatusCard } from './ConnectionStatusCard';
import type { BankConnection } from '../types';

const now = new Date();

function makeConnection(overrides: Partial<BankConnection> = {}): BankConnection {
  return {
    id: 'conn-1',
    userId: 'user-1',
    provider: 'tink',
    bankName: 'Test Bank',
    status: 'active',
    connectedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    consentGrantedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    consentExpiresAt: new Date(now.getTime() + 166 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    tinkCredentialsId: 'cred-1',
    ...overrides,
  };
}

const mockOnDisconnect = jest.fn();
const mockOnReconnect = jest.fn();
const mockOnRefresh = jest.fn();

function renderCard(connection: BankConnection, props: Partial<{ isDisconnecting: boolean; isDetecting: boolean }> = {}) {
  return render(
    <PaperProvider theme={theme}>
      <ConnectionStatusCard
        connection={connection}
        onDisconnect={mockOnDisconnect}
        onReconnect={mockOnReconnect}
        onRefresh={mockOnRefresh}
        isDisconnecting={props.isDisconnecting ?? false}
        isDetecting={props.isDetecting ?? false}
      />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ConnectionStatusCard', () => {
  it('renders bank name', () => {
    renderCard(makeConnection());
    expect(screen.getByText('Test Bank')).toBeTruthy();
  });

  describe('active status', () => {
    it('shows Connected badge', () => {
      renderCard(makeConnection({ status: 'active' }));
      expect(screen.getByText('Connected')).toBeTruthy();
    });

    it('shows Disconnect and Refresh Now buttons', () => {
      renderCard(makeConnection({ status: 'active' }));
      expect(screen.getByLabelText('Disconnect bank')).toBeTruthy();
      expect(screen.getByLabelText('Refresh bank data')).toBeTruthy();
    });

    it('calls onDisconnect when Disconnect pressed', () => {
      renderCard(makeConnection({ status: 'active' }));
      fireEvent.press(screen.getByLabelText('Disconnect bank'));
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });

    it('calls onRefresh when Refresh Now pressed', () => {
      renderCard(makeConnection({ status: 'active' }));
      fireEvent.press(screen.getByLabelText('Refresh bank data'));
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('disables buttons when isDisconnecting', () => {
      renderCard(makeConnection({ status: 'active' }), { isDisconnecting: true });
      expect(screen.getByLabelText('Disconnect bank').props.accessibilityState?.disabled).toBe(true);
    });

    it('disables buttons when isDetecting', () => {
      renderCard(makeConnection({ status: 'active' }), { isDetecting: true });
      expect(screen.getByLabelText('Refresh bank data').props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('expired status', () => {
    it('shows Expired badge', () => {
      renderCard(makeConnection({ status: 'expired', consentExpiresAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() }));
      expect(screen.getByText('Expired')).toBeTruthy();
    });

    it('shows expired warning text', () => {
      renderCard(makeConnection({ status: 'expired', consentExpiresAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() }));
      expect(screen.getByText('Connection expired. Reconnect to continue auto-detection.')).toBeTruthy();
    });

    it('shows Reconnect button', () => {
      renderCard(makeConnection({ status: 'expired', consentExpiresAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() }));
      expect(screen.getByLabelText('Reconnect bank')).toBeTruthy();
    });

    it('calls onReconnect when Reconnect pressed', () => {
      renderCard(makeConnection({ status: 'expired', consentExpiresAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() }));
      fireEvent.press(screen.getByLabelText('Reconnect bank'));
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('expiring_soon status', () => {
    it('shows Expiring Soon badge', () => {
      renderCard(makeConnection({ status: 'expiring_soon', consentExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() }));
      expect(screen.getByText('Expiring Soon')).toBeTruthy();
    });

    it('shows Reconnect button', () => {
      renderCard(makeConnection({ status: 'expiring_soon', consentExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() }));
      expect(screen.getByLabelText('Reconnect bank')).toBeTruthy();
    });
  });

  describe('error status', () => {
    it('shows Error badge', () => {
      renderCard(makeConnection({ status: 'error' }));
      expect(screen.getByText('Error')).toBeTruthy();
    });

    it('shows error message and Retry button', () => {
      renderCard(makeConnection({ status: 'error' }));
      expect(screen.getByText(/error occurred/i)).toBeTruthy();
      expect(screen.getByLabelText('Retry bank connection')).toBeTruthy();
    });

    it('calls onReconnect when Retry pressed', () => {
      renderCard(makeConnection({ status: 'error' }));
      fireEvent.press(screen.getByLabelText('Retry bank connection'));
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnected status', () => {
    it('shows Disconnected badge', () => {
      renderCard(makeConnection({ status: 'disconnected' }));
      expect(screen.getByText('Disconnected')).toBeTruthy();
    });

    it('does not show action buttons for disconnected status', () => {
      renderCard(makeConnection({ status: 'disconnected' }));
      expect(screen.queryByLabelText('Disconnect bank')).toBeNull();
      expect(screen.queryByLabelText('Reconnect bank')).toBeNull();
    });

    it('shows disconnected help text', () => {
      renderCard(makeConnection({ status: 'disconnected' }));
      expect(screen.getByLabelText('Bank disconnected')).toBeTruthy();
      expect(screen.getByText('Connect a new bank from the Bank Connection screen.')).toBeTruthy();
    });
  });
});
