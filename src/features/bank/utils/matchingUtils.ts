import type { DetectedSubscription } from '@features/bank/types';
import type { Subscription } from '@features/subscriptions/types';

export interface MatchResult {
  detectedId: string;
  subscriptionId: string;
  subscriptionName: string;
  subscriptionPrice: number;
  subscriptionBillingCycle: string;
  subscriptionCurrency: string;
  matchScore: number; // 0.0 - 1.0
  matchReasons: string[]; // e.g. ['name_similar', 'amount_close', 'cycle_match']
}

const COMMON_SUFFIXES = ['subscription', 'premium', 'plus', 'monthly', 'yearly'];

export function normalizeName(name: string): string {
  let normalized = name.toLowerCase().trim();
  for (const suffix of COMMON_SUFFIXES) {
    normalized = normalized.replace(new RegExp(`\\b${suffix}\\b`, 'g'), '').trim();
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function scoreMatch(
  detected: DetectedSubscription,
  subscription: Subscription,
): { score: number; reasons: string[] } {
  const normalizedDetected = normalizeName(detected.merchantName);
  const normalizedSubscription = normalizeName(subscription.name);

  let score = 0;
  const reasons: string[] = [];

  // Name similarity: substring inclusion check
  if (
    normalizedDetected.length > 0 &&
    normalizedSubscription.length > 0 &&
    (normalizedDetected.includes(normalizedSubscription) ||
      normalizedSubscription.includes(normalizedDetected))
  ) {
    score += 0.5;
    reasons.push('name_similar');
  }

  // Amount proximity: within ±10%
  if (
    Math.abs(detected.amount - subscription.price) /
      Math.max(detected.amount, subscription.price) <=
    0.1
  ) {
    score += 0.3;
    reasons.push('amount_close');
  }

  // Billing cycle match
  if (detected.frequency === subscription.billing_cycle) {
    score += 0.2;
    reasons.push('cycle_match');
  }

  return { score, reasons };
}

/**
 * Returns a Map keyed by detectedId → best MatchResult.
 * Only includes matches with score >= 0.5 (name must match at minimum).
 */
export function findMatches(
  detected: DetectedSubscription[],
  subscriptions: Subscription[],
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>();

  for (const det of detected) {
    let bestMatch: MatchResult | null = null;

    for (const sub of subscriptions) {
      const { score, reasons } = scoreMatch(det, sub);

      if (reasons.includes('name_similar') && score >= 0.5 && (!bestMatch || score > bestMatch.matchScore)) {
        bestMatch = {
          detectedId: det.id,
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          subscriptionPrice: sub.price,
          subscriptionBillingCycle: sub.billing_cycle,
          subscriptionCurrency: sub.currency ?? '',
          matchScore: score,
          matchReasons: reasons,
        };
      }
    }

    if (bestMatch) {
      results.set(det.id, bestMatch);
    }
  }

  return results;
}
