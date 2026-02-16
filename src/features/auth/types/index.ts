import type { User, Session } from '@supabase/supabase-js';
import type { LoginSchemaType } from './schemas';

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export type LoginFormData = LoginSchemaType;

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export type { User, Session };
