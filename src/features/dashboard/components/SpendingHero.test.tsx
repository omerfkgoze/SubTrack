import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { SpendingHero } from './SpendingHero';

function renderComponent(amount: number, props?: Partial<React.ComponentProps<typeof SpendingHero>>) {
  return render(
    <PaperProvider theme={theme}>
      <SpendingHero amount={amount} currency="€" showYearly animateOnChange {...props} />
    </PaperProvider>,
  );
}

describe('SpendingHero', () => {
  it('renders monthly total correctly formatted', () => {
    renderComponent(17.99);
    expect(screen.getByText('€17.99')).toBeTruthy();
  });

  it('renders yearly total (monthly × 12) correctly', () => {
    renderComponent(17.99);
    // 17.99 * 12 = 215.88
    expect(screen.getByText('= €215.88 per year')).toBeTruthy();
  });

  it('renders €0.00 when amount is 0', () => {
    renderComponent(0);
    expect(screen.getByText('€0.00')).toBeTruthy();
  });

  it('shows empty state message when amount is 0', () => {
    renderComponent(0);
    expect(screen.getByText('Add your first subscription to see your spending')).toBeTruthy();
  });

  it('does not show empty state message when amount is greater than 0', () => {
    renderComponent(17.99);
    expect(screen.queryByText('Add your first subscription to see your spending')).toBeNull();
  });

  it('accessibilityLabel contains monthly amount', () => {
    renderComponent(17.99);
    expect(screen.getByLabelText(/17\.99/)).toBeTruthy();
  });

  it('renders active count stat card when showQuickStats and subscriptionCount > 0', () => {
    renderComponent(17.99, { showQuickStats: true, subscriptionCount: 5 });
    expect(screen.getByLabelText(/5 active subscriptions/)).toBeTruthy();
  });

  it('uses singular "subscription" in accessibility label for subscriptionCount = 1', () => {
    renderComponent(17.99, { showQuickStats: true, subscriptionCount: 1 });
    expect(screen.getByLabelText('1 active subscription')).toBeTruthy();
  });

  it('renders average amount stat card when showQuickStats and subscriptionCount > 0', () => {
    renderComponent(17.99, { showQuickStats: true, subscriptionCount: 2, averageAmount: 8.99 });
    expect(screen.getByLabelText(/8\.99 average monthly cost/)).toBeTruthy();
  });

  it('does not render stat cards when subscriptionCount is 0', () => {
    renderComponent(0, { showQuickStats: true, subscriptionCount: 0 });
    expect(screen.queryByLabelText(/active subscriptions/)).toBeNull();
  });

  it('does not render stat cards when showQuickStats is false', () => {
    renderComponent(17.99, { showQuickStats: false, subscriptionCount: 5 });
    expect(screen.queryByLabelText(/active subscriptions/)).toBeNull();
  });

  it('stat cards not rendered when showQuickStats not provided', () => {
    renderComponent(17.99, { subscriptionCount: 5 });
    expect(screen.queryByLabelText(/active subscriptions/)).toBeNull();
  });
});
