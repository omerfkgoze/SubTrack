import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { SavingsIndicator } from './SavingsIndicator';

function renderComponent(props: { savingsAmount: number; inactiveCount: number }) {
  return render(
    <PaperProvider theme={theme}>
      <SavingsIndicator {...props} />
    </PaperProvider>,
  );
}

describe('SavingsIndicator', () => {
  it('renders savings message when amount > 0 and inactiveCount > 0', () => {
    renderComponent({ savingsAmount: 9.99, inactiveCount: 1 });
    expect(screen.getByText(/You're saving/)).toBeTruthy();
  });

  it('renders correct amount formatted as €X.XX', () => {
    renderComponent({ savingsAmount: 9.99, inactiveCount: 1 });
    expect(screen.getByText('€9.99')).toBeTruthy();
  });

  it('uses singular "subscription" for inactiveCount = 1', () => {
    renderComponent({ savingsAmount: 9.99, inactiveCount: 1 });
    expect(screen.getByText(/cancelling 1 subscription$/)).toBeTruthy();
  });

  it('uses plural "subscriptions" for inactiveCount > 1', () => {
    renderComponent({ savingsAmount: 19.98, inactiveCount: 2 });
    expect(screen.getByText(/cancelling 2 subscriptions$/)).toBeTruthy();
  });

  it('does NOT render when savingsAmount is 0', () => {
    renderComponent({ savingsAmount: 0, inactiveCount: 1 });
    expect(screen.queryByText(/You're saving/)).toBeNull();
  });

  it('does NOT render when inactiveCount is 0', () => {
    renderComponent({ savingsAmount: 9.99, inactiveCount: 0 });
    expect(screen.queryByText(/You're saving/)).toBeNull();
  });

  it('does NOT render when both are 0', () => {
    renderComponent({ savingsAmount: 0, inactiveCount: 0 });
    expect(screen.queryByText(/You're saving/)).toBeNull();
  });

  it('accessibility label contains amount and count', () => {
    renderComponent({ savingsAmount: 9.99, inactiveCount: 1 });
    expect(screen.getByLabelText(/You are saving €9.99 per month by cancelling 1 subscription/)).toBeTruthy();
  });

  it('accessibility label uses plural for multiple subscriptions', () => {
    renderComponent({ savingsAmount: 19.98, inactiveCount: 2 });
    expect(screen.getByLabelText(/You are saving €19.98 per month by cancelling 2 subscriptions/)).toBeTruthy();
  });
});
