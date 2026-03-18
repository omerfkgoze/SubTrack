import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme, Icon, Badge } from 'react-native-paper';
import type { MainTabsParamList } from './types';
import { HomeScreen } from '@features/dashboard/screens/HomeScreen';
import { AddSubscriptionScreen } from '@features/subscriptions/screens/AddSubscriptionScreen';
import { SubscriptionsStack } from './SubscriptionsStack';
import { SettingsStack } from './SettingsStack';
import { usePremiumStore, MAX_FREE_SUBSCRIPTIONS } from '@shared/stores/usePremiumStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const theme = useTheme();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const canAddSubscription = usePremiumStore((s) => s.canAddSubscription);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const activeCount = subscriptions.filter((s) => s.is_active !== false).length;
  const atLimit = !isPremium && activeCount >= MAX_FREE_SUBSCRIPTIONS;

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
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon source="plus-circle" size={size} color={color} />
              {atLimit && (
                <Badge
                  size={12}
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    backgroundColor: theme.colors.secondary,
                  }}
                >
                  {''}
                </Badge>
              )}
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!canAddSubscription(activeCount)) {
              e.preventDefault();
              navigation.navigate('Settings', { screen: 'Premium' });
            }
          },
        })}
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
