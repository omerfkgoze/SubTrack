/**
 * Mock bank data for testing Epic 7 features when Tink sandbox
 * doesn't provide realistic subscription scenarios.
 *
 * Activated by EXPO_PUBLIC_DEMO_BANK_MODE=true
 */

import type { BankConnection, DetectedSubscription, SupportedBank, DetectionResult, DismissedMerchant } from '../types';

// --- Mock Bank Connection ---

const now = new Date();
const connectedDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
const consentExpiry = new Date(connectedDate.getTime() + 180 * 24 * 60 * 60 * 1000); // +180 days

export const MOCK_CONNECTION: BankConnection = {
  id: 'demo-conn-001',
  userId: 'demo-user',
  provider: 'tink',
  bankName: 'Demo Bank (Sandbox)',
  status: 'active',
  connectedAt: connectedDate.toISOString(),
  consentGrantedAt: connectedDate.toISOString(),
  consentExpiresAt: consentExpiry.toISOString(),
  lastSyncedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  tinkCredentialsId: 'demo-cred-001',
};

// --- Mock Connections (multi-status for ConnectionStatusCard testing) ---

const expiredDate = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000); // 200 days ago (expired)
const expiringSoonDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // expires in 10 days

export const MOCK_CONNECTIONS_MULTI: BankConnection[] = [
  MOCK_CONNECTION,
  {
    id: 'demo-conn-002',
    userId: 'demo-user',
    provider: 'tink',
    bankName: 'Expired Bank',
    status: 'expired',
    connectedAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    consentGrantedAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    consentExpiresAt: expiredDate.toISOString(),
    lastSyncedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tinkCredentialsId: 'demo-cred-002',
  },
  {
    id: 'demo-conn-003',
    userId: 'demo-user',
    provider: 'tink',
    bankName: 'Error Bank',
    status: 'error',
    connectedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    consentGrantedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    consentExpiresAt: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tinkCredentialsId: 'demo-cred-003',
  },
  {
    id: 'demo-conn-004',
    userId: 'demo-user',
    provider: 'tink',
    bankName: 'Expiring Soon Bank',
    status: 'expiring_soon',
    connectedAt: new Date(now.getTime() - 170 * 24 * 60 * 60 * 1000).toISOString(),
    consentGrantedAt: new Date(now.getTime() - 170 * 24 * 60 * 60 * 1000).toISOString(),
    consentExpiresAt: expiringSoonDate.toISOString(),
    lastSyncedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    tinkCredentialsId: 'demo-cred-004',
  },
];

// --- Mock Detected Subscriptions ---
// Realistic mix: streaming, music, cloud, news, fitness, gaming, productivity

export const MOCK_DETECTED_SUBSCRIPTIONS: DetectedSubscription[] = [
  {
    id: 'demo-det-001',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-netflix',
    merchantName: 'Netflix',
    amount: 15.49,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.95,
    status: 'detected',
    firstSeen: '2025-09-15',
    lastSeen: '2026-03-15',
  },
  {
    id: 'demo-det-002',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-spotify',
    merchantName: 'Spotify Premium',
    amount: 10.99,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.92,
    status: 'detected',
    firstSeen: '2025-08-01',
    lastSeen: '2026-03-01',
  },
  {
    id: 'demo-det-003',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-icloud',
    merchantName: 'Apple iCloud+ Storage',
    amount: 2.99,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.88,
    status: 'detected',
    firstSeen: '2025-07-10',
    lastSeen: '2026-03-10',
  },
  {
    id: 'demo-det-004',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-youtube',
    merchantName: 'YouTube Premium',
    amount: 13.99,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.90,
    status: 'detected',
    firstSeen: '2025-10-20',
    lastSeen: '2026-03-20',
  },
  {
    id: 'demo-det-005',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-chatgpt',
    merchantName: 'OpenAI ChatGPT Plus',
    amount: 20.00,
    currency: 'USD',
    frequency: 'monthly',
    confidenceScore: 0.85,
    status: 'detected',
    firstSeen: '2025-11-05',
    lastSeen: '2026-03-05',
  },
  {
    id: 'demo-det-006',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-gym',
    merchantName: 'FitLife Gym Membership',
    amount: 39.90,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.78,
    status: 'detected',
    firstSeen: '2025-06-01',
    lastSeen: '2026-03-01',
  },
  {
    id: 'demo-det-007',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-adobe',
    merchantName: 'Adobe Creative Cloud',
    amount: 59.99,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.93,
    status: 'detected',
    firstSeen: '2025-08-15',
    lastSeen: '2026-03-15',
  },
  {
    id: 'demo-det-008',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-xbox',
    merchantName: 'Xbox Game Pass Ultimate',
    amount: 14.99,
    currency: 'EUR',
    frequency: 'monthly',
    confidenceScore: 0.82,
    status: 'detected',
    firstSeen: '2025-12-01',
    lastSeen: '2026-03-01',
  },
  {
    id: 'demo-det-009',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-medium',
    merchantName: 'Medium',
    amount: 5.00,
    currency: 'USD',
    frequency: 'monthly',
    confidenceScore: 0.70,
    status: 'detected',
    firstSeen: '2025-10-01',
    lastSeen: '2026-03-01',
  },
  {
    id: 'demo-det-010',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-domain',
    merchantName: 'Cloudflare Inc.',
    amount: 120.00,
    currency: 'USD',
    frequency: 'yearly',
    confidenceScore: 0.65,
    status: 'detected',
    firstSeen: '2025-04-10',
    lastSeen: '2026-03-10',
  },
  {
    id: 'demo-det-011',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-coffee',
    merchantName: 'Local Coffee Shop',
    amount: 4.50,
    currency: 'EUR',
    frequency: 'weekly',
    confidenceScore: 0.55,
    status: 'dismissed',
    firstSeen: '2026-01-01',
    lastSeen: '2026-03-20',
  },
  {
    id: 'demo-det-012',
    userId: 'demo-user',
    bankConnectionId: 'demo-conn-001',
    tinkGroupId: 'grp-supermarket',
    merchantName: 'Supermarket Weekly',
    amount: 95.00,
    currency: 'EUR',
    frequency: 'weekly',
    confidenceScore: 0.50,
    status: 'dismissed',
    firstSeen: '2026-01-15',
    lastSeen: '2026-03-15',
  },
];

// --- Mock Supported Banks ---

export const MOCK_SUPPORTED_BANKS: SupportedBank[] = [
  { id: 'demo-bank-se-1', displayName: 'Nordea (Demo)', market: 'SE', iconUrl: null, popular: true, rank: 1 },
  { id: 'demo-bank-se-2', displayName: 'SEB (Demo)', market: 'SE', iconUrl: null, popular: true, rank: 2 },
  { id: 'demo-bank-se-3', displayName: 'Swedbank (Demo)', market: 'SE', iconUrl: null, popular: true, rank: 3 },
  { id: 'demo-bank-de-1', displayName: 'Deutsche Bank (Demo)', market: 'DE', iconUrl: null, popular: true, rank: 1 },
  { id: 'demo-bank-de-2', displayName: 'Commerzbank (Demo)', market: 'DE', iconUrl: null, popular: false, rank: 4 },
  { id: 'demo-bank-gb-1', displayName: 'Barclays (Demo)', market: 'GB', iconUrl: null, popular: true, rank: 1 },
  { id: 'demo-bank-gb-2', displayName: 'HSBC (Demo)', market: 'GB', iconUrl: null, popular: true, rank: 2 },
  { id: 'demo-bank-nl-1', displayName: 'ING (Demo)', market: 'NL', iconUrl: null, popular: true, rank: 1 },
  { id: 'demo-bank-fr-1', displayName: 'BNP Paribas (Demo)', market: 'FR', iconUrl: null, popular: true, rank: 1 },
  { id: 'demo-bank-tr-1', displayName: 'Garanti BBVA (Demo)', market: 'TR', iconUrl: null, popular: true, rank: 1 },
];

// --- Mock Detection Result ---

export const MOCK_DETECTION_RESULT: DetectionResult = {
  success: true,
  detectedCount: MOCK_DETECTED_SUBSCRIPTIONS.length,
  newCount: 3,
};

// --- Mock Dismissed Merchants ---

export const MOCK_DISMISSED_MERCHANTS: DismissedMerchant[] = [
  {
    id: 'demo-dm-001',
    userId: 'demo-user',
    merchantName: 'Local Coffee Shop',
    dismissedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  },
  {
    id: 'demo-dm-002',
    userId: 'demo-user',
    merchantName: 'Supermarket Weekly',
    dismissedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
  },
];

// --- Helper: simulate network delay ---

export function mockDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
