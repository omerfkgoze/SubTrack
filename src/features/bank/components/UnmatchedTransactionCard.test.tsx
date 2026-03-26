import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { UnmatchedTransactionCard } from './UnmatchedTransactionCard';
import type { DetectedSubscription } from '../types';

const mockItem: DetectedSubscription = {
  id: 'det-1',
  userId: 'user-1',
  bankConnectionId: 'conn-1',
  tinkGroupId: 'grp-1',
  merchantName: 'Spotify',
  amount: 9.99,
  currency: 'EUR',
  frequency: 'monthly',
  confidenceScore: 0.85,
  status: 'detected',
  firstSeen: '2025-10-01',
  lastSeen: '2026-02-01',
};

const mockOnAdd = jest.fn();
const mockOnDismiss = jest.fn();

function renderCard(item: DetectedSubscription = mockItem) {
  return render(
    <PaperProvider theme={theme}>
      <UnmatchedTransactionCard item={item} onAdd={mockOnAdd} onDismiss={mockOnDismiss} />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UnmatchedTransactionCard', () => {
  it('renders merchant name', () => {
    renderCard();
    expect(screen.getByText('Spotify')).toBeTruthy();
  });

  it('renders amount with currency', () => {
    renderCard();
    expect(screen.getByText('9.99 EUR')).toBeTruthy();
  });

  it('renders frequency', () => {
    renderCard();
    expect(screen.getByText('Monthly')).toBeTruthy();
  });

  it('renders Add to Subscriptions button', () => {
    renderCard();
    expect(screen.getByLabelText('Add Spotify to subscriptions')).toBeTruthy();
  });

  it('renders Dismiss button', () => {
    renderCard();
    expect(screen.getByLabelText('Dismiss Spotify')).toBeTruthy();
  });

  it('calls onAdd when Add to Subscriptions is pressed', () => {
    renderCard();
    fireEvent.press(screen.getByLabelText('Add Spotify to subscriptions'));
    expect(mockOnAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Dismiss is pressed', () => {
    renderCard();
    fireEvent.press(screen.getByLabelText('Dismiss Spotify'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders card with accessibility label', () => {
    renderCard();
    expect(screen.getByLabelText('Unmatched transaction: Spotify')).toBeTruthy();
  });

  it('renders yearly frequency correctly', () => {
    renderCard({ ...mockItem, frequency: 'yearly' });
    expect(screen.getByText('Yearly')).toBeTruthy();
  });

  it('renders quarterly frequency correctly', () => {
    renderCard({ ...mockItem, frequency: 'quarterly' });
    expect(screen.getByText('Quarterly')).toBeTruthy();
  });
});
