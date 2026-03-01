import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { CategoryChip } from './CategoryChip';
import { SUBSCRIPTION_CATEGORIES } from '@config/categories';
import { theme } from '@config/theme';

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

const entertainmentCategory = SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'entertainment');
const musicCategory = SUBSCRIPTION_CATEGORIES.find((c) => c.id === 'music');

if (!entertainmentCategory || !musicCategory) {
  throw new Error('Test setup failed: required categories not found in SUBSCRIPTION_CATEGORIES');
}

describe('CategoryChip', () => {
  it('renders with category label', () => {
    renderWithProvider(
      <CategoryChip category={entertainmentCategory} selected={false} onPress={jest.fn()} />,
    );
    expect(screen.getByText('Entertainment')).toBeTruthy();
  });

  it('renders with category data for all 8 categories', () => {
    SUBSCRIPTION_CATEGORIES.forEach((cat) => {
      const { unmount } = renderWithProvider(
        <CategoryChip category={cat} selected={false} onPress={jest.fn()} />,
      );
      expect(screen.getByText(cat.label)).toBeTruthy();
      unmount();
    });
  });

  it('shows tinted background when selected', () => {
    const { toJSON } = renderWithProvider(
      <CategoryChip category={entertainmentCategory} selected={true} onPress={jest.fn()} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain(entertainmentCategory.color + '1F');
  });

  it('does not show tinted background when unselected', () => {
    const { toJSON } = renderWithProvider(
      <CategoryChip category={entertainmentCategory} selected={false} onPress={jest.fn()} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain(entertainmentCategory.color + '1F');
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <CategoryChip category={entertainmentCategory} selected={false} onPress={onPress} />,
    );
    fireEvent.press(screen.getByText('Entertainment'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <CategoryChip category={entertainmentCategory} selected={false} onPress={onPress} disabled={true} />,
    );
    fireEvent.press(screen.getByText('Entertainment'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('has accessibility label including category name', () => {
    renderWithProvider(
      <CategoryChip category={musicCategory} selected={false} onPress={jest.fn()} />,
    );
    expect(screen.getByLabelText('Music category')).toBeTruthy();
  });

  it('defaults disabled to false', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <CategoryChip category={entertainmentCategory} selected={false} onPress={onPress} />,
    );
    fireEvent.press(screen.getByText('Entertainment'));
    expect(onPress).toHaveBeenCalled();
  });
});
