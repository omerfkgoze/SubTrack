import type { Database } from '@shared/types/database.types';

export type BillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'weekly';

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export interface CreateSubscriptionDTO {
  name: string;
  price: number;
  currency?: string;
  billing_cycle: BillingCycle;
  renewal_date: string;
  is_trial?: boolean;
  trial_expiry_date?: string;
  category?: string;
  notes?: string;
}

export type UpdateSubscriptionDTO = Partial<CreateSubscriptionDTO> & { id: string };

export interface AppError {
  code: string;
  message: string;
}

export interface SubscriptionResult {
  data: Subscription | null;
  error: AppError | null;
}

export interface SubscriptionListResult {
  data: Subscription[];
  error: AppError | null;
}
