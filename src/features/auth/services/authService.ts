import { supabase } from '@shared/services/supabase';
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { getResetPasswordRedirectUrl } from '@shared/services/deepLinking';
import type { AuthResult } from '../types';

function mapAuthError(error: SupabaseAuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'This email is already registered.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (msg.includes('invalid') && msg.includes('email')) {
    return 'Please check your email format.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many failed attempts. Please try again in 15 minutes.';
  }
  if (msg.includes('network') || error.status === 0) {
    return 'No internet connection. Please try again.';
  }
  return 'An error occurred. Please try again.';
}

function mapErrorCode(error: SupabaseAuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) return 'INVALID_CREDENTIALS';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'EMAIL_TAKEN';
  if (msg.includes('email not confirmed')) return 'EMAIL_NOT_CONFIRMED';
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'RATE_LIMITED';
  if (msg.includes('invalid') && msg.includes('email')) return 'INVALID_EMAIL';
  if (msg.includes('network') || error.status === 0) return 'NETWORK_ERROR';
  return 'UNKNOWN';
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: mapAuthError(error), code: mapErrorCode(error) },
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null,
      session: null,
      error: {
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
      },
    };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: mapAuthError(error), code: mapErrorCode(error) },
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null,
      session: null,
      error: {
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
      },
    };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getResetPasswordRedirectUrl(),
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: mapAuthError(error), code: mapErrorCode(error) },
      };
    }

    return { user: null, session: null, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null,
      session: null,
      error: {
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
      },
    };
  }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: mapAuthError(error), code: mapErrorCode(error) },
      };
    }

    return { user: data.user, session: null, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null,
      session: null,
      error: {
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
      },
    };
  }
}

export async function deleteAccount(): Promise<AuthResult> {
  try {
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });

    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 401) {
        return {
          user: null,
          session: null,
          error: { message: 'Session expired. Please log in again.', code: 'AUTH_ERROR' },
        };
      }
      return {
        user: null,
        session: null,
        error: { message: 'Failed to delete account. Please try again.', code: 'DELETE_FAILED' },
      };
    }

    return { user: null, session: null, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null,
      session: null,
      error: {
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'Failed to delete account. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'DELETE_FAILED',
      },
    };
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: mapAuthError(error), code: mapErrorCode(error) },
      };
    }

    return { user: null, session: null, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null,
      session: null,
      error: {
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
      },
    };
  }
}

export async function setSessionFromTokens(
  accessToken: string,
  refreshToken: string,
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: mapAuthError(error), code: mapErrorCode(error) },
      };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err) {
    const isNetwork = err instanceof TypeError;
    return {
      user: null,
      session: null,
      error: {
        message: isNetwork
          ? 'No internet connection. Please try again.'
          : 'An error occurred. Please try again.',
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
      },
    };
  }
}
