import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import type { Subscription } from '@features/subscriptions/types';

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Supabase mock
jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn(),
  },
}));

// Stores
jest.mock('@shared/stores/useSubscriptionStore');
jest.mock('@shared/stores/useAuthStore');
jest.mock('@shared/stores/useNotificationStore');

// Services
jest.mock('@features/settings/services/userSettingsService');
jest.mock('@features/settings/services/personalDataService');

import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { getUserSettings } from '@features/settings/services/userSettingsService';
import { exportPersonalData } from '@features/settings/services/personalDataService';
import { MyDataScreen } from './MyDataScreen';

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<
  typeof useSubscriptionStore
>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseNotificationStore = useNotificationStore as jest.MockedFunction<
  typeof useNotificationStore
>;
const mockGetUserSettings = getUserSettings as jest.MockedFunction<typeof getUserSettings>;
const mockExportPersonalData = exportPersonalData as jest.MockedFunction<typeof exportPersonalData>;

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

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2026-01-15T00:00:00Z',
};

const mockFetchSubscriptions = jest.fn().mockResolvedValue(undefined);

function setupStores(subscriptions: Subscription[] = [makeSubscription('1')]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseSubscriptionStore.mockImplementation((selector: (state: any) => unknown) =>
    selector({ subscriptions, fetchSubscriptions: mockFetchSubscriptions })
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseAuthStore.mockImplementation((selector: (state: any) => unknown) =>
    selector({ user: mockUser })
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseNotificationStore.mockImplementation((selector: (state: any) => unknown) =>
    selector({ permissionStatus: 'granted', expoPushToken: null })
  );
}

const renderWithProvider = (ui: React.ReactElement) =>
  render(<PaperProvider theme={theme}>{ui}</PaperProvider>);

describe('MyDataScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStores();
    mockGetUserSettings.mockResolvedValue({ preferred_calendar_id: 'cal-1' } as never);
    mockExportPersonalData.mockResolvedValue(undefined);
    mockFetchSubscriptions.mockResolvedValue(undefined);
  });

  it('shows loading state initially', () => {
    // Delay fetchSubscriptions to keep loading state visible
    mockFetchSubscriptions.mockReturnValue(new Promise(() => {}));
    renderWithProvider(<MyDataScreen />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('renders data summary section after loading: email, creation date, subscription count, storage location', async () => {
    setupStores([makeSubscription('1'), makeSubscription('2')]);
    renderWithProvider(<MyDataScreen />);

    // Wait for loading to complete by looking for summary content
    await screen.findByText('Supabase Cloud (EU)', {}, { timeout: 5000 });

    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(screen.getByText('2 subscriptions')).toBeTruthy();
    expect(screen.getByText('Supabase Cloud (EU)')).toBeTruthy();
    const createdFormatted = new Date('2026-01-15T00:00:00Z').toLocaleDateString();
    expect(screen.getByText(createdFormatted)).toBeTruthy();
  });

  it('renders "View My Data" detailed section with accordions', async () => {
    renderWithProvider(<MyDataScreen />);

    await screen.findByText('Profile Data', {}, { timeout: 5000 });

    expect(screen.getByText('Profile Data')).toBeTruthy();
    expect(screen.getByText('Notification Settings')).toBeTruthy();
    expect(screen.getByText('Calendar Preferences')).toBeTruthy();
  });

  it('renders "Download My Data" button', async () => {
    renderWithProvider(<MyDataScreen />);

    await screen.findByLabelText('Download My Data', {}, { timeout: 5000 });
    expect(screen.getByLabelText('Download My Data')).toBeTruthy();
  });

  it('triggers exportPersonalData on "Download My Data" button press', async () => {
    renderWithProvider(<MyDataScreen />);

    const downloadBtn = await screen.findByLabelText('Download My Data', {}, { timeout: 5000 });
    await act(async () => {
      fireEvent.press(downloadBtn);
    });

    await waitFor(() => {
      expect(mockExportPersonalData).toHaveBeenCalledTimes(1);
    });

    const [userId, email] = mockExportPersonalData.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(email).toBe('test@example.com');
  });

  it('shows success snackbar after successful download', async () => {
    renderWithProvider(<MyDataScreen />);

    const downloadBtn = await screen.findByLabelText('Download My Data', {}, { timeout: 5000 });
    await act(async () => {
      fireEvent.press(downloadBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Data exported successfully')).toBeTruthy();
    });
  });

  it('shows error snackbar when download fails', async () => {
    mockExportPersonalData.mockRejectedValue(new Error('No internet connection'));
    renderWithProvider(<MyDataScreen />);

    const downloadBtn = await screen.findByLabelText('Download My Data', {}, { timeout: 5000 });
    await act(async () => {
      fireEvent.press(downloadBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('No internet connection')).toBeTruthy();
    });
  });

  it('shows 0 subscriptions count when no subscriptions', async () => {
    setupStores([]);
    renderWithProvider(<MyDataScreen />);

    await screen.findByText('0 subscriptions', {}, { timeout: 5000 });
    expect(screen.getByText('0 subscriptions')).toBeTruthy();
  });
});
