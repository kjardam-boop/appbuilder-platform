import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import manifest from './manifest.json' with { type: 'json' };

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/mcp-server', '');

    // Health check
    if (path === '/health' || path === '/') {
      return new Response(
        JSON.stringify({ ok: true, version: '1.0.0' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Manifest
    if (path === '/manifest') {
      return new Response(
        JSON.stringify(manifest),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All other endpoints require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = req.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'Missing X-Tenant-Id header' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid authorization token' },
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ctx = {
      tenant_id: tenantId,
      user_id: user.id,
      roles: [],
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    // Resource endpoints
    if (path.startsWith('/resources/')) {
      const parts = path.split('/').filter(Boolean);
      const resourceType = parts[1];
      const resourceId = parts[2];

      if (!resourceType) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'Resource type is required' },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get single resource
      if (resourceId) {
        const result = await getResource(supabase, ctx, resourceType, resourceId);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List resources
      const q = url.searchParams.get('q') || undefined;
      const limit = parseInt(url.searchParams.get('limit') || '25');
      const cursor = url.searchParams.get('cursor') || undefined;

      const result = await listResources(supabase, ctx, resourceType, { q, limit, cursor });
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action endpoints
    if (path.startsWith('/actions/')) {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({
            ok: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is allowed for actions' },
          }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const actionName = path.split('/')[2];
      if (!actionName) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'Action name is required' },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const idempotencyKey = req.headers.get('X-Idempotency-Key') || undefined;

      const result = await executeAction(supabase, ctx, actionName, body, idempotencyKey);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown endpoint
    return new Response(
      JSON.stringify({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[MCP Server] Error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions
async function listResources(supabase: any, ctx: any, type: string, params: any) {
  const { q, limit = 25, cursor } = params;
  const effectiveLimit = Math.min(limit, 100);

  try {
    const tableName = getTableName(type);
    let query = supabase.from(tableName).select('*');

    // Tenant filtering for tenant-scoped tables
    if (type === 'project' || type === 'task' || type === 'application') {
      query = query.eq('tenant_id', ctx.tenant_id);
    }

    query = query.limit(effectiveLimit + 1);

    // Search
    if (q && type === 'company') {
      query = query.ilike('name', `%${q}%`);
    } else if (q && type === 'project') {
      query = query.ilike('title', `%${q}%`);
    }

    // Cursor pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return {
        ok: false,
        error: { code: 'DATABASE_ERROR', message: error.message },
      };
    }

    const items = data || [];
    const hasMore = items.length > effectiveLimit;
    const returnItems = hasMore ? items.slice(0, effectiveLimit) : items;
    const nextCursor = hasMore && returnItems.length > 0 ? returnItems[returnItems.length - 1]?.created_at : undefined;

    return {
      ok: true,
      data: {
        items: returnItems,
        cursor: nextCursor,
        hasMore,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

async function getResource(supabase: any, ctx: any, type: string, id: string) {
  try {
    const tableName = getTableName(type);
    let query = supabase.from(tableName).select('*').eq('id', id);

    // Tenant filtering for tenant-scoped tables
    if (type === 'project' || type === 'task' || type === 'application') {
      query = query.eq('tenant_id', ctx.tenant_id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return {
        ok: false,
        error: { code: 'DATABASE_ERROR', message: error.message },
      };
    }

    if (!data) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: `Resource ${type}/${id} not found` },
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

async function executeAction(supabase: any, ctx: any, actionName: string, params: any, idempotencyKey?: string) {
  const startTime = Date.now();

  try {
    // Check idempotency
    if (idempotencyKey) {
      const { data: existingLog } = await supabase
        .from('mcp_action_log')
        .select('*')
        .eq('tenant_id', ctx.tenant_id)
        .eq('idempotency_key', idempotencyKey)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLog) {
        console.log(`[MCP] Returning cached result for idempotency key: ${idempotencyKey}`);
        return {
          ok: true,
          data: existingLog.result_json,
        };
      }
    }

    // Execute action based on name
    let result;
    switch (actionName) {
      case 'create_project':
        result = await actionCreateProject(supabase, ctx, params);
        break;
      case 'list_projects':
        result = await actionListProjects(supabase, ctx, params);
        break;
      case 'assign_task':
        result = await actionAssignTask(supabase, ctx, params);
        break;
      case 'search_companies':
        result = await actionSearchCompanies(supabase, ctx, params);
        break;
      case 'evaluate_supplier':
        result = await actionEvaluateSupplier(supabase, ctx, params);
        break;
      default:
        const durationMs = Date.now() - startTime;
        await logAction(supabase, ctx, actionName, params, null, 'error', durationMs, `Action not found: ${actionName}`, idempotencyKey);
        return {
          ok: false,
          error: { code: 'ACTION_NOT_FOUND', message: `Action '${actionName}' not found` },
        };
    }

    const durationMs = Date.now() - startTime;
    await logAction(supabase, ctx, actionName, params, result, 'success', durationMs, undefined, idempotencyKey);

    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAction(supabase, ctx, actionName, params, null, 'error', durationMs, errorMessage, idempotencyKey);

    return {
      ok: false,
      error: { code: 'ACTION_FAILED', message: errorMessage },
    };
  }
}

// Action implementations
async function actionCreateProject(supabase: any, ctx: any, params: any) {
  const { name, customerCompanyId, description } = params;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: name,
      description: description || null,
      company_id: customerCompanyId || null,
      current_phase: 'as_is',
      created_by: ctx.user_id,
      tenant_id: ctx.tenant_id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    projectId: data.id,
    name: data.title,
    phase: data.current_phase,
  };
}

async function actionListProjects(supabase: any, ctx: any, params: any) {
  const limit = params.limit || 25;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('tenant_id', ctx.tenant_id)
    .eq('created_by', ctx.user_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return {
    projects: data.map((p: any) => ({
      id: p.id,
      title: p.title,
      phase: p.current_phase,
      created_at: p.created_at,
    })),
    count: data.length,
  };
}

async function actionAssignTask(supabase: any, ctx: any, params: any) {
  const { title, description, assigned_to, entity_type, entity_id, priority, due_date } = params;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description: description || null,
      assigned_to: assigned_to || ctx.user_id,
      entity_type,
      entity_id,
      priority: priority || 'medium',
      due_date: due_date || null,
      status: 'todo',
      created_by: ctx.user_id,
      tenant_id: ctx.tenant_id,
      tags: [],
      completion_percentage: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    taskId: data.id,
    title: data.title,
    assigned_to: data.assigned_to,
    status: data.status,
    priority: data.priority,
  };
}

async function actionSearchCompanies(supabase: any, ctx: any, params: any) {
  const { query, limit = 25 } = params;

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .or(`name.ilike.%${query}%,org_number.ilike.%${query}%`)
    .limit(limit);

  if (error) throw new Error(error.message);

  return {
    companies: data.map((c: any) => ({
      id: c.id,
      name: c.name,
      org_number: c.org_number,
      industry_code: c.industry_code,
      employees: c.employees,
    })),
    count: data.length,
  };
}

async function actionEvaluateSupplier(supabase: any, ctx: any, params: any) {
  const { supplierId } = params;

  // Dummy implementation
  return {
    supplierId,
    score: 75,
    reason: 'Placeholder evaluation - will be implemented with real scoring logic',
    criteria: ['quality', 'price', 'delivery'],
    evaluated_at: new Date().toISOString(),
  };
}

// Helper functions
async function logAction(
  supabase: any,
  ctx: any,
  actionName: string,
  payload: any,
  result: any,
  status: string,
  durationMs: number,
  errorMessage?: string,
  idempotencyKey?: string
) {
  try {
    await supabase.from('mcp_action_log').insert({
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      action_name: actionName,
      payload_json: payload,
      result_json: result,
      status,
      error_message: errorMessage,
      duration_ms: durationMs,
      idempotency_key: idempotencyKey,
    });
  } catch (error) {
    console.error('[MCP] Failed to log action:', error);
  }
}

function getTableName(type: string): string {
  switch (type) {
    case 'company':
    case 'supplier':
      return 'companies';
    case 'project':
      return 'projects';
    case 'task':
      return 'tasks';
    case 'external_system':
      return 'app_products';
    case 'application':
      return 'applications';
    default:
      throw new Error(`Unknown resource type: ${type}`);
  }
}
