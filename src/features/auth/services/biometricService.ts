import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';
import type {
  BiometricCheckResult,
  BiometricResult,
  BiometricAuthResult,
  BiometricError,
} from '../types';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

const KEYCHAIN_SERVICE = 'com.subtrack.biometric';

function mapBiometryType(
  biometryType: string | undefined,
): BiometricCheckResult['biometryType'] {
  switch (biometryType) {
    case BiometryTypes.FaceID:
      return 'FaceID';
    case BiometryTypes.TouchID:
      return 'TouchID';
    case BiometryTypes.Biometrics:
      return 'Biometrics';
    default:
      return null;
  }
}

function mapBiometricError(error: unknown): BiometricError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('cancel') || msg.includes('user cancel')) {
      return { message: '', code: 'USER_CANCELLED' };
    }
    if (msg.includes('not available') || msg.includes('no hardware')) {
      return {
        message: 'Your device does not support biometric authentication',
        code: 'NOT_AVAILABLE',
      };
    }
    if (msg.includes('not enrolled') || msg.includes('no biometrics')) {
      return {
        message: 'No biometrics enrolled on this device',
        code: 'NOT_ENROLLED',
      };
    }
    if (msg.includes('keychain') || msg.includes('credential')) {
      return {
        message: 'Failed to access secure storage',
        code: 'KEYCHAIN_ERROR',
      };
    }
  }
  return {
    message: 'Biometric authentication failed',
    code: 'AUTH_FAILED',
  };
}

export async function checkBiometricAvailability(): Promise<BiometricCheckResult> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return {
      available,
      biometryType: mapBiometryType(biometryType),
    };
  } catch {
    return { available: false, biometryType: null };
  }
}

export async function enrollBiometric(refreshToken: string): Promise<BiometricResult> {
  try {
    await rnBiometrics.createKeys();

    try {
      await Keychain.setGenericPassword('biometric_token', refreshToken, {
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        service: KEYCHAIN_SERVICE,
      });
    } catch (keychainError) {
      // Rollback: clean up keys if keychain storage fails
      try {
        await rnBiometrics.deleteKeys();
      } catch {
        // Best-effort cleanup
      }
      return { success: false, error: mapBiometricError(keychainError) };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: mapBiometricError(error) };
  }
}

export async function authenticateWithBiometric(): Promise<BiometricAuthResult> {
  try {
    const { success, error } = await rnBiometrics.simplePrompt({
      promptMessage: 'Log in to SubTrack',
      cancelButtonText: 'Use Password',
    });

    if (!success) {
      if (error) {
        return { success: false, refreshToken: null, error: mapBiometricError(new Error(error)) };
      }
      return {
        success: false,
        refreshToken: null,
        error: { message: '', code: 'USER_CANCELLED' },
      };
    }

    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });

    if (!credentials) {
      return {
        success: false,
        refreshToken: null,
        error: { message: 'Failed to access secure storage', code: 'KEYCHAIN_ERROR' },
      };
    }

    return {
      success: true,
      refreshToken: credentials.password,
      error: null,
    };
  } catch (error) {
    return { success: false, refreshToken: null, error: mapBiometricError(error) };
  }
}

export async function disableBiometric(): Promise<void> {
  try {
    await rnBiometrics.deleteKeys();
  } catch {
    // Keys may not exist, that's fine
  }

  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {
    // Keychain may not have credentials, that's fine
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    return credentials ? credentials.password : null;
  } catch {
    return null;
  }
}
