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

    // 1. Find subscriptions needing reminders today
    const { data: candidates, error: queryError } = await supabase.rpc(
      'get_reminder_candidates',
      { check_date: today }
    )
    if (queryError) throw queryError

    let sent = 0, skipped = 0, failed = 0

    for (const candidate of (candidates ?? []) as ReminderCandidate[]) {
      // 2. Check deduplication — skip only if already successfully sent
      const { data: existing } = await supabase
        .from('notification_log')
        .select('id, status')
        .eq('subscription_id', candidate.subscription_id)
        .eq('renewal_date', candidate.renewal_date)
        .maybeSingle()

      if (existing?.status === 'sent') { skipped++; continue }

      // 3. Get user push tokens
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', candidate.user_id)

      if (!tokens || tokens.length === 0) { skipped++; continue }

      // 4. Send via Expo Push API
      const notifications = tokens.map((t: { token: string }) => ({
        to: t.token,
        title: `📅 ${candidate.subscription_name} renews in ${candidate.remind_days_before} days`,
        body: `${candidate.price} ${candidate.currency} will be charged on ${candidate.renewal_date}`,
        sound: 'default' as const,
        data: { subscription_id: candidate.subscription_id },
      }))

      let success = false
      let lastError = ''

      // Retry logic: up to 3 attempts with exponential backoff for transient failures only
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
            // Capture Expo receipt ID from first ticket
            const tickets = result?.data ?? result
            if (Array.isArray(tickets) && tickets.length > 0 && tickets[0].id) {
              expoReceiptId = tickets[0].id
            }
            break
          }

          lastError = JSON.stringify(result)

          // Only retry on transient failures (5xx); permanent errors (4xx) fail immediately
          if (res.status >= 400 && res.status < 500) {
            break
          }
        } catch (err) {
          lastError = String(err)
        }
        // Exponential backoff: 1s, 2s, 4s
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
        }
      }

      // 5. Log result to notification_log (upsert to allow retry of previously failed notifications)
      await supabase.from('notification_log').upsert(
        {
          user_id: candidate.user_id,
          subscription_id: candidate.subscription_id,
          renewal_date: candidate.renewal_date,
          status: success ? 'sent' : 'failed',
          expo_receipt_id: expoReceiptId,
          error_message: success ? null : lastError,
        },
        { onConflict: 'subscription_id,renewal_date' }
      )

      if (success) sent++
      else failed++
    }

    const summary = { processed: (candidates ?? []).length, sent, skipped, failed }
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
