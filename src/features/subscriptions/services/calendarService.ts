import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { supabase } from '@shared/services/supabase';
import type { Subscription, BillingCycle } from '../types';

export async function requestCalendarAccess(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
  return { granted: status === 'granted', canAskAgain: canAskAgain ?? true };
}

export async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((cal) => cal.allowsModifications);
  if (writable) return writable.id;
  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    return defaultCal?.id ?? null;
  }
  return calendars[0]?.id ?? null;
}

export function mapBillingCycleToRecurrence(cycle: BillingCycle): {
  frequency: Calendar.Frequency;
  interval: number;
} {
  switch (cycle) {
    case 'weekly':
      return { frequency: Calendar.Frequency.WEEKLY, interval: 1 };
    case 'monthly':
      return { frequency: Calendar.Frequency.MONTHLY, interval: 1 };
    case 'quarterly':
      return { frequency: Calendar.Frequency.MONTHLY, interval: 3 };
    case 'yearly':
      return { frequency: Calendar.Frequency.YEARLY, interval: 1 };
  }
}

export async function addSubscriptionToCalendar(
  subscription: Subscription,
  calendarId?: string,
): Promise<string> {
  const targetCalendarId = calendarId ?? (await getDefaultCalendarId());
  if (!targetCalendarId) throw new Error('No writable calendar found');

  const { frequency, interval } = mapBillingCycleToRecurrence(
    subscription.billing_cycle as BillingCycle,
  );

  const eventId = await Calendar.createEventAsync(targetCalendarId, {
    title: `${subscription.name} Renewal - ${subscription.currency ?? '€'}${subscription.price.toFixed(2)}`,
    startDate: new Date(subscription.renewal_date),
    endDate: new Date(subscription.renewal_date),
    allDay: true,
    recurrenceRule: {
      frequency,
      interval,
    },
  });

  const { error } = await supabase
    .from('subscriptions')
    .update({ calendar_event_id: eventId })
    .eq('id', subscription.id);

  if (error) {
    await Calendar.deleteEventAsync(eventId).catch(() => {});
    throw error;
  }

  return eventId;
}

export async function getWritableCalendars(): Promise<
  Array<{ id: string; title: string; color: string; isPrimary: boolean }>
> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars
    .filter((cal) => cal.allowsModifications)
    .map((cal) => ({
      id: cal.id,
      title: cal.title,
      color: cal.color ?? '#888888',
      isPrimary: cal.isPrimary ?? false,
    }));
}

export async function isCalendarAvailable(calendarId: string): Promise<boolean> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.some((cal) => cal.id === calendarId);
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await Calendar.deleteEventAsync(eventId);
}
