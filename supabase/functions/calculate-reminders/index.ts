import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderCandidate {
  subscription_id: string
  subscription_name: string
  price: number
  currency: string
  renewal_date: string
  user_id: string
  remind_days_before: number
}

interface BankExpiryCandidate {
  bank_connection_id: string
  bank_name: string
  consent_expires_at: string
  user_id: string
  days_until_expiry: number
  connection_status: string
}

interface TrialExpiryCandidate {
  subscription_id: string
  subscription_name: string
  price: number
  currency: string
  trial_expiry_date: string
  user_id: string
  days_until_expiry: number
}

// NOTE: This function is duplicated in src/features/notifications/services/bankExpiryNotifications.test.ts
// If you change the logic here, update the test copy as well.
function formatBankExpiryNotification(candidate: BankExpiryCandidate) {
  const { bank_name, days_until_expiry } = candidate

  if (days_until_expiry <= 0) {
    return {
      title: `🔗 Your ${bank_name} connection has expired`,
      body: 'Reconnect now to keep auto-detection active.',
    }
  }
  return {
    title: `🔗 Your ${bank_name} connection expires in ${days_until_expiry} day${days_until_expiry === 1 ? '' : 's'}`,
    body: 'Reconnect to keep auto-detection active.',
  }
}

// NOTE: This function is duplicated in src/features/notifications/services/trialExpiryNotifications.test.ts
// If you change the logic here, update the test copy as well.
function formatTrialNotification(candidate: TrialExpiryCandidate) {
  const { subscription_name, price, currency, days_until_expiry } = candidate

  if (days_until_expiry === 0) {
    return {
      title: `🚨 Last day: ${subscription_name} trial expires today`,
      body: `Cancel now to avoid being charged ${price} ${currency}`,
    }
  }
  if (days_until_expiry === 1) {
    return {
      title: `⚠️ Tomorrow: ${subscription_name} trial expires`,
      body: `${price} ${currency} will be charged if not cancelled`,
    }
  }
  // days_until_expiry === 3
  return {
    title: `⚠️ ${subscription_name} trial expires in 3 days`,
    body: `Cancel before ${candidate.trial_expiry_date} to avoid ${price} ${currency} charge`,
  }
}

async function sendPushNotification(
  tokens: { token: string }[],
  title: string,
  body: string,
  entityId: string,
  expoAccessToken: string | undefined,
  dataKey: string = 'subscription_id',
): Promise<{ success: boolean; lastError: string; expoReceiptId: string | null }> {
  const notifications = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    sound: 'default' as const,
    data: { [dataKey]: entityId },
  }))

  let success = false
  let lastError = ''
  let expoReceiptId: string | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (expoAccessToken) {
        headers['Authorization'] = `Bearer ${expoAccessToken}`
      }

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(notifications),
      })
      const result = await res.json()

      if (res.ok) {
        success = true
        const tickets = result?.data ?? result
        if (Array.isArray(tickets) && tickets.length > 0 && tickets[0].id) {
          expoReceiptId = tickets[0].id
        }
        break
      }

      lastError = JSON.stringify(result)

      if (res.status >= 400 && res.status < 500) {
        break
      }
    } catch (err) {
      lastError = String(err)
    }
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }
  }

  return { success, lastError, expoReceiptId }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const today = new Date().toISOString().split('T')[0]

    // ========================================
    // 1. Process RENEWAL reminders
    // ========================================
    const { data: candidates, error: queryError } = await supabase.rpc(
      'get_reminder_candidates',
      { check_date: today }
    )
    if (queryError) throw queryError

    let sent = 0, skipped = 0, failed = 0

    for (const candidate of (candidates ?? []) as ReminderCandidate[]) {
      // Deduplication — include notification_type for correctness with new constraint
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id, status')
        .eq('subscription_id', candidate.subscription_id)
        .eq('renewal_date', candidate.renewal_date)
        .eq('notification_type', 'renewal')
        .maybeSingle()

      if (existing?.status === 'sent') { skipped++; continue }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', candidate.user_id)

      if (!tokens || tokens.length === 0) { skipped++; continue }

      const title = `📅 ${candidate.subscription_name} renews in ${candidate.remind_days_before} days`
      const body = `${candidate.price} ${candidate.currency} will be charged on ${candidate.renewal_date}`

      const result = await sendPushNotification(tokens, title, body, candidate.subscription_id, expoAccessToken)

      await supabase.from('notification_log').upsert(
        {
          user_id: candidate.user_id,
          subscription_id: candidate.subscription_id,
          renewal_date: candidate.renewal_date,
          notification_type: 'renewal',
          status: result.success ? 'sent' : 'failed',
          expo_receipt_id: result.expoReceiptId,
          error_message: result.success ? null : result.lastError,
        },
        { onConflict: 'subscription_id,renewal_date,notification_type' }
      )

      if (result.success) sent++
      else failed++
    }

    // ========================================
    // 2. Process TRIAL EXPIRY notifications
    // ========================================
    const { data: trialCandidates, error: trialError } = await supabase.rpc(
      'get_trial_expiry_candidates',
      { check_date: today }
    )
    if (trialError) throw trialError

    let trialSent = 0, trialSkipped = 0, trialFailed = 0

    for (const candidate of (trialCandidates ?? []) as TrialExpiryCandidate[]) {
      // Deduplication — check for existing trial_expiry notification
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id, status')
        .eq('subscription_id', candidate.subscription_id)
        .eq('renewal_date', candidate.trial_expiry_date)
        .eq('notification_type', 'trial_expiry')
        .maybeSingle()

      if (existing?.status === 'sent') { trialSkipped++; continue }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', candidate.user_id)

      if (!tokens || tokens.length === 0) { trialSkipped++; continue }

      const { title, body } = formatTrialNotification(candidate)

      const result = await sendPushNotification(tokens, title, body, candidate.subscription_id, expoAccessToken)

      await supabase.from('notification_log').upsert(
        {
          user_id: candidate.user_id,
          subscription_id: candidate.subscription_id,
          renewal_date: candidate.trial_expiry_date,
          notification_type: 'trial_expiry',
          status: result.success ? 'sent' : 'failed',
          expo_receipt_id: result.expoReceiptId,
          error_message: result.success ? null : result.lastError,
        },
        { onConflict: 'subscription_id,renewal_date,notification_type' }
      )

      if (result.success) trialSent++
      else trialFailed++
    }

    // ========================================
    // 3. Process BANK CONNECTION EXPIRY notifications
    // ========================================
    const { data: bankCandidates, error: bankError } = await supabase.rpc(
      'get_bank_expiry_candidates',
      { check_date: today }
    )
    if (bankError) throw bankError

    let bankSent = 0, bankSkipped = 0, bankFailed = 0

    for (const candidate of (bankCandidates ?? []) as BankExpiryCandidate[]) {
      // Deduplication — one notification per day per connection
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id, status')
        .eq('bank_connection_id', candidate.bank_connection_id)
        .eq('renewal_date', today)
        .eq('notification_type', 'bank_expiry')
        .maybeSingle()

      if (existing?.status === 'sent') { bankSkipped++; continue }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', candidate.user_id)

      if (!tokens || tokens.length === 0) { bankSkipped++; continue }

      const { title, body } = formatBankExpiryNotification(candidate)

      const result = await sendPushNotification(tokens, title, body, candidate.bank_connection_id, expoAccessToken, 'bank_connection_id')

      await supabase.from('notification_log').upsert(
        {
          user_id: candidate.user_id,
          bank_connection_id: candidate.bank_connection_id,
          renewal_date: today,
          notification_type: 'bank_expiry',
          status: result.success ? 'sent' : 'failed',
          expo_receipt_id: result.expoReceiptId,
          error_message: result.success ? null : result.lastError,
        },
        { onConflict: 'bank_connection_id,renewal_date,notification_type' }
      )

      // Update connection status based on expiry
      if (candidate.days_until_expiry <= 0 && candidate.connection_status !== 'expired') {
        await supabase
          .from('bank_connections')
          .update({ status: 'expired' })
          .eq('id', candidate.bank_connection_id)
      } else if (candidate.days_until_expiry > 0 && candidate.connection_status === 'active') {
        await supabase
          .from('bank_connections')
          .update({ status: 'expiring_soon' })
          .eq('id', candidate.bank_connection_id)
      }

      if (result.success) bankSent++
      else bankFailed++
    }

    // ========================================
    // 3b. Process BANK CONNECTION ERROR notifications
    // ========================================
    const { data: errorConnections } = await supabase
      .from('bank_connections')
      .select('id, bank_name, user_id, status')
      .eq('status', 'error')

    for (const conn of (errorConnections ?? [])) {
      // Dedup: one error notification per day per connection
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id, status')
        .eq('bank_connection_id', conn.id)
        .eq('renewal_date', today)
        .eq('notification_type', 'bank_expiry')
        .maybeSingle()

      if (existing?.status === 'sent') { bankSkipped++; continue }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', conn.user_id)

      if (!tokens || tokens.length === 0) { bankSkipped++; continue }

      const title = `⚠️ Issue with your ${conn.bank_name} connection`
      const body = 'Check your bank connection settings.'

      const result = await sendPushNotification(tokens, title, body, conn.id, expoAccessToken, 'bank_connection_id')

      await supabase.from('notification_log').upsert(
        {
          user_id: conn.user_id,
          bank_connection_id: conn.id,
          renewal_date: today,
          notification_type: 'bank_expiry',
          status: result.success ? 'sent' : 'failed',
          expo_receipt_id: result.expoReceiptId,
          error_message: result.success ? null : result.lastError,
        },
        { onConflict: 'bank_connection_id,renewal_date,notification_type' }
      )

      if (result.success) bankSent++
      else bankFailed++
    }

    const summary = {
      renewals: { processed: (candidates ?? []).length, sent, skipped, failed },
      trials: { processed: (trialCandidates ?? []).length, sent: trialSent, skipped: trialSkipped, failed: trialFailed },
      bankExpiry: { processed: (bankCandidates ?? []).length + (errorConnections ?? []).length, sent: bankSent, skipped: bankSkipped, failed: bankFailed },
      totals: {
        processed: (candidates ?? []).length + (trialCandidates ?? []).length + (bankCandidates ?? []).length + (errorConnections ?? []).length,
        sent: sent + trialSent + bankSent,
        skipped: skipped + trialSkipped + bankSkipped,
        failed: failed + trialFailed + bankFailed,
      },
    }
    console.log('calculate-reminders result:', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('calculate-reminders error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
