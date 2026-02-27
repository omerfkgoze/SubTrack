import { differenceInDays, isToday, parseISO, startOfDay } from 'date-fns';
import { SUBSCRIPTION_CATEGORIES } from '@config/categories';
import type { SubscriptionCategory } from '@config/categories';
import type { BillingCycle } from '@features/subscriptions/types';

export function formatBillingCycleShort(cycle: BillingCycle): string {
  switch (cycle) {
    case 'monthly':
      return 'mo';
    case 'yearly':
      return 'yr';
    case 'quarterly':
      return 'qtr';
    case 'weekly':
      return 'wk';
  }
}

export function formatPrice(price: number, cycle: BillingCycle): string {
  return `€${price.toFixed(2)}/${formatBillingCycleShort(cycle)}`;
}

export function calculateMonthlyEquivalent(price: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly':
      return price;
    case 'yearly':
      return price / 12;
    case 'quarterly':
      return price / 3;
    case 'weekly':
      return price * (52 / 12);
  }
}

export function calculateTotalMonthlyCost(
  subscriptions: { price: number; billing_cycle: string; is_active: boolean | null }[],
): number {
  return subscriptions
    .filter((sub) => sub.is_active !== false)
    .reduce((total, sub) => {
      return total + calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle);
    }, 0);
}

export function getRenewalInfo(renewalDate: string): {
  text: string;
  daysUntil: number;
  isOverdue: boolean;
} {
  const date = startOfDay(parseISO(renewalDate));
  const today = startOfDay(new Date());

  if (isToday(date)) {
    return { text: 'Renews today', daysUntil: 0, isOverdue: false };
  }

  const days = differenceInDays(date, today);

  if (days < 0) {
    return { text: `Overdue by ${Math.abs(days)} days`, daysUntil: days, isOverdue: true };
  }

  return { text: `Renews in ${days} days`, daysUntil: days, isOverdue: false };
}

export function getCategoryConfig(categoryId: string | null): SubscriptionCategory {
  if (!categoryId) {
    return SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'other')!;
  }
  return (
    SUBSCRIPTION_CATEGORIES.find((c) => c.id === categoryId) ??
    SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'other')!
  );
}
