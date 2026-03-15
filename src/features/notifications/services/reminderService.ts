import { supabase } from '@shared/services/supabase';

export interface ReminderSetting {
  id: string;
  user_id: string;
  subscription_id: string;
  remind_days_before: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function getReminderSettings(
  subscriptionId: string,
): Promise<ReminderSetting | null> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDefaultReminder(
  userId: string,
  subscriptionId: string,
): Promise<ReminderSetting> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .upsert(
      {
        user_id: userId,
        subscription_id: subscriptionId,
        remind_days_before: 3,
        is_enabled: true,
      },
      { onConflict: 'user_id,subscription_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReminder(
  id: string,
  updates: { remind_days_before?: number; is_enabled?: boolean },
): Promise<ReminderSetting> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_settings')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
