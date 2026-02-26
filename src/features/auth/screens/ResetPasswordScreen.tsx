import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { TextInput, Button, Text, HelperText, Snackbar, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { resetPasswordSchema } from '../types/schemas';
import type { ResetPasswordFormData } from '../types';
import type { AuthStackParamList } from '@app/navigation/types';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { PasswordRequirements } from '../components/PasswordRequirements';

type ResetPasswordNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordNavigationProp>();
  const theme = useTheme();
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const pendingPasswordReset = useAuthStore((s) => s.pendingPasswordReset);
  const clearError = useAuthStore((s) => s.clearError);
  const clearResetState = useAuthStore((s) => s.clearResetState);

  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const passwordValue = watch('password');

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    clearError();
    const success = await updatePassword(data.password);

    if (success) {
      setShowSuccess(true);
      redirectTimerRef.current = setTimeout(() => {
        clearResetState();
        navigation.navigate('Login');
      }, 2000);
    }
  };

  // If no pending password reset session, show expired/invalid state
  if (!pendingPasswordReset) {
    return (
      <View style={[styles.flex, styles.container]}>
        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.colors.error }]}
          accessibilityRole="header"
        >
          Link Expired
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          This reset link has expired or is invalid. Please request a new one.
        </Text>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          accessibilityLabel="Request New Link"
          accessibilityRole="button"
        >
          Request New Link
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
          Create New Password
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Enter your new password below.
        </Text>

        {authError && (
          <HelperText type="error" visible style={styles.authError}>
            {authError.message}
          </HelperText>
        )}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="New Password"
              mode="outlined"
              secureTextEntry={securePassword}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.password}
              style={styles.input}
              accessibilityLabel="New password"
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

        <PasswordRequirements password={passwordValue || ''} />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Confirm Password"
              mode="outlined"
              secureTextEntry={secureConfirm}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.confirmPassword}
              style={styles.input}
              accessibilityLabel="Confirm new password"
              right={
                <TextInput.Icon
                  icon={secureConfirm ? 'eye-off' : 'eye'}
                  onPress={() => setSecureConfirm(!secureConfirm)}
                  forceTextInputFocus={false}
                  accessibilityLabel={secureConfirm ? 'Show password' : 'Hide password'}
                />
              }
            />
          )}
        />
        <HelperText type="error" visible={!!errors.confirmPassword}>
          {errors.confirmPassword?.message}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading || !isValid}
          style={styles.button}
          contentStyle={styles.buttonContent}
          accessibilityLabel="Update Password"
          accessibilityRole="button"
        >
          Update Password
        </Button>

        {authError && (
          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.linkButton}
            contentStyle={styles.linkButtonContent}
            accessibilityLabel="Request New Reset Link"
            accessibilityRole="button"
          >
            Request New Reset Link
          </Button>
        )}
      </ScrollView>

      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={2000}
        style={{ backgroundColor: theme.colors.primaryContainer }}
        theme={{ colors: { inverseSurface: theme.colors.primaryContainer, inverseOnSurface: theme.colors.onPrimaryContainer } }}
      >
        Password updated successfully!
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
