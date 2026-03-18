import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Subscription } from '@features/subscriptions/types';
import { checkConnectivity } from '@shared/services/networkCheck';

export interface NotificationPreferences {
  permissionStatus: string;
  expoPushToken: string | null;
}

export interface CalendarPreferences {
  preferred_calendar_id: string | null;
}

export interface PersonalDataExport {
  export_date: string;
  user: {
    email: string;
    id: string;
    created_at: string;
  };
  subscriptions: Subscription[];
  settings: {
    preferred_calendar_id: string | null;
    notification_preferences: NotificationPreferences;
  };
}

function getFilename(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `subtrack-my-data-${date}.json`;
}

export async function exportPersonalData(
  userId: string,
  email: string,
  createdAt: string,
  subscriptions: Subscription[],
  notificationSettings: NotificationPreferences,
  calendarPreferences: CalendarPreferences,
): Promise<void> {
  const { error } = await checkConnectivity();
  if (error) {
    throw new Error(error.message);
  }

  const exportData: PersonalDataExport = {
    export_date: new Date().toISOString(),
    user: {
      email,
      id: userId,
      created_at: createdAt,
    },
    subscriptions,
    settings: {
      preferred_calendar_id: calendarPreferences.preferred_calendar_id,
      notification_preferences: notificationSettings,
    },
  };

  const content = JSON.stringify(exportData, null, 2);
  const filename = getFilename();
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'My Personal Data',
  });
}
