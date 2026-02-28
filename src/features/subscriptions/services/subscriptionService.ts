import { supabase } from '@shared/services/supabase';
import type {
  CreateSubscriptionDTO,
  SubscriptionResult,
  SubscriptionListResult,
} from '../types';

export async function createSubscription(
  dto: CreateSubscriptionDTO,
): Promise<SubscriptionResult> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        data: null,
        error: { code: 'AUTH_ERROR', message: 'Session expired. Please log in again.' },
      };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        name: dto.name,
        price: dto.price,
        currency: dto.currency ?? 'EUR',
        billing_cycle: dto.billing_cycle,
        renewal_date: dto.renewal_date,
        is_trial: dto.is_trial ?? false,
        trial_expiry_date: dto.trial_expiry_date ?? null,
        category: dto.category ?? null,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Supabase insert error:', error.message, error.code, error.details);
      return {
        data: null,
        error: { code: 'DB_ERROR', message: 'Failed to save subscription. Please try again.' },
      };
    }

    return { data, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      data: null,
      error: {
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
      },
    };
  }
}

export async function updateSubscription(
  id: string,
  dto: Partial<CreateSubscriptionDTO>,
): Promise<SubscriptionResult> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        data: null,
        error: { code: 'AUTH_ERROR', message: 'Please log in to update subscriptions.' },
      };
    }

    const updatePayload: Record<string, unknown> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.price !== undefined) updatePayload.price = dto.price;
    if (dto.currency !== undefined) updatePayload.currency = dto.currency;
    if (dto.billing_cycle !== undefined) updatePayload.billing_cycle = dto.billing_cycle;
    if (dto.renewal_date !== undefined) updatePayload.renewal_date = dto.renewal_date;
    if (dto.is_trial !== undefined) updatePayload.is_trial = dto.is_trial;
    if ('trial_expiry_date' in dto) updatePayload.trial_expiry_date = dto.trial_expiry_date ?? null;
    if ('category' in dto) updatePayload.category = dto.category ?? null;
    if ('notes' in dto) updatePayload.notes = dto.notes ?? null;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Supabase update error:', error.message, error.code, error.details);
      return {
        data: null,
        error: { code: 'DB_ERROR', message: 'Failed to update subscription. Please try again.' },
      };
    }

    return { data, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      data: null,
      error: {
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
      },
    };
  }
}

export async function getSubscriptions(): Promise<SubscriptionListResult> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('renewal_date', { ascending: true });

    if (error) {
      return {
        data: [],
        error: { code: 'DB_ERROR', message: 'Failed to load subscriptions. Please try again.' },
      };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      data: [],
      error: {
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
      },
    };
  }
}

export async function getSubscriptionCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true });

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
