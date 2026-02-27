import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { CostSummaryHeader } from './CostSummaryHeader';
import { theme } from '@config/theme';

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('CostSummaryHeader', () => {
  it('displays total monthly cost', () => {
    renderWithProvider(
      <CostSummaryHeader totalMonthlyCost={45.97} subscriptionCount={3} />,
    );
    expect(screen.getByText('€45.97/month')).toBeTruthy();
  });

  it('displays subscription count (plural)', () => {
    renderWithProvider(
      <CostSummaryHeader totalMonthlyCost={45.97} subscriptionCount={3} />,
    );
    expect(screen.getByText('3 subscriptions')).toBeTruthy();
  });

  it('displays subscription count (singular)', () => {
    renderWithProvider(
      <CostSummaryHeader totalMonthlyCost={9.99} subscriptionCount={1} />,
    );
    expect(screen.getByText('1 subscription')).toBeTruthy();
  });

  it('displays yearly equivalent', () => {
    renderWithProvider(
      <CostSummaryHeader totalMonthlyCost={10} subscriptionCount={1} />,
    );
    expect(screen.getByText('€120.00/year')).toBeTruthy();
  });

  it('handles zero cost', () => {
    renderWithProvider(
      <CostSummaryHeader totalMonthlyCost={0} subscriptionCount={0} />,
    );
    expect(screen.getByText('€0.00/month')).toBeTruthy();
    expect(screen.getByText('0 subscriptions')).toBeTruthy();
  });
});
