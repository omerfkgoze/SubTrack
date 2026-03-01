export interface SubscriptionCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [
  { id: 'entertainment', label: 'Entertainment', icon: 'movie-open', color: '#8B5CF6' },
  { id: 'music', label: 'Music', icon: 'music', color: '#EF4444' },
  { id: 'productivity', label: 'Productivity', icon: 'briefcase', color: '#3B82F6' },
  { id: 'storage', label: 'Storage', icon: 'cloud', color: '#F97316' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad-variant', color: '#22C55E' },
  { id: 'news', label: 'News', icon: 'newspaper', color: '#A16207' },
  { id: 'health', label: 'Health', icon: 'heart-pulse', color: '#EC4899' },
  { id: 'other', label: 'Other', icon: 'package-variant', color: '#6B7280' },
];
