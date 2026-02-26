// Feature public exports
export { RegisterScreen } from './screens/RegisterScreen';
export { LoginScreen } from './screens/LoginScreen';
export { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
export { ResetPasswordScreen } from './screens/ResetPasswordScreen';
export { BiometricPromptScreen } from './screens/BiometricPromptScreen';
export { PasswordRequirements } from './components/PasswordRequirements';
export {
  signUpWithEmail,
  signInWithEmail,
  requestPasswordReset,
  updatePassword,
  setSessionFromTokens,
  signOut,
} from './services/authService';
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
  ForgotPasswordFormData,
  ResetPasswordFormData,
  DeepLinkResult,
  AuthError,
  AuthResult,
  BiometricCheckResult,
  BiometricResult,
  BiometricAuthResult,
  BiometricError,
  BiometricErrorCode,
} from './types';
export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './types/schemas';
