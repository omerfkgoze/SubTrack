// Feature public exports
export { NotificationPermissionScreen } from './screens/NotificationPermissionScreen';
export { NotificationHistoryScreen } from './screens/NotificationHistoryScreen';
export { NotificationStatusBanner } from './components/NotificationStatusBanner';
export { NotificationStatusBadge } from './components/NotificationStatusBadge';
export type { NotificationStatusBadgeProps } from './components/NotificationStatusBadge';
export {
  registerForPushNotificationsAsync,
  savePushToken,
  getPermissionStatus,
  openNotificationSettings,
  removePushToken,
} from './services/notificationService';
export {
  getReminderSettings,
  createDefaultReminder,
  updateReminder,
  deleteReminder,
} from './services/reminderService';
export type { ReminderSetting } from './services/reminderService';
export {
  getNotificationHistory,
  getDeliveryCount,
  hasPartialNotifications,
} from './services/notificationHistoryService';
export type { NotificationHistoryItem } from './services/notificationHistoryService';
