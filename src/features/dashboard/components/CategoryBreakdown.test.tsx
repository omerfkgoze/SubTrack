import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { CategoryBreakdown } from './CategoryBreakdown';
import type { CategoryBreakdownItem } from '@features/subscriptions/utils/subscriptionUtils';

function renderComponent(breakdownData: CategoryBreakdownItem[], totalMonthly: number) {
  return render(
    <PaperProvider theme={theme}>
      <CategoryBreakdown breakdownData={breakdownData} totalMonthly={totalMonthly} />
    </PaperProvider>,
  );
}

const mockBreakdown: CategoryBreakdownItem[] = [
  { categoryId: 'entertainment', categoryLabel: 'Entertainment', color: '#8B5CF6', icon: 'movie-open', monthlyTotal: 15, percentage: 60 },
  { categoryId: 'music', categoryLabel: 'Music', color: '#EF4444', icon: 'music', monthlyTotal: 10, percentage: 40 },
];

describe('CategoryBreakdown', () => {
  it('renders section header "Spending by Category"', () => {
    renderComponent(mockBreakdown, 25);
    expect(screen.getByText('Spending by Category')).toBeTruthy();
  });

  it('renders category names and amounts', () => {
    renderComponent(mockBreakdown, 25);
    expect(screen.getByText('Entertainment')).toBeTruthy();
    expect(screen.getByText('€15.00')).toBeTruthy();
    expect(screen.getByText('Music')).toBeTruthy();
    expect(screen.getByText('€10.00')).toBeTruthy();
  });

  it('renders color bar segments', () => {
    const { toJSON } = renderComponent(mockBreakdown, 25);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('#8B5CF6');
    expect(tree).toContain('#EF4444');
  });

  it('renders correct percentage values', () => {
    renderComponent(mockBreakdown, 25);
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
  });

  it('accessibility labels contain category name and amount', () => {
    renderComponent(mockBreakdown, 25);
    expect(
      screen.getByLabelText('Entertainment spending: 15.00 euros, 60 percent of total'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Music spending: 10.00 euros, 40 percent of total'),
    ).toBeTruthy();
  });

  it('renders single category correctly', () => {
    const single: CategoryBreakdownItem[] = [
      { categoryId: 'music', categoryLabel: 'Music', color: '#EF4444', icon: 'music', monthlyTotal: 10, percentage: 100 },
    ];
    renderComponent(single, 10);
    expect(screen.getByText('Music')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
