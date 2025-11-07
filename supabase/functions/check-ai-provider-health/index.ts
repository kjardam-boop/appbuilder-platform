import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Check AI Provider Health
 * Tests connectivity and response time for all configured AI providers
 * Can be called manually or via cron job
 */

const PROVIDERS_TO_CHECK = [
  {
    provider: 'openai',
    testUrl: 'https://api.openai.com/v1/models',
    testMethod: 'GET',
  },
  {
    provider: 'anthropic',
    testUrl: 'https://api.anthropic.com/v1/messages',
    testMethod: 'POST',
    testBody: {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }]
    }
  },
  {
    provider: 'google',
    testUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    testMethod: 'POST',
    testBody: {
      model: 'google/gemini-2.5-flash-lite',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }]
    }
  },
  {
    provider: 'lovable',
    testUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    testMethod: 'POST',
    testBody: {
      model: 'google/gemini-2.5-flash',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }]
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Get all tenant AI configs to know which providers to test
    const { data: tenantConfigs } = await supabaseClient
      .from('tenant_integrations')
      .select('adapter_id, credentials')
      .like('adapter_id', 'ai-%')
      .eq('is_active', true);

    const results = [];

    // Test each provider
    for (const providerConfig of PROVIDERS_TO_CHECK) {
      const startTime = Date.now();
      let status = 'unknown';
      let errorMessage = null;
      let responseTimeMs = null;

      try {
        // Get credentials for this provider type
        const tenantConfig = tenantConfigs?.find(
          c => c.adapter_id === `ai-${providerConfig.provider}`
        );

        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add auth based on provider
        if (providerConfig.provider === 'openai') {
          const apiKey = tenantConfig?.credentials?.apiKey;
          if (!apiKey) continue; // Skip if not configured
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (providerConfig.provider === 'anthropic') {
          const apiKey = tenantConfig?.credentials?.apiKey;
          if (!apiKey) continue;
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else if (providerConfig.provider === 'google' || providerConfig.provider === 'lovable') {
          if (!LOVABLE_API_KEY) continue;
          headers['Authorization'] = `Bearer ${LOVABLE_API_KEY}`;
        }

        const response = await fetch(providerConfig.testUrl, {
          method: providerConfig.testMethod,
          headers,
          body: providerConfig.testBody ? JSON.stringify(providerConfig.testBody) : undefined,
        });

        responseTimeMs = Date.now() - startTime;

        if (response.ok || response.status === 400) {
          // 400 is acceptable for test requests (means auth worked)
          if (responseTimeMs < 2000) {
            status = 'healthy';
          } else if (responseTimeMs < 5000) {
            status = 'degraded';
          } else {
            status = 'down';
            errorMessage = 'Response time too slow';
          }
        } else {
          status = 'down';
          errorMessage = `HTTP ${response.status}`;
        }
      } catch (error) {
        responseTimeMs = Date.now() - startTime;
        status = 'down';
        errorMessage = error instanceof Error ? error.message : 'Connection failed';
      }

      // Insert health check result
      await supabaseClient.from('ai_provider_health').insert({
        provider: providerConfig.provider,
        status,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
        last_check_at: new Date().toISOString(),
      });

      results.push({
        provider: providerConfig.provider,
        status,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        checked_at: new Date().toISOString(),
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
