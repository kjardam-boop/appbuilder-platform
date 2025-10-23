import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import adapter logic (simplified for edge function)
const ADAPTERS: Record<string, any> = {
  brreg: {
    async invoke(action: string, payload: any, config: any) {
      const baseUrl = config.baseUrl || "https://data.brreg.no/enhetsregisteret/api";
      
      switch (action) {
        case "lookup":
          const response = await fetch(`${baseUrl}/enheter/${payload.orgNumber}`);
          if (!response.ok) throw new Error(`Brreg API error: ${response.statusText}`);
          return await response.json();
          
        case "search":
          const searchUrl = new URL(`${baseUrl}/enheter`);
          searchUrl.searchParams.set("navn", payload.query);
          if (payload.size) searchUrl.searchParams.set("size", payload.size.toString());
          
          const searchResponse = await fetch(searchUrl.toString());
          if (!searchResponse.ok) throw new Error(`Brreg API error: ${searchResponse.statusText}`);
          return await searchResponse.json();
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract adapter and action from path: /integrations-invoke/{adapter}/{action}
    const adapter = pathParts[pathParts.length - 2];
    const action = pathParts[pathParts.length - 1];

    if (!adapter || !action) {
      throw new Error('Adapter and action are required in URL path');
    }

    const { payload } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = user.user_metadata?.tenant_id || 'default';

    console.log(`[Integration] Invoking ${adapter}.${action} for tenant ${tenantId}`);

    // Get tenant integration config
    const { data: integration, error: configError } = await supabase
      .from('tenant_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('adapter_id', adapter)
      .eq('is_active', true)
      .single();

    if (configError || !integration) {
      return new Response(
        JSON.stringify({ error: `Integration ${adapter} not configured for this tenant` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const rateLimit = integration.rate_limit as any;
    if (rateLimit) {
      const now = new Date();
      const currentMinute = now.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
      
      let currentCount = rateLimit.current_minute_count || 0;
      const lastReset = rateLimit.last_reset_minute;
      
      if (lastReset !== currentMinute) {
        currentCount = 0;
      }
      
      if (currentCount >= (rateLimit.requests_per_minute || 60)) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update rate limit counter
      await supabase
        .from('tenant_integrations')
        .update({
          rate_limit: {
            ...rateLimit,
            current_minute_count: currentCount + 1,
            last_reset_minute: currentMinute,
          },
          last_used_at: now.toISOString(),
        })
        .eq('id', integration.id);
    }

    // Invoke adapter
    const startTime = Date.now();
    let result;
    let status = 200;
    let errorMessage = null;

    try {
      const adapterImpl = ADAPTERS[adapter];
      if (!adapterImpl) {
        throw new Error(`Unknown adapter: ${adapter}`);
      }

      result = await adapterImpl.invoke(action, payload, integration.config);
    } catch (error) {
      status = 500;
      errorMessage = (error as Error).message;
      result = { error: errorMessage };
    }

    const responseTime = Date.now() - startTime;

    // Log usage
    await supabase.from('integration_usage_logs').insert({
      tenant_id: tenantId,
      adapter_id: adapter,
      action,
      request_payload: payload,
      response_status: status,
      response_time_ms: responseTime,
      error_message: errorMessage,
      user_id: user.id,
    });

    return new Response(
      JSON.stringify(result),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error invoking integration:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
