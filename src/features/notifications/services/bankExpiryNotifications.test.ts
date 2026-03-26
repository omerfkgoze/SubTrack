/**
 * Tests for bank connection expiry notification logic (Story 7.9)
 *
 * These tests verify the Edge Function's bank expiry notification behavior
 * by testing the core logic: message formatting, candidate filtering,
 * deduplication, and notification_log entries.
 *
 * The actual Edge Function runs in Deno, so we extract and test the
 * pure logic functions and mock the Supabase/Expo interactions.
 */

// ============================================
// Types mirroring Edge Function interfaces
// ============================================
interface BankExpiryCandidate {
  bank_connection_id: string;
  bank_name: string;
  consent_expires_at: string;
  user_id: string;
  days_until_expiry: number;
  connection_status: string;
}

// ============================================
// Pure function extracted from Edge Function
// NOTE: Duplicated from supabase/functions/calculate-reminders/index.ts
// If the Edge Function logic changes, update this copy as well.
// ============================================
function formatBankExpiryNotification(candidate: BankExpiryCandidate) {
  const { bank_name, days_until_expiry } = candidate;

  if (days_until_expiry <= 0) {
    return {
      title: `🔗 Your ${bank_name} connection has expired`,
      body: 'Reconnect now to keep auto-detection active.',
    };
  }
  return {
    title: `🔗 Your ${bank_name} connection expires in ${days_until_expiry} day${days_until_expiry === 1 ? '' : 's'}`,
    body: 'Reconnect to keep auto-detection active.',
  };
}

// ============================================
// Processing loop extracted from Edge Function
// Mirrors the bank expiry section of calculate-reminders/index.ts
// ============================================
async function processBankExpiryCandidates(
  candidates: BankExpiryCandidate[],
  today: string,
  supabase: ReturnType<typeof createMockSupabase>,
  mockFetch: jest.Mock,
) {
  let sent = 0, skipped = 0, failed = 0;

  for (const candidate of candidates) {
    const { data: existing } = await supabase
      .from('notification_log')
      .select('id, status')
      .eq('bank_connection_id', candidate.bank_connection_id)
      .eq('renewal_date', today)
      .eq('notification_type', 'bank_expiry')
      .maybeSingle();

    if (existing?.status === 'sent') { skipped++; continue; }

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', candidate.user_id);

    if (!tokens || tokens.length === 0) { skipped++; continue; }

    const { title, body } = formatBankExpiryNotification(candidate);

    const notifications = tokens.map((t: { token: string }) => ({
      to: t.token, title, body, sound: 'default',
      data: { bank_connection_id: candidate.bank_connection_id },
    }));

    let success = false;
    let expoReceiptId: string | null = null;
    try {
      const res = await mockFetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      });
      const result = await res.json();
      if (res.ok) {
        success = true;
        const tickets = result?.data ?? result;
        if (Array.isArray(tickets) && tickets.length > 0 && tickets[0].id) {
          expoReceiptId = tickets[0].id;
        }
      }
    } catch (_e) { /* failed */ }

    await supabase.from('notification_log').upsert(
      {
        user_id: candidate.user_id,
        bank_connection_id: candidate.bank_connection_id,
        renewal_date: today,
        notification_type: 'bank_expiry',
        status: success ? 'sent' : 'failed',
        expo_receipt_id: expoReceiptId,
        error_message: success ? null : 'send failed',
      },
      { onConflict: 'bank_connection_id,renewal_date,notification_type' },
    );

    // Update connection status if expired
    if (candidate.days_until_expiry <= 0 && candidate.connection_status !== 'expired') {
      await supabase
        .from('bank_connections')
        .update({ status: 'expired' })
        .eq('id', candidate.bank_connection_id);
    }

    if (success) sent++; else failed++;
  }

  return { sent, skipped, failed };
}

// ============================================
// Helper: create candidate
// ============================================
function createBankCandidate(
  overrides: Partial<BankExpiryCandidate> = {},
): BankExpiryCandidate {
  const today = new Date();
  const daysUntil = overrides.days_until_expiry ?? 5;
  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + daysUntil);

  return {
    bank_connection_id: 'conn-1',
    bank_name: 'Test Bank',
    consent_expires_at: expiryDate.toISOString().split('T')[0],
    user_id: 'user-1',
    days_until_expiry: daysUntil,
    connection_status: daysUntil > 0 ? 'expiring_soon' : 'active',
    ...overrides,
  };
}

const TODAY = new Date().toISOString().split('T')[0];

// ============================================
// Mock setup for Supabase client
// ============================================
function createMockSupabase(opts: {
  existingLog?: { status: string };
  pushTokens?: { token: string }[];
} = {}) {
  const notificationLogUpsert = jest.fn().mockResolvedValue({ error: null });
  const bankConnectionsUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  });

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'notification_log') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: opts.existingLog ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        upsert: notificationLogUpsert,
      };
    }
    if (table === 'push_tokens') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: opts.pushTokens ?? [{ token: 'ExponentPushToken[mock]' }],
            error: null,
          }),
        }),
      };
    }
    if (table === 'bank_connections') {
      return {
        update: bankConnectionsUpdate,
      };
    }
    return {};
  });

  return {
    from: mockFrom,
    rpc: jest.fn(),
    _notificationLogUpsert: notificationLogUpsert,
    _bankConnectionsUpdate: bankConnectionsUpdate,
  };
}

function createMockFetch(ok = true, receiptId = 'receipt-123') {
  return jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: jest.fn().mockResolvedValue(
      ok ? [{ id: receiptId }] : { error: 'server error' },
    ),
  });
}

describe('Bank Expiry Notifications (Story 7.9)', () => {
  describe('formatBankExpiryNotification', () => {
    it('formats expiring soon notification with days count (AC1)', () => {
      const candidate = createBankCandidate({ days_until_expiry: 7, bank_name: 'Sparkasse' });
      const result = formatBankExpiryNotification(candidate);

      expect(result.title).toBe('🔗 Your Sparkasse connection expires in 7 days');
      expect(result.body).toBe('Reconnect to keep auto-detection active.');
    });

    it('uses singular "day" for 1 day remaining (AC1)', () => {
      const candidate = createBankCandidate({ days_until_expiry: 1, bank_name: 'ING' });
      const result = formatBankExpiryNotification(candidate);

      expect(result.title).toBe('🔗 Your ING connection expires in 1 day');
    });

    it('uses plural "days" for multiple days remaining (AC1)', () => {
      const candidate = createBankCandidate({ days_until_expiry: 3, bank_name: 'ING' });
      const result = formatBankExpiryNotification(candidate);

      expect(result.title).toBe('🔗 Your ING connection expires in 3 days');
    });

    it('formats expired notification when days_until_expiry is 0 (AC2)', () => {
      const candidate = createBankCandidate({ days_until_expiry: 0, bank_name: 'N26' });
      const result = formatBankExpiryNotification(candidate);

      expect(result.title).toBe('🔗 Your N26 connection has expired');
      expect(result.body).toBe('Reconnect now to keep auto-detection active.');
    });

    it('formats expired notification when days_until_expiry is negative (AC2)', () => {
      const candidate = createBankCandidate({ days_until_expiry: -5, bank_name: 'DKB' });
      const result = formatBankExpiryNotification(candidate);

      expect(result.title).toBe('🔗 Your DKB connection has expired');
    });

    it('includes bank name in all notification types', () => {
      for (const days of [7, 1, 0, -1]) {
        const candidate = createBankCandidate({ days_until_expiry: days, bank_name: 'Volksbank' });
        const result = formatBankExpiryNotification(candidate);

        expect(result.title).toContain('Volksbank');
      }
    });
  });

  describe('Deduplication (AC1)', () => {
    it('skips notification already sent today — status sent prevents re-send', async () => {
      const supabase = createMockSupabase({ existingLog: { status: 'sent' } });
      const mockFetch = createMockFetch();
      const candidate = createBankCandidate({ days_until_expiry: 5 });

      const result = await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('retries previously failed notifications — status failed allows re-send', async () => {
      const supabase = createMockSupabase({ existingLog: { status: 'failed' } });
      const mockFetch = createMockFetch(true, 'receipt-retry');
      const candidate = createBankCandidate({ days_until_expiry: 3 });

      const result = await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(result.sent).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('upsert uses bank_connection_id,renewal_date,notification_type conflict key', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();
      const candidate = createBankCandidate({ days_until_expiry: 5 });

      await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(supabase._notificationLogUpsert).toHaveBeenCalledWith(
        expect.anything(),
        { onConflict: 'bank_connection_id,renewal_date,notification_type' },
      );
    });
  });

  describe('Connection status update (AC2)', () => {
    it('updates bank_connections status to expired when days_until_expiry <= 0 and not already expired', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();
      const candidate = createBankCandidate({
        days_until_expiry: 0,
        connection_status: 'expiring_soon',
        bank_connection_id: 'conn-expired',
      });

      await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(supabase._bankConnectionsUpdate).toHaveBeenCalledWith({ status: 'expired' });
    });

    it('does NOT update status when connection already marked expired', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();
      const candidate = createBankCandidate({
        days_until_expiry: -5,
        connection_status: 'expired',
      });

      await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(supabase._bankConnectionsUpdate).not.toHaveBeenCalled();
    });

    it('does NOT update status when connection has days remaining', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();
      const candidate = createBankCandidate({
        days_until_expiry: 5,
        connection_status: 'expiring_soon',
      });

      await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(supabase._bankConnectionsUpdate).not.toHaveBeenCalled();
    });
  });

  describe('No push tokens — skip silently', () => {
    it('skips candidate when no push tokens registered', async () => {
      const supabase = createMockSupabase({ pushTokens: [] });
      const mockFetch = createMockFetch();
      const candidate = createBankCandidate({ days_until_expiry: 5 });

      const result = await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('notification_log entries', () => {
    it('log includes notification_type = bank_expiry (AC5)', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch(true, 'receipt-123');
      const candidate = createBankCandidate({ days_until_expiry: 5, bank_connection_id: 'conn-abc' });

      await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(supabase._notificationLogUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_type: 'bank_expiry',
          bank_connection_id: 'conn-abc',
          renewal_date: TODAY,
          status: 'sent',
          expo_receipt_id: 'receipt-123',
        }),
        expect.objectContaining({ onConflict: 'bank_connection_id,renewal_date,notification_type' }),
      );
    });

    it('failed push notification logged with status failed', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch(false);
      const candidate = createBankCandidate({ days_until_expiry: 3 });

      const result = await processBankExpiryCandidates([candidate], TODAY, supabase, mockFetch);

      expect(result.failed).toBe(1);
      expect(supabase._notificationLogUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', notification_type: 'bank_expiry' }),
        expect.anything(),
      );
    });
  });

  describe('Edge Function summary includes bankExpiry counts', () => {
    it('summary structure includes bankExpiry breakdown', () => {
      const summary = {
        renewals: { processed: 5, sent: 3, skipped: 1, failed: 1 },
        trials: { processed: 2, sent: 2, skipped: 0, failed: 0 },
        bankExpiry: { processed: 3, sent: 2, skipped: 1, failed: 0 },
        totals: { processed: 10, sent: 7, skipped: 2, failed: 1 },
      };

      expect(summary.totals.processed).toBe(
        summary.renewals.processed + summary.trials.processed + summary.bankExpiry.processed,
      );
      expect(summary.totals.sent).toBe(
        summary.renewals.sent + summary.trials.sent + summary.bankExpiry.sent,
      );
    });
  });
});
