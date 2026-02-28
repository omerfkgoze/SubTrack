import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import type { Subscription, BillingCycle } from '@features/subscriptions/types';
import { getRenewalInfo } from '@features/subscriptions/utils/subscriptionUtils';
import { SubscriptionCard } from './SubscriptionCard';

interface SwipeableSubscriptionCardProps {
  subscription: Subscription;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  onSwipeableOpen?: (close: () => void) => void;
}

export function SwipeableSubscriptionCard({
  subscription,
  onEdit,
  onDelete,
  onPress,
  onSwipeableOpen,
}: SwipeableSubscriptionCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const renewalInfo = getRenewalInfo(subscription.renewal_date);
  const detailedLabel = `${subscription.name}, ${subscription.price} euros per ${subscription.billing_cycle as BillingCycle}, ${renewalInfo.text}`;

  const renderRightActions = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editAction]}
        onPress={() => {
          swipeableRef.current?.close();
          onEdit?.();
        }}
        accessibilityLabel={`Edit ${subscription.name}`}
        accessibilityRole="button"
      >
        <Icon source="pencil-outline" size={22} color="#FFFFFF" />
        <Text style={styles.actionLabel}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete?.();
        }}
        accessibilityLabel={`Delete ${subscription.name}`}
        accessibilityRole="button"
      >
        <Icon source="trash-can-outline" size={22} color="#FFFFFF" />
        <Text style={styles.actionLabel}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2} // AC specifies damping:20, but classic Swipeable uses friction (not Reanimated damping)
      onSwipeableOpen={() => onSwipeableOpen?.(() => swipeableRef.current?.close())}
    >
      <View
        accessible={true}
        accessibilityLabel={detailedLabel}
        accessibilityActions={[
          { name: 'edit', label: `Edit ${subscription.name}` },
          { name: 'delete', label: `Delete ${subscription.name}` },
        ]}
        onAccessibilityAction={(event) => {
          switch (event.nativeEvent.actionName) {
            case 'edit':
              onEdit?.();
              break;
            case 'delete':
              onDelete?.();
              break;
          }
        }}
      >
        <SubscriptionCard subscription={subscription} onPress={onPress} />
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAction: {
    backgroundColor: '#3B82F6',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
});
