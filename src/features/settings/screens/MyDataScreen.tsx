import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  List,
  Button,
  Snackbar,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useSubscriptionStore } from '@shared/stores/useSubscriptionStore';
import { useNotificationStore } from '@shared/stores/useNotificationStore';
import { getUserSettings } from '@features/settings/services/userSettingsService';
import { exportPersonalData } from '@features/settings/services/personalDataService';

export function MyDataScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const fetchSubscriptions = useSubscriptionStore((s) => s.fetchSubscriptions);
  const permissionStatus = useNotificationStore((s) => s.permissionStatus);
  const expoPushToken = useNotificationStore((s) => s.expoPushToken);

  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [preferredCalendarId, setPreferredCalendarId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    isError: boolean;
  }>({ visible: false, message: '', isError: false });

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchSubscriptions();
        if (user?.id && !cancelled) {
          const settings = await getUserSettings(user.id);
          if (!cancelled) {
            setPreferredCalendarId(settings?.preferred_calendar_id ?? null);
          }
        }
      } catch {
        // Non-blocking
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [fetchSubscriptions, user?.id]);

  const handleDownload = useCallback(async () => {
    if (!user || isDownloading) return;
    setIsDownloading(true);
    try {
      await exportPersonalData(
        user.id,
        user.email ?? '',
        user.created_at,
        subscriptions,
        { permissionStatus, expoPushToken },
        { preferred_calendar_id: preferredCalendarId },
      );
      setSnackbar({ visible: true, message: 'Data exported successfully', isError: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Export failed. Please try again.';
      setSnackbar({ visible: true, message, isError: true });
    } finally {
      setIsDownloading(false);
    }
  }, [user, isDownloading, subscriptions, permissionStatus, expoPushToken, preferredCalendarId]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator
          size="large"
          accessibilityLabel="Loading"
        />
      </View>
    );
  }

  const createdAtFormatted = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : 'Unknown';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Data Summary (AC1) */}
        <List.Section>
          <List.Subheader>Data Summary</List.Subheader>
          <List.Item
            title="Email"
            description={user?.email ?? ''}
            left={(props) => <List.Icon {...props} icon="email-outline" />}
          />
          <List.Item
            title="Account Created"
            description={createdAtFormatted}
            left={(props) => <List.Icon {...props} icon="calendar-account" />}
          />
          <List.Item
            title="Subscriptions"
            description={`${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''}`}
            left={(props) => <List.Icon {...props} icon="credit-card-outline" />}
          />
          <List.Item
            title="Data Storage"
            description="Supabase Cloud (EU)"
            left={(props) => <List.Icon {...props} icon="cloud-outline" />}
          />
        </List.Section>

        {/* Detailed Data View (AC2) */}
        <List.Section>
          <List.Subheader>View My Data</List.Subheader>
          <List.Accordion
            title="Profile Data"
            left={(props) => <List.Icon {...props} icon="account-outline" />}
            testID="profile-accordion"
          >
            <List.Item
              title="Email"
              description={user?.email ?? ''}
              titleStyle={styles.detailTitle}
            />
            <List.Item
              title="User ID"
              description={user?.id ?? ''}
              titleStyle={styles.detailTitle}
            />
            <List.Item
              title="Account Created"
              description={createdAtFormatted}
              titleStyle={styles.detailTitle}
            />
          </List.Accordion>

          <List.Accordion
            title={`Subscriptions (${subscriptions.length})`}
            left={(props) => <List.Icon {...props} icon="credit-card-multiple-outline" />}
            testID="subscriptions-accordion"
          >
            {subscriptions.length === 0 ? (
              <List.Item title="No subscriptions yet" titleStyle={styles.detailTitle} />
            ) : (
              subscriptions.map((sub) => (
                <List.Item
                  key={sub.id}
                  title={sub.name}
                  description={`${sub.price} ${sub.currency} / ${sub.billing_cycle} • ${sub.is_active ? 'Active' : 'Inactive'}`}
                  titleStyle={styles.detailTitle}
                />
              ))
            )}
          </List.Accordion>

          <List.Accordion
            title="Notification Settings"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            testID="notifications-accordion"
          >
            <List.Item
              title="Permission Status"
              description={permissionStatus}
              titleStyle={styles.detailTitle}
            />
            <List.Item
              title="Push Token"
              description={expoPushToken ?? 'Not registered'}
              titleStyle={styles.detailTitle}
            />
          </List.Accordion>

          <List.Accordion
            title="Calendar Preferences"
            left={(props) => <List.Icon {...props} icon="calendar-outline" />}
            testID="calendar-accordion"
          >
            <List.Item
              title="Preferred Calendar ID"
              description={preferredCalendarId ?? 'Default'}
              titleStyle={styles.detailTitle}
            />
          </List.Accordion>
        </List.Section>

        {/* Download My Data (AC3) */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            icon="download"
            onPress={handleDownload}
            disabled={isDownloading}
            loading={isDownloading}
            accessibilityLabel="Download My Data"
            accessibilityRole="button"
          >
            Download My Data
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        duration={snackbar.isError ? 5000 : 3000}
        style={snackbar.isError ? { backgroundColor: theme.colors.error } : undefined}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  detailTitle: {
    fontSize: 13,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
});
