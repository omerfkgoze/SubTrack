import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './types';
import { SettingsScreen } from '@features/settings/screens/SettingsScreen';
import { NotificationPermissionScreen } from '@features/notifications/screens/NotificationPermissionScreen';
import { NotificationHistoryScreen } from '@features/notifications/screens/NotificationHistoryScreen';
import { DataExportScreen } from '@features/settings/screens/DataExportScreen';
import { MyDataScreen } from '@features/settings/screens/MyDataScreen';
import { PaywallScreen } from '@features/premium/screens/PaywallScreen';
import { usePremiumStore } from '@shared/stores/usePremiumStore';

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
      <Stack.Screen
        name="Premium"
        component={PaywallScreen}
        options={() => ({
          title: usePremiumStore.getState().isPremium ? 'Your Premium Plan' : 'Unlock Premium',
        })}
      />
      <Stack.Screen
        name="DataExport"
        component={DataExportScreen}
        options={{ title: 'Data Export' }}
      />
      <Stack.Screen
        name="MyData"
        component={MyDataScreen}
        options={{ title: 'My Data' }}
      />
    </Stack.Navigator>
  );
}
