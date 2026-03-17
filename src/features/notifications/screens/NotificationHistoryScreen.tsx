import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, List, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useAuthStore } from '@shared/stores/useAuthStore';
import {
  getNotificationHistory,
  type NotificationHistoryItem,
} from '../services/notificationHistoryService';
import { NotificationStatusBadge } from '../components/NotificationStatusBadge';

function StatusChip({ status }: { status: NotificationHistoryItem['status'] }) {
  const colorMap: Record<NotificationHistoryItem['status'], string> = {
    sent: '#10B981',
    failed: '#EF4444',
    retrying: '#F59E0B',
  };
  const labelMap: Record<NotificationHistoryItem['status'], string> = {
    sent: 'Delivered',
    failed: 'Failed',
    retrying: 'Retrying',
  };
  return (
    <Chip
      compact
      style={[styles.chip, { backgroundColor: colorMap[status] }]}
      textStyle={styles.chipText}
    >
      {labelMap[status]}
    </Chip>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <List.Icon icon="bell-sleep-outline" style={styles.emptyIcon} />
      <Text variant="bodyLarge" style={styles.emptyText}>
        No notifications yet. Reminders will appear here once your subscriptions approach renewal.
      </Text>
    </View>
  );
}

export function NotificationHistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotificationHistory(user.id);
      setItems(data);
    } catch {
      // errors are non-blocking for list display
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = useCallback(({ item }: { item: NotificationHistoryItem }) => {
    const icon = item.notification_type === 'trial_expiry' ? 'clock-outline' : 'bell-outline';
    const typeLabel = item.notification_type === 'trial_expiry' ? 'Trial expiry' : 'Renewal reminder';
    const dateStr = format(new Date(item.sent_at), 'MMM d, yyyy');

    return (
      <List.Item
        title={item.subscription_name}
        description={`${typeLabel} · ${dateStr}`}
        left={(props) => <List.Icon {...props} icon={icon} />}
        right={() => <StatusChip status={item.status} />}
        style={styles.listItem}
      />
    );
  }, []);

  return (
    <View style={styles.container}>
      <NotificationStatusBadge variant="banner" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState />}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={items.length === 0 ? styles.emptyListContent : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listItem: {
    minHeight: 56,
  },
  chip: {
    alignSelf: 'center',
    marginRight: 8,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});
