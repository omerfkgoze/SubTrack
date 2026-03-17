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

interface TrialExpiryCandidate {
  subscription_id: string
  subscription_name: string
  price: number
  currency: string
  trial_expiry_date: string
  user_id: string
  days_until_expiry: number
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
  subscriptionId: string,
  expoAccessToken: string | undefined,
): Promise<{ success: boolean; lastError: string; expoReceiptId: string | null }> {
  const notifications = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    sound: 'default' as const,
    data: { subscription_id: subscriptionId },
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

    const summary = {
      renewals: { processed: (candidates ?? []).length, sent, skipped, failed },
      trials: { processed: (trialCandidates ?? []).length, sent: trialSent, skipped: trialSkipped, failed: trialFailed },
      totals: {
        processed: (candidates ?? []).length + (trialCandidates ?? []).length,
        sent: sent + trialSent,
        skipped: skipped + trialSkipped,
        failed: failed + trialFailed,
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
