import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { forgotPasswordSchema } from '../types/schemas';
import type { ForgotPasswordFormData } from '../types';
import type { AuthStackParamList } from '@app/navigation/types';
import { useAuthStore } from '@shared/stores/useAuthStore';

type ForgotPasswordNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const theme = useTheme();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const isResetEmailSent = useAuthStore((s) => s.isResetEmailSent);
  const clearResetState = useAuthStore((s) => s.clearResetState);
  const clearError = useAuthStore((s) => s.clearError);

  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedEmailRef = useRef('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
      clearResetState();
    };
  }, [clearResetState]);

  const startCooldown = useCallback(() => {
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    clearError();
    submittedEmailRef.current = data.email.trim().toLowerCase();
    await requestPasswordReset(submittedEmailRef.current);
    if (useAuthStore.getState().isResetEmailSent) {
      startCooldown();
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isLoading) return;
    clearError();
    await requestPasswordReset(submittedEmailRef.current);
    startCooldown();
  };

  if (isResetEmailSent) {
    return (
      <View style={[styles.flex, styles.container]}>
        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.colors.primary }]}
          accessibilityRole="header"
        >
          Check Your Email
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          We've sent password reset instructions to {submittedEmailRef.current}. If you don't see
          it, check your spam folder.
        </Text>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          accessibilityLabel="Back to Login"
          accessibilityRole="button"
        >
          Back to Login
        </Button>

        <Button
          mode="text"
          onPress={handleResend}
          disabled={cooldownSeconds > 0 || isLoading}
          loading={isLoading}
          style={styles.linkButton}
          contentStyle={styles.linkButtonContent}
          accessibilityLabel={
            cooldownSeconds > 0
              ? `Resend available in ${cooldownSeconds} seconds`
              : "Didn't receive it? Send again"
          }
          accessibilityRole="button"
        >
          {cooldownSeconds > 0
            ? `Send again (${cooldownSeconds}s)`
            : "Didn't receive it? Send again"}
        </Button>

        {authError && (
          <HelperText type="error" visible style={styles.authError}>
            {authError.message}
          </HelperText>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text
          variant="headlineMedium"
          style={styles.title}
          accessibilityRole="header"
        >
          Reset Password
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
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
              accessibilityLabel="Email address"
            />
          )}
        />
        <HelperText type="error" visible={!!errors.email}>
          {errors.email?.message}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading || !isValid}
          style={styles.button}
          contentStyle={styles.buttonContent}
          accessibilityLabel="Send Reset Link"
          accessibilityRole="button"
        >
          Send Reset Link
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
          contentStyle={styles.linkButtonContent}
          accessibilityLabel="Back to Login"
          accessibilityRole="button"
        >
          Back to Login
        </Button>
      </ScrollView>
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
