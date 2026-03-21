import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { BankConsentDialog } from './BankConsentDialog';

function renderWithProvider(props: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return render(
    <PaperProvider theme={theme}>
      <BankConsentDialog {...props} />
    </PaperProvider>,
  );
}

describe('BankConsentDialog', () => {
  const defaultProps = {
    visible: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders GDPR consent content when visible', () => {
    renderWithProvider(defaultProps);

    expect(screen.getByText('Bank Connection Consent')).toBeTruthy();
    expect(screen.getByText(/Access your account information/)).toBeTruthy();
    expect(screen.getByText(/Access your transaction history/)).toBeTruthy();
  });

  it('shows what SubTrack will NOT do', () => {
    renderWithProvider(defaultProps);

    expect(screen.getByText(/Access your bank login credentials/)).toBeTruthy();
    expect(screen.getByText(/Make payments or transfers/)).toBeTruthy();
    expect(screen.getByText(/Share your financial data/)).toBeTruthy();
    expect(screen.getByText(/Store raw transaction data longer than 30 days/)).toBeTruthy();
  });

  it('shows disconnect notice', () => {
    renderWithProvider(defaultProps);
    expect(screen.getByText(/disconnect your bank at any time/)).toBeTruthy();
  });

  it('calls onConfirm when Connect Bank Account is pressed', () => {
    renderWithProvider(defaultProps);
    fireEvent.press(screen.getByLabelText('Connect Bank Account'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is pressed', () => {
    renderWithProvider(defaultProps);
    fireEvent.press(screen.getByLabelText('Cancel bank connection'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
