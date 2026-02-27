import { z } from 'zod';

export const createSubscriptionSchema = z
  .object({
    name: z.string().min(1, 'Subscription name is required').max(100),
    price: z.number().positive('Please enter a valid price'),
    billing_cycle: z.enum(['monthly', 'yearly', 'quarterly', 'weekly']),
    renewal_date: z.string().min(1, 'Renewal date is required'),
    is_trial: z.boolean(),
    trial_expiry_date: z.string().optional(),
    category: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => !data.is_trial || (data.is_trial && data.trial_expiry_date),
    {
      message: 'Trial expiry date is required when trial is enabled',
      path: ['trial_expiry_date'],
    },
  );

export type CreateSubscriptionFormData = z.infer<typeof createSubscriptionSchema>;
