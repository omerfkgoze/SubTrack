import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SubscriptionsStackParamList } from './types';
import { SubscriptionsScreen } from '@features/subscriptions/screens/SubscriptionsScreen';
import { EditSubscriptionScreen } from '@features/subscriptions/screens/EditSubscriptionScreen';

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
        name="EditSubscription"
        component={EditSubscriptionScreen}
        options={{ title: 'Edit Subscription' }}
      />
    </Stack.Navigator>
  );
}
