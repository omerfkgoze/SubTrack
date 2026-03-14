import { differenceInDays, isToday, parseISO, startOfDay } from 'date-fns';
import { SUBSCRIPTION_CATEGORIES } from '@config/categories';
import type { SubscriptionCategory } from '@config/categories';
import type { BillingCycle, Subscription } from '@features/subscriptions/types';

export type TrialStatus = 'active' | 'expiring-soon' | 'critical' | 'expired' | 'none';
export type TrialUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface TrialInfo {
  daysRemaining: number;
  status: TrialStatus;
  text: string;
  urgencyLevel: TrialUrgency;
}

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
    default:
      return price;
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
    const absDays = Math.abs(days);
    return { text: `Overdue by ${absDays} ${absDays === 1 ? 'day' : 'days'}`, daysUntil: days, isOverdue: true };
  }

  return { text: `Renews in ${days} ${days === 1 ? 'day' : 'days'}`, daysUntil: days, isOverdue: false };
}

const DEFAULT_CATEGORY: SubscriptionCategory = {
  id: 'other',
  label: 'Other',
  icon: 'package-variant',
  color: '#6B7280',
};

export function getTrialInfo(
  isTrial: boolean | null,
  trialExpiryDate: string | null,
): TrialInfo {
  if (!isTrial) {
    return { daysRemaining: 0, status: 'none', text: '', urgencyLevel: 'low' };
  }

  if (!trialExpiryDate) {
    return { daysRemaining: 0, status: 'active', text: 'Trial', urgencyLevel: 'low' };
  }

  const expiryDate = startOfDay(parseISO(trialExpiryDate));
  const today = startOfDay(new Date());

  if (isToday(expiryDate)) {
    return { daysRemaining: 0, status: 'critical', text: 'Expires today', urgencyLevel: 'critical' };
  }

  const days = differenceInDays(expiryDate, today);

  if (days < 0) {
    return { daysRemaining: days, status: 'expired', text: 'Trial expired', urgencyLevel: 'critical' };
  }

  const dayText = `${days} ${days === 1 ? 'day' : 'days'} left`;

  if (days <= 3) {
    return { daysRemaining: days, status: 'critical', text: dayText, urgencyLevel: 'high' };
  }

  if (days <= 7) {
    return { daysRemaining: days, status: 'expiring-soon', text: dayText, urgencyLevel: 'medium' };
  }

  return { daysRemaining: days, status: 'active', text: dayText, urgencyLevel: 'low' };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryLabel: string;
  color: string;
  icon: string;
  monthlyTotal: number;
  percentage: number;
}

export function calculateCategoryBreakdown(
  subscriptions: { price: number; billing_cycle: string; is_active: boolean | null; category: string | null }[],
): CategoryBreakdownItem[] {
  const active = subscriptions.filter((sub) => sub.is_active !== false);
  if (active.length === 0) return [];

  const categoryMap = new Map<string, number>();
  for (const sub of active) {
    const config = getCategoryConfig(sub.category);
    const monthly = calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle);
    categoryMap.set(config.id, (categoryMap.get(config.id) ?? 0) + monthly);
  }

  const grandTotal = [...categoryMap.values()].reduce((sum, val) => sum + val, 0);

  return [...categoryMap.entries()]
    .map(([catId, total]) => {
      const config = getCategoryConfig(catId);
      return {
        categoryId: catId,
        categoryLabel: config.label,
        color: config.color,
        icon: config.icon,
        monthlyTotal: total,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}

export function calculateActiveCount(subscriptions: { is_active: boolean | null }[]): number {
  return subscriptions.filter((sub) => sub.is_active !== false).length;
}

export function calculateAverageMonthlyCost(
  subscriptions: { price: number; billing_cycle: string; is_active: boolean | null }[],
): number {
  const active = subscriptions.filter((sub) => sub.is_active !== false);
  if (active.length === 0) return 0;
  const total = active.reduce(
    (sum, sub) => sum + calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle),
    0,
  );
  return total / active.length;
}

export function calculateMonthlySavings(
  subscriptions: { price: number; billing_cycle: string; is_active: boolean | null }[],
): number {
  return subscriptions
    .filter((sub) => sub.is_active === false)
    .reduce(
      (sum, sub) => sum + calculateMonthlyEquivalent(sub.price, sub.billing_cycle as BillingCycle),
      0,
    );
}

export function calculateInactiveCount(subscriptions: { is_active: boolean | null }[]): number {
  return subscriptions.filter((sub) => sub.is_active === false).length;
}

export interface UpcomingRenewal {
  subscription: Subscription;
  daysUntil: number;
  isUrgent: boolean;
  renewalText: string;
  isTrial: boolean;
  trialText: string;
}

export function getUpcomingRenewals(subscriptions: Subscription[]): UpcomingRenewal[] {
  const result: UpcomingRenewal[] = [];

  for (const sub of subscriptions) {
    if (sub.is_active === false) continue;

    const renewalInfo = getRenewalInfo(sub.renewal_date);
    const { daysUntil } = renewalInfo;

    if (daysUntil < 0 || daysUntil > 30) continue;

    const trialInfo = getTrialInfo(sub.is_trial, sub.trial_expiry_date);

    result.push({
      subscription: sub,
      daysUntil,
      isUrgent: daysUntil <= 3,
      renewalText: renewalInfo.text,
      isTrial: trialInfo.status !== 'none',
      trialText: trialInfo.text,
    });
  }

  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getCategoryConfig(categoryId: string | null): SubscriptionCategory {
  if (!categoryId) {
    return SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'other') ?? DEFAULT_CATEGORY;
  }
  return (
    SUBSCRIPTION_CATEGORIES.find((c) => c.id === categoryId) ??
    SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'other') ??
    DEFAULT_CATEGORY
  );
}
