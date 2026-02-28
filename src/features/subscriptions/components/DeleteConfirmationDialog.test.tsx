import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { theme } from '@config/theme';

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('DeleteConfirmationDialog', () => {
  const defaultProps = {
    visible: true,
    subscriptionName: 'Netflix',
    onConfirm: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog with subscription name in title', () => {
    renderWithProvider(<DeleteConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Delete Netflix?')).toBeTruthy();
  });

  it('renders body text about undo', () => {
    renderWithProvider(<DeleteConfirmationDialog {...defaultProps} />);
    expect(
      screen.getByText(
        'This subscription will be removed from your tracking. This action can be undone for the next 5 seconds.',
      ),
    ).toBeTruthy();
  });

  it('calls onDismiss when Cancel is pressed', () => {
    renderWithProvider(<DeleteConfirmationDialog {...defaultProps} />);
    fireEvent.press(screen.getByText('Cancel'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete is pressed', () => {
    renderWithProvider(<DeleteConfirmationDialog {...defaultProps} />);
    fireEvent.press(screen.getByText('Delete'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not render content when visible is false', () => {
    renderWithProvider(
      <DeleteConfirmationDialog {...defaultProps} visible={false} />,
    );
    expect(screen.queryByText('Delete Netflix?')).toBeNull();
  });

  it('has correct accessibilityLabel on Delete button', () => {
    renderWithProvider(<DeleteConfirmationDialog {...defaultProps} />);
    expect(
      screen.getByLabelText('Confirm delete Netflix'),
    ).toBeTruthy();
  });
});
