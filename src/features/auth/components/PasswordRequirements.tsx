import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const theme = useTheme();
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
          style={[styles.requirementText, rule.met && { opacity: 1, color: theme.colors.tertiary }]}
        >
          {rule.met ? '✓' : '○'} {rule.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  requirements: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  requirementText: {
    opacity: 0.5,
    lineHeight: 18,
  },
});
