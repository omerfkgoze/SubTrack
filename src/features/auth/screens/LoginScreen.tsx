import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, Snackbar } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loginSchema } from '../types/schemas';
import type { LoginFormData } from '../types';
import type { AuthStackParamList } from '@app/navigation/types';
import { useAuthStore } from '@shared/stores/useAuthStore';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigationProp>();
  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const sessionExpiredMessage = useAuthStore((s) => s.sessionExpiredMessage);
  const clearSessionExpiredMessage = useAuthStore((s) => s.clearSessionExpiredMessage);

  const [securePassword, setSecurePassword] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const isNetworkError = authError?.message?.includes('internet');

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    clearSessionExpiredMessage();
    await signIn(data.email.trim(), data.password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium" style={styles.title}>
          Welcome Back
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Log in to manage your subscriptions
        </Text>

        {authError && (
          <HelperText type="error" visible style={styles.authError}>
            {authError.message}
          </HelperText>
        )}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Email"
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.email}
              style={styles.input}
            />
          )}
        />
        <HelperText type="error" visible={!!errors.email}>
          {errors.email?.message}
        </HelperText>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry={securePassword}
              autoComplete="current-password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.password}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={securePassword ? 'eye-off' : 'eye'}
                  onPress={() => setSecurePassword(!securePassword)}
                  forceTextInputFocus={false}
                  accessibilityLabel={securePassword ? 'Show password' : 'Hide password'}
                />
              }
            />
          )}
        />
        <HelperText type="error" visible={!!errors.password}>
          {errors.password?.message}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {isNetworkError ? 'Try Again' : 'Login'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.linkButton}
          contentStyle={styles.linkButtonContent}
          accessibilityLabel="Forgot Password"
          accessibilityRole="button"
        >
          Forgot Password?
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
          contentStyle={styles.linkButtonContent}
        >
          Don't have an account? Register
        </Button>
      </ScrollView>

      <Snackbar
        visible={!!sessionExpiredMessage}
        onDismiss={clearSessionExpiredMessage}
        duration={5000}
      >
        {sessionExpiredMessage ?? ''}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 24,
  },
  authError: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    marginBottom: 0,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    minHeight: 48,
  },
  linkButton: {
    marginTop: 12,
  },
  linkButtonContent: {
    minHeight: 44,
  },
});
