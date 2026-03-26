import { computeReconciliation } from './reconciliationUtils';
import type { DetectedSubscription } from '@features/bank/types';
import type { Subscription } from '@features/subscriptions/types';

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    user_id: 'user-1',
    name: 'Netflix',
    price: 12.99,
    currency: 'EUR',
    billing_cycle: 'monthly',
    renewal_date: '2026-04-01',
    is_active: true,
    is_trial: false,
    trial_expiry_date: null,
    category: null,
    notes: null,
    calendar_event_id: null,
    created_at: '2025-09-01',
    updated_at: '2025-09-01',
    ...overrides,
  } as Subscription;
}

function makeDetected(overrides: Partial<DetectedSubscription> = {}): DetectedSubscription {
  return {
    id: 'det-1',
    userId: 'user-1',
    bankConnectionId: 'conn-1',
    tinkGroupId: 'grp-1',
    merchantName: 'Netflix',
    amount: 12.99,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.9,
    status: 'detected',
    firstSeen: '2025-09-15',
    lastSeen: '2026-02-15',
    ...overrides,
  };
}

describe('computeReconciliation', () => {
  it('returns zero totals when both lists are empty', () => {
    const result = computeReconciliation([], []);
    expect(result.trackedTotal).toBe(0);
    expect(result.detectedTotal).toBe(0);
    expect(result.difference).toBe(0);
    expect(result.unmatchedDetected).toHaveLength(0);
    expect(result.isFullyReconciled).toBe(true);
  });

  it('sums tracked subscriptions (monthly)', () => {
    const subs = [makeSub({ price: 10, billing_cycle: 'monthly' }), makeSub({ id: 'sub-2', price: 20, billing_cycle: 'monthly' })];
    const result = computeReconciliation(subs, []);
    expect(result.trackedTotal).toBe(30);
  });

  it('normalizes yearly subscription to monthly', () => {
    const subs = [makeSub({ price: 120, billing_cycle: 'yearly' })];
    const result = computeReconciliation(subs, []);
    expect(result.trackedTotal).toBe(10);
  });

  it('normalizes quarterly subscription to monthly', () => {
    const subs = [makeSub({ price: 30, billing_cycle: 'quarterly' })];
    const result = computeReconciliation(subs, []);
    expect(result.trackedTotal).toBe(10);
  });

  it('normalizes weekly subscription to monthly', () => {
    const subs = [makeSub({ price: 10, billing_cycle: 'weekly' })];
    const result = computeReconciliation(subs, []);
    expect(result.trackedTotal).toBe(43.3);
  });

  it('excludes inactive subscriptions from trackedTotal', () => {
    const subs = [
      makeSub({ price: 10, is_active: true }),
      makeSub({ id: 'sub-2', price: 20, is_active: false }),
    ];
    const result = computeReconciliation(subs, []);
    expect(result.trackedTotal).toBe(10);
  });

  it('includes subscriptions with is_active=null in trackedTotal (null treated as active)', () => {
    const subs = [makeSub({ price: 15, is_active: null })];
    const result = computeReconciliation(subs, []);
    expect(result.trackedTotal).toBe(15);
  });

  it('includes detected subs with status=detected in detectedTotal', () => {
    const detected = [makeDetected({ amount: 12.99, status: 'detected' })];
    const result = computeReconciliation([], detected);
    expect(result.detectedTotal).toBe(12.99);
  });

  it('includes detected subs with status=approved in detectedTotal', () => {
    const detected = [makeDetected({ amount: 9.99, status: 'approved' })];
    const result = computeReconciliation([], detected);
    expect(result.detectedTotal).toBe(9.99);
  });

  it('includes detected subs with status=matched in detectedTotal', () => {
    const detected = [makeDetected({ amount: 14.99, status: 'matched' })];
    const result = computeReconciliation([], detected);
    expect(result.detectedTotal).toBe(14.99);
  });

  it('excludes dismissed detected subs from detectedTotal', () => {
    const detected = [makeDetected({ amount: 9.99, status: 'dismissed' })];
    const result = computeReconciliation([], detected);
    expect(result.detectedTotal).toBe(0);
  });

  it('unmatchedDetected contains only status=detected items', () => {
    const detected = [
      makeDetected({ id: 'det-1', status: 'detected' }),
      makeDetected({ id: 'det-2', status: 'approved' }),
      makeDetected({ id: 'det-3', status: 'matched' }),
      makeDetected({ id: 'det-4', status: 'dismissed' }),
    ];
    const result = computeReconciliation([], detected);
    expect(result.unmatchedDetected).toHaveLength(1);
    expect(result.unmatchedDetected[0].id).toBe('det-1');
  });

  it('isFullyReconciled true when difference <= 0.50 and no unmatched', () => {
    const subs = [makeSub({ price: 12.99, billing_cycle: 'monthly' })];
    const detected = [makeDetected({ amount: 13.20, status: 'matched' })];
    const result = computeReconciliation(subs, detected);
    expect(Math.abs(result.difference)).toBeLessThanOrEqual(0.50);
    expect(result.unmatchedDetected).toHaveLength(0);
    expect(result.isFullyReconciled).toBe(true);
  });

  it('isFullyReconciled false when unmatched detected items exist', () => {
    const subs = [makeSub({ price: 12.99, billing_cycle: 'monthly' })];
    const detected = [makeDetected({ amount: 12.99, status: 'detected' })];
    const result = computeReconciliation(subs, detected);
    expect(result.isFullyReconciled).toBe(false);
  });

  it('isFullyReconciled false when difference > 0.50', () => {
    const subs = [makeSub({ price: 10, billing_cycle: 'monthly' })];
    const detected = [makeDetected({ amount: 20, status: 'matched' })];
    const result = computeReconciliation(subs, detected);
    expect(result.isFullyReconciled).toBe(false);
  });

  it('computes correct difference (detectedTotal - trackedTotal)', () => {
    const subs = [makeSub({ price: 10, billing_cycle: 'monthly' })];
    const detected = [makeDetected({ amount: 15, status: 'matched' })];
    const result = computeReconciliation(subs, detected);
    expect(result.difference).toBe(5);
  });

  it('rounds totals to 2 decimal places', () => {
    const subs = [makeSub({ price: 10.001, billing_cycle: 'monthly' })];
    const result = computeReconciliation(subs, []);
    expect(result.trackedTotal).toBe(10);
  });
});
