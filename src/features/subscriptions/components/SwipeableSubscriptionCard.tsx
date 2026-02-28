import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import type { Subscription } from '@features/subscriptions/types';
import { SubscriptionCard } from './SubscriptionCard';

interface SwipeableSubscriptionCardProps {
  subscription: Subscription;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
}

export function SwipeableSubscriptionCard({
  subscription,
  onEdit,
  onDelete,
  onPress,
}: SwipeableSubscriptionCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

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
      friction={2}
    >
      <SubscriptionCard subscription={subscription} onPress={onPress} />
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
