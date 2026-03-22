import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { BankListItem } from './BankListItem';
import type { SupportedBank } from '../types';

const mockBank: SupportedBank = {
  id: 'bank-1',
  displayName: 'Test Bank',
  market: 'SE',
  iconUrl: 'https://cdn.tink.se/icon.png',
  popular: true,
  rank: 1,
};

const mockBankNoIcon: SupportedBank = {
  ...mockBank,
  id: 'bank-2',
  displayName: 'No Icon Bank',
  iconUrl: null,
};

function renderWithProvider(bank: SupportedBank, onPress = jest.fn()) {
  return render(
    <PaperProvider theme={theme}>
      <BankListItem bank={bank} onPress={onPress} />
    </PaperProvider>,
  );
}

describe('BankListItem', () => {
  it('renders bank display name', () => {
    renderWithProvider(mockBank);
    expect(screen.getByText('Test Bank')).toBeTruthy();
  });

  it('renders market code', () => {
    renderWithProvider(mockBank);
    expect(screen.getByText('SE')).toBeTruthy();
  });

  it('calls onPress with bank when tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(mockBank, onPress);
    fireEvent.press(screen.getByLabelText('Test Bank - SE'));
    expect(onPress).toHaveBeenCalledWith(mockBank);
  });

  it('handles missing icon gracefully', () => {
    renderWithProvider(mockBankNoIcon);
    expect(screen.getByText('No Icon Bank')).toBeTruthy();
  });
});
