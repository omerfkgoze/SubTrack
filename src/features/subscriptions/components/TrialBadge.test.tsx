import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { TrialBadge } from './TrialBadge';
import { theme } from '@config/theme';
import { toLocalDateString } from '@features/subscriptions/utils/testHelpers';

function renderWithProvider(ui: React.ReactElement) {
  return render(<PaperProvider theme={theme}>{ui}</PaperProvider>);
}

describe('TrialBadge', () => {
  it('renders nothing when isTrial is false', () => {
    renderWithProvider(
      <TrialBadge isTrial={false} trialExpiryDate={null} />,
    );
    expect(screen.queryByRole('text')).toBeNull();
  });

  it('renders nothing when isTrial is null', () => {
    renderWithProvider(
      <TrialBadge isTrial={null} trialExpiryDate={null} />,
    );
    expect(screen.queryByRole('text')).toBeNull();
  });

  it('renders "Trial" text when trial has no expiry date', () => {
    renderWithProvider(<TrialBadge isTrial={true} trialExpiryDate={null} />);
    expect(screen.getByText('Trial')).toBeTruthy();
  });

  it('renders countdown text for active trial', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    renderWithProvider(
      <TrialBadge isTrial={true} trialExpiryDate={toLocalDateString(future)} />,
    );
    expect(screen.getByText('10 days left')).toBeTruthy();
  });

  it('renders "Expires today" for trial expiring today', () => {
    const today = toLocalDateString(new Date());
    renderWithProvider(
      <TrialBadge isTrial={true} trialExpiryDate={today} />,
    );
    expect(screen.getByText('Expires today')).toBeTruthy();
  });

  it('renders "Trial expired" for expired trial', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    renderWithProvider(
      <TrialBadge isTrial={true} trialExpiryDate={toLocalDateString(past)} />,
    );
    expect(screen.getByText('Trial expired')).toBeTruthy();
  });

  it('has correct accessibility label for trial without expiry date', () => {
    renderWithProvider(<TrialBadge isTrial={true} trialExpiryDate={null} />);
    expect(screen.getByLabelText('Trial')).toBeTruthy();
  });

  it('has correct accessibility label for active trial', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    renderWithProvider(
      <TrialBadge isTrial={true} trialExpiryDate={toLocalDateString(future)} />,
    );
    expect(screen.getByLabelText('Trial, 5 days remaining')).toBeTruthy();
  });

  it('has correct accessibility label for expired trial', () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    renderWithProvider(
      <TrialBadge isTrial={true} trialExpiryDate={toLocalDateString(past)} />,
    );
    expect(screen.getByLabelText('Trial expired')).toBeTruthy();
  });

  it('renders low urgency badge with gray color', () => {
    const future = new Date();
    future.setDate(future.getDate() + 15);
    const { toJSON } = renderWithProvider(
      <TrialBadge isTrial={true} trialExpiryDate={toLocalDateString(future)} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#6B7280');
  });

  it('renders critical urgency badge with red color', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const { toJSON } = renderWithProvider(
      <TrialBadge isTrial={true} trialExpiryDate={toLocalDateString(past)} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#EF4444');
  });
});
