import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { registerSchema } from '../types/schemas';
import type { RegisterFormData } from '../types';
import type { AuthStackParamList } from '@app/navigation/types';
import { useAuthStore } from '@shared/stores/useAuthStore';

type RegisterNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

function PasswordRequirements({ password }: { password: string }) {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: '1 uppercase letter', met: /[A-Z]/.test(password) },
    { label: '1 lowercase letter', met: /[a-z]/.test(password) },
    { label: '1 number', met: /[0-9]/.test(password) },
  ];

  return (
    <View style={styles.requirements}>
      {rules.map((rule) => (
        <Text
          key={rule.label}
          variant="labelSmall"
          style={[styles.requirementText, rule.met && styles.requirementMet]}
        >
          {rule.met ? '✓' : '○'} {rule.label}
        </Text>
      ))}
    </View>
  );
}

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNavigationProp>();
  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    await signUp(data.email, data.password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium" style={styles.title}>
          Create Account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Start tracking your subscriptions
        </Text>

        {authError && (
          <HelperText type="error" visible style={styles.authError}>
            {authError}
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
              right={
                <TextInput.Icon
                  icon={secureConfirm ? 'eye-off' : 'eye'}
                  onPress={() => setSecureConfirm(!secureConfirm)}
                  forceTextInputFocus={false}
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
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Create Account
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}
          contentStyle={styles.loginLinkContent}
        >
          Already have an account? Login
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
  requirements: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  requirementText: {
    opacity: 0.5,
    lineHeight: 18,
  },
  requirementMet: {
    opacity: 1,
    color: '#10B981',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    minHeight: 48,
  },
  loginLink: {
    marginTop: 12,
  },
  loginLinkContent: {
    minHeight: 44,
  },
});
