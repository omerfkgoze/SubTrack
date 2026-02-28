import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

// Settings Stack
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Notifications: undefined;
  Premium: undefined;
  DataExport: undefined;
  Account: undefined;
};

// Subscriptions Stack
export type SubscriptionsStackParamList = {
  SubscriptionsList: undefined;
  EditSubscription: { subscriptionId: string };
};

// Main Tabs
export type MainTabsParamList = {
  Home: undefined;
  Subscriptions: NavigatorScreenParams<SubscriptionsStackParamList>;
  Add: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
};

// Screen prop types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type MainTabsScreenProps<T extends keyof MainTabsParamList> = BottomTabScreenProps<
  MainTabsParamList,
  T
>;

export type SubscriptionsStackScreenProps<T extends keyof SubscriptionsStackParamList> =
  NativeStackScreenProps<SubscriptionsStackParamList, T>;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;
