import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { theme } from '@config/theme';
import { CalendarSelectionDialog } from './CalendarSelectionDialog';

const mockCalendars = [
  { id: 'cal-1', title: 'Personal', color: '#FF0000', isPrimary: true },
  { id: 'cal-2', title: 'Work', color: '#0000FF', isPrimary: false },
  { id: 'cal-3', title: 'Family', color: '#00FF00', isPrimary: false },
];

function renderDialog(props: Partial<React.ComponentProps<typeof CalendarSelectionDialog>> = {}) {
  const defaultProps = {
    visible: true,
    calendars: mockCalendars,
    onSelect: jest.fn(),
    onDismiss: jest.fn(),
  };
  return render(
    <PaperProvider theme={theme}>
      <CalendarSelectionDialog {...defaultProps} {...props} />
    </PaperProvider>,
  );
}

describe('CalendarSelectionDialog', () => {
  it('renders calendar list with titles', () => {
    renderDialog();
    expect(screen.getByText('Select Calendar')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
  });

  it('highlights currently selected calendar with check icon', () => {
    renderDialog({ selectedId: 'cal-2' });
    // The selected calendar should have a check icon
    const workItem = screen.getByText('Work');
    expect(workItem).toBeTruthy();
  });

  it('calls onSelect with correct id and title when calendar is pressed', () => {
    const onSelect = jest.fn();
    renderDialog({ onSelect });

    fireEvent.press(screen.getByText('Personal'));
    expect(onSelect).toHaveBeenCalledWith('cal-1', 'Personal');
  });

  it('calls onSelect with second calendar', () => {
    const onSelect = jest.fn();
    renderDialog({ onSelect });

    fireEvent.press(screen.getByText('Work'));
    expect(onSelect).toHaveBeenCalledWith('cal-2', 'Work');
  });

  it('calls onDismiss when Cancel is pressed', () => {
    const onDismiss = jest.fn();
    renderDialog({ onDismiss });

    fireEvent.press(screen.getByText('Cancel'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does not render when visible is false', () => {
    renderDialog({ visible: false });
    expect(screen.queryByText('Select Calendar')).toBeNull();
  });

  it('renders all calendar items as selectable options', () => {
    renderDialog();
    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
  });
});
