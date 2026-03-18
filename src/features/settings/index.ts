// Feature public exports
export { SettingsScreen } from './screens/SettingsScreen';
export {
  getUserSettings,
  upsertPreferredCalendar,
  clearPreferredCalendar,
} from './services/userSettingsService';
export type { UserSettings } from './types';
