import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SwipeableSubscriptionCard } from './SwipeableSubscriptionCard';
import type { Subscription } from '@features/subscriptions/types';
import { theme } from '@config/theme';

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 5);
const futureDateStr = toLocalDateString(futureDate);

const mockSubscription: Subscription = {
  id: 'sub-1',
  user_id: 'user-1',
  name: 'Netflix',
  price: 17.99,
  currency: 'EUR',
  billing_cycle: 'monthly',
  renewal_date: futureDateStr,
  is_trial: false,
  is_active: true,
  category: 'entertainment',
  notes: null,
  trial_expiry_date: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('SwipeableSubscriptionCard', () => {
  it('renders the subscription card with subscription data', () => {
    renderWithProvider(
      <SwipeableSubscriptionCard subscription={mockSubscription} />,
    );
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText('€17.99/mo')).toBeTruthy();
  });

  it('renders edit and delete action buttons with correct accessibility labels', () => {
    renderWithProvider(
      <SwipeableSubscriptionCard subscription={mockSubscription} />,
    );
    expect(screen.getByLabelText('Edit Netflix')).toBeTruthy();
    expect(screen.getByLabelText('Delete Netflix')).toBeTruthy();
  });

  it('calls onEdit when edit action button is pressed', () => {
    const onEdit = jest.fn();
    renderWithProvider(
      <SwipeableSubscriptionCard subscription={mockSubscription} onEdit={onEdit} />,
    );
    fireEvent.press(screen.getByLabelText('Edit Netflix'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete action button is pressed', () => {
    const onDelete = jest.fn();
    renderWithProvider(
      <SwipeableSubscriptionCard subscription={mockSubscription} onDelete={onDelete} />,
    );
    fireEvent.press(screen.getByLabelText('Delete Netflix'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders action button labels', () => {
    renderWithProvider(
      <SwipeableSubscriptionCard subscription={mockSubscription} />,
    );
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });
});
