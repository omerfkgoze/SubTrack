import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { NotificationStatusBanner } from './NotificationStatusBanner';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    easConfig: { projectId: 'test-project-id' },
  },
}));

function renderWithProvider(props = {}) {
  return render(
    <PaperProvider theme={theme}>
      <NotificationStatusBanner {...props} />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationStore.setState({
    permissionStatus: 'undetermined',
    expoPushToken: null,
    isLoading: false,
    error: null,
  });
});

describe('NotificationStatusBanner', () => {
  it('renders red banner when notifications are denied', () => {
    useNotificationStore.setState({ permissionStatus: 'denied' });
    renderWithProvider();
    expect(screen.getByText(/Notifications are off/)).toBeTruthy();
  });

  it('does not render when notifications are granted', () => {
    useNotificationStore.setState({ permissionStatus: 'granted' });
    renderWithProvider();
    expect(screen.queryByText(/Notifications are off/)).toBeNull();
  });

  it('does not render when permission status is undetermined', () => {
    useNotificationStore.setState({ permissionStatus: 'undetermined' });
    renderWithProvider();
    expect(screen.queryByText(/Notifications are off/)).toBeNull();
  });

  it('renders Turn On CTA button with accessibility label', () => {
    useNotificationStore.setState({ permissionStatus: 'denied' });
    renderWithProvider();
    expect(screen.getByLabelText('Turn on notifications')).toBeTruthy();
  });

  it('Turn On button opens device settings', () => {
    useNotificationStore.setState({ permissionStatus: 'denied' });
    const RN = require('react-native');
    const spy = jest.spyOn(RN.Linking, 'openSettings').mockResolvedValue(undefined);

    renderWithProvider();
    fireEvent.press(screen.getByLabelText('Turn on notifications'));
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('respects visible prop - does not render when visible is false', () => {
    useNotificationStore.setState({ permissionStatus: 'denied' });
    renderWithProvider({ visible: false });
    expect(screen.queryByText(/Notifications are off/)).toBeNull();
  });

  it('renders when visible is true and notifications are denied', () => {
    useNotificationStore.setState({ permissionStatus: 'denied' });
    renderWithProvider({ visible: true });
    expect(screen.getByText(/Notifications are off/)).toBeTruthy();
  });
});
