import { MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366F1',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0E0FF',
    onPrimaryContainer: '#1A1A5E',
    secondary: '#8B5CF6',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#EDDCFF',
    onSecondaryContainer: '#2E004E',
    tertiary: '#10B981',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#A7F3D0',
    onTertiaryContainer: '#003822',
  },
};
