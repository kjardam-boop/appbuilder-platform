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
    
    // Create separate clients for public and vault schemas
    const supabasePublic = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const supabaseVault = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'vault' },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { action, ...body } = await req.json();

    if (action === 'save') {
      const { tenantId, provider, credentials, config } = body as SaveCredentialsRequest;
      
      console.log(`[AI Credentials] Saving credentials for tenant ${tenantId}, provider ${provider}`);

      // Insert into vault.secrets using vault-scoped client
      const secretName = `ai_credentials_${tenantId}_${provider}`;
      const { data: vaultData, error: vaultError } = await supabaseVault
        .from('secrets')
        .upsert({
          name: secretName,
          secret: JSON.stringify(credentials),
        }, {
          onConflict: 'name'
        })
        .select('id')
        .single();

      if (vaultError) {
        console.error('[AI Credentials] Vault upsert error:', vaultError);
        throw new Error(`Failed to store credentials: ${vaultError.message}`);
      }

      console.log('[AI Credentials] Vault secret created/updated:', vaultData.id);

      // Upsert tenant_integrations with vault_secret_id
      const { error: integrationError } = await supabasePublic
        .from('tenant_integrations')
        .upsert({
          tenant_id: tenantId,
          adapter_id: `ai-${provider}`,
          vault_secret_id: vaultData.id,
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
        JSON.stringify({ success: true, secretId: vaultData.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get') {
      const { tenantId, provider } = body as GetCredentialsRequest;
      
      console.log(`[AI Credentials] Fetching credentials for tenant ${tenantId}, provider ${provider}`);

      // Get integration with vault_secret_id
      const { data: integration, error: integrationError } = await supabasePublic
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

      // Read secret from Vault using vault-scoped client
      const { data: vaultSecret, error: secretError } = await supabaseVault
        .from('secrets')
        .select('decrypted_secret')
        .eq('id', integration.vault_secret_id)
        .single();

      if (secretError) {
        console.error('[AI Credentials] Vault read error:', secretError);
        throw new Error(`Failed to read credentials: ${secretError.message}`);
      }

      const credentials = JSON.parse(vaultSecret.decrypted_secret);

      return new Response(
        JSON.stringify({ 
          success: true, 
          credentials,
          config: integration.config 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'list') {
      console.log('[AI Credentials] Listing all Vault secrets');

      // List all secrets from Vault
      const { data: secrets, error: secretsError } = await supabaseVault
        .from('secrets')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (secretsError) {
        console.error('[AI Credentials] Vault list error:', secretsError);
        throw new Error(`Failed to list secrets: ${secretsError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          secrets: secrets || [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'link') {
      const { tenantId, provider, vaultSecretId, config } = body;
      
      if (!tenantId || !provider || !vaultSecretId) {
        throw new Error('Missing required fields: tenantId, provider, vaultSecretId');
      }

      console.log(`[AI Credentials] Linking secret ${vaultSecretId} to tenant ${tenantId}, provider ${provider}`);

      // Verify secret exists in Vault
      const { data: secretExists, error: verifyError } = await supabaseVault
        .from('secrets')
        .select('id')
        .eq('id', vaultSecretId)
        .single();

      if (verifyError || !secretExists) {
        console.error('[AI Credentials] Secret verification error:', verifyError);
        throw new Error('Vault secret not found');
      }

      // Link secret to tenant integration
      const { error: linkError } = await supabasePublic
        .from('tenant_integrations')
        .upsert({
          tenant_id: tenantId,
          adapter_id: `ai-${provider}`,
          vault_secret_id: vaultSecretId,
          config: config || {},
          is_active: true,
        }, {
          onConflict: 'tenant_id,adapter_id'
        });

      if (linkError) {
        console.error('[AI Credentials] Link error:', linkError);
        throw new Error(`Failed to link secret: ${linkError.message}`);
      }

      console.log('[AI Credentials] Secret linked successfully');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action. Use "save", "get", "list", or "link".');
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
