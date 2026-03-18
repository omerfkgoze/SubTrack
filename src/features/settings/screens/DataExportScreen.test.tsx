import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import type { Subscription } from '@features/subscriptions/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn(),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@shared/stores/useSubscriptionStore');

const mockExportToJSON = jest.fn().mockResolvedValue(undefined);
const mockExportToCSV = jest.fn().mockResolvedValue(undefined);
jest.mock('@features/settings/services/exportService', () => ({
  exportToJSON: (...args: unknown[]) => mockExportToJSON(...args),
  exportToCSV: (...args: unknown[]) => mockExportToCSV(...args),
}));

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<
  typeof useSubscriptionStore
>;

import { DataExportScreen } from './DataExportScreen';

const mockFetchSubscriptions = jest.fn();

const makeSubscription = (id: string): Subscription =>
  ({
    id,
    user_id: 'user-1',
    name: `Sub ${id}`,
    price: 9.99,
    currency: 'USD',
    billing_cycle: 'monthly',
    renewal_date: '2026-04-01',
    category: 'Entertainment',
    is_active: true,
    is_trial: false,
    trial_expiry_date: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    calendar_event_id: null,
  } as unknown as Subscription);

const renderWithProvider = (ui: React.ReactElement) =>
  render(<PaperProvider theme={theme}>{ui}</PaperProvider>);

function setupStore(subscriptions: Subscription[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseSubscriptionStore.mockImplementation((selector: (state: any) => unknown) =>
    selector({
      subscriptions,
      fetchSubscriptions: mockFetchSubscriptions,
    })
  );
}

describe('DataExportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSubscriptions.mockResolvedValue(undefined);
  });

  it('renders format selection (JSON and CSV options visible)', () => {
    setupStore([makeSubscription('1')]);
    renderWithProvider(<DataExportScreen />);

    expect(screen.getByText('JSON')).toBeTruthy();
    expect(screen.getByText('CSV')).toBeTruthy();
  });

  it('shows empty state message when no subscriptions', () => {
    setupStore([]);
    renderWithProvider(<DataExportScreen />);

    expect(
      screen.getByText('No data to export. Add subscriptions first.')
    ).toBeTruthy();
  });

  it('Export button is absent when no subscriptions', () => {
    setupStore([]);
    renderWithProvider(<DataExportScreen />);

    expect(screen.queryByText('Export')).toBeNull();
  });

  it('tapping Export with JSON selected calls exportToJSON', async () => {
    setupStore([makeSubscription('1')]);
    renderWithProvider(<DataExportScreen />);

    const exportButton = screen.getByText('Export');
    await act(async () => {
      fireEvent.press(exportButton);
    });

    await waitFor(() => {
      expect(mockExportToJSON).toHaveBeenCalledTimes(1);
    });
    expect(mockExportToCSV).not.toHaveBeenCalled();
  });

  it('tapping Export with CSV selected calls exportToCSV', async () => {
    setupStore([makeSubscription('1')]);
    renderWithProvider(<DataExportScreen />);

    const csvOption = screen.getByText('CSV');
    fireEvent.press(csvOption);

    const exportButton = screen.getByText('Export');
    await act(async () => {
      fireEvent.press(exportButton);
    });

    await waitFor(() => {
      expect(mockExportToCSV).toHaveBeenCalledTimes(1);
    });
    expect(mockExportToJSON).not.toHaveBeenCalled();
  });

  it('shows loading state during export (button disabled while isExporting)', async () => {
    let resolveExport!: () => void;
    mockExportToJSON.mockImplementation(
      () => new Promise<void>((resolve) => { resolveExport = resolve; })
    );
    setupStore([makeSubscription('1')]);
    renderWithProvider(<DataExportScreen />);

    const exportButton = screen.getByText('Export');
    fireEvent.press(exportButton);

    // While exporting, button should be loading/disabled
    await waitFor(() => {
      const btn = screen.getByLabelText('Export');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    resolveExport();
    await waitFor(() => {
      expect(mockExportToJSON).toHaveBeenCalledTimes(1);
    });
  });

  it('on export error: shows error snackbar', async () => {
    mockExportToJSON.mockRejectedValue(new Error('Share failed'));
    setupStore([makeSubscription('1')]);
    renderWithProvider(<DataExportScreen />);

    const exportButton = screen.getByText('Export');
    await act(async () => {
      fireEvent.press(exportButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Export failed. Please try again.')).toBeTruthy();
    });
  });

  it('on export success: shows success snackbar', async () => {
    mockExportToJSON.mockResolvedValue(undefined);
    setupStore([makeSubscription('1')]);
    renderWithProvider(<DataExportScreen />);

    const exportButton = screen.getByText('Export');
    await act(async () => {
      fireEvent.press(exportButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Export complete')).toBeTruthy();
    });
  });
});
