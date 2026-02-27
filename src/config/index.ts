// Note: env is intentionally excluded from barrel export.
// Import directly from '@config/env' to avoid crash when env vars are not set.
export { theme } from './theme';
export { SUBSCRIPTION_CATEGORIES } from './categories';
export { searchPopularServices } from './popularServices';
