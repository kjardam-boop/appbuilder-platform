/**
 * n8n MCP Test Edge Function
 * Tests MCP connection using stored vault credentials
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { credentialId, tenantId } = await req.json();

    if (!credentialId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'credentialId and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the credential from vault_credentials
    const { data: credential, error: credError } = await supabase
      .from('vault_credentials')
      .select('name, encrypted_value, description')
      .eq('id', credentialId)
      .eq('tenant_id', tenantId)
      .single();

    if (credError || !credential) {
      console.error('[n8n-mcp-test] Credential not found:', credError);
      return new Response(
        JSON.stringify({ error: 'Credential not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[n8n-mcp-test] Found credential:', credential.name);

    // Parse the secret (should be JSON with server_url and access_token)
    let mcpConfig: { server_url: string; access_token: string };
    try {
      mcpConfig = JSON.parse(credential.encrypted_value);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid MCP credential format. Expected JSON with server_url and access_token.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mcpConfig.server_url || !mcpConfig.access_token) {
      return new Response(
        JSON.stringify({ error: 'MCP credential missing server_url or access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[n8n-mcp-test] Testing MCP connection to:', mcpConfig.server_url);

    // Test the MCP connection by calling the server
    // MCP uses JSON-RPC 2.0 format with specific Accept headers
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };

    const mcpResponse = await fetch(mcpConfig.server_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${mcpConfig.access_token}`,
      },
      body: JSON.stringify(mcpRequest),
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.error('[n8n-mcp-test] MCP request failed:', mcpResponse.status, errorText);
      
      // Update test status to failed
      await supabase
        .from('vault_credentials')
        .update({ 
          test_status: 'failed',
          last_tested_at: new Date().toISOString(),
        })
        .eq('id', credentialId);

      return new Response(
        JSON.stringify({ 
          error: `MCP server responded with ${mcpResponse.status}: ${errorText}`,
          success: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mcpData = await mcpResponse.json();
    console.log('[n8n-mcp-test] MCP response:', JSON.stringify(mcpData).slice(0, 200));

    // Count MCP-enabled workflows (tools in MCP terminology)
    const tools = mcpData?.result?.tools || [];
    const mcpWorkflowCount = tools.length;

    // Update test status to success
    await supabase
      .from('vault_credentials')
      .update({ 
        test_status: 'success',
        last_tested_at: new Date().toISOString(),
      })
      .eq('id', credentialId);

    return new Response(
      JSON.stringify({
        success: true,
        mcp_workflows: mcpWorkflowCount,
        tools: tools.map((t: any) => ({ name: t.name, description: t.description })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[n8n-mcp-test] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

