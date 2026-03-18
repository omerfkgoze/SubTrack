import { supabase } from '@shared/services/supabase';
import type { UserSettings } from '../types';

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertPreferredCalendar(
  userId: string,
  calendarId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, preferred_calendar_id: calendarId },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

export async function clearPreferredCalendar(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .update({ preferred_calendar_id: null })
    .eq('user_id', userId);
  if (error) throw error;
}
