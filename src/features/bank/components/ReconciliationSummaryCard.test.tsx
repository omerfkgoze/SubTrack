import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { ReconciliationSummaryCard } from './ReconciliationSummaryCard';
import type { ReconciliationSummary } from '../types/reconciliation';
import type { DetectedSubscription } from '../types';

const baseDetected: DetectedSubscription = {
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
};

const reconciledSummary: ReconciliationSummary = {
  trackedTotal: 50.00,
  detectedTotal: 50.00,
  difference: 0,
  unmatchedDetected: [],
  isFullyReconciled: true,
};

const mismatchedSummary: ReconciliationSummary = {
  trackedTotal: 30.00,
  detectedTotal: 45.00,
  difference: 15.00,
  unmatchedDetected: [baseDetected],
  isFullyReconciled: false,
};

function renderCard(summary: ReconciliationSummary) {
  return render(
    <PaperProvider theme={theme}>
      <ReconciliationSummaryCard summary={summary} />
    </PaperProvider>,
  );
}

describe('ReconciliationSummaryCard', () => {
  describe('when fully reconciled', () => {
    it('shows success message', () => {
      renderCard(reconciledSummary);
      expect(screen.getByLabelText('Your tracking is 100% accurate!')).toBeTruthy();
    });

    it('shows tracked total', () => {
      renderCard(reconciledSummary);
      expect(screen.getByLabelText('Tracked: €50.00 per month')).toBeTruthy();
    });

    it('shows detected total', () => {
      renderCard(reconciledSummary);
      expect(screen.getByLabelText('Detected: €50.00 per month')).toBeTruthy();
    });

    it('does not show difference row', () => {
      renderCard(reconciledSummary);
      expect(screen.queryByLabelText(/Difference:/)).toBeNull();
    });
  });

  describe('when not reconciled', () => {
    it('shows mismatch message', () => {
      renderCard(mismatchedSummary);
      expect(screen.getByLabelText('Spending mismatch detected')).toBeTruthy();
    });

    it('shows tracked total', () => {
      renderCard(mismatchedSummary);
      expect(screen.getByLabelText('Tracked: €30.00 per month')).toBeTruthy();
    });

    it('shows detected total', () => {
      renderCard(mismatchedSummary);
      expect(screen.getByLabelText('Detected: €45.00 per month')).toBeTruthy();
    });

    it('shows difference amount', () => {
      renderCard(mismatchedSummary);
      expect(screen.getByLabelText('Difference: €15.00 per month')).toBeTruthy();
    });
  });

  it('renders with accessibility label for the card', () => {
    renderCard(reconciledSummary);
    expect(screen.getByLabelText('Reconciliation summary')).toBeTruthy();
  });
});
