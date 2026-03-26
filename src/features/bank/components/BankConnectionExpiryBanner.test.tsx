import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { BankConnectionExpiryBanner } from './BankConnectionExpiryBanner';
import type { BankConnection } from '../types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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
    lastSyncedAt: null,
    tinkCredentialsId: 'cred-1',
    ...overrides,
  };
}

let mockBankStoreState = {
  connections: [] as BankConnection[],
};

jest.mock('@shared/stores/useBankStore', () => ({
  useBankStore: jest.fn((selector: (s: typeof mockBankStoreState) => unknown) =>
    selector(mockBankStoreState)
  ),
}));

function renderBanner() {
  return render(
    <PaperProvider theme={theme}>
      <BankConnectionExpiryBanner />
    </PaperProvider>
  );
}

describe('BankConnectionExpiryBanner', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockBankStoreState = { connections: [] };
  });

  it('returns null when no connections', () => {
    renderBanner();
    expect(screen.queryByText(/connection/i)).toBeNull();
  });

  it('returns null when all connections are active', () => {
    mockBankStoreState = { connections: [makeConnection({ status: 'active' })] };
    renderBanner();
    expect(screen.queryByText(/expires/i)).toBeNull();
  });

  it('returns null when connection is disconnected', () => {
    mockBankStoreState = { connections: [makeConnection({ status: 'disconnected' })] };
    renderBanner();
    expect(screen.queryByText(/expires/i)).toBeNull();
  });

  it('renders amber banner for expiring_soon connection', () => {
    mockBankStoreState = {
      connections: [makeConnection({ status: 'expiring_soon', bankName: 'Sparkasse' })],
    };
    renderBanner();
    expect(screen.getByText(/Sparkasse.*expires soon/i)).toBeTruthy();
    expect(screen.getByText('Reconnect')).toBeTruthy();
  });

  it('renders red banner for expired connection', () => {
    mockBankStoreState = {
      connections: [makeConnection({ status: 'expired', bankName: 'ING' })],
    };
    renderBanner();
    expect(screen.getByText(/ING.*expired/i)).toBeTruthy();
    expect(screen.getByText('Reconnect')).toBeTruthy();
  });

  it('Reconnect button navigates to BankConnectionStatus', () => {
    mockBankStoreState = {
      connections: [makeConnection({ status: 'expired', bankName: 'ING' })],
    };
    renderBanner();
    fireEvent.press(screen.getByText('Reconnect'));
    expect(mockNavigate).toHaveBeenCalledWith('BankConnectionStatus');
  });

  it('shows first expiring/expired connection when multiple connections exist', () => {
    mockBankStoreState = {
      connections: [
        makeConnection({ id: 'conn-1', status: 'active', bankName: 'Active Bank' }),
        makeConnection({ id: 'conn-2', status: 'expiring_soon', bankName: 'Expiring Bank' }),
        makeConnection({ id: 'conn-3', status: 'expired', bankName: 'Expired Bank' }),
      ],
    };
    renderBanner();
    // Should show the first matching connection (expiring_soon found first)
    expect(screen.getByText(/Expiring Bank.*expires soon/i)).toBeTruthy();
  });
});
