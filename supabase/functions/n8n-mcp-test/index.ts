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
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[n8n-mcp-test] Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { credentialId, tenantId } = body;
    console.log('[n8n-mcp-test] Request:', { credentialId, tenantId });

    if (!credentialId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'credentialId and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[n8n-mcp-test] Supabase config:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseServiceKey 
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch credential from decrypted view (auto-decrypts pgcrypto values)
    console.log('[n8n-mcp-test] Fetching credential from database...');
    let credential;
    try {
      // Try decrypted view first (for encrypted values)
      let { data, error: credError } = await supabase
        .from('vault_credentials_decrypted')
        .select('name, decrypted_value, description')
        .eq('id', credentialId)
        .eq('tenant_id', tenantId)
        .single();

      // Fallback to regular table if view doesn't exist yet
      if (credError?.code === '42P01') {
        console.log('[n8n-mcp-test] Decrypted view not found, using direct table');
        const result = await supabase
          .from('vault_credentials')
          .select('name, encrypted_value, description')
          .eq('id', credentialId)
          .eq('tenant_id', tenantId)
          .single();
        
        data = result.data ? {
          ...result.data,
          decrypted_value: result.data.encrypted_value
        } : null;
        credError = result.error;
      }

      if (credError) {
        console.error('[n8n-mcp-test] Database error:', credError);
        return new Response(
          JSON.stringify({ error: `Database error: ${credError.message}`, code: credError.code }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data) {
        console.error('[n8n-mcp-test] Credential not found');
        return new Response(
          JSON.stringify({ error: 'Credential not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      credential = data;
    } catch (dbErr) {
      console.error('[n8n-mcp-test] Database exception:', dbErr);
      return new Response(
        JSON.stringify({ error: `Database exception: ${dbErr}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[n8n-mcp-test] Found credential:', credential.name);

    // Get the decrypted value
    const secretValue = credential.decrypted_value;
    console.log('[n8n-mcp-test] Secret value length:', secretValue?.length || 0);

    // Parse the secret (should be JSON with server_url and access_token)
    let mcpConfig: { server_url: string; access_token: string };
    try {
      mcpConfig = JSON.parse(secretValue);
      console.log('[n8n-mcp-test] Parsed config, has server_url:', !!mcpConfig.server_url);
    } catch (parseErr) {
      console.error('[n8n-mcp-test] JSON parse error:', parseErr);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid MCP credential format. Expected JSON with server_url and access_token.',
          raw_value_preview: secretValue?.substring(0, 50),
        }),
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

    // MCP can return either JSON or SSE stream - handle both
    const contentType = mcpResponse.headers.get('content-type') || '';
    console.log('[n8n-mcp-test] Response content-type:', contentType);

    let mcpData: any;
    
    if (contentType.includes('text/event-stream')) {
      // Parse SSE response
      const sseText = await mcpResponse.text();
      console.log('[n8n-mcp-test] SSE response preview:', sseText.substring(0, 200));
      
      // Extract JSON from SSE format (event: message\ndata: {...}\n\n)
      const dataMatch = sseText.match(/data:\s*(\{[\s\S]*?\})\n/);
      if (dataMatch && dataMatch[1]) {
        try {
          mcpData = JSON.parse(dataMatch[1]);
        } catch {
          // Try to find any JSON object in the response
          const jsonMatch = sseText.match(/\{[\s\S]*"result"[\s\S]*\}/);
          if (jsonMatch) {
            mcpData = JSON.parse(jsonMatch[0]);
          }
        }
      }
      
      if (!mcpData) {
        console.log('[n8n-mcp-test] Could not parse SSE, but connection works!');
        // Connection works even if we can't parse the response
        mcpData = { result: { tools: [] } };
      }
    } else {
      // Regular JSON response
      mcpData = await mcpResponse.json();
    }

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
    console.error('[n8n-mcp-test] Unhandled error:', error);
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

