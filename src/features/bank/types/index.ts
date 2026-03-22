export interface SupportedBank {
  id: string; // Tink financialInstitutionId
  displayName: string; // Tink displayName
  market: string; // ISO 3166-1 alpha-2 (e.g., "SE", "DE")
  iconUrl: string | null; // Tink images.icon CDN URL
  popular: boolean; // Tink popular flag
  rank: number; // Tink rank (lower = more prominent)
}

export type BankConnectionStatus = 'active' | 'expiring_soon' | 'expired' | 'error' | 'disconnected';

export interface BankConnection {
  id: string;
  userId: string;
  provider: 'tink';
  bankName: string;
  status: BankConnectionStatus;
  connectedAt: string; // ISO 8601
  consentGrantedAt: string; // ISO 8601
  consentExpiresAt: string; // ISO 8601 — consentGrantedAt + 180 days
  lastSyncedAt: string | null; // ISO 8601 | null for fresh connections
  tinkCredentialsId: string;
}
