import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './types';
import { SettingsScreen } from '@features/settings/screens/SettingsScreen';
import { NotificationPermissionScreen } from '@features/notifications/screens/NotificationPermissionScreen';
import { NotificationHistoryScreen } from '@features/notifications/screens/NotificationHistoryScreen';
import { DataExportScreen } from '@features/settings/screens/DataExportScreen';
import { MyDataScreen } from '@features/settings/screens/MyDataScreen';
import { PaywallScreen } from '@features/premium/screens/PaywallScreen';
import { BankConnectionScreen } from '@features/bank/screens/BankConnectionScreen';
import { SupportedBanksScreen } from '@features/bank/screens/SupportedBanksScreen';
import { DetectedReviewScreen } from '@features/bank/screens/DetectedReviewScreen';
import { DismissedItemsScreen } from '@features/bank/screens/DismissedItemsScreen';
import { BankConnectionStatusScreen } from '@features/bank/screens/BankConnectionStatusScreen';
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
        name="BankConnection"
        component={BankConnectionScreen}
        options={{ title: 'Bank Connection' }}
      />
      <Stack.Screen
        name="SupportedBanks"
        component={SupportedBanksScreen}
        options={{ title: 'Supported Banks' }}
      />
      <Stack.Screen
        name="DetectedReview"
        component={DetectedReviewScreen}
        options={{ title: 'Detected Subscriptions' }}
      />
      <Stack.Screen
        name="BankConnectionStatus"
        component={BankConnectionStatusScreen}
        options={{ title: 'Connection Status' }}
      />
      <Stack.Screen
        name="DismissedItems"
        component={DismissedItemsScreen}
        options={{ title: 'Dismissed Items' }}
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
