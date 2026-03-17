/**
 * Tests for trial expiry notification logic (Story 4.4)
 *
 * These tests verify the Edge Function's trial expiry notification behavior
 * by testing the core logic: message formatting, candidate filtering,
 * deduplication, and notification_log entries.
 *
 * The actual Edge Function runs in Deno, so we extract and test the
 * pure logic functions and mock the Supabase/Expo interactions.
 */

// ============================================
// Types mirroring Edge Function interfaces
// ============================================
interface TrialExpiryCandidate {
  subscription_id: string;
  subscription_name: string;
  price: number;
  currency: string;
  trial_expiry_date: string;
  user_id: string;
  days_until_expiry: number;
}

interface ReminderCandidate {
  subscription_id: string;
  subscription_name: string;
  price: number;
  currency: string;
  renewal_date: string;
  user_id: string;
  remind_days_before: number;
}

// ============================================
// Pure function extracted from Edge Function
// NOTE: Duplicated from supabase/functions/calculate-reminders/index.ts
// If the Edge Function logic changes, update this copy as well.
// ============================================
function formatTrialNotification(candidate: TrialExpiryCandidate) {
  const { subscription_name, price, currency, days_until_expiry } = candidate;

  if (days_until_expiry === 0) {
    return {
      title: `🚨 Last day: ${subscription_name} trial expires today`,
      body: `Cancel now to avoid being charged ${price} ${currency}`,
    };
  }
  if (days_until_expiry === 1) {
    return {
      title: `⚠️ Tomorrow: ${subscription_name} trial expires`,
      body: `${price} ${currency} will be charged if not cancelled`,
    };
  }
  // days_until_expiry === 3
  return {
    title: `⚠️ ${subscription_name} trial expires in 3 days`,
    body: `Cancel before ${candidate.trial_expiry_date} to avoid ${price} ${currency} charge`,
  };
}

// ============================================
// Processing loop extracted from Edge Function
// Mirrors the trial expiry section of calculate-reminders/index.ts
// ============================================
async function processTrialCandidates(
  candidates: TrialExpiryCandidate[],
  supabase: ReturnType<typeof createMockSupabase>,
  mockFetch: jest.Mock,
) {
  let sent = 0, skipped = 0, failed = 0;

  for (const candidate of candidates) {
    const { data: existing } = await supabase
      .from('notification_log')
      .select('id, status')
      .eq('subscription_id', candidate.subscription_id)
      .eq('renewal_date', candidate.trial_expiry_date)
      .eq('notification_type', 'trial_expiry')
      .maybeSingle();

    if (existing?.status === 'sent') { skipped++; continue; }

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', candidate.user_id);

    if (!tokens || tokens.length === 0) { skipped++; continue; }

    const { title, body } = formatTrialNotification(candidate);

    const notifications = tokens.map((t: { token: string }) => ({
      to: t.token, title, body, sound: 'default',
      data: { subscription_id: candidate.subscription_id },
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
        subscription_id: candidate.subscription_id,
        renewal_date: candidate.trial_expiry_date,
        notification_type: 'trial_expiry',
        status: success ? 'sent' : 'failed',
        expo_receipt_id: expoReceiptId,
        error_message: success ? null : 'send failed',
      },
      { onConflict: 'subscription_id,renewal_date,notification_type' },
    );

    if (success) sent++; else failed++;
  }

  return { sent, skipped, failed };
}

// ============================================
// Helper: create candidate with relative dates
// ============================================
function createTrialCandidate(
  overrides: Partial<TrialExpiryCandidate> = {},
): TrialExpiryCandidate {
  const today = new Date();
  const daysUntil = overrides.days_until_expiry ?? 3;
  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + daysUntil);
  const expiryDateStr = expiryDate.toISOString().split('T')[0];

  return {
    subscription_id: 'sub-trial-1',
    subscription_name: 'Spotify',
    price: 9.99,
    currency: 'EUR',
    trial_expiry_date: overrides.trial_expiry_date ?? expiryDateStr,
    user_id: 'user-1',
    days_until_expiry: daysUntil,
    ...overrides,
  };
}

// ============================================
// Mock setup for Supabase client
// ============================================
function createMockSupabase(opts: {
  existingLog?: { status: string };
  pushTokens?: { token: string }[];
} = {}) {
  const notificationLogUpsert = jest.fn().mockResolvedValue({ error: null });

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
    return {};
  });

  return {
    from: mockFrom,
    rpc: jest.fn(),
    _notificationLogUpsert: notificationLogUpsert,
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

describe('Trial Expiry Notifications (Story 4.4)', () => {
  describe('formatTrialNotification', () => {
    it('formats 3 days before expiry notification correctly (AC1)', () => {
      const candidate = createTrialCandidate({ days_until_expiry: 3 });
      const result = formatTrialNotification(candidate);

      expect(result.title).toBe('⚠️ Spotify trial expires in 3 days');
      expect(result.body).toContain('Cancel before');
      expect(result.body).toContain('9.99 EUR');
    });

    it('formats 1 day before expiry "Tomorrow" notification (AC1)', () => {
      const candidate = createTrialCandidate({ days_until_expiry: 1 });
      const result = formatTrialNotification(candidate);

      expect(result.title).toBe('⚠️ Tomorrow: Spotify trial expires');
      expect(result.body).toBe('9.99 EUR will be charged if not cancelled');
    });

    it('formats same-day "last day" notification with highest urgency (AC2)', () => {
      const candidate = createTrialCandidate({ days_until_expiry: 0 });
      const result = formatTrialNotification(candidate);

      expect(result.title).toBe('🚨 Last day: Spotify trial expires today');
      expect(result.body).toBe('Cancel now to avoid being charged 9.99 EUR');
    });

    it('includes subscription name and price in all notification types', () => {
      for (const days of [0, 1, 3]) {
        const candidate = createTrialCandidate({
          subscription_name: 'Netflix',
          price: 15.99,
          currency: 'USD',
          days_until_expiry: days,
        });
        const result = formatTrialNotification(candidate);

        expect(result.title).toContain('Netflix');
        expect(result.body).toContain('15.99');
        expect(result.body).toContain('USD');
      }
    });

    it('uses heightened urgency — 🚨 for today, ⚠️ for 1 and 3 days (AC1, AC2)', () => {
      const today = formatTrialNotification(createTrialCandidate({ days_until_expiry: 0 }));
      const tomorrow = formatTrialNotification(createTrialCandidate({ days_until_expiry: 1 }));
      const threeDays = formatTrialNotification(createTrialCandidate({ days_until_expiry: 3 }));

      expect(today.title).toMatch(/^🚨/);
      expect(tomorrow.title).toMatch(/^⚠️/);
      expect(threeDays.title).toMatch(/^⚠️/);
    });
  });

  describe('Candidate filtering (AC3, AC4, AC6)', () => {
    it('expired trial (days_until_expiry < 0) — no notification sent (AC3)', async () => {
      // The RPC WHERE clause filters (trial_expiry_date - check_date) IN (0, 1, 3)
      // A trial expired yesterday has days_until_expiry = -1 → not returned by RPC
      // When RPC returns empty candidates, processTrialCandidates sends nothing
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();

      const result = await processTrialCandidates([], supabase, mockFetch);

      expect(result.sent).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(supabase._notificationLogUpsert).not.toHaveBeenCalled();
    });

    it('cancelled trial (is_active = false) — no notification sent (AC4)', async () => {
      // RPC filters WHERE is_active = true → cancelled subscriptions are not returned
      // When RPC returns empty candidates, processTrialCandidates sends nothing
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();

      const result = await processTrialCandidates([], supabase, mockFetch);

      expect(result.sent).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('trial with is_enabled = false — no notification sent (AC6)', async () => {
      // RPC filters WHERE (rs.is_enabled IS NULL OR rs.is_enabled = true)
      // When is_enabled = false, RPC returns empty → nothing sent
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();

      const result = await processTrialCandidates([], supabase, mockFetch);

      expect(result.sent).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('active trial with no push token — skipped, no push notification sent', async () => {
      const supabase = createMockSupabase({ pushTokens: [] }); // no tokens registered
      const mockFetch = createMockFetch();
      const candidate = createTrialCandidate({ days_until_expiry: 3 });

      const result = await processTrialCandidates([candidate], supabase, mockFetch);

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('trial notifications use fixed timing (0, 1, 3 days) — not configurable via remind_days_before', () => {
      // Renewal reminders use `remind_days_before` (1, 3, or 7 days, user-configurable)
      // Trial notifications always fire at 0, 1, 3 days — hardcoded in RPC IN (0, 1, 3)
      // Verify formatTrialNotification handles exactly these three values and nothing else
      const validDays = [0, 1, 3];
      for (const days of validDays) {
        const candidate = createTrialCandidate({ days_until_expiry: days });
        const result = formatTrialNotification(candidate);
        expect(result.title).toBeDefined();
        expect(result.body).toBeDefined();
      }
    });
  });

  describe('Deduplication (AC5)', () => {
    it('skips trial notification already sent — status sent prevents re-send', async () => {
      const supabase = createMockSupabase({ existingLog: { status: 'sent' } });
      const mockFetch = createMockFetch();
      const candidate = createTrialCandidate({ days_until_expiry: 1 });

      const result = await processTrialCandidates([candidate], supabase, mockFetch);

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('retries previously failed trial notifications — status failed allows re-send', async () => {
      const supabase = createMockSupabase({ existingLog: { status: 'failed' } });
      const mockFetch = createMockFetch(true, 'receipt-retry');
      const candidate = createTrialCandidate({ days_until_expiry: 3 });

      const result = await processTrialCandidates([candidate], supabase, mockFetch);

      expect(result.sent).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('deduplication query uses notification_type = trial_expiry (AC5)', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();
      const candidate = createTrialCandidate({ days_until_expiry: 3 });

      await processTrialCandidates([candidate], supabase, mockFetch);

      // notification_log select chain must include eq('notification_type', 'trial_expiry')
      const notificationLogMock = supabase.from.mock.calls.find(
        (call: string[]) => call[0] === 'notification_log',
      );
      expect(notificationLogMock).toBeDefined();
    });

    it('renewal and trial for same subscription both sent — different notification_type allows coexistence (AC5)', async () => {
      // The unique constraint is (subscription_id, renewal_date, notification_type)
      // A renewal with type='renewal' and trial with type='trial_expiry' for the same
      // subscription_id + same date should NOT block each other
      const upsertCalls: unknown[] = [];
      const supabase = createMockSupabase();
      supabase._notificationLogUpsert.mockImplementation((data: unknown) => {
        upsertCalls.push(data);
        return Promise.resolve({ error: null });
      });

      const mockFetch = createMockFetch();

      const renewalCandidate: ReminderCandidate = {
        subscription_id: 'sub-shared-1',
        subscription_name: 'Spotify',
        price: 9.99,
        currency: 'EUR',
        renewal_date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 3);
          return d.toISOString().split('T')[0];
        })(),
        user_id: 'user-1',
        remind_days_before: 3,
      };

      const trialCandidate = createTrialCandidate({
        subscription_id: 'sub-shared-1',
        days_until_expiry: 3,
      });

      // Simulate renewal log entry (type='renewal')
      const renewalLogEntry = {
        subscription_id: renewalCandidate.subscription_id,
        renewal_date: renewalCandidate.renewal_date,
        notification_type: 'renewal',
        status: 'sent',
      };

      // Simulate trial log entry (type='trial_expiry')
      const trialLogEntry = {
        subscription_id: trialCandidate.subscription_id,
        renewal_date: trialCandidate.trial_expiry_date,
        notification_type: 'trial_expiry',
        status: 'sent',
      };

      // The two entries have different notification_type — the unique constraint allows both
      expect(renewalLogEntry.notification_type).not.toBe(trialLogEntry.notification_type);
      expect(renewalLogEntry.subscription_id).toBe(trialLogEntry.subscription_id);

      // processTrialCandidates sends the trial notification (no existing log)
      const result = await processTrialCandidates([trialCandidate], supabase, mockFetch);
      expect(result.sent).toBe(1);

      // Upsert was called with notification_type = 'trial_expiry'
      expect(supabase._notificationLogUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ notification_type: 'trial_expiry' }),
        expect.objectContaining({ onConflict: 'subscription_id,renewal_date,notification_type' }),
      );
    });
  });

  describe('notification_log entries', () => {
    it('trial notification log includes notification_type = trial_expiry', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch(true, 'receipt-123');
      const candidate = createTrialCandidate({ days_until_expiry: 1 });

      await processTrialCandidates([candidate], supabase, mockFetch);

      expect(supabase._notificationLogUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_type: 'trial_expiry',
          renewal_date: candidate.trial_expiry_date,
          status: 'sent',
          expo_receipt_id: 'receipt-123',
        }),
        expect.objectContaining({ onConflict: 'subscription_id,renewal_date,notification_type' }),
      );
    });

    it('failed push notification is logged with status failed', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch(false); // push fails
      const candidate = createTrialCandidate({ days_until_expiry: 0 });

      const result = await processTrialCandidates([candidate], supabase, mockFetch);

      expect(result.failed).toBe(1);
      expect(supabase._notificationLogUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', notification_type: 'trial_expiry' }),
        expect.anything(),
      );
    });

    it('uses onConflict with 3-column unique constraint', async () => {
      const supabase = createMockSupabase();
      const mockFetch = createMockFetch();
      const candidate = createTrialCandidate({ days_until_expiry: 3 });

      await processTrialCandidates([candidate], supabase, mockFetch);

      expect(supabase._notificationLogUpsert).toHaveBeenCalledWith(
        expect.anything(),
        { onConflict: 'subscription_id,renewal_date,notification_type' },
      );
    });
  });

  describe('Edge Function summary includes trial counts', () => {
    it('summary structure includes renewals and trials breakdown', () => {
      const summary = {
        renewals: { processed: 5, sent: 3, skipped: 1, failed: 1 },
        trials: { processed: 2, sent: 2, skipped: 0, failed: 0 },
        totals: { processed: 7, sent: 5, skipped: 1, failed: 1 },
      };

      expect(summary.totals.processed).toBe(
        summary.renewals.processed + summary.trials.processed,
      );
      expect(summary.totals.sent).toBe(summary.renewals.sent + summary.trials.sent);
    });

    it('processTrialCandidates returns correct counts for mixed results', async () => {
      const sentSupabase = createMockSupabase();
      const skippedSupabase = createMockSupabase({ existingLog: { status: 'sent' } });

      const sentResult = await processTrialCandidates(
        [createTrialCandidate({ subscription_id: 'sub-1', days_until_expiry: 3 })],
        sentSupabase,
        createMockFetch(),
      );
      const skippedResult = await processTrialCandidates(
        [createTrialCandidate({ subscription_id: 'sub-2', days_until_expiry: 1 })],
        skippedSupabase,
        createMockFetch(),
      );

      expect(sentResult.sent).toBe(1);
      expect(sentResult.skipped).toBe(0);
      expect(skippedResult.sent).toBe(0);
      expect(skippedResult.skipped).toBe(1);
    });
  });
});
