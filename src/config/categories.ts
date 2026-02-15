export interface SubscriptionCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [
  { id: 'entertainment', label: 'Entertainment', icon: 'movie-open', color: '#6366F1' },
  { id: 'music', label: 'Music', icon: 'music', color: '#8B5CF6' },
  { id: 'productivity', label: 'Productivity', icon: 'briefcase', color: '#3B82F6' },
  { id: 'cloud', label: 'Cloud Storage', icon: 'cloud', color: '#06B6D4' },
  { id: 'fitness', label: 'Fitness', icon: 'dumbbell', color: '#10B981' },
  { id: 'news', label: 'News & Reading', icon: 'newspaper', color: '#F59E0B' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad-variant', color: '#EF4444' },
  { id: 'other', label: 'Other', icon: 'dots-horizontal-circle', color: '#6B7280' },
];
