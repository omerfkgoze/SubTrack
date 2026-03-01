import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SubscriptionsStackParamList } from './types';
import { SubscriptionsScreen } from '@features/subscriptions/screens/SubscriptionsScreen';
import { EditSubscriptionScreen } from '@features/subscriptions/screens/EditSubscriptionScreen';
import { SubscriptionDetailScreen } from '@features/subscriptions/screens/SubscriptionDetailScreen';

const Stack = createNativeStackNavigator<SubscriptionsStackParamList>();

export function SubscriptionsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SubscriptionsList"
        component={SubscriptionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SubscriptionDetail"
        component={SubscriptionDetailScreen}
        options={{ title: 'Subscription Details' }}
      />
      <Stack.Screen
        name="EditSubscription"
        component={EditSubscriptionScreen}
        options={{ title: 'Edit Subscription' }}
      />
    </Stack.Navigator>
  );
}
