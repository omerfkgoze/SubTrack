import {
  formatBillingCycleShort,
  formatPrice,
  calculateMonthlyEquivalent,
  calculateTotalMonthlyCost,
  calculateCategoryBreakdown,
  getRenewalInfo,
  getCategoryConfig,
  getTrialInfo,
  calculateActiveCount,
  calculateAverageMonthlyCost,
  calculateMonthlySavings,
  calculateInactiveCount,
  getUpcomingRenewals,
} from './subscriptionUtils';
import type { Subscription } from '@features/subscriptions/types';
import { toLocalDateString } from './testHelpers';

describe('formatBillingCycleShort', () => {
  it('returns "mo" for monthly', () => {
    expect(formatBillingCycleShort('monthly')).toBe('mo');
  });

  it('returns "yr" for yearly', () => {
    expect(formatBillingCycleShort('yearly')).toBe('yr');
  });

  it('returns "qtr" for quarterly', () => {
    expect(formatBillingCycleShort('quarterly')).toBe('qtr');
  });

  it('returns "wk" for weekly', () => {
    expect(formatBillingCycleShort('weekly')).toBe('wk');
  });
});

describe('formatPrice', () => {
  it('formats monthly price', () => {
    expect(formatPrice(17.99, 'monthly')).toBe('€17.99/mo');
  });

  it('formats yearly price', () => {
    expect(formatPrice(119.99, 'yearly')).toBe('€119.99/yr');
  });

  it('formats quarterly price', () => {
    expect(formatPrice(29.99, 'quarterly')).toBe('€29.99/qtr');
  });

  it('formats weekly price', () => {
    expect(formatPrice(4.99, 'weekly')).toBe('€4.99/wk');
  });

  it('formats whole numbers with two decimals', () => {
    expect(formatPrice(10, 'monthly')).toBe('€10.00/mo');
  });
});

describe('calculateMonthlyEquivalent', () => {
  it('returns same price for monthly', () => {
    expect(calculateMonthlyEquivalent(10, 'monthly')).toBe(10);
  });

  it('divides by 12 for yearly', () => {
    expect(calculateMonthlyEquivalent(120, 'yearly')).toBe(10);
  });

  it('divides by 3 for quarterly', () => {
    expect(calculateMonthlyEquivalent(30, 'quarterly')).toBe(10);
  });

  it('multiplies by 52/12 for weekly', () => {
    expect(calculateMonthlyEquivalent(10, 'weekly')).toBeCloseTo(43.33, 2);
  });
});

describe('calculateTotalMonthlyCost', () => {
  it('sums monthly equivalents for active subscriptions', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true },
      { price: 120, billing_cycle: 'yearly', is_active: true },
    ];
    expect(calculateTotalMonthlyCost(subs)).toBe(20);
  });

  it('excludes inactive subscriptions', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true },
      { price: 20, billing_cycle: 'monthly', is_active: false },
    ];
    expect(calculateTotalMonthlyCost(subs)).toBe(10);
  });

  it('includes subscriptions with null is_active (treated as active)', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: null },
      { price: 20, billing_cycle: 'monthly', is_active: true },
    ];
    expect(calculateTotalMonthlyCost(subs)).toBe(30);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotalMonthlyCost([])).toBe(0);
  });

  it('handles mixed billing cycles', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true },
      { price: 120, billing_cycle: 'yearly', is_active: true },
      { price: 30, billing_cycle: 'quarterly', is_active: true },
      { price: 5, billing_cycle: 'weekly', is_active: true },
    ];
    const expected = 10 + 10 + 10 + 5 * (52 / 12);
    expect(calculateTotalMonthlyCost(subs)).toBeCloseTo(expected, 2);
  });
});

describe('getRenewalInfo', () => {
  it('returns "Renews today" for today\'s date', () => {
    const today = toLocalDateString(new Date());
    const result = getRenewalInfo(today);
    expect(result.text).toBe('Renews today');
    expect(result.daysUntil).toBe(0);
    expect(result.isOverdue).toBe(false);
  });

  it('returns "Renews in X days" for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const result = getRenewalInfo(toLocalDateString(future));
    expect(result.text).toBe('Renews in 5 days');
    expect(result.daysUntil).toBe(5);
    expect(result.isOverdue).toBe(false);
  });

  it('returns "Overdue by X days" for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const result = getRenewalInfo(toLocalDateString(past));
    expect(result.text).toBe('Overdue by 3 days');
    expect(result.daysUntil).toBe(-3);
    expect(result.isOverdue).toBe(true);
  });

  it('uses singular "day" for 1 day future', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = getRenewalInfo(toLocalDateString(tomorrow));
    expect(result.text).toBe('Renews in 1 day');
    expect(result.daysUntil).toBe(1);
  });

  it('uses singular "day" for 1 day overdue', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = getRenewalInfo(toLocalDateString(yesterday));
    expect(result.text).toBe('Overdue by 1 day');
    expect(result.daysUntil).toBe(-1);
  });
});

describe('getCategoryConfig', () => {
  it('returns correct category for valid id', () => {
    const result = getCategoryConfig('entertainment');
    expect(result.id).toBe('entertainment');
    expect(result.color).toBe('#8B5CF6');
    expect(result.icon).toBe('movie-open');
  });

  it('returns "Other" for null category', () => {
    const result = getCategoryConfig(null);
    expect(result.id).toBe('other');
    expect(result.color).toBe('#6B7280');
  });

  it('returns "Other" for unknown category', () => {
    const result = getCategoryConfig('nonexistent');
    expect(result.id).toBe('other');
  });

  it('returns "Other" for empty string category', () => {
    const result = getCategoryConfig('');
    expect(result.id).toBe('other');
  });

  it('returns music category with updated color', () => {
    const result = getCategoryConfig('music');
    expect(result.id).toBe('music');
    expect(result.icon).toBe('music');
    expect(result.color).toBe('#EF4444');
  });

  it('returns storage category (formerly cloud)', () => {
    const result = getCategoryConfig('storage');
    expect(result.id).toBe('storage');
    expect(result.label).toBe('Storage');
    expect(result.color).toBe('#F97316');
  });

  it('returns health category (formerly fitness)', () => {
    const result = getCategoryConfig('health');
    expect(result.id).toBe('health');
    expect(result.label).toBe('Health');
    expect(result.icon).toBe('heart-pulse');
    expect(result.color).toBe('#EC4899');
  });

  it('falls back to Other for old "cloud" category ID', () => {
    const result = getCategoryConfig('cloud');
    expect(result.id).toBe('other');
  });

  it('falls back to Other for old "fitness" category ID', () => {
    const result = getCategoryConfig('fitness');
    expect(result.id).toBe('other');
  });
});

describe('getTrialInfo', () => {
  it('returns status "none" when isTrial is false', () => {
    const result = getTrialInfo(false, null);
    expect(result.status).toBe('none');
    expect(result.text).toBe('');
    expect(result.daysRemaining).toBe(0);
  });

  it('returns status "none" when isTrial is null', () => {
    const result = getTrialInfo(null, null);
    expect(result.status).toBe('none');
    expect(result.text).toBe('');
  });

  it('returns status "active" with text "Trial" when isTrial is true but trialExpiryDate is null', () => {
    const result = getTrialInfo(true, null);
    expect(result.status).toBe('active');
    expect(result.text).toBe('Trial');
    expect(result.urgencyLevel).toBe('low');
    expect(result.daysRemaining).toBe(0);
  });

  it('returns status "active" with urgencyLevel "low" for >7 days remaining', () => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    const result = getTrialInfo(true, toLocalDateString(future));
    expect(result.status).toBe('active');
    expect(result.urgencyLevel).toBe('low');
    expect(result.daysRemaining).toBe(15);
    expect(result.text).toBe('15 days left');
  });

  it('returns status "expiring-soon" with urgencyLevel "medium" for 4-7 days remaining', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const result = getTrialInfo(true, toLocalDateString(future));
    expect(result.status).toBe('expiring-soon');
    expect(result.urgencyLevel).toBe('medium');
    expect(result.text).toBe('5 days left');
  });

  it('returns status "critical" with urgencyLevel "high" for 1-3 days remaining', () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const result = getTrialInfo(true, toLocalDateString(future));
    expect(result.status).toBe('critical');
    expect(result.urgencyLevel).toBe('high');
    expect(result.text).toBe('2 days left');
  });

  it('returns singular "1 day left" for exactly 1 day remaining', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = getTrialInfo(true, toLocalDateString(tomorrow));
    expect(result.status).toBe('critical');
    expect(result.urgencyLevel).toBe('high');
    expect(result.text).toBe('1 day left');
    expect(result.daysRemaining).toBe(1);
  });

  it('returns status "critical" with urgencyLevel "critical" for 0 days (today)', () => {
    const today = toLocalDateString(new Date());
    const result = getTrialInfo(true, today);
    expect(result.status).toBe('critical');
    expect(result.urgencyLevel).toBe('critical');
    expect(result.text).toBe('Expires today');
    expect(result.daysRemaining).toBe(0);
  });

  it('returns status "expired" with urgencyLevel "critical" for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const result = getTrialInfo(true, toLocalDateString(past));
    expect(result.status).toBe('expired');
    expect(result.urgencyLevel).toBe('critical');
    expect(result.text).toBe('Trial expired');
    expect(result.daysRemaining).toBe(-5);
  });

  it('returns correct daysRemaining values (positive, zero, negative)', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(getTrialInfo(true, toLocalDateString(future)).daysRemaining).toBe(10);

    const today = toLocalDateString(new Date());
    expect(getTrialInfo(true, today).daysRemaining).toBe(0);

    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(getTrialInfo(true, toLocalDateString(past)).daysRemaining).toBe(-3);
  });

  it('boundary: exactly 7 days returns urgencyLevel "medium"', () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const result = getTrialInfo(true, toLocalDateString(future));
    expect(result.urgencyLevel).toBe('medium');
    expect(result.status).toBe('expiring-soon');
  });

  it('boundary: exactly 8 days returns urgencyLevel "low"', () => {
    const future = new Date();
    future.setDate(future.getDate() + 8);
    const result = getTrialInfo(true, toLocalDateString(future));
    expect(result.urgencyLevel).toBe('low');
    expect(result.status).toBe('active');
  });

  it('boundary: exactly 3 days returns urgencyLevel "high"', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const result = getTrialInfo(true, toLocalDateString(future));
    expect(result.urgencyLevel).toBe('high');
    expect(result.status).toBe('critical');
  });

  it('boundary: exactly 4 days returns urgencyLevel "medium"', () => {
    const future = new Date();
    future.setDate(future.getDate() + 4);
    const result = getTrialInfo(true, toLocalDateString(future));
    expect(result.urgencyLevel).toBe('medium');
    expect(result.status).toBe('expiring-soon');
  });
});

describe('calculateCategoryBreakdown', () => {
  it('returns empty array for empty subscriptions', () => {
    expect(calculateCategoryBreakdown([])).toEqual([]);
  });

  it('returns empty array when all subscriptions are inactive', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: false, category: 'music' },
      { price: 20, billing_cycle: 'monthly', is_active: false, category: 'entertainment' },
    ];
    expect(calculateCategoryBreakdown(subs)).toEqual([]);
  });

  it('groups subscriptions by category with correct totals', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'music' },
      { price: 5, billing_cycle: 'monthly', is_active: true, category: 'music' },
      { price: 120, billing_cycle: 'yearly', is_active: true, category: 'entertainment' },
    ];
    const result = calculateCategoryBreakdown(subs);
    expect(result).toHaveLength(2);
    expect(result[0].categoryId).toBe('music');
    expect(result[0].monthlyTotal).toBe(15);
    expect(result[1].categoryId).toBe('entertainment');
    expect(result[1].monthlyTotal).toBe(10);
  });

  it('normalizes billing cycles (yearly/quarterly/weekly → monthly equivalent)', () => {
    const subs = [
      { price: 120, billing_cycle: 'yearly', is_active: true, category: 'entertainment' },
      { price: 30, billing_cycle: 'quarterly', is_active: true, category: 'music' },
      { price: 2, billing_cycle: 'weekly', is_active: true, category: 'gaming' },
    ];
    const result = calculateCategoryBreakdown(subs);
    const entertainment = result.find((r) => r.categoryId === 'entertainment');
    const music = result.find((r) => r.categoryId === 'music');
    const gaming = result.find((r) => r.categoryId === 'gaming');
    expect(entertainment?.monthlyTotal).toBe(10);
    expect(music?.monthlyTotal).toBe(10);
    expect(gaming?.monthlyTotal).toBeCloseTo(2 * (52 / 12), 2);
  });

  it('sorts categories by monthly total descending', () => {
    const subs = [
      { price: 5, billing_cycle: 'monthly', is_active: true, category: 'music' },
      { price: 20, billing_cycle: 'monthly', is_active: true, category: 'entertainment' },
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'gaming' },
    ];
    const result = calculateCategoryBreakdown(subs);
    expect(result[0].categoryId).toBe('entertainment');
    expect(result[1].categoryId).toBe('gaming');
    expect(result[2].categoryId).toBe('music');
  });

  it('calculates correct percentages summing to ~100%', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'music' },
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'entertainment' },
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'gaming' },
    ];
    const result = calculateCategoryBreakdown(subs);
    const totalPercentage = result.reduce((sum, item) => sum + item.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 1);
    expect(result[0].percentage).toBeCloseTo(33.33, 1);
  });

  it('maps subscriptions with null category to "Other"', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true, category: null },
    ];
    const result = calculateCategoryBreakdown(subs);
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe('other');
    expect(result[0].categoryLabel).toBe('Other');
    expect(result[0].color).toBe('#6B7280');
  });

  it('single category shows 100%', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'music' },
      { price: 5, billing_cycle: 'monthly', is_active: true, category: 'music' },
    ];
    const result = calculateCategoryBreakdown(subs);
    expect(result).toHaveLength(1);
    expect(result[0].percentage).toBe(100);
    expect(result[0].monthlyTotal).toBe(15);
  });

  it('includes correct color and icon from category config', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: true, category: 'entertainment' },
    ];
    const result = calculateCategoryBreakdown(subs);
    expect(result[0].color).toBe('#8B5CF6');
    expect(result[0].icon).toBe('movie-open');
  });

  it('treats is_active null as active', () => {
    const subs = [
      { price: 10, billing_cycle: 'monthly', is_active: null, category: 'music' },
    ];
    const result = calculateCategoryBreakdown(subs);
    expect(result).toHaveLength(1);
    expect(result[0].monthlyTotal).toBe(10);
  });
});

describe('calculateActiveCount', () => {
  it('returns 0 for empty array', () => {
    expect(calculateActiveCount([])).toBe(0);
  });

  it('counts all as active when all are active', () => {
    expect(calculateActiveCount([{ is_active: true }, { is_active: true }])).toBe(2);
  });

  it('counts active and null as active', () => {
    expect(
      calculateActiveCount([
        { is_active: true },
        { is_active: null },
        { is_active: false },
      ]),
    ).toBe(2);
  });

  it('returns 0 when all are inactive', () => {
    expect(calculateActiveCount([{ is_active: false }, { is_active: false }])).toBe(0);
  });
});

describe('calculateAverageMonthlyCost', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverageMonthlyCost([])).toBe(0);
  });

  it('returns 0 when all inactive', () => {
    expect(
      calculateAverageMonthlyCost([
        { price: 10, billing_cycle: 'monthly', is_active: false },
      ]),
    ).toBe(0);
  });

  it('returns price for single active monthly subscription', () => {
    expect(
      calculateAverageMonthlyCost([
        { price: 10, billing_cycle: 'monthly', is_active: true },
      ]),
    ).toBe(10);
  });

  it('calculates average of monthly equivalents', () => {
    // 10/month + 120/year(=10/month) = 20 total / 2 = 10 average
    expect(
      calculateAverageMonthlyCost([
        { price: 10, billing_cycle: 'monthly', is_active: true },
        { price: 120, billing_cycle: 'yearly', is_active: true },
      ]),
    ).toBe(10);
  });

  it('excludes inactive subscriptions from average', () => {
    expect(
      calculateAverageMonthlyCost([
        { price: 10, billing_cycle: 'monthly', is_active: true },
        { price: 50, billing_cycle: 'monthly', is_active: false },
      ]),
    ).toBe(10);
  });

  it('treats null is_active as active', () => {
    expect(
      calculateAverageMonthlyCost([
        { price: 20, billing_cycle: 'monthly', is_active: null },
        { price: 20, billing_cycle: 'monthly', is_active: true },
      ]),
    ).toBe(20);
  });
});

describe('calculateMonthlySavings', () => {
  it('returns 0 for empty array', () => {
    expect(calculateMonthlySavings([])).toBe(0);
  });

  it('returns 0 when no inactive subscriptions', () => {
    expect(
      calculateMonthlySavings([
        { price: 10, billing_cycle: 'monthly', is_active: true },
      ]),
    ).toBe(0);
  });

  it('returns 0 for null is_active (not considered inactive)', () => {
    expect(
      calculateMonthlySavings([
        { price: 10, billing_cycle: 'monthly', is_active: null },
      ]),
    ).toBe(0);
  });

  it('sums monthly equivalents of inactive subscriptions', () => {
    expect(
      calculateMonthlySavings([
        { price: 10, billing_cycle: 'monthly', is_active: false },
        { price: 120, billing_cycle: 'yearly', is_active: false },
        { price: 5, billing_cycle: 'monthly', is_active: true }, // excluded
      ]),
    ).toBeCloseTo(20); // 10 + 120/12
  });

  it('handles different billing cycles for inactive subs', () => {
    expect(
      calculateMonthlySavings([
        { price: 30, billing_cycle: 'quarterly', is_active: false },
      ]),
    ).toBe(10);
  });
});

describe('calculateInactiveCount', () => {
  it('returns 0 for empty array', () => {
    expect(calculateInactiveCount([])).toBe(0);
  });

  it('returns 0 when no inactive subscriptions', () => {
    expect(calculateInactiveCount([{ is_active: true }, { is_active: null }])).toBe(0);
  });

  it('counts only is_active === false (not null)', () => {
    expect(
      calculateInactiveCount([
        { is_active: false },
        { is_active: null },
        { is_active: true },
      ]),
    ).toBe(1);
  });

  it('counts all when all inactive', () => {
    expect(
      calculateInactiveCount([{ is_active: false }, { is_active: false }]),
    ).toBe(2);
  });
});

const baseSubscription: Subscription = {
  id: '1',
  name: 'Netflix',
  price: 17.99,
  billing_cycle: 'monthly',
  is_active: true,
  renewal_date: '',
  currency: '€',
  category: null,
  notes: null,
  is_trial: false,
  trial_expiry_date: null,
  user_id: 'user-1',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('getUpcomingRenewals', () => {
  it('returns empty array for empty subscriptions', () => {
    expect(getUpcomingRenewals([])).toEqual([]);
  });

  it('returns empty array when no upcoming renewals in 30 days', () => {
    const future = new Date();
    future.setDate(future.getDate() + 31);
    const sub = { ...baseSubscription, renewal_date: toLocalDateString(future) };
    expect(getUpcomingRenewals([sub])).toEqual([]);
  });

  it('includes subscription renewing today (daysUntil = 0)', () => {
    const sub = { ...baseSubscription, renewal_date: toLocalDateString(new Date()) };
    const result = getUpcomingRenewals([sub]);
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(0);
    expect(result[0].isUrgent).toBe(true);
  });

  it('includes subscription renewing in 30 days', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const sub = { ...baseSubscription, renewal_date: toLocalDateString(future) };
    const result = getUpcomingRenewals([sub]);
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(30);
  });

  it('excludes subscription renewing in 31 days', () => {
    const future = new Date();
    future.setDate(future.getDate() + 31);
    const sub = { ...baseSubscription, renewal_date: toLocalDateString(future) };
    expect(getUpcomingRenewals([sub])).toHaveLength(0);
  });

  it('excludes overdue subscriptions (daysUntil < 0)', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const sub = { ...baseSubscription, renewal_date: toLocalDateString(past) };
    expect(getUpcomingRenewals([sub])).toHaveLength(0);
  });

  it('excludes subscriptions with is_active === false', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const sub = { ...baseSubscription, is_active: false, renewal_date: toLocalDateString(future) };
    expect(getUpcomingRenewals([sub])).toHaveLength(0);
  });

  it('includes subscriptions with is_active === null (treated as active)', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const sub = { ...baseSubscription, is_active: null, renewal_date: toLocalDateString(future) };
    const result = getUpcomingRenewals([sub]);
    expect(result).toHaveLength(1);
  });

  it('includes subscriptions with is_active === true', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const sub = { ...baseSubscription, is_active: true, renewal_date: toLocalDateString(future) };
    const result = getUpcomingRenewals([sub]);
    expect(result).toHaveLength(1);
  });

  it('sorts by daysUntil ascending (soonest first)', () => {
    const d10 = new Date(); d10.setDate(d10.getDate() + 10);
    const d5 = new Date(); d5.setDate(d5.getDate() + 5);
    const d20 = new Date(); d20.setDate(d20.getDate() + 20);
    const subs = [
      { ...baseSubscription, id: '1', name: 'A', renewal_date: toLocalDateString(d10) },
      { ...baseSubscription, id: '2', name: 'B', renewal_date: toLocalDateString(d5) },
      { ...baseSubscription, id: '3', name: 'C', renewal_date: toLocalDateString(d20) },
    ];
    const result = getUpcomingRenewals(subs);
    expect(result[0].daysUntil).toBe(5);
    expect(result[1].daysUntil).toBe(10);
    expect(result[2].daysUntil).toBe(20);
  });

  it('sets isUrgent = true when daysUntil <= 3', () => {
    const d2 = new Date(); d2.setDate(d2.getDate() + 2);
    const d3 = new Date(); d3.setDate(d3.getDate() + 3);
    const d4 = new Date(); d4.setDate(d4.getDate() + 4);
    const subs = [
      { ...baseSubscription, id: '1', renewal_date: toLocalDateString(d2) },
      { ...baseSubscription, id: '2', renewal_date: toLocalDateString(d3) },
      { ...baseSubscription, id: '3', renewal_date: toLocalDateString(d4) },
    ];
    const result = getUpcomingRenewals(subs);
    expect(result.find(r => r.daysUntil === 2)?.isUrgent).toBe(true);
    expect(result.find(r => r.daysUntil === 3)?.isUrgent).toBe(true);
    expect(result.find(r => r.daysUntil === 4)?.isUrgent).toBe(false);
  });

  it('sets isTrial = true for trial subscriptions', () => {
    const future = new Date(); future.setDate(future.getDate() + 5);
    const trialExpiry = new Date(); trialExpiry.setDate(trialExpiry.getDate() + 10);
    const sub = {
      ...baseSubscription,
      is_trial: true,
      trial_expiry_date: toLocalDateString(trialExpiry),
      renewal_date: toLocalDateString(future),
    };
    const result = getUpcomingRenewals([sub]);
    expect(result[0].isTrial).toBe(true);
    expect(result[0].trialText).toBeTruthy();
  });

  it('sets isTrial = false for non-trial subscriptions', () => {
    const future = new Date(); future.setDate(future.getDate() + 5);
    const sub = { ...baseSubscription, is_trial: false, renewal_date: toLocalDateString(future) };
    const result = getUpcomingRenewals([sub]);
    expect(result[0].isTrial).toBe(false);
    expect(result[0].trialText).toBe('');
  });

  it('includes renewalText from getRenewalInfo', () => {
    const future = new Date(); future.setDate(future.getDate() + 5);
    const sub = { ...baseSubscription, renewal_date: toLocalDateString(future) };
    const result = getUpcomingRenewals([sub]);
    expect(result[0].renewalText).toBe('Renews in 5 days');
  });

  it('returns subscription object in result', () => {
    const future = new Date(); future.setDate(future.getDate() + 5);
    const sub = { ...baseSubscription, renewal_date: toLocalDateString(future) };
    const result = getUpcomingRenewals([sub]);
    expect(result[0].subscription).toEqual(sub);
  });
});
