import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateRequest {
  platform: 'ios' | 'android'
  receipt: string
  userId: string
}

interface ValidationResult {
  valid: boolean
  expiresAt?: string
  planType?: 'monthly' | 'yearly'
}

async function validateAppleReceipt(receipt: string): Promise<ValidationResult> {
  // Apple App Store Server API validation
  // In production, this would call Apple's verifyReceipt endpoint
  // For now, we trust the receipt from StoreKit 2 and extract transaction info
  const appleValidationUrl = Deno.env.get('APPLE_VALIDATION_URL') || 'https://buy.itunes.apple.com/verifyReceipt'
  const appSharedSecret = Deno.env.get('APPLE_SHARED_SECRET')

  if (!appSharedSecret) {
    console.warn('APPLE_SHARED_SECRET not configured — using receipt trust mode')
    // In development/testing, trust the receipt
    return { valid: true, expiresAt: undefined, planType: undefined }
  }

  const response = await fetch(appleValidationUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receipt,
      password: appSharedSecret,
      'exclude-old-transactions': true,
    }),
  })

  const data = await response.json()

  if (data.status !== 0) {
    return { valid: false }
  }

  // Extract latest subscription info
  const latestReceipt = data.latest_receipt_info?.[0]
  if (!latestReceipt) {
    return { valid: false }
  }

  const expiresAt = new Date(parseInt(latestReceipt.expires_date_ms)).toISOString()
  const isExpired = new Date(expiresAt) < new Date()

  if (isExpired) {
    return { valid: false }
  }

  // Determine plan type from product_id
  const planType = latestReceipt.product_id?.includes('yearly') ? 'yearly' : 'monthly'

  return { valid: true, expiresAt, planType }
}

async function validateGoogleReceipt(receipt: string): Promise<ValidationResult> {
  // Google Play Developer API validation
  const googleApiKey = Deno.env.get('GOOGLE_PLAY_API_KEY')

  if (!googleApiKey) {
    console.warn('GOOGLE_PLAY_API_KEY not configured — using receipt trust mode')
    return { valid: true, expiresAt: undefined, planType: undefined }
  }

  // In production, validate with Google Play Developer API
  // using the purchaseToken
  // For now, trust mode for development
  return { valid: true, expiresAt: undefined, planType: undefined }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the calling user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: ValidateRequest = await req.json()
    const { platform, receipt, userId } = body

    if (!platform || !receipt || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: platform, receipt, userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ensure the user can only validate their own purchases
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: userId mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate receipt with the appropriate store
    let result: ValidationResult
    if (platform === 'ios') {
      result = await validateAppleReceipt(receipt)
    } else {
      result = await validateGoogleReceipt(receipt)
    }

    // Admin client for updating user_settings
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    if (result.valid) {
      const { error: updateError } = await supabaseAdmin
        .from('user_settings')
        .update({
          is_premium: true,
          premium_plan_type: result.planType || null,
          premium_expires_at: result.expiresAt || null,
          premium_purchase_token: receipt,
        })
        .eq('user_id', userId)

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Failed to update premium status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        valid: true,
        expiresAt: result.expiresAt || null,
        planType: result.planType || null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      // Invalid or expired receipt — downgrade
      await supabaseAdmin
        .from('user_settings')
        .update({
          is_premium: false,
        })
        .eq('user_id', userId)

      return new Response(JSON.stringify({
        valid: false,
        error: 'Receipt validation failed or subscription expired',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
