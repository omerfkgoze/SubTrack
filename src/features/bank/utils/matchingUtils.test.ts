import { findMatches, normalizeName } from './matchingUtils';
import type { DetectedSubscription } from '@features/bank/types';
import type { Subscription } from '@features/subscriptions/types';

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

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  NETFLIX  ')).toBe('netflix');
  });

  it('removes common suffix: premium', () => {
    expect(normalizeName('Netflix Premium')).toBe('netflix');
  });

  it('removes common suffix: subscription', () => {
    expect(normalizeName('Spotify Subscription')).toBe('spotify');
  });

  it('removes common suffix: plus', () => {
    expect(normalizeName('Apple Plus')).toBe('apple');
  });

  it('removes common suffix: monthly', () => {
    expect(normalizeName('Adobe Monthly')).toBe('adobe');
  });

  it('removes common suffix: yearly', () => {
    expect(normalizeName('iCloud Yearly')).toBe('icloud');
  });
});

describe('findMatches', () => {
  describe('name matching', () => {
    it('exact name match → score 0.5 minimum', () => {
      const detected = [makeDetected({ merchantName: 'Netflix', amount: 99.99, frequency: 'yearly' })];
      const subs = [makeSub({ name: 'Netflix', price: 99.99, billing_cycle: 'yearly' })];

      const results = findMatches(detected, subs);
      expect(results.has('det-1')).toBe(true);
      expect(results.get('det-1')!.matchReasons).toContain('name_similar');
    });

    it('partial name match: detected contains subscription name', () => {
      const detected = [makeDetected({ merchantName: 'Netflix Premium', amount: 99.99, frequency: 'yearly' })];
      const subs = [makeSub({ name: 'Netflix', price: 99.99, billing_cycle: 'yearly' })];

      const results = findMatches(detected, subs);
      expect(results.has('det-1')).toBe(true);
      expect(results.get('det-1')!.matchReasons).toContain('name_similar');
    });

    it('partial name match: subscription name contains detected name', () => {
      const detected = [makeDetected({ merchantName: 'Spotify', amount: 9.99, frequency: 'monthly' })];
      const subs = [makeSub({ name: 'Spotify Premium', price: 9.99, billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      expect(results.has('det-1')).toBe(true);
    });

    it('no name match → no result', () => {
      const detected = [makeDetected({ merchantName: 'Netflix', amount: 9.99, frequency: 'monthly' })];
      const subs = [makeSub({ name: 'Spotify', price: 9.99, billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      expect(results.has('det-1')).toBe(false);
    });
  });

  describe('amount matching', () => {
    it('amount within ±10% tolerance adds amount_close reason', () => {
      const detected = [makeDetected({ merchantName: 'Netflix', amount: 12.99, frequency: 'monthly' })];
      const subs = [makeSub({ name: 'Netflix', price: 13.50, billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      expect(results.get('det-1')!.matchReasons).toContain('amount_close');
    });

    it('amount outside ±10% tolerance does NOT add amount_close reason', () => {
      const detected = [makeDetected({ merchantName: 'Netflix', amount: 12.99, frequency: 'monthly' })];
      const subs = [makeSub({ name: 'Netflix', price: 20.00, billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      const match = results.get('det-1')!;
      expect(match).toBeDefined();
      expect(match.matchReasons).not.toContain('amount_close');
    });
  });

  describe('billing cycle matching', () => {
    it('matching cycle adds cycle_match reason', () => {
      const detected = [makeDetected({ merchantName: 'Netflix', frequency: 'monthly' })];
      const subs = [makeSub({ name: 'Netflix', billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      expect(results.get('det-1')!.matchReasons).toContain('cycle_match');
    });

    it('mismatching cycle does NOT add cycle_match reason', () => {
      const detected = [makeDetected({ merchantName: 'Netflix', frequency: 'yearly' })];
      const subs = [makeSub({ name: 'Netflix', billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      const match = results.get('det-1')!;
      expect(match).toBeDefined();
      expect(match.matchReasons).not.toContain('cycle_match');
    });
  });

  describe('combined scoring', () => {
    it('full match (name + amount + cycle) → score 1.0', () => {
      const detected = [makeDetected()];
      const subs = [makeSub()];

      const results = findMatches(detected, subs);
      expect(results.get('det-1')!.matchScore).toBeCloseTo(1.0);
      expect(results.get('det-1')!.matchReasons).toHaveLength(3);
    });

    it('name + cycle match → score 0.7', () => {
      const detected = [makeDetected({ amount: 50.00, frequency: 'monthly' })];
      const subs = [makeSub({ price: 5.00, billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      expect(results.get('det-1')!.matchScore).toBeCloseTo(0.7);
    });

    it('name only → score 0.5, included as match', () => {
      const detected = [makeDetected({ amount: 99.99, frequency: 'yearly' })];
      const subs = [makeSub({ price: 1.00, billing_cycle: 'monthly' })];

      const results = findMatches(detected, subs);
      expect(results.has('det-1')).toBe(true);
      expect(results.get('det-1')!.matchScore).toBeCloseTo(0.5);
    });
  });

  describe('no match scenarios', () => {
    it('returns empty map when no detected subscriptions', () => {
      const results = findMatches([], [makeSub()]);
      expect(results.size).toBe(0);
    });

    it('returns empty map when no subscriptions', () => {
      const results = findMatches([makeDetected()], []);
      expect(results.size).toBe(0);
    });

    it('no match found → item not in map', () => {
      const detected = [makeDetected({ merchantName: 'Adobe Creative Cloud' })];
      const subs = [makeSub({ name: 'Spotify' })];

      const results = findMatches(detected, subs);
      expect(results.has('det-1')).toBe(false);
    });
  });

  describe('best match selection', () => {
    it('selects highest-score match when multiple subscriptions exist', () => {
      const detected = [makeDetected({ merchantName: 'Netflix', amount: 12.99, frequency: 'monthly' })];
      const subs = [
        makeSub({ id: 'sub-1', name: 'Netflix', price: 50.00, billing_cycle: 'yearly' }), // name only → 0.5
        makeSub({ id: 'sub-2', name: 'Netflix', price: 12.99, billing_cycle: 'monthly' }), // all three → 1.0
      ];

      const results = findMatches(detected, subs);
      expect(results.get('det-1')!.subscriptionId).toBe('sub-2');
    });

    it('each detected sub gets its own best match independently', () => {
      const detected = [
        makeDetected({ id: 'det-1', merchantName: 'Netflix', amount: 12.99, frequency: 'monthly' }),
        makeDetected({ id: 'det-2', merchantName: 'Spotify', amount: 9.99, frequency: 'monthly' }),
      ];
      const subs = [
        makeSub({ id: 'sub-1', name: 'Netflix', price: 12.99, billing_cycle: 'monthly' }),
        makeSub({ id: 'sub-2', name: 'Spotify', price: 9.99, billing_cycle: 'monthly' }),
      ];

      const results = findMatches(detected, subs);
      expect(results.get('det-1')!.subscriptionId).toBe('sub-1');
      expect(results.get('det-2')!.subscriptionId).toBe('sub-2');
    });
  });

  describe('MatchResult shape', () => {
    it('result contains all required fields', () => {
      const detected = [makeDetected()];
      const subs = [makeSub()];

      const results = findMatches(detected, subs);
      const match = results.get('det-1')!;

      expect(match.detectedId).toBe('det-1');
      expect(match.subscriptionId).toBe('sub-1');
      expect(match.subscriptionName).toBe('Netflix');
      expect(match.subscriptionPrice).toBe(12.99);
      expect(match.subscriptionBillingCycle).toBe('monthly');
      expect(typeof match.matchScore).toBe('number');
      expect(Array.isArray(match.matchReasons)).toBe(true);
    });

    it('subscriptionCurrency uses empty string when subscription currency is null', () => {
      const detected = [makeDetected()];
      const subs = [makeSub({ currency: null })];

      const results = findMatches(detected, subs);
      expect(results.get('det-1')!.subscriptionCurrency).toBe('');
    });
  });
});
