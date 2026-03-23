import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { DetectedReviewCard } from './DetectedReviewCard';
import type { DetectedSubscription } from '../types';

const mockItem: DetectedSubscription = {
  id: 'det-1',
  userId: 'user-1',
  bankConnectionId: 'conn-1',
  tinkGroupId: 'group-1',
  merchantName: 'Netflix',
  amount: 12.99,
  currency: 'EUR',
  frequency: 'monthly',
  confidenceScore: 0.9,
  status: 'detected',
  firstSeen: '2025-09-15',
  lastSeen: '2026-02-15',
};

const mockOnApprove = jest.fn();
const mockOnDismiss = jest.fn();
const mockOnNotSubscription = jest.fn();

function renderCard(item: DetectedSubscription = mockItem) {
  return render(
    <PaperProvider theme={theme}>
      <DetectedReviewCard
        item={item}
        onApprove={mockOnApprove}
        onDismiss={mockOnDismiss}
        onNotSubscription={mockOnNotSubscription}
      />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DetectedReviewCard', () => {
  it('renders merchant name', () => {
    renderCard();
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('renders amount and currency', () => {
    renderCard();
    expect(screen.getByText('12.99 EUR')).toBeTruthy();
  });

  it('renders frequency', () => {
    renderCard();
    expect(screen.getByText('Monthly')).toBeTruthy();
  });

  it('renders confidence score as percentage', () => {
    renderCard();
    expect(screen.getByText('90%')).toBeTruthy();
  });

  it('renders last seen date formatted', () => {
    renderCard();
    expect(screen.getByText(/Feb 15, 2026/)).toBeTruthy();
  });

  it('renders Add, Ignore, Not a Sub action buttons', () => {
    renderCard();
    expect(screen.getByLabelText('Add Netflix to My Subscriptions')).toBeTruthy();
    expect(screen.getByLabelText('Ignore Netflix')).toBeTruthy();
    expect(screen.getByLabelText('Netflix is not a subscription')).toBeTruthy();
  });

  it('calls onApprove when Add is pressed', () => {
    renderCard();
    fireEvent.press(screen.getByLabelText('Add Netflix to My Subscriptions'));
    expect(mockOnApprove).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Ignore is pressed', () => {
    renderCard();
    fireEvent.press(screen.getByLabelText('Ignore Netflix'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onNotSubscription when Not a Sub is pressed', () => {
    renderCard();
    fireEvent.press(screen.getByLabelText('Netflix is not a subscription'));
    expect(mockOnNotSubscription).toHaveBeenCalledTimes(1);
  });

  it('renders card with accessibility label', () => {
    renderCard();
    expect(screen.getByLabelText('Detected subscription: Netflix')).toBeTruthy();
  });

  it('shows 60% confidence score for medium confidence item', () => {
    renderCard({ ...mockItem, confidenceScore: 0.6 });
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('shows 45% confidence score for low confidence item', () => {
    renderCard({ ...mockItem, confidenceScore: 0.45 });
    expect(screen.getByText('45%')).toBeTruthy();
  });

  it('renders yearly frequency correctly', () => {
    renderCard({ ...mockItem, frequency: 'yearly' });
    expect(screen.getByText('Yearly')).toBeTruthy();
  });
});
