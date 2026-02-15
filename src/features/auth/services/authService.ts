import { supabase } from '@shared/services/supabase';
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import type { AuthResult } from '../types';

function mapAuthError(error: SupabaseAuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'This email is already registered.';
  }
  if (msg.includes('invalid') && msg.includes('email')) {
    return 'Please check your email format.';
  }
  if (msg.includes('network') || error.status === 0) {
    return 'No internet connection. Please try again.';
  }
  return 'An error occurred. Please try again.';
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: mapAuthError(error), code: error.message },
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch {
    return {
      user: null,
      session: null,
      error: { message: 'No internet connection. Please try again.' },
    };
  }
}
