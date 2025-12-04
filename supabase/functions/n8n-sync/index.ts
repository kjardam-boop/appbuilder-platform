/**
 * n8n Sync Edge Function
 * Handles bi-directional sync between platform and n8n
 * 
 * Actions:
 * - list: Get all workflows from n8n
 * - pull: Get a specific workflow by ID
 * - push: Create a new workflow in n8n
 * - update: Update an existing workflow
 * - activate: Activate/deactivate a workflow
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

async function getN8nConfig(supabase: any, tenantId: string): Promise<N8nConfig | null> {
  console.log('[n8n-sync] Getting config for tenant:', tenantId);
  
  // Priority 1: Check tenant-specific config from tenant_integrations (vault_credentials)
  const { data: tenantConfig, error: tenantError } = await supabase
    .from('tenant_integrations')
    .select('config, credentials')
    .eq('tenant_id', tenantId)
    .eq('adapter_id', 'n8n')
    .eq('is_active', true)
    .maybeSingle();

  console.log('[n8n-sync] tenant_integrations check:', { found: !!tenantConfig, error: tenantError?.message });

  if (tenantConfig?.credentials?.api_key || tenantConfig?.credentials?.N8N_API_KEY) {
    console.log('[n8n-sync] Using tenant_integrations config');
    return {
      baseUrl: tenantConfig.config?.base_url || tenantConfig.config?.n8n_base_url || 'https://jardam.app.n8n.cloud',
      apiKey: tenantConfig.credentials?.api_key || tenantConfig.credentials?.N8N_API_KEY,
    };
  }

  // Priority 2: Platform-level secrets from Supabase Functions Secrets (env vars)
  const envApiKey = Deno.env.get('N8N_API_KEY_APPBUILDER_PLATFORM') || Deno.env.get('N8N_API_KEY');
  console.log('[n8n-sync] env var check:', { 
    hasN8N_API_KEY_APPBUILDER_PLATFORM: !!Deno.env.get('N8N_API_KEY_APPBUILDER_PLATFORM'),
    hasN8N_API_KEY: !!Deno.env.get('N8N_API_KEY'),
    envApiKeyLength: envApiKey?.length || 0
  });
  
  if (envApiKey) {
    console.log('[n8n-sync] Using platform env var config');
    return {
      baseUrl: Deno.env.get('N8N_BASE_URL') || 'https://jardam.app.n8n.cloud',
      apiKey: envApiKey,
    };
  }

  console.log('[n8n-sync] No n8n config found!');
  return null;
}

async function n8nApiCall(
  config: N8nConfig,
  method: string,
  endpoint: string,
  body?: any
): Promise<{ data?: any; error?: string; status: number }> {
  const url = `${config.baseUrl}/api/v1${endpoint}`;
  
  console.log(`[n8n-sync] ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      console.error(`[n8n-sync] API error ${response.status}:`, data);
      return { error: data.message || `n8n API error: ${response.status}`, status: response.status };
    }

    return { data, status: response.status };
  } catch (err) {
    console.error(`[n8n-sync] Fetch error:`, err);
    return { error: err.message, status: 500 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, tenantId, workflowId, workflow } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenantId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get n8n config
    const n8nConfig = await getN8nConfig(supabase, tenantId);
    if (!n8nConfig) {
      // Detailed error info for debugging
      const debugInfo = {
        tenantId,
        envVars: {
          hasN8N_API_KEY_APPBUILDER_PLATFORM: !!Deno.env.get('N8N_API_KEY_APPBUILDER_PLATFORM'),
          hasN8N_API_KEY: !!Deno.env.get('N8N_API_KEY'),
          hasSUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
        }
      };
      console.error('[n8n-sync] No config found. Debug info:', debugInfo);
      
      return new Response(
        JSON.stringify({ 
          error: "n8n not configured. Check Supabase Secrets for N8N_API_KEY_APPBUILDER_PLATFORM.",
          debug: debugInfo
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case 'list': {
        // List all workflows
        result = await n8nApiCall(n8nConfig, 'GET', '/workflows');
        if (result.error) {
          return new Response(
            JSON.stringify({ error: result.error }),
            { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ workflows: result.data?.data || result.data || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'pull': {
        // Get specific workflow
        if (!workflowId) {
          return new Response(
            JSON.stringify({ error: "workflowId is required for pull action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await n8nApiCall(n8nConfig, 'GET', `/workflows/${workflowId}`);
        if (result.error) {
          return new Response(
            JSON.stringify({ error: result.error }),
            { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ workflow: result.data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'push': {
        // Create new workflow
        if (!workflow) {
          return new Response(
            JSON.stringify({ error: "workflow is required for push action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await n8nApiCall(n8nConfig, 'POST', '/workflows', workflow);
        if (result.error) {
          return new Response(
            JSON.stringify({ error: result.error }),
            { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ workflow: result.data, success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'update': {
        // Update existing workflow
        if (!workflowId || !workflow) {
          return new Response(
            JSON.stringify({ error: "workflowId and workflow are required for update action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await n8nApiCall(n8nConfig, 'PUT', `/workflows/${workflowId}`, workflow);
        if (result.error) {
          return new Response(
            JSON.stringify({ error: result.error }),
            { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ workflow: result.data, success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'activate': {
        // Activate/deactivate workflow
        if (!workflowId) {
          return new Response(
            JSON.stringify({ error: "workflowId is required for activate action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const activate = workflow?.active !== false;
        result = await n8nApiCall(
          n8nConfig, 
          'POST', 
          `/workflows/${workflowId}/${activate ? 'activate' : 'deactivate'}`
        );
        if (result.error) {
          return new Response(
            JSON.stringify({ error: result.error }),
            { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ workflow: result.data, success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: list, pull, push, update, activate` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("[n8n-sync] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

