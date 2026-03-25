import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { DismissedItemCard } from './DismissedItemCard';
import type { DetectedSubscription } from '../types';

const mockItem: DetectedSubscription = {
  id: 'det-5',
  userId: 'user-1',
  bankConnectionId: 'conn-1',
  tinkGroupId: 'g5',
  merchantName: 'Coffee Shop',
  amount: 4.50,
  currency: 'EUR',
  frequency: 'weekly',
  confidenceScore: 0.55,
  status: 'dismissed',
  firstSeen: '2026-01-01',
  lastSeen: '2026-03-20',
};

const mockOnUndismiss = jest.fn();

function renderCard(item: DetectedSubscription = mockItem) {
  return render(
    <PaperProvider theme={theme}>
      <DismissedItemCard item={item} onUndismiss={mockOnUndismiss} />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DismissedItemCard', () => {
  it('renders merchant name', () => {
    renderCard();
    expect(screen.getByText('Coffee Shop')).toBeTruthy();
  });

  it('renders amount and currency', () => {
    renderCard();
    expect(screen.getByText(/4.50/)).toBeTruthy();
    expect(screen.getByText(/EUR/)).toBeTruthy();
  });

  it('renders frequency', () => {
    renderCard();
    expect(screen.getByText(/Weekly/)).toBeTruthy();
  });

  it('renders "Dismissed" label with relative date', () => {
    renderCard();
    expect(screen.getByText(/Dismissed/)).toBeTruthy();
  });

  it('renders Undo button', () => {
    renderCard();
    expect(screen.getByText('Undo')).toBeTruthy();
  });

  it('calls onUndismiss when Undo is pressed', () => {
    renderCard();
    fireEvent.press(screen.getByLabelText('Undo dismiss for Coffee Shop'));
    expect(mockOnUndismiss).toHaveBeenCalledTimes(1);
  });

  it('renders card with accessibility label', () => {
    renderCard();
    expect(screen.getByLabelText('Dismissed item: Coffee Shop')).toBeTruthy();
  });

  it('renders monthly frequency correctly', () => {
    renderCard({ ...mockItem, frequency: 'monthly', merchantName: 'Netflix' });
    expect(screen.getByText(/Monthly/)).toBeTruthy();
  });

  it('renders yearly frequency correctly', () => {
    renderCard({ ...mockItem, frequency: 'yearly', merchantName: 'Adobe' });
    expect(screen.getByText(/Yearly/)).toBeTruthy();
  });

  it('renders quarterly frequency correctly', () => {
    renderCard({ ...mockItem, frequency: 'quarterly', merchantName: 'Some Service' });
    expect(screen.getByText(/Quarterly/)).toBeTruthy();
  });
});
