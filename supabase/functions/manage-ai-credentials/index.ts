import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkSecretRequest {
  tenantId: string;
  provider: string;
  secretName: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxCompletionTokens?: number;
}

interface GetCredentialsRequest {
  tenantId: string;
  provider: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...body } = await req.json();
    console.log('[AI Credentials] Action:', action);

    if (action === 'link') {
      const { 
        tenantId, 
        provider, 
        secretName,
        model,
        temperature,
        maxTokens,
        maxCompletionTokens
      } = body as LinkSecretRequest;

      console.log(`[AI Credentials] Linking secret "${secretName}" to tenant ${tenantId}, provider ${provider}`);

      const config = {
        provider,
        model,
        temperature,
        maxTokens,
        maxCompletionTokens,
      };

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.76.1');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Store only the secret name in credentials - the actual value is in Supabase Environment Secrets
      const { error: integrationError } = await supabase
        .from('tenant_integrations')
        .upsert({
          tenant_id: tenantId,
          adapter_id: `ai-${provider}`,
          config,
          credentials: {
            secretName, // Only store the name, not the value
          },
          is_active: true,
        }, {
          onConflict: 'tenant_id,adapter_id'
        });

      if (integrationError) {
        console.error('[AI Credentials] Error saving to tenant_integrations:', integrationError);
        throw new Error(`Failed to link secret: ${integrationError.message}`);
      }

      console.log('[AI Credentials] Secret linked successfully');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get') {
      const { tenantId, provider } = body as GetCredentialsRequest;

      console.log(`[AI Credentials] Fetching credentials for tenant ${tenantId}, provider ${provider}`);

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.76.1');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: integration, error: integrationError } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('adapter_id', `ai-${provider}`)
        .maybeSingle();

      if (integrationError) {
        console.error('[AI Credentials] Error fetching integration:', integrationError);
        throw new Error(`Failed to fetch integration: ${integrationError.message}`);
      }

      if (!integration) {
        return new Response(
          JSON.stringify({ success: false, error: 'No credentials found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const secretName = integration.credentials?.secretName;
      if (!secretName) {
        return new Response(
          JSON.stringify({ success: false, error: 'No secret linked' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Read actual secret value from Supabase Environment Secrets
      const apiKey = Deno.env.get(secretName);
      
      return new Response(
        JSON.stringify({
          success: true,
          credentials: {
            apiKey,
            secretName,
          },
          config: integration.config,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use "link" or "get".');

  } catch (error) {
    console.error('[AI Credentials] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
