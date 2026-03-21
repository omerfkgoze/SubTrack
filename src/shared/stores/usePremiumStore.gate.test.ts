import { usePremiumStore, MAX_FREE_SUBSCRIPTIONS, _resetSessionRetryCount } from './usePremiumStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@shared/services/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@shared/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn().mockReturnValue({ user: { id: 'user-1' } }),
  },
}));

describe('add-subscription gate logic', () => {
  beforeEach(() => {
    _resetSessionRetryCount();
    usePremiumStore.setState({ isPremium: false, isLoading: false });
  });

  it('allows add when activeCount is below limit', () => {
    const { canAddSubscription } = usePremiumStore.getState();
    expect(canAddSubscription(MAX_FREE_SUBSCRIPTIONS - 1)).toBe(true);
  });

  it('blocks add when activeCount equals limit for free user', () => {
    const { canAddSubscription } = usePremiumStore.getState();
    expect(canAddSubscription(MAX_FREE_SUBSCRIPTIONS)).toBe(false);
  });

  it('blocks add when activeCount exceeds limit for free user', () => {
    const { canAddSubscription } = usePremiumStore.getState();
    expect(canAddSubscription(MAX_FREE_SUBSCRIPTIONS + 1)).toBe(false);
  });

  it('allows add for premium user even when above limit', () => {
    usePremiumStore.setState({ isPremium: true });
    const { canAddSubscription } = usePremiumStore.getState();
    expect(canAddSubscription(MAX_FREE_SUBSCRIPTIONS)).toBe(true);
    expect(canAddSubscription(MAX_FREE_SUBSCRIPTIONS + 10)).toBe(true);
  });
});

describe('isFeatureAvailable', () => {
  beforeEach(() => {
    _resetSessionRetryCount();
    usePremiumStore.setState({ isPremium: false, isLoading: false });
  });

  it('returns true for all features when user is premium', () => {
    usePremiumStore.setState({ isPremium: true });
    const { isFeatureAvailable } = usePremiumStore.getState();
    expect(isFeatureAvailable('calendar-sync')).toBe(true);
    expect(isFeatureAvailable('data-export')).toBe(true);
    expect(isFeatureAvailable('full-analytics')).toBe(true);
  });

  it('returns false for premium-only features when user is free', () => {
    usePremiumStore.setState({ isPremium: false });
    const { isFeatureAvailable } = usePremiumStore.getState();
    expect(isFeatureAvailable('calendar-sync')).toBe(false);
    expect(isFeatureAvailable('data-export')).toBe(false);
    expect(isFeatureAvailable('full-analytics')).toBe(false);
  });
});
