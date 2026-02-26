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

// Password reset types
export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export type { DeepLinkResult } from '@shared/services/deepLinking';

// Biometric types
export type BiometricErrorCode =
  | 'NOT_AVAILABLE'
  | 'NOT_ENROLLED'
  | 'AUTH_FAILED'
  | 'USER_CANCELLED'
  | 'SESSION_EXPIRED'
  | 'KEYCHAIN_ERROR'
  | 'UNKNOWN';

export interface BiometricError {
  message: string;
  code: BiometricErrorCode;
}

export interface BiometricCheckResult {
  available: boolean;
  biometryType: 'FaceID' | 'TouchID' | 'Biometrics' | null;
}

export interface BiometricResult {
  success: boolean;
  error: BiometricError | null;
}

export interface BiometricAuthResult {
  success: boolean;
  refreshToken: string | null;
  error: BiometricError | null;
}
