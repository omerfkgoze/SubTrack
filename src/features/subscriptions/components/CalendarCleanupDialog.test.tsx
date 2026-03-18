import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { CalendarCleanupDialog } from './CalendarCleanupDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof CalendarCleanupDialog>> = {}) {
  const defaultProps = {
    visible: true,
    subscriptionName: 'Netflix',
    onRemove: jest.fn(),
    onKeep: jest.fn(),
    ...props,
  };
  return {
    ...render(
      <PaperProvider theme={theme}>
        <CalendarCleanupDialog {...defaultProps} />
      </PaperProvider>,
    ),
    props: defaultProps,
  };
}

describe('CalendarCleanupDialog', () => {
  it('renders dialog with subscription name', () => {
    renderDialog();
    expect(screen.getByText('Remove Calendar Events?')).toBeTruthy();
    expect(screen.getByText('Do you want to remove calendar events for Netflix?')).toBeTruthy();
  });

  it('"Remove" button calls onRemove', () => {
    const { props } = renderDialog();
    fireEvent.press(screen.getByText('Remove'));
    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it('"Keep" button calls onKeep', () => {
    const { props } = renderDialog();
    fireEvent.press(screen.getByText('Keep'));
    expect(props.onKeep).toHaveBeenCalledTimes(1);
  });
});
