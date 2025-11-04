/**
 * MCP Server Edge Function
 * Provides MCP (Model Context Protocol) endpoints for external integrations
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

// Structured logging helper
const log = (level: string, msg: string, meta: Record<string, any> = {}) => {
  console.log(JSON.stringify({ level, msg, timestamp: new Date().toISOString(), ...meta }));
};

// Standard error response
const errorResponse = (code: string, message: string, status: number = 400) => {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

// Standard success response
const successResponse = (data: any, status: number = 200) => {
  return new Response(
    JSON.stringify({ ok: true, data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/mcp/', '').replace('/mcp', '');

    log('info', 'mcp.request', { request_id: requestId, method: req.method, path });

    // Health check (no auth required)
    if (path === 'health' || path === '') {
      return successResponse({ status: 'ok', version: '1.0.0' });
    }

    // Manifest endpoint (no auth required)
    if (path === 'manifest') {
      const manifest = await Deno.readTextFile('./manifest.json');
      return new Response(manifest, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // All other endpoints require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log('warn', 'mcp.auth.missing', { request_id: requestId });
      return errorResponse('UNAUTHORIZED', 'Missing Authorization header', 401);
    }

    // Extract tenant and user from headers
    const tenantId = req.headers.get('X-Tenant-Id');
    const userId = req.headers.get('X-User-Id');
    const idempotencyKey = req.headers.get('Idempotency-Key');

    if (!tenantId) {
      log('warn', 'mcp.tenant.missing', { request_id: requestId });
      return errorResponse('FORBIDDEN_TENANT', 'Missing X-Tenant-Id header', 403);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      log('warn', 'mcp.auth.invalid', { request_id: requestId, error: authError?.message });
      return errorResponse('UNAUTHORIZED', 'Invalid token', 401);
    }

    // Validate X-User-Id matches JWT user
    if (userId && userId !== user.id) {
      log('warn', 'mcp.user.mismatch', { request_id: requestId, jwt_user: user.id, header_user: userId });
      return errorResponse('FORBIDDEN', 'X-User-Id does not match authenticated user', 403);
    }

    // Build context
    const ctx = {
      tenant_id: tenantId,
      user_id: userId || user.id,
      roles: [], // TODO: fetch from user_roles table
      request_id: requestId,
      timestamp: new Date().toISOString(),
    };

    log('info', 'mcp.context', { request_id: requestId, tenant_id: tenantId, user_id: ctx.user_id });

    // Route to handlers
    if (path.startsWith('resources/')) {
      return await handleResourceRequest(supabase, ctx, path, url, req.method);
    } else if (path.startsWith('actions/')) {
      return await handleActionRequest(supabase, ctx, path, url, req, idempotencyKey);
    }

    log('warn', 'mcp.route.notfound', { request_id: requestId, path });
    return errorResponse('NOT_FOUND', 'Endpoint not found', 404);

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'mcp.error', { 
      request_id: requestId, 
      error: errorMessage, 
      latency_ms: duration 
    });
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
});

/**
 * Handle resource requests (GET /resources/:type or /resources/:type/:id)
 */
async function handleResourceRequest(
  supabase: any,
  ctx: any,
  path: string,
  url: URL,
  method: string
) {
  if (method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only GET is supported for resources', 405);
  }

  const parts = path.replace('resources/', '').split('/');
  const type = parts[0];
  const id = parts[1];

  // Validate resource type
  const validTypes = ['company', 'supplier', 'project', 'task', 'external_system', 'application'];
  if (!validTypes.includes(type)) {
    log('warn', 'mcp.resource.invalid_type', { request_id: ctx.request_id, type });
    return errorResponse('VALIDATION_ERROR', `Invalid resource type. Valid types: ${validTypes.join(', ')}`, 400);
  }

  if (id) {
    // GET single resource
    const resource = await getResource(supabase, ctx, type, id);
    if (!resource) {
      return errorResponse('NOT_FOUND', `${type} not found`, 404);
    }
    return successResponse(resource);
  } else {
    // LIST resources
    const q = url.searchParams.get('q') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '25');
    const cursor = url.searchParams.get('cursor') || undefined;

    const result = await listResources(supabase, ctx, type, { q, limit, cursor });
    return successResponse(result);
  }
}

/**
 * Handle action requests (POST /actions/:actionName)
 */
async function handleActionRequest(
  supabase: any,
  ctx: any,
  path: string,
  url: URL,
  req: Request,
  idempotencyKey?: string | null
) {
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST is supported for actions', 405);
  }

  const actionName = path.replace('actions/', '');
  let params = {};

  try {
    params = await req.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON in request body', 400);
  }

  const result = await executeAction(supabase, ctx, actionName, params, idempotencyKey);
  return successResponse(result);
}

/**
 * List resources with pagination
 */
async function listResources(supabase: any, ctx: any, type: string, params: any) {
  const { q, limit = 25, cursor } = params;
  const safeLimit = Math.min(limit, 100);

  const tableName = getTableName(type);
  let query = supabase.from(tableName).select('*');

  // Apply tenant isolation
  if (['project', 'task', 'application'].includes(type)) {
    query = query.eq('tenant_id', ctx.tenant_id);
  }

  // Apply supplier filter
  if (type === 'supplier') {
    query = query.eq('is_approved_supplier', true);
  }

  // Decode and apply cursor
  if (cursor) {
    try {
      const decoded = JSON.parse(atob(cursor));
      query = query
        .or(`id.gt.${decoded.id},and(id.eq.${decoded.id},created_at.gt.${decoded.created_at})`);
    } catch (err) {
      throw new Error('Invalid cursor format');
    }
  }

  // Apply search
  if (q) {
    const searchFields = getSearchFields(type);
    const conditions = searchFields.map(f => `${f}.ilike.%${q}%`).join(',');
    query = query.or(conditions);
  }

  // Order and limit
  query = query
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(safeLimit + 1);

  const { data, error } = await query;

  if (error) {
    log('error', 'mcp.resource.list.error', { 
      request_id: ctx.request_id, 
      type, 
      error: error.message 
    });
    throw error;
  }

  const items = data || [];
  const hasMore = items.length > safeLimit;
  const results = hasMore ? items.slice(0, safeLimit) : items;

  const nextCursor = hasMore && results.length > 0
    ? btoa(JSON.stringify({
        id: results[results.length - 1].id,
        created_at: results[results.length - 1].created_at
      }))
    : undefined;

  log('info', 'mcp.resource.list', {
    request_id: ctx.request_id,
    tenant_id: ctx.tenant_id,
    type,
    count: results.length,
    hasMore
  });

  return { items: results, cursor: nextCursor, hasMore };
}

/**
 * Get single resource
 */
async function getResource(supabase: any, ctx: any, type: string, id: string) {
  const tableName = getTableName(type);
  let query = supabase.from(tableName).select('*').eq('id', id);

  if (['project', 'task', 'application'].includes(type)) {
    query = query.eq('tenant_id', ctx.tenant_id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    log('error', 'mcp.resource.get.error', {
      request_id: ctx.request_id,
      type,
      id,
      error: error.message
    });
    throw error;
  }

  log('info', 'mcp.resource.get', {
    request_id: ctx.request_id,
    tenant_id: ctx.tenant_id,
    type,
    id,
    found: !!data
  });

  return data;
}

/**
 * Execute an action
 */
async function executeAction(
  supabase: any,
  ctx: any,
  actionName: string,
  params: any,
  idempotencyKey?: string | null
) {
  const startTime = Date.now();

  // Check idempotency
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('mcp_action_log')
      .select('*')
      .eq('tenant_id', ctx.tenant_id)
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      log('info', 'mcp.action.idempotent', {
        request_id: ctx.request_id,
        action: actionName,
        idempotency_key: idempotencyKey
      });
      return existing.result_json;
    }
  }

  try {
    let result;

    // Route to action handlers
    switch (actionName) {
      case 'create_project':
        result = await createProject(supabase, ctx, params);
        break;
      case 'list_projects':
        result = await listProjects(supabase, ctx, params);
        break;
      case 'assign_task':
        result = await assignTask(supabase, ctx, params);
        break;
      case 'search_companies':
        result = await searchCompanies(supabase, ctx, params);
        break;
      case 'evaluate_supplier':
        result = await evaluateSupplier(supabase, ctx, params);
        break;
      default:
        throw new Error(`Unknown action: ${actionName}`);
    }

    const duration = Date.now() - startTime;

    // Log action
    await logAction(supabase, ctx, actionName, params, result, 'success', duration, null, idempotencyKey);

    log('info', 'mcp.action', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      action: actionName,
      latency_ms: duration,
      status: 'success'
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await logAction(supabase, ctx, actionName, params, null, 'error', duration, errorMessage, idempotencyKey);

    log('error', 'mcp.action.error', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      action: actionName,
      latency_ms: duration,
      error: errorMessage
    });

    throw error;
  }
}

/**
 * Log action to mcp_action_log
 */
async function logAction(
  supabase: any,
  ctx: any,
  actionName: string,
  payload: any,
  result: any,
  status: string,
  durationMs: number,
  errorMessage: string | null,
  idempotencyKey?: string | null
) {
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
    request_id: ctx.request_id,
    policy_result: null, // Will be used in Step 2+
  });
}

// Action implementations
async function createProject(supabase: any, ctx: any, params: any) {
  const { name, description, customerCompanyId, tags } = params;
  
  const { data, error } = await supabase.from('projects').insert({
    tenant_id: ctx.tenant_id,
    title: name,
    description: description || null,
    customer_company_id: customerCompanyId || null,
    owner_id: ctx.user_id,
    current_phase: 'planning',
    tags: tags || [],
  }).select().single();

  if (error) throw error;

  return {
    projectId: data.id,
    name: data.title,
    phase: data.current_phase,
  };
}

async function listProjects(supabase: any, ctx: any, params: any) {
  const limit = Math.min(params.limit || 25, 100);

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('tenant_id', ctx.tenant_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return {
    projects: data.map((p: any) => ({
      id: p.id,
      title: p.title,
      phase: p.current_phase,
      created_at: p.created_at,
    })),
    count: data.length,
    total: data.length,
  };
}

async function assignTask(supabase: any, ctx: any, params: any) {
  const { title, description, assigned_to, entity_type, entity_id, priority, due_date } = params;

  const { data, error } = await supabase.from('tasks').insert({
    tenant_id: ctx.tenant_id,
    title,
    description: description || null,
    assigned_to: assigned_to || ctx.user_id,
    entity_type,
    entity_id,
    priority: priority || 'medium',
    due_date: due_date || null,
    status: 'todo',
    created_by: ctx.user_id,
  }).select().single();

  if (error) throw error;

  return {
    taskId: data.id,
    title: data.title,
    assigned_to: data.assigned_to,
    status: data.status,
    priority: data.priority,
  };
}

async function searchCompanies(supabase: any, ctx: any, params: any) {
  const { query, limit = 25 } = params;
  const safeLimit = Math.min(limit, 100);

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, org_number, industry_code, employees')
    .or(`name.ilike.%${query}%,org_number.ilike.%${query}%`)
    .limit(safeLimit);

  if (error) throw error;

  return {
    companies: data,
    count: data.length,
    total: data.length,
  };
}

async function evaluateSupplier(supabase: any, ctx: any, params: any) {
  // Placeholder implementation
  return {
    supplierId: params.supplierId,
    score: 75,
    reason: 'Placeholder evaluation - will be implemented with real scoring logic',
    criteria: params.criteria || ['quality', 'price', 'delivery'],
    evaluated_at: new Date().toISOString(),
  };
}

// Helper functions
function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    company: 'companies',
    supplier: 'companies',
    project: 'projects',
    task: 'tasks',
    external_system: 'app_products',
    application: 'applications',
  };
  return tableMap[type] || type;
}

function getSearchFields(type: string): string[] {
  const searchMap: Record<string, string[]> = {
    company: ['name', 'org_number'],
    supplier: ['name', 'org_number'],
    project: ['title', 'description'],
    task: ['title', 'description'],
    external_system: ['name', 'vendor'],
    application: ['name', 'key'],
  };
  return searchMap[type] || ['name'];
}
