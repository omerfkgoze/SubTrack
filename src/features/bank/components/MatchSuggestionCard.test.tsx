import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { MatchSuggestionCard } from './MatchSuggestionCard';
import type { DetectedSubscription } from '../types';
import type { MatchResult } from '@shared/stores/useBankStore';

const mockDetected: DetectedSubscription = {
  id: 'det-1',
  userId: 'u1',
  bankConnectionId: 'c1',
  tinkGroupId: 'g1',
  merchantName: 'Netflix',
  amount: 15.49,
  currency: 'EUR',
  frequency: 'monthly',
  confidenceScore: 0.95,
  status: 'detected',
  firstSeen: '2025-09-15',
  lastSeen: '2026-03-15',
};

const mockMatch: MatchResult = {
  detectedId: 'det-1',
  subscriptionId: 'sub-1',
  subscriptionName: 'Netflix Premium',
  subscriptionPrice: 12.99,
  subscriptionBillingCycle: 'monthly',
  subscriptionCurrency: 'EUR',
  matchScore: 0.7,
  matchReasons: ['name_similar', 'cycle_match'],
};

const mockOnConfirm = jest.fn();
const mockOnDismiss = jest.fn();
const mockOnReplace = jest.fn();

function renderCard(
  detected: DetectedSubscription = mockDetected,
  match: MatchResult = mockMatch,
) {
  return render(
    <PaperProvider theme={theme}>
      <MatchSuggestionCard
        detected={detected}
        match={match}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
        onReplace={mockOnReplace}
      />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MatchSuggestionCard', () => {
  describe('rendering', () => {
    it('shows Possible Match indicator', () => {
      renderCard();
      expect(screen.getByText('Possible Match')).toBeTruthy();
    });

    it('renders detected subscription data', () => {
      renderCard();
      expect(screen.getByLabelText('Detected name: Netflix')).toBeTruthy();
      expect(screen.getByLabelText('Detected amount: 15.49 EUR')).toBeTruthy();
      expect(screen.getByLabelText('Detected cycle: Monthly')).toBeTruthy();
    });

    it('renders manual subscription data', () => {
      renderCard();
      expect(screen.getByLabelText('Subscription name: Netflix Premium')).toBeTruthy();
      expect(screen.getByLabelText('Subscription price: 12.99 EUR')).toBeTruthy();
      expect(screen.getByLabelText('Subscription cycle: Monthly')).toBeTruthy();
    });

    it('shows column headers: Detected and Your Subscription', () => {
      renderCard();
      expect(screen.getByText('Detected')).toBeTruthy();
      expect(screen.getByText('Your Subscription')).toBeTruthy();
    });

    it('has accessible card label', () => {
      renderCard();
      expect(screen.getByLabelText('Possible match: Netflix and Netflix Premium')).toBeTruthy();
    });
  });

  describe('match reason chips', () => {
    it('displays name_similar reason chip', () => {
      renderCard();
      expect(screen.getByLabelText('Name')).toBeTruthy();
    });

    it('displays cycle_match reason chip', () => {
      renderCard();
      expect(screen.getByLabelText('Cycle')).toBeTruthy();
    });

    it('displays amount_close chip when present', () => {
      const matchWithAmount: MatchResult = {
        ...mockMatch,
        matchReasons: ['name_similar', 'amount_close', 'cycle_match'],
      };
      renderCard(mockDetected, matchWithAmount);
      expect(screen.getByLabelText('Amount')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('renders Confirm Match button', () => {
      renderCard();
      expect(screen.getByLabelText('Confirm match between Netflix and Netflix Premium')).toBeTruthy();
    });

    it('renders Not a Match button', () => {
      renderCard();
      expect(screen.getByLabelText('Not a match: Netflix')).toBeTruthy();
    });

    it('renders Replace button', () => {
      renderCard();
      expect(screen.getByLabelText('Replace Netflix Premium with detected data')).toBeTruthy();
    });

    it('calls onConfirm when Confirm Match is pressed', () => {
      renderCard();
      fireEvent.press(screen.getByLabelText('Confirm match between Netflix and Netflix Premium'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when Not a Match is pressed', () => {
      renderCard();
      fireEvent.press(screen.getByLabelText('Not a match: Netflix'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onReplace when Replace is pressed', () => {
      renderCard();
      fireEvent.press(screen.getByLabelText('Replace Netflix Premium with detected data'));
      expect(mockOnReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe('difference highlighting', () => {
    it('renders correctly when amounts differ', () => {
      const detected = { ...mockDetected, amount: 15.49 };
      const match = { ...mockMatch, subscriptionPrice: 12.99 };
      renderCard(detected, match);
      // Both amount fields should render
      expect(screen.getByLabelText('Detected amount: 15.49 EUR')).toBeTruthy();
      expect(screen.getByLabelText('Subscription price: 12.99 EUR')).toBeTruthy();
    });

    it('renders correctly when names differ', () => {
      const detected = { ...mockDetected, merchantName: 'Netflix' };
      const match = { ...mockMatch, subscriptionName: 'Netflix Premium' };
      renderCard(detected, match);
      expect(screen.getByLabelText('Detected name: Netflix')).toBeTruthy();
      expect(screen.getByLabelText('Subscription name: Netflix Premium')).toBeTruthy();
    });
  });
});
