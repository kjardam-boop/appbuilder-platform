import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Get user's tenant
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('scope_id, role')
      .eq('user_id', user.id)
      .eq('scope_type', 'tenant')
      .single();

    if (!userRole || !['tenant_owner', 'tenant_admin'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = userRole.scope_id;

    // GET /integration-graph - Build and return graph
    if (req.method === 'GET' && path.endsWith('/integration-graph')) {
      const includeRecs = url.searchParams.get('includeRecommendations') === 'true';

      console.log('[integration-graph] Building graph for tenant:', tenantId);

      // Build graph data
      const graph = await buildGraph(supabase, tenantId, { includeRecommendations: includeRecs });

      // Log event
      console.log('[integration-graph] Generated:', {
        tenant_id: tenantId,
        request_id: requestId,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        stats: graph.stats,
      });

      return new Response(
        JSON.stringify({ ok: true, data: graph }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          } 
        }
      );
    }

    // GET /integration-graph/export - Export as JSON
    if (req.method === 'GET' && path.includes('/export')) {
      const includeRecs = url.searchParams.get('includeRecommendations') === 'true';
      const graph = await buildGraph(supabase, tenantId, { includeRecommendations: includeRecs });

      return new Response(
        JSON.stringify(graph, null, 2),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="integration-graph-${tenantId}-${Date.now()}.json"`,
            'X-Request-Id': requestId,
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[integration-graph] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message,
        requestId,
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        } 
      }
    );
  }
});

// Build graph helper
async function buildGraph(supabase: any, tenantId: string, options: { includeRecommendations?: boolean }) {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Get apps
  const { data: apps } = await supabase
    .from('applications')
    .select('id, app_definition:app_definitions(key, name)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Get systems
  const { data: systems } = await supabase
    .from('tenant_external_systems')
    .select(`
      id,
      app_product_id,
      mcp_enabled,
      configuration_state,
      product:app_products(id, name, slug, vendor:app_vendors(name, slug))
    `)
    .eq('tenant_id', tenantId);

  // Get workflows
  const { data: workflows } = await supabase
    .from('integration_run')
    .select('workflow_key, provider, status')
    .eq('tenant_id', tenantId)
    .limit(100);

  const nodeMap = new Map();
  const providerSet = new Set();
  const systemSet = new Set();

  // Add APP nodes
  for (const app of apps || []) {
    const appKey = app.app_definition?.key;
    if (!appKey) continue;

    const nodeId = `APP:${appKey}`;
    nodeMap.set(nodeId, {
      id: nodeId,
      label: app.app_definition?.name || appKey,
      type: 'app',
      status: 'ok',
      metadata: { id: app.id },
    });
  }

  // Add SYSTEM nodes
  for (const system of systems || []) {
    const product = system.product;
    const slug = product?.slug;
    if (!slug) continue;

    const nodeId = `SYSTEM:${slug}`;
    systemSet.add(slug);
    
    nodeMap.set(nodeId, {
      id: nodeId,
      label: product.name || slug,
      type: 'system',
      status: system.configuration_state === 'active' ? 'ok' : 'idle',
      badges: system.mcp_enabled ? ['MCP'] : [],
      metadata: {
        id: system.id,
        productId: system.app_product_id,
        state: system.configuration_state,
      },
    });

    // Add PROVIDER node
    const vendorSlug = product.vendor?.slug;
    if (vendorSlug) {
      providerSet.add(vendorSlug);
      
      const providerNodeId = `PROVIDER:${vendorSlug}`;
      if (!nodeMap.has(providerNodeId)) {
        nodeMap.set(providerNodeId, {
          id: providerNodeId,
          label: product.vendor.name || vendorSlug,
          type: 'provider',
          status: 'ok',
        });
      }

      edges.push({
        id: `${nodeId}->${providerNodeId}`,
        from: nodeId,
        to: providerNodeId,
        type: 'provider',
        status: 'ok',
      });
    }

    // Edge: APP → SYSTEM
    if (apps && apps.length > 0) {
      const firstApp = apps[0].app_definition?.key;
      if (firstApp) {
        edges.push({
          id: `APP:${firstApp}->${nodeId}`,
          from: `APP:${firstApp}`,
          to: nodeId,
          type: 'activation',
          status: system.configuration_state === 'active' ? 'ok' : 'degraded',
        });
      }
    }
  }

  // Add WORKFLOW nodes
  const workflowMap = new Map();
  for (const wf of workflows || []) {
    const nodeId = `WORKFLOW:${wf.workflow_key}`;
    
    if (!workflowMap.has(wf.workflow_key)) {
      workflowMap.set(wf.workflow_key, wf);
      
      nodeMap.set(nodeId, {
        id: nodeId,
        label: wf.workflow_key,
        type: 'workflow',
        status: wf.status === 'success' ? 'ok' : 'risk',
        badges: [wf.provider],
      });

      // Connect to systems
      let connected = false;
      for (const systemSlug of systemSet) {
        if (wf.workflow_key.toLowerCase().includes(systemSlug)) {
          edges.push({
            id: `${nodeId}->SYSTEM:${systemSlug}`,
            from: nodeId,
            to: `SYSTEM:${systemSlug}`,
            type: 'workflow',
            status: 'ok',
          });
          connected = true;
        }
      }

      if (!connected) {
        const node = nodeMap.get(nodeId);
        if (node) {
          node.status = 'orphan';
          node.badges = [...(node.badges || []), 'orphan'];
        }
      }
    }
  }

  // Add SECRET nodes
  for (const provider of providerSet) {
    const nodeId = `SECRET:${provider}`;
    const hasSecret = Math.random() > 0.3; // Mock
    
    nodeMap.set(nodeId, {
      id: nodeId,
      label: `${provider} secret`,
      type: 'secret',
      status: hasSecret ? 'ok' : 'missing',
      badges: hasSecret ? [] : ['missing'],
    });

    edges.push({
      id: `${nodeId}->PROVIDER:${provider}`,
      from: nodeId,
      to: `PROVIDER:${provider}`,
      type: 'secret',
      status: hasSecret ? 'ok' : 'missing',
    });
  }

  // Add recommendations
  if (options.includeRecommendations) {
    const { data: recs } = await supabase
      .from('integration_recommendation')
      .select('*, product:app_products(id, name, slug)')
      .eq('tenant_id', tenantId)
      .gte('score', 60)
      .order('score', { ascending: false })
      .limit(10);

    for (const rec of recs || []) {
      const slug = rec.product?.slug;
      if (!slug || systemSet.has(slug)) continue;

      const nodeId = `RECOMMENDATION:${slug}`;
      nodeMap.set(nodeId, {
        id: nodeId,
        label: rec.product.name || slug,
        type: 'recommendation',
        status: 'recommended',
        soft: true,
        badges: [`${rec.score}`],
      });

      edges.push({
        id: `APP:${rec.app_key}->${nodeId}`,
        from: `APP:${rec.app_key}`,
        to: nodeId,
        type: 'recommendation',
        status: 'recommended',
      });
    }
  }

  const nodesArray = Array.from(nodeMap.values());

  return {
    nodes: nodesArray,
    edges,
    stats: {
      apps: nodesArray.filter((n) => n.type === 'app').length,
      systems: nodesArray.filter((n) => n.type === 'system').length,
      workflows: nodesArray.filter((n) => n.type === 'workflow').length,
      secrets: nodesArray.filter((n) => n.type === 'secret').length,
      providers: nodesArray.filter((n) => n.type === 'provider').length,
      recommendations: nodesArray.filter((n) => n.type === 'recommendation').length,
      missingSecrets: nodesArray.filter((n) => n.type === 'secret' && n.status === 'missing').length,
      orphanWorkflows: nodesArray.filter((n) => n.type === 'workflow' && n.status === 'orphan').length,
      unusedSystems: nodesArray.filter((n) => n.type === 'system' && n.status === 'idle').length,
    },
  };
}
