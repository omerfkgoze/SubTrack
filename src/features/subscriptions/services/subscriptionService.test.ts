import { createSubscription, updateSubscription, deleteSubscription } from './subscriptionService';

const mockCheckConnectivity = jest.fn();

jest.mock('@shared/services/networkCheck', () => ({
  checkConnectivity: (...args: unknown[]) => mockCheckConnectivity(...args),
}));

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function getSupabaseMock() {
  return jest.requireMock('@shared/services/supabase').supabase as {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
  };
}

type MockResult = { data: Record<string, unknown> | null; error: { code: string; message: string } | null };

function setupInsertChain(result: MockResult = { data: { id: 'sub-1' }, error: null }) {
  const supabase = getSupabaseMock();
  const mockSingle = jest.fn().mockResolvedValue(result);
  const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
  supabase.from.mockReturnValue({ insert: mockInsert, update: jest.fn() });
  return { mockInsert };
}

function setupUpdateChain(result: MockResult = { data: { id: 'sub-1' }, error: null }) {
  const supabase = getSupabaseMock();
  const mockSingle = jest.fn().mockResolvedValue(result);
  const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
  const mockEqUserId = jest.fn().mockReturnValue({ select: mockSelect });
  const mockEqId = jest.fn().mockReturnValue({ eq: mockEqUserId });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqId });
  supabase.from.mockReturnValue({ insert: jest.fn(), update: mockUpdate });
  return { mockUpdate };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckConnectivity.mockResolvedValue({ error: null });
  const supabase = getSupabaseMock();
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
});

describe('subscriptionService - is_active handling', () => {
  describe('createSubscription', () => {
    it('includes is_active=false in insert payload when provided', async () => {
      const { mockInsert } = setupInsertChain({ data: { id: 'sub-1', is_active: false }, error: null });

      await createSubscription({
        name: 'Netflix',
        price: 9.99,
        billing_cycle: 'monthly',
        renewal_date: '2026-04-01',
        is_active: false,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it('includes is_active=true in insert payload when provided', async () => {
      const { mockInsert } = setupInsertChain({ data: { id: 'sub-1', is_active: true }, error: null });

      await createSubscription({
        name: 'Netflix',
        price: 9.99,
        billing_cycle: 'monthly',
        renewal_date: '2026-04-01',
        is_active: true,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      );
    });

    it('omits is_active from insert payload when not provided', async () => {
      const { mockInsert } = setupInsertChain();

      await createSubscription({
        name: 'Netflix',
        price: 9.99,
        billing_cycle: 'monthly',
        renewal_date: '2026-04-01',
      });

      const insertArg = mockInsert.mock.calls[0][0] as Record<string, unknown>;
      expect('is_active' in insertArg).toBe(false);
    });
  });

  describe('updateSubscription', () => {
    it('includes is_active=false in update payload when provided', async () => {
      const { mockUpdate } = setupUpdateChain({ data: { id: 'sub-1', is_active: false }, error: null });

      await updateSubscription('sub-1', { is_active: false });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it('includes is_active=true in update payload when provided', async () => {
      const { mockUpdate } = setupUpdateChain({ data: { id: 'sub-1', is_active: true }, error: null });

      await updateSubscription('sub-1', { is_active: true });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      );
    });

    it('omits is_active from update payload when not in dto', async () => {
      const { mockUpdate } = setupUpdateChain();

      await updateSubscription('sub-1', { name: 'Spotify' });

      const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
      expect('is_active' in updateArg).toBe(false);
    });
  });
});

describe('subscriptionService - connectivity check', () => {
  const networkError = {
    error: { code: 'NETWORK_ERROR', message: 'No internet connection. Please check your connection and try again.' },
  };

  it('createSubscription returns NETWORK_ERROR when offline', async () => {
    mockCheckConnectivity.mockResolvedValue(networkError);
    const result = await createSubscription({
      name: 'Netflix',
      price: 9.99,
      billing_cycle: 'monthly',
      renewal_date: '2026-04-01',
    });
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(getSupabaseMock().from).not.toHaveBeenCalled();
  });

  it('updateSubscription returns NETWORK_ERROR when offline', async () => {
    mockCheckConnectivity.mockResolvedValue(networkError);
    const result = await updateSubscription('sub-1', { name: 'Spotify' });
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(getSupabaseMock().from).not.toHaveBeenCalled();
  });

  it('deleteSubscription returns NETWORK_ERROR when offline', async () => {
    mockCheckConnectivity.mockResolvedValue(networkError);
    const result = await deleteSubscription('sub-1');
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(getSupabaseMock().from).not.toHaveBeenCalled();
  });
});
