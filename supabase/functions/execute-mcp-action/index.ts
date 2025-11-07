import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteMcpRequest {
  tenant_id: string;
  fq_action: string;
  version?: string;
  payload: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tenant_id, fq_action, version, payload } = await req.json() as ExecuteMcpRequest;

    console.log('[MCP Test] Executing action:', { tenant_id, fq_action, version });

    // 1. Get action from registry
    let query = supabase
      .from('mcp_action_registry')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('fq_action', fq_action)
      .eq('enabled', true);

    if (version) {
      query = query.eq('version', version);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: action, error: actionError } = await query.single();

    if (actionError || !action) {
      throw new Error(`Action not found: ${fq_action}`);
    }

    // 2. Validate payload against input schema
    if (action.input_schema) {
      const required = action.input_schema.required || [];
      for (const field of required) {
        if (!(field in payload)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    // 3. Get tenant integrations to find MCP provider
    const { data: integrations, error: intError } = await supabase
      .from('tenant_integrations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('integration_type', 'mcp')
      .eq('enabled', true);

    if (intError || !integrations || integrations.length === 0) {
      throw new Error('No MCP providers configured for this tenant');
    }

    // Use first available MCP provider (in production, you'd route based on action.app_key)
    const mcpProvider = integrations[0];
    
    if (!mcpProvider.credentials?.api_key || !mcpProvider.config?.base_url) {
      throw new Error('MCP provider not properly configured');
    }

    // 4. Execute action via MCP provider
    const mcpUrl = `${mcpProvider.config.base_url}/api/actions/${fq_action}`;
    
    console.log('[MCP Test] Calling MCP provider:', mcpUrl);

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpProvider.credentials.api_key}`,
      },
      body: JSON.stringify({
        version: action.version,
        payload,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP provider error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    // 5. Log the test execution
    await supabase.from('mcp_action_log').insert({
      tenant_id,
      fq_action,
      version: action.version,
      request_payload: payload,
      response_data: result,
      status: 'success',
      triggered_by: user.id,
      execution_context: 'test_ui',
    });

    console.log('[MCP Test] Success:', { fq_action, result });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        action: {
          fq_action: action.fq_action,
          version: action.version,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[MCP Test] Error:', error);

    // Log failed execution
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const body = await req.json();
      
      await supabase.from('mcp_action_log').insert({
        tenant_id: body.tenant_id,
        fq_action: body.fq_action,
        version: body.version,
        request_payload: body.payload,
        status: 'error',
        error_message: error.message,
        execution_context: 'test_ui',
      });
    } catch (logError) {
      console.error('[MCP Test] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even for errors to allow client to parse response
      }
    );
  }
});
