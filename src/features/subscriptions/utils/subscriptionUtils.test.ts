import {
  formatBillingCycleShort,
  formatPrice,
  calculateMonthlyEquivalent,
  calculateTotalMonthlyCost,
  getRenewalInfo,
  getCategoryConfig,
} from './subscriptionUtils';

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
    expect(result.color).toBe('#6366F1');
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

  it('returns music category', () => {
    const result = getCategoryConfig('music');
    expect(result.id).toBe('music');
    expect(result.icon).toBe('music');
  });
});
