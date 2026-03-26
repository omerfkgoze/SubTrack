import type { DetectedSubscription } from './index';

export interface ReconciliationSummary {
  trackedTotal: number;
  detectedTotal: number;
  difference: number;
  unmatchedDetected: DetectedSubscription[];
  isFullyReconciled: boolean;
}
