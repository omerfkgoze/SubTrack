import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './types';
import { SettingsScreen } from '@features/settings/screens/SettingsScreen';
import { NotificationPermissionScreen } from '@features/notifications/screens/NotificationPermissionScreen';
import { NotificationHistoryScreen } from '@features/notifications/screens/NotificationHistoryScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationPermissionScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="NotificationHistory"
        component={NotificationHistoryScreen}
        options={{ title: 'Notification History' }}
      />
    </Stack.Navigator>
  );
}
