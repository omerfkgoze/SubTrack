import type { Subscription } from '@features/subscriptions/types';
import type { DetectedSubscription } from '@features/bank/types';
import type { ReconciliationSummary } from '@features/bank/types/reconciliation';

function normalizeToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

export function computeReconciliation(
  subscriptions: Subscription[],
  detectedSubscriptions: DetectedSubscription[],
): ReconciliationSummary {
  const activeSubscriptions = subscriptions.filter((s) => s.is_active !== false);
  const trackedTotal = activeSubscriptions.reduce(
    (sum, s) => sum + normalizeToMonthly(s.price, s.billing_cycle),
    0,
  );

  const relevantDetected = detectedSubscriptions.filter(
    (d) => d.status === 'detected' || d.status === 'approved',
  );
  const detectedTotal = relevantDetected.reduce(
    (sum, d) => sum + normalizeToMonthly(d.amount, d.frequency),
    0,
  );

  const matchedDetected = detectedSubscriptions.filter((d) => d.status === 'matched');
  const matchedTotal = matchedDetected.reduce(
    (sum, d) => sum + normalizeToMonthly(d.amount, d.frequency),
    0,
  );

  const totalDetectedSpending = detectedTotal + matchedTotal;
  const difference = totalDetectedSpending - trackedTotal;

  const unmatchedDetected = detectedSubscriptions.filter((d) => d.status === 'detected');

  return {
    trackedTotal: Math.round(trackedTotal * 100) / 100,
    detectedTotal: Math.round(totalDetectedSpending * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    unmatchedDetected,
    isFullyReconciled: Math.abs(difference) <= 0.50 && unmatchedDetected.length === 0,
  };
}
