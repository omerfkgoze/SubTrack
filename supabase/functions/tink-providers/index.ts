import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getClientCredentialsToken, mapProviderToSupportedBank } from './utils.ts';
import type { TinkProvider } from './utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_HOURS = 24;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tinkClientId = Deno.env.get('TINK_CLIENT_ID');
    const tinkClientSecret = Deno.env.get('TINK_CLIENT_SECRET');

    if (!tinkClientId || !tinkClientSecret) {
      console.error('TINK_CLIENT_ID or TINK_CLIENT_SECRET not configured');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    // Verify the calling user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Parse request body for optional market filter
    let market = 'ALL';
    try {
      const body = await req.json();
      if (body?.market && body.market !== 'ALL') {
        market = body.market;
      }
    } catch {
      // No body or invalid JSON — use default market
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check cache
    const { data: cached } = await supabaseAdmin
      .from('provider_cache')
      .select('data, cached_at')
      .eq('market', market)
      .maybeSingle();

    const isCacheFresh =
      cached?.cached_at &&
      Date.now() - new Date(cached.cached_at).getTime() < CACHE_TTL_HOURS * 60 * 60 * 1000;

    if (cached && isCacheFresh) {
      console.log(`Cache hit for market: ${market}`);
      return jsonResponse({ providers: cached.data });
    }

    // Fetch from Tink API
    try {
      console.log('Requesting client credentials token...');
      const accessToken = await getClientCredentialsToken(
        tinkClientId,
        tinkClientSecret,
        'providers:read',
      );
      console.log('Client credentials token obtained');

      // Tink providers endpoint requires a market code — no "get all" endpoint exists.
      // When market is 'ALL', fetch from key EU markets and merge results.
      const DEFAULT_MARKETS = ['SE', 'DE', 'GB', 'FR', 'NL', 'FI', 'NO', 'DK', 'ES', 'IT'];
      const marketsToFetch = market !== 'ALL' ? [market] : DEFAULT_MARKETS;

      let allProviders: TinkProvider[] = [];

      for (const m of marketsToFetch) {
        // Include test providers in sandbox so we get demo banks for development
        const tinkUrl = `https://api.tink.com/api/v1/providers/${m}?capability=CHECKING_ACCOUNTS&includeTestProviders=true`; // TODO: revert includeTestProviders to false for production once we have real providers in all markets
        console.log(`Fetching providers for market: ${m}`);

        const tinkResponse = await fetch(tinkUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!tinkResponse.ok) {
          const errorBody = await tinkResponse.text();
          console.error(`Tink providers API failed for ${m}: ${tinkResponse.status}`, errorBody);
          // Skip this market but continue with others
          continue;
        }

        const tinkData = await tinkResponse.json();
        const marketProviders: TinkProvider[] = tinkData.providers ?? tinkData;
        allProviders = allProviders.concat(Array.isArray(marketProviders) ? marketProviders : []);
      }

      if (allProviders.length === 0 && market !== 'ALL') {
        throw new Error(`Tink providers API returned no data for market: ${market}`);
      }

      const providers = allProviders;

      // Filter enabled providers and map to lean shape
      const supportedBanks = providers
        .filter((p: TinkProvider) => p.status !== 'DISABLED')
        .map(mapProviderToSupportedBank);

      // Upsert cache
      await supabaseAdmin
        .from('provider_cache')
        .upsert(
          { market, data: supportedBanks, cached_at: new Date().toISOString() },
          { onConflict: 'market' },
        );

      console.log(`Fetched ${supportedBanks.length} providers for market: ${market}`);
      return jsonResponse({ providers: supportedBanks });
    } catch (tinkError) {
      // Tink API failed — return stale cache if available
      if (cached?.data) {
        console.warn('Tink API failed, returning stale cache:', tinkError);
        return jsonResponse({ providers: cached.data });
      }

      // No cache at all — return 503
      console.error('Tink API failed and no cache available:', tinkError);
      return jsonResponse(
        { error: "Couldn't load supported banks. Please check your connection and try again." },
        503,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('tink-providers error:', message);
    return jsonResponse(
      { error: "Couldn't load supported banks. Please check your connection and try again." },
      500,
    );
  }
});
