// Feature public exports
export { RegisterScreen } from './screens/RegisterScreen';
export { LoginScreen } from './screens/LoginScreen';
export { signUpWithEmail, signInWithEmail } from './services/authService';
export type { RegisterFormData, LoginFormData, AuthError, AuthResult } from './types';
export { registerSchema, loginSchema } from './types/schemas';
