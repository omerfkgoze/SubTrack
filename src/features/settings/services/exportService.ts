import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Subscription } from '@features/subscriptions/types';

const EXPORT_FIELDS = [
  'name',
  'price',
  'currency',
  'billing_cycle',
  'renewal_date',
  'category',
  'is_active',
  'is_trial',
  'trial_expiry_date',
  'notes',
] as const;

type ExportField = (typeof EXPORT_FIELDS)[number];

function getFilename(ext: 'json' | 'csv'): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `subtrack-export-${date}.${ext}`;
}

export async function exportToJSON(subscriptions: Subscription[]): Promise<void> {
  const data = subscriptions.map((sub) =>
    Object.fromEntries(EXPORT_FIELDS.map((f: ExportField) => [f, sub[f] ?? null]))
  );
  const content = JSON.stringify(data, null, 2);
  const filename = getFilename('json');
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Subscriptions',
  });
}

export async function exportToCSV(subscriptions: Subscription[]): Promise<void> {
  const headers = EXPORT_FIELDS.join(',');
  const rows = subscriptions.map((sub) =>
    EXPORT_FIELDS.map((f: ExportField) => {
      const val = sub[f] ?? '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const content = [headers, ...rows].join('\n');
  const filename = getFilename('csv');
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Subscriptions',
  });
}
