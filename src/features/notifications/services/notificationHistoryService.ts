import { supabase } from '@shared/services/supabase';

export interface NotificationHistoryItem {
  id: string;
  subscription_name: string;
  notification_type: 'renewal' | 'trial_expiry' | 'bank_expiry';
  renewal_date: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'retrying';
}

export async function getNotificationHistory(userId: string): Promise<NotificationHistoryItem[]> {
  const { data: logs, error: logsError } = await supabase
    .from('notification_log')
    .select('id, subscription_id, bank_connection_id, notification_type, renewal_date, sent_at, status')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (logsError) throw logsError;
  if (!logs || logs.length === 0) return [];

  const subscriptionIds = [...new Set(
    logs
      .filter((l) => l.subscription_id != null)
      .map((l) => l.subscription_id as string)
  )];

  const bankConnectionIds = [...new Set(
    logs
      .filter((l) => l.bank_connection_id != null)
      .map((l) => l.bank_connection_id as string)
  )];

  const nameById: Record<string, string> = {};

  if (subscriptionIds.length > 0) {
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, name')
      .in('id', subscriptionIds);

    if (subError) throw subError;

    for (const sub of subscriptions ?? []) {
      nameById[sub.id] = sub.name;
    }
  }

  if (bankConnectionIds.length > 0) {
    const { data: bankConnections, error: bankError } = await supabase
      .from('bank_connections')
      .select('id, bank_name')
      .in('id', bankConnectionIds);

    if (bankError) throw bankError;

    for (const bc of bankConnections ?? []) {
      nameById[bc.id] = bc.bank_name ?? 'Unknown Bank';
    }
  }

  return logs.map((log) => {
    const refId = (log.bank_connection_id ?? log.subscription_id) as string;
    return {
      id: log.id as string,
      subscription_name: nameById[refId] ?? 'Unknown',
      notification_type: log.notification_type as 'renewal' | 'trial_expiry' | 'bank_expiry',
      renewal_date: log.renewal_date as string,
      sent_at: log.sent_at as string,
      status: log.status as 'sent' | 'failed' | 'retrying',
    };
  });
}

export async function getDeliveryCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent');

  if (error) throw error;
  return count ?? 0;
}

export async function hasPartialNotifications(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('reminder_settings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_enabled', false);

  if (error) throw error;
  return (count ?? 0) > 0;
}
