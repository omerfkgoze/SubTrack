import type { Subscription } from '@features/subscriptions/types';

jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportToJSON, exportToCSV } from './exportService';

const mockWriteAsStringAsync = FileSystem.writeAsStringAsync as jest.MockedFunction<
  typeof FileSystem.writeAsStringAsync
>;
const mockShareAsync = Sharing.shareAsync as jest.MockedFunction<typeof Sharing.shareAsync>;

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    id: 'sub-1',
    user_id: 'user-1',
    name: 'Netflix',
    price: 15.99,
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
    calendar_event_id: 'evt-1',
    ...overrides,
  } as unknown as Subscription);

describe('exportToJSON', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls writeAsStringAsync with correct JSON content and filename pattern', async () => {
    const sub = makeSubscription();
    await exportToJSON([sub]);

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [fileUri, content] = mockWriteAsStringAsync.mock.calls[0];
    expect(fileUri).toMatch(/file:\/\/\/cache\/subtrack-export-\d{4}-\d{2}-\d{2}\.json/);
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('JSON output includes all required fields and excludes internal fields', async () => {
    const sub = makeSubscription({ notes: 'test note' });
    await exportToJSON([sub]);

    const [, content] = mockWriteAsStringAsync.mock.calls[0];
    const [parsed] = JSON.parse(content);

    // Required fields
    expect(parsed).toHaveProperty('name', 'Netflix');
    expect(parsed).toHaveProperty('price', 15.99);
    expect(parsed).toHaveProperty('currency', 'USD');
    expect(parsed).toHaveProperty('billing_cycle', 'monthly');
    expect(parsed).toHaveProperty('renewal_date', '2026-04-01');
    expect(parsed).toHaveProperty('category', 'Entertainment');
    expect(parsed).toHaveProperty('is_active', true);
    expect(parsed).toHaveProperty('is_trial', false);
    expect(parsed).toHaveProperty('trial_expiry_date', null);
    expect(parsed).toHaveProperty('notes', 'test note');

    // Excluded internal fields
    expect(parsed).not.toHaveProperty('id');
    expect(parsed).not.toHaveProperty('user_id');
    expect(parsed).not.toHaveProperty('created_at');
    expect(parsed).not.toHaveProperty('updated_at');
    expect(parsed).not.toHaveProperty('calendar_event_id');
  });

  it('calls shareAsync after writing file', async () => {
    await exportToJSON([makeSubscription()]);
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    const [fileUri, options] = mockShareAsync.mock.calls[0];
    expect(fileUri).toMatch(/\.json$/);
    expect(options).toMatchObject({ mimeType: 'application/json' });
  });
});

describe('exportToCSV', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('CSV output has correct headers and correct row values', async () => {
    const sub = makeSubscription();
    await exportToCSV([sub]);

    const [, content] = mockWriteAsStringAsync.mock.calls[0];
    const lines = content.split('\n');
    expect(lines[0]).toBe(
      'name,price,currency,billing_cycle,renewal_date,category,is_active,is_trial,trial_expiry_date,notes'
    );
    expect(lines[1]).toContain('Netflix');
    expect(lines[1]).toContain('15.99');
    expect(lines[1]).toContain('USD');
    expect(lines[1]).toContain('monthly');
  });

  it('values with commas are properly quoted', async () => {
    const sub = makeSubscription({ name: 'Service, Premium', notes: 'has, comma' });
    await exportToCSV([sub]);

    const [, content] = mockWriteAsStringAsync.mock.calls[0];
    const row = content.split('\n')[1];
    expect(row).toContain('"Service, Premium"');
    expect(row).toContain('"has, comma"');
  });

  it('calls shareAsync after writing file', async () => {
    await exportToCSV([makeSubscription()]);
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    const [fileUri, options] = mockShareAsync.mock.calls[0];
    expect(fileUri).toMatch(/\.csv$/);
    expect(options).toMatchObject({ mimeType: 'text/csv' });
  });
});
