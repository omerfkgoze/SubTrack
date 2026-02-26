// Feature public exports
export { RegisterScreen } from './screens/RegisterScreen';
export { LoginScreen } from './screens/LoginScreen';
export { BiometricPromptScreen } from './screens/BiometricPromptScreen';
export { signUpWithEmail, signInWithEmail } from './services/authService';
export {
  checkBiometricAvailability,
  enrollBiometric,
  authenticateWithBiometric,
  disableBiometric,
  getStoredToken,
} from './services/biometricService';
export type {
  RegisterFormData,
  LoginFormData,
  AuthError,
  AuthResult,
  BiometricCheckResult,
  BiometricResult,
  BiometricAuthResult,
  BiometricError,
  BiometricErrorCode,
} from './types';
export { registerSchema, loginSchema } from './types/schemas';
