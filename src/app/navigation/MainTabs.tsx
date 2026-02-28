import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme, Icon } from 'react-native-paper';
import type { MainTabsParamList } from './types';
import { HomeScreen } from '@features/dashboard/screens/HomeScreen';
import { AddSubscriptionScreen } from '@features/subscriptions/screens/AddSubscriptionScreen';
import { SubscriptionsStack } from './SubscriptionsStack';
import { SettingsStack } from './SettingsStack';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Icon source="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsStack}
        options={{
          tabBarLabel: 'Subscriptions',
          tabBarIcon: ({ color, size }) => (
            <Icon source="credit-card-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddSubscriptionScreen}
        options={{
          tabBarLabel: 'Add',
          tabBarIcon: ({ color, size }) => <Icon source="plus-circle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Icon source="cog" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
