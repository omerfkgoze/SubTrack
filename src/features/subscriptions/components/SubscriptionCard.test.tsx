import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SubscriptionCard } from './SubscriptionCard';
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

describe('SubscriptionCard', () => {
  it('renders subscription name', () => {
    renderWithProvider(<SubscriptionCard subscription={mockSubscription} />);
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('renders formatted price', () => {
    renderWithProvider(<SubscriptionCard subscription={mockSubscription} />);
    expect(screen.getByText('€17.99/mo')).toBeTruthy();
  });

  it('renders renewal info', () => {
    renderWithProvider(<SubscriptionCard subscription={mockSubscription} />);
    expect(screen.getByText('Renews in 5 days')).toBeTruthy();
  });

  it('shows trial badge when is_trial is true', () => {
    const trialSub = { ...mockSubscription, is_trial: true };
    renderWithProvider(<SubscriptionCard subscription={trialSub} />);
    expect(screen.getByText('Trial')).toBeTruthy();
  });

  it('does not show trial badge when is_trial is false', () => {
    renderWithProvider(<SubscriptionCard subscription={mockSubscription} />);
    expect(screen.queryByText('Trial')).toBeNull();
  });

  it('applies inactive styling when is_active is false', () => {
    const inactiveSub = { ...mockSubscription, is_active: false };
    const { toJSON } = renderWithProvider(<SubscriptionCard subscription={inactiveSub} />);
    const json = toJSON();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper for tree traversal
    const findOpacity = (node: any): boolean => {
      if (!node) return false;
      if (node.props?.style) {
        const styleArr = Array.isArray(node.props.style) ? node.props.style : [node.props.style];
        for (const s of styleArr) {
          if (s && s.opacity === 0.5) return true;
        }
      }
      if (node.children) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
        return node.children.some((child: any) => typeof child === 'object' && findOpacity(child));
      }
      return false;
    };
    expect(findOpacity(json)).toBe(true);
  });

  it('has correct accessibility label', () => {
    renderWithProvider(<SubscriptionCard subscription={mockSubscription} />);
    expect(
      screen.getByAccessibilityHint('Swipe left for options'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Netflix, 17.99 euros per monthly, Renews in 5 days'),
    ).toBeTruthy();
  });

  it('renders category color stripe for entertainment', () => {
    const { toJSON } = renderWithProvider(<SubscriptionCard subscription={mockSubscription} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#6366F1');
  });

  it('uses default "Other" category for null category', () => {
    const noCatSub = { ...mockSubscription, category: null };
    const { toJSON } = renderWithProvider(<SubscriptionCard subscription={noCatSub} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#6B7280');
  });
});
