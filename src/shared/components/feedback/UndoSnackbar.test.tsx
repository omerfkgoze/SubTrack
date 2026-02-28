import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { UndoSnackbar } from './UndoSnackbar';
import { theme } from '@config/theme';

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('UndoSnackbar', () => {
  const defaultProps = {
    visible: true,
    message: 'Netflix deleted',
    onUndo: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders message text', () => {
    renderWithProvider(<UndoSnackbar {...defaultProps} />);
    expect(screen.getByText('Netflix deleted')).toBeTruthy();
  });

  it('calls onUndo when UNDO button is pressed', () => {
    renderWithProvider(<UndoSnackbar {...defaultProps} />);
    fireEvent.press(screen.getByText('UNDO'));
    expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when timer expires', () => {
    renderWithProvider(<UndoSnackbar {...defaultProps} duration={5000} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('does not render when visible is false', () => {
    renderWithProvider(<UndoSnackbar {...defaultProps} visible={false} />);
    expect(screen.queryByText('Netflix deleted')).toBeNull();
  });
});
