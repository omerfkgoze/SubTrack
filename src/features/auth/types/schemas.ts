import { z } from 'zod';

const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number');

export const registerSchema = z
  .object({
    email: z.email('Please enter a valid email address'),
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterSchemaType = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
