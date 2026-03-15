import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';
import { supabase } from '@shared/services/supabase';

// Must be called at module level before any notification interaction
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('renewal-reminders', {
      name: 'Renewal Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    throw new Error('EAS Project ID not found');
  }

  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData;
}

export async function savePushToken(
  userId: string,
  token: string,
  platform: string,
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform }, { onConflict: 'user_id,token' });
  if (error) throw error;
}

export async function getPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
  if (error) throw error;
}
