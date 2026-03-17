import { act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionStore } from './useSubscriptionStore';
import type { Subscription, CreateSubscriptionDTO } from '@features/subscriptions/types';

// Mock services
jest.mock('@features/subscriptions/services/subscriptionService', () => ({
  getSubscriptions: jest.fn(),
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  deleteSubscription: jest.fn(),
}));

jest.mock('@features/notifications', () => ({
  createDefaultReminder: jest.fn().mockResolvedValue({}),
  getReminderSettings: jest.fn(),
  updateReminder: jest.fn(),
  deleteReminder: jest.fn(),
}));

jest.mock('@shared/stores/useNotificationStore', () => ({
  useNotificationStore: {
    getState: jest.fn().mockReturnValue({ permissionStatus: 'undetermined' }),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const {
  deleteSubscription: mockDeleteService,
  createSubscription: mockCreateService,
  updateSubscription: mockUpdateService,
} = jest.requireMock('@features/subscriptions/services/subscriptionService');

const mockSubscription: Subscription = {
  id: 'sub-1',
  user_id: 'user-1',
  name: 'Netflix',
  price: 9.99,
  currency: 'EUR',
  billing_cycle: 'monthly',
  renewal_date: '2026-04-01',
  is_trial: false,
  trial_expiry_date: null,
  category: null,
  notes: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockSubscription2: Subscription = {
  ...mockSubscription,
  id: 'sub-2',
  name: 'Spotify',
  price: 4.99,
};

describe('useSubscriptionStore - delete operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useSubscriptionStore.setState({
      subscriptions: [mockSubscription, mockSubscription2],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
  });

  describe('deleteSubscription', () => {
    it('optimistically removes subscription and sets pendingDelete', async () => {
      mockDeleteService.mockResolvedValue({ data: mockSubscription, error: null });

      await act(async () => {
        await useSubscriptionStore.getState().deleteSubscription('sub-1');
      });

      const state = useSubscriptionStore.getState();
      expect(state.subscriptions).toHaveLength(1);
      expect(state.subscriptions[0].id).toBe('sub-2');
    });

    it('returns true on successful delete', async () => {
      mockDeleteService.mockResolvedValue({ data: mockSubscription, error: null });

      let result: boolean;
      await act(async () => {
        result = await useSubscriptionStore.getState().deleteSubscription('sub-1');
      });

      expect(result!).toBe(true);
    });

    it('restores subscription on failure', async () => {
      mockDeleteService.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Failed to delete' },
      });

      await act(async () => {
        await useSubscriptionStore.getState().deleteSubscription('sub-1');
      });

      const state = useSubscriptionStore.getState();
      expect(state.subscriptions).toHaveLength(2);
      expect(state.error?.code).toBe('DB_ERROR');
      expect(state.pendingDelete).toBeNull();
    });

    it('returns false when subscription not found', async () => {
      let result: boolean;
      await act(async () => {
        result = await useSubscriptionStore.getState().deleteSubscription('nonexistent');
      });

      expect(result!).toBe(false);
      expect(mockDeleteService).not.toHaveBeenCalled();
    });

    it('clears existing pendingDelete before new delete (M1 fix)', async () => {
      // Set up a pending delete for sub-1
      useSubscriptionStore.setState({
        pendingDelete: { subscription: mockSubscription, originalIndex: 0 },
        subscriptions: [mockSubscription2],
      });

      mockDeleteService.mockResolvedValue({ data: mockSubscription2, error: null });

      await act(async () => {
        await useSubscriptionStore.getState().deleteSubscription('sub-2');
      });

      const state = useSubscriptionStore.getState();
      // sub-2 should be removed, pendingDelete should now be for sub-2 (not sub-1)
      expect(state.subscriptions).toHaveLength(0);
      expect(state.pendingDelete?.subscription.id).toBe('sub-2');
    });

    it('does not restore if undo was already called (M2 fix)', async () => {
      let deletePromiseResolve: (value: unknown) => void;
      const deletePromise = new Promise((resolve) => {
        deletePromiseResolve = resolve;
      });
      mockDeleteService.mockReturnValue(deletePromise);

      // Start delete (don't await yet)
      let deleteResult: Promise<boolean>;
      act(() => {
        deleteResult = useSubscriptionStore.getState().deleteSubscription('sub-1');
      });

      // Verify optimistic removal
      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(1);
      expect(useSubscriptionStore.getState().pendingDelete).not.toBeNull();

      // Call undo before delete completes
      mockCreateService.mockResolvedValue({ data: { ...mockSubscription, id: 'sub-1-new' }, error: null });
      await act(async () => {
        await useSubscriptionStore.getState().undoDelete();
      });

      // pendingDelete should be cleared by undo
      expect(useSubscriptionStore.getState().pendingDelete).toBeNull();
      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(2);

      // Now resolve the delete with failure
      await act(async () => {
        deletePromiseResolve!({
          data: null,
          error: { code: 'DB_ERROR', message: 'Failed' },
        });
        await deleteResult;
      });

      // Should NOT double-restore (undo already handled it)
      const state = useSubscriptionStore.getState();
      expect(state.subscriptions).toHaveLength(2); // not 3
      expect(state.pendingDelete).toBeNull();
    });
  });

  describe('undoDelete', () => {
    it('restores subscription at original index', async () => {
      // Set up: sub-1 was deleted, only sub-2 remains
      useSubscriptionStore.setState({
        subscriptions: [mockSubscription2],
        pendingDelete: { subscription: mockSubscription, originalIndex: 0 },
      });

      mockCreateService.mockResolvedValue({ data: { ...mockSubscription, id: 'sub-1-new' }, error: null });

      await act(async () => {
        await useSubscriptionStore.getState().undoDelete();
      });

      const state = useSubscriptionStore.getState();
      expect(state.subscriptions).toHaveLength(2);
      expect(state.subscriptions[0].name).toBe('Netflix');
      expect(state.pendingDelete).toBeNull();
    });

    it('clamps index to array length', async () => {
      // Sub was at index 5 but array is now empty
      useSubscriptionStore.setState({
        subscriptions: [],
        pendingDelete: { subscription: mockSubscription, originalIndex: 5 },
      });

      mockCreateService.mockResolvedValue({ data: mockSubscription, error: null });

      await act(async () => {
        await useSubscriptionStore.getState().undoDelete();
      });

      expect(useSubscriptionStore.getState().subscriptions).toHaveLength(1);
    });

    it('does nothing if no pendingDelete', async () => {
      useSubscriptionStore.setState({ pendingDelete: null });

      await act(async () => {
        await useSubscriptionStore.getState().undoDelete();
      });

      expect(mockCreateService).not.toHaveBeenCalled();
    });

    it('fetches fresh data if server re-create fails', async () => {
      const { getSubscriptions: mockGetService } = jest.requireMock(
        '@features/subscriptions/services/subscriptionService',
      );
      mockGetService.mockResolvedValue({ data: [mockSubscription], error: null });

      useSubscriptionStore.setState({
        subscriptions: [mockSubscription2],
        pendingDelete: { subscription: mockSubscription, originalIndex: 0 },
      });

      mockCreateService.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Create failed' },
      });

      await act(async () => {
        await useSubscriptionStore.getState().undoDelete();
      });

      expect(mockGetService).toHaveBeenCalled();
    });
  });

  describe('clearPendingDelete', () => {
    it('clears pendingDelete state', () => {
      useSubscriptionStore.setState({
        pendingDelete: { subscription: mockSubscription, originalIndex: 0 },
      });

      act(() => {
        useSubscriptionStore.getState().clearPendingDelete();
      });

      expect(useSubscriptionStore.getState().pendingDelete).toBeNull();
    });
  });
});

describe('useSubscriptionStore - toggleSubscriptionStatus', () => {
  const activeSubscription: Subscription = {
    id: 'sub-1',
    user_id: 'user-1',
    name: 'Netflix',
    price: 9.99,
    currency: 'EUR',
    billing_cycle: 'monthly',
    renewal_date: '2026-04-01',
    is_trial: false,
    trial_expiry_date: null,
    category: null,
    notes: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSubscriptionStore.setState({
      subscriptions: [activeSubscription],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
  });

  it('flips is_active from true to false (optimistic)', async () => {
    mockUpdateService.mockResolvedValue({
      data: { ...activeSubscription, is_active: false },
      error: null,
    });

    await act(async () => {
      await useSubscriptionStore.getState().toggleSubscriptionStatus('sub-1');
    });

    const state = useSubscriptionStore.getState();
    expect(state.subscriptions[0].is_active).toBe(false);
  });

  it('flips is_active from false to true (optimistic)', async () => {
    useSubscriptionStore.setState({
      subscriptions: [{ ...activeSubscription, is_active: false }],
    });

    mockUpdateService.mockResolvedValue({
      data: { ...activeSubscription, is_active: true },
      error: null,
    });

    await act(async () => {
      await useSubscriptionStore.getState().toggleSubscriptionStatus('sub-1');
    });

    const state = useSubscriptionStore.getState();
    expect(state.subscriptions[0].is_active).toBe(true);
  });

  it('treats null is_active as active and flips to false', async () => {
    useSubscriptionStore.setState({
      subscriptions: [{ ...activeSubscription, is_active: null }],
    });

    mockUpdateService.mockResolvedValue({
      data: { ...activeSubscription, is_active: false },
      error: null,
    });

    await act(async () => {
      await useSubscriptionStore.getState().toggleSubscriptionStatus('sub-1');
    });

    expect(mockUpdateService).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ is_active: false }),
    );
  });

  it('rolls back on service error', async () => {
    mockUpdateService.mockResolvedValue({
      data: null,
      error: { code: 'DB_ERROR', message: 'Failed to update' },
    });

    await act(async () => {
      await useSubscriptionStore.getState().toggleSubscriptionStatus('sub-1');
    });

    const state = useSubscriptionStore.getState();
    // Should roll back to original true value
    expect(state.subscriptions[0].is_active).toBe(true);
    expect(state.error?.code).toBe('DB_ERROR');
  });

  it('returns false when subscription not found', async () => {
    let result: boolean;
    await act(async () => {
      result = await useSubscriptionStore.getState().toggleSubscriptionStatus('nonexistent');
    });

    expect(result!).toBe(false);
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it('undoDelete includes is_active in re-creation payload', async () => {
    const cancelledSub = { ...activeSubscription, is_active: false };
    useSubscriptionStore.setState({
      subscriptions: [],
      pendingDelete: { subscription: cancelledSub, originalIndex: 0 },
    });

    mockCreateService.mockResolvedValue({ data: { ...cancelledSub, id: 'sub-1-new' }, error: null });

    await act(async () => {
      await useSubscriptionStore.getState().undoDelete();
    });

    expect(mockCreateService).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
  });
});

describe('useSubscriptionStore - addSubscription', () => {
  const mockNotificationStore = jest.requireMock('@shared/stores/useNotificationStore').useNotificationStore;
  const mockCreateReminderFn = jest.requireMock('@features/notifications').createDefaultReminder;

  const dto: CreateSubscriptionDTO = {
    name: mockSubscription.name,
    price: mockSubscription.price,
    billing_cycle: 'monthly',
    renewal_date: mockSubscription.renewal_date,
    is_trial: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationStore.getState.mockReturnValue({ permissionStatus: 'undetermined' });
    useSubscriptionStore.setState({
      subscriptions: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      pendingDelete: null,
    });
  });

  it('calls createDefaultReminder with global default when notifications are granted', async () => {
    mockNotificationStore.getState.mockReturnValue({ permissionStatus: 'granted' });
    mockCreateService.mockResolvedValue({ data: mockSubscription, error: null });
    mockCreateReminderFn.mockResolvedValue({});
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('7');

    await act(async () => {
      await useSubscriptionStore.getState().addSubscription(dto);
    });

    expect(mockCreateReminderFn).toHaveBeenCalledWith(mockSubscription.user_id, mockSubscription.id, 7);
  });

  it('uses default 3 days when no global default stored in AsyncStorage', async () => {
    mockNotificationStore.getState.mockReturnValue({ permissionStatus: 'granted' });
    mockCreateService.mockResolvedValue({ data: mockSubscription, error: null });
    mockCreateReminderFn.mockResolvedValue({});
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await act(async () => {
      await useSubscriptionStore.getState().addSubscription(dto);
    });

    expect(mockCreateReminderFn).toHaveBeenCalledWith(mockSubscription.user_id, mockSubscription.id, 3);
  });

  it('skips createDefaultReminder when notifications are not granted', async () => {
    mockNotificationStore.getState.mockReturnValue({ permissionStatus: 'undetermined' });
    mockCreateService.mockResolvedValue({ data: mockSubscription, error: null });

    await act(async () => {
      await useSubscriptionStore.getState().addSubscription(dto);
    });

    expect(mockCreateReminderFn).not.toHaveBeenCalled();
  });
});
