import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveCredentialsRequest {
  tenantId: string;
  provider: string;
  credentials: {
    apiKey: string;
    baseUrl?: string;
  };
  config: Record<string, any>;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { action, ...body } = await req.json();

    if (action === 'save') {
      const { tenantId, provider, credentials, config } = body as SaveCredentialsRequest;
      
      console.log(`[AI Credentials] Saving credentials for tenant ${tenantId}, provider ${provider}`);

      // Create secret in Vault
      const secretName = `ai_credentials_${tenantId}_${provider}`;
      const { data: secretData, error: secretError } = await supabaseAdmin
        .rpc('vault_create_secret', {
          secret_name: secretName,
          secret_value: JSON.stringify(credentials),
        });

      if (secretError) {
        console.error('[AI Credentials] Vault create error:', secretError);
        throw new Error(`Failed to store credentials: ${secretError.message}`);
      }

      console.log('[AI Credentials] Vault secret created:', secretData);

      // Upsert tenant_integrations with vault_secret_id
      const { error: integrationError } = await supabaseAdmin
        .from('tenant_integrations')
        .upsert({
          tenant_id: tenantId,
          adapter_id: `ai-${provider}`,
          vault_secret_id: secretData,
          config: config,
          is_active: true,
        }, {
          onConflict: 'tenant_id,adapter_id'
        });

      if (integrationError) {
        console.error('[AI Credentials] Integration upsert error:', integrationError);
        throw new Error(`Failed to save integration: ${integrationError.message}`);
      }

      console.log('[AI Credentials] Integration saved successfully');

      return new Response(
        JSON.stringify({ success: true, secretId: secretData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get') {
      const { tenantId, provider } = body as GetCredentialsRequest;
      
      console.log(`[AI Credentials] Fetching credentials for tenant ${tenantId}, provider ${provider}`);

      // Get integration with vault_secret_id
      const { data: integration, error: integrationError } = await supabaseAdmin
        .from('tenant_integrations')
        .select('vault_secret_id, config')
        .eq('tenant_id', tenantId)
        .eq('adapter_id', `ai-${provider}`)
        .eq('is_active', true)
        .maybeSingle();

      if (integrationError) {
        console.error('[AI Credentials] Integration fetch error:', integrationError);
        throw new Error(`Failed to fetch integration: ${integrationError.message}`);
      }

      if (!integration?.vault_secret_id) {
        return new Response(
          JSON.stringify({ success: true, credentials: null, config: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Read secret from Vault
      const { data: secretValue, error: secretError } = await supabaseAdmin
        .rpc('vault_read_secret', {
          secret_id: integration.vault_secret_id
        });

      if (secretError) {
        console.error('[AI Credentials] Vault read error:', secretError);
        throw new Error(`Failed to read credentials: ${secretError.message}`);
      }

      const credentials = JSON.parse(secretValue);

      return new Response(
        JSON.stringify({ 
          success: true, 
          credentials,
          config: integration.config 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action. Use "save" or "get".');
    }

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
