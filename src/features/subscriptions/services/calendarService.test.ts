import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { Subscription, BillingCycle } from '../types';

jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getDefaultCalendarAsync: jest.fn(),
  createEventAsync: jest.fn(),
  deleteEventAsync: jest.fn(),
  EntityTypes: { EVENT: 'event' },
  Frequency: {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  },
}));

jest.mock('@shared/services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { requestCalendarAccess, getDefaultCalendarId, mapBillingCycleToRecurrence, addSubscriptionToCalendar } =
  require('./calendarService') as typeof import('./calendarService');

const mockSubscription: Subscription = {
  id: 'sub-1',
  user_id: 'user-1',
  name: 'Netflix',
  price: 17.99,
  currency: 'EUR',
  billing_cycle: 'monthly',
  renewal_date: '2026-04-01',
  is_trial: false,
  is_active: true,
  category: 'entertainment',
  notes: null,
  trial_expiry_date: null,
  created_at: '2026-01-10',
  updated_at: '2026-01-10',
  calendar_event_id: null,
};

describe('calendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestCalendarAccess', () => {
    it('returns granted: true when permission is granted', async () => {
      (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
      });

      const result = await requestCalendarAccess();
      expect(result).toEqual({ granted: true, canAskAgain: true });
    });

    it('returns granted: false when permission is denied', async () => {
      (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
      });

      const result = await requestCalendarAccess();
      expect(result).toEqual({ granted: false, canAskAgain: true });
    });

    it('returns canAskAgain: false when permanently denied', async () => {
      (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
      });

      const result = await requestCalendarAccess();
      expect(result).toEqual({ granted: false, canAskAgain: false });
    });

    it('defaults canAskAgain to true when undefined', async () => {
      (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: undefined,
      });

      const result = await requestCalendarAccess();
      expect(result).toEqual({ granted: false, canAskAgain: true });
    });
  });

  describe('getDefaultCalendarId', () => {
    it('returns first writable calendar ID', async () => {
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-readonly', allowsModifications: false },
        { id: 'cal-writable', allowsModifications: true },
      ]);

      const result = await getDefaultCalendarId();
      expect(result).toBe('cal-writable');
    });

    it('falls back to default calendar on iOS when no writable calendar', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-readonly', allowsModifications: false },
      ]);
      (Calendar.getDefaultCalendarAsync as jest.Mock).mockResolvedValue({ id: 'default-ios-cal' });

      const result = await getDefaultCalendarId();
      expect(result).toBe('default-ios-cal');

      Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    });

    it('falls back to first calendar on Android when no writable calendar', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-first', allowsModifications: false },
      ]);

      const result = await getDefaultCalendarId();
      expect(result).toBe('cal-first');

      Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    });

    it('returns null when no calendars exist', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([]);

      const result = await getDefaultCalendarId();
      expect(result).toBeNull();

      Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    });
  });

  describe('mapBillingCycleToRecurrence', () => {
    it('maps weekly to WEEKLY with interval 1', () => {
      const result = mapBillingCycleToRecurrence('weekly' as BillingCycle);
      expect(result).toEqual({ frequency: Calendar.Frequency.WEEKLY, interval: 1 });
    });

    it('maps monthly to MONTHLY with interval 1', () => {
      const result = mapBillingCycleToRecurrence('monthly' as BillingCycle);
      expect(result).toEqual({ frequency: Calendar.Frequency.MONTHLY, interval: 1 });
    });

    it('maps quarterly to MONTHLY with interval 3', () => {
      const result = mapBillingCycleToRecurrence('quarterly' as BillingCycle);
      expect(result).toEqual({ frequency: Calendar.Frequency.MONTHLY, interval: 3 });
    });

    it('maps yearly to YEARLY with interval 1', () => {
      const result = mapBillingCycleToRecurrence('yearly' as BillingCycle);
      expect(result).toEqual({ frequency: Calendar.Frequency.YEARLY, interval: 1 });
    });
  });

  describe('addSubscriptionToCalendar', () => {
    it('creates event with correct recurrence for monthly subscription', async () => {
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-1', allowsModifications: true },
      ]);
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-123');

      const result = await addSubscriptionToCalendar(mockSubscription);

      expect(Calendar.createEventAsync).toHaveBeenCalledWith('cal-1', {
        title: 'Netflix Renewal - EUR17.99',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-01'),
        allDay: true,
        recurrenceRule: {
          frequency: Calendar.Frequency.MONTHLY,
          interval: 1,
        },
      });
      expect(result).toBe('event-123');
    });

    it('creates event with yearly recurrence for yearly subscription', async () => {
      const yearlySub = { ...mockSubscription, billing_cycle: 'yearly' };
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-1', allowsModifications: true },
      ]);
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-456');

      await addSubscriptionToCalendar(yearlySub);

      expect(Calendar.createEventAsync).toHaveBeenCalledWith('cal-1', expect.objectContaining({
        recurrenceRule: {
          frequency: Calendar.Frequency.YEARLY,
          interval: 1,
        },
      }));
    });

    it('creates event with quarterly recurrence (monthly interval 3)', async () => {
      const quarterlySub = { ...mockSubscription, billing_cycle: 'quarterly' };
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-1', allowsModifications: true },
      ]);
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-789');

      await addSubscriptionToCalendar(quarterlySub);

      expect(Calendar.createEventAsync).toHaveBeenCalledWith('cal-1', expect.objectContaining({
        recurrenceRule: {
          frequency: Calendar.Frequency.MONTHLY,
          interval: 3,
        },
      }));
    });

    it('uses provided calendarId instead of default', async () => {
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-custom');

      await addSubscriptionToCalendar(mockSubscription, 'custom-cal-id');

      expect(Calendar.createEventAsync).toHaveBeenCalledWith('custom-cal-id', expect.anything());
      expect(Calendar.getCalendarsAsync).not.toHaveBeenCalled();
    });

    it('throws when no writable calendar found', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([]);

      await expect(addSubscriptionToCalendar(mockSubscription)).rejects.toThrow(
        'No writable calendar found',
      );

      Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    });

    it('updates calendar_event_id in Supabase after event creation', async () => {
      const { supabase } = require('@shared/services/supabase');
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ update: mockUpdate });

      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-1', allowsModifications: true },
      ]);
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-persist');

      await addSubscriptionToCalendar(mockSubscription);

      expect(supabase.from).toHaveBeenCalledWith('subscriptions');
      expect(mockUpdate).toHaveBeenCalledWith({ calendar_event_id: 'event-persist' });
      expect(mockEq).toHaveBeenCalledWith('id', 'sub-1');
    });

    it('throws when Supabase update fails', async () => {
      const { supabase } = require('@shared/services/supabase');
      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ update: mockUpdate });

      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-1', allowsModifications: true },
      ]);
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-fail');

      await expect(addSubscriptionToCalendar(mockSubscription)).rejects.toEqual({ message: 'DB error' });
    });

    it('uses € as default currency when currency is null', async () => {
      const { supabase } = require('@shared/services/supabase');
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      supabase.from.mockReturnValue({ update: mockUpdate });

      const noCurrencySub = { ...mockSubscription, currency: null };
      (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([
        { id: 'cal-1', allowsModifications: true },
      ]);
      (Calendar.createEventAsync as jest.Mock).mockResolvedValue('event-eur');

      await addSubscriptionToCalendar(noCurrencySub);

      expect(Calendar.createEventAsync).toHaveBeenCalledWith('cal-1', expect.objectContaining({
        title: 'Netflix Renewal - €17.99',
      }));
    });
  });
});
