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

    // Create per-request role cache
    const roleCache = new Map<string, string[]>();

    // Load roles from database
    const roles = await loadUserRoles(supabase, userId || user.id, tenantId, roleCache);

    // Build context
    const ctx = {
      tenant_id: tenantId,
      user_id: userId || user.id,
      roles,
      request_id: requestId,
      timestamp: new Date().toISOString(),
    };

    log('info', 'mcp.context', {
      request_id: requestId,
      tenant_id: tenantId,
      user_id: ctx.user_id,
      roles: roles.join(',')
    });

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
 * Load user roles for tenant from database
 * Uses per-request cache to avoid multiple DB calls
 */
async function loadUserRoles(
  supabase: any,
  userId: string,
  tenantId: string,
  cache: Map<string, string[]>
): Promise<string[]> {
  const cacheKey = `${userId}:${tenantId}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    const { data, error } = await supabase.rpc('get_user_roles', {
      _user_id: userId,
      _tenant_id: tenantId
    });

    if (error) {
      log('error', 'mcp.roles.load_error', {
        user_id: userId,
        tenant_id: tenantId,
        error: error.message
      });
      return [];
    }

    const roles = data || [];
    cache.set(cacheKey, roles);

    log('info', 'mcp.roles.loaded', {
      user_id: userId,
      tenant_id: tenantId,
      roles: roles.join(',')
    });

    return roles;
  } catch (err) {
    log('error', 'mcp.roles.exception', {
      user_id: userId,
      tenant_id: tenantId,
      error: String(err)
    });
    return [];
  }
}

/**
 * Check resource access policy
 * Returns whether access is allowed and optional reason
 */
function checkResourcePolicy(
  ctx: any,
  resourceType: string,
  operation: 'list' | 'get'
): { allowed: boolean; reason?: string } {
  const roles = ctx.roles || [];

  // Full access roles
  if (roles.some((r: string) => ['platform_owner', 'tenant_owner', 'tenant_admin'].includes(r))) {
    return { allowed: true };
  }

  // Project-level roles can read all resources
  if (roles.some((r: string) => ['project_owner', 'analyst', 'contributor', 'viewer'].includes(r))) {
    return { allowed: true };
  }

  // Supplier can only read supplier resources (ownership check in data layer)
  if (roles.includes('supplier') && resourceType === 'supplier' && operation === 'get') {
    return { allowed: true, reason: 'Supplier can read own data' };
  }

  // External partner can read company and external_system
  if (roles.includes('external_partner')) {
    if (['company', 'external_system'].includes(resourceType)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `No role in [${roles.join(', ')}] has permission to ${operation} ${resourceType}`
  };
}

/**
 * Check action execution policy
 * Returns whether access is allowed and optional reason
 */
function checkActionPolicy(
  ctx: any,
  actionName: string
): { allowed: boolean; reason?: string } {
  const roles = ctx.roles || [];

  // Full access roles
  if (roles.some((r: string) => ['platform_owner', 'tenant_owner', 'tenant_admin'].includes(r))) {
    return { allowed: true };
  }

  // Project managers can create projects and assign tasks
  if (roles.some((r: string) => ['project_owner', 'analyst'].includes(r))) {
    if (['create_project', 'assign_task', 'list_projects', 'search_companies'].includes(actionName)) {
      return { allowed: true };
    }
  }

  // Contributors can assign tasks and list projects
  if (roles.includes('contributor')) {
    if (['assign_task', 'list_projects'].includes(actionName)) {
      return { allowed: true };
    }
  }

  // Viewers (read-only)
  if (roles.includes('viewer')) {
    if (['list_projects', 'search_companies'].includes(actionName)) {
      return { allowed: true };
    }
  }

  // Suppliers can evaluate themselves
  if (roles.includes('supplier')) {
    if (actionName === 'evaluate_supplier') {
      return { allowed: true, reason: 'Supplier can evaluate own data' };
    }
  }

  // External partners can search companies
  if (roles.includes('external_partner')) {
    if (actionName === 'search_companies') {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `No role in [${roles.join(', ')}] has permission to execute ${actionName}`
  };
}

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
    return errorResponse('INVALID_RESOURCE', `Invalid resource type. Valid types: ${validTypes.join(', ')}`, 400);
  }

  // Check policy before data access
  const policyCheck = checkResourcePolicy(ctx, type, id ? 'get' : 'list');
  if (!policyCheck.allowed) {
    log('warn', 'mcp.policy.denied', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      resource_type: type,
      operation: id ? 'get' : 'list',
      reason: policyCheck.reason,
      roles: ctx.roles.join(',')
    });
    return errorResponse('UNAUTHORIZED', policyCheck.reason || 'Insufficient permissions', 403);
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

  // Apply supplier filter and ownership check
  if (type === 'supplier') {
    query = query.eq('is_approved_supplier', true);
    // TODO: Implement supplier ownership check via company_id
    // If ctx.roles includes 'supplier', filter by ctx.user.company_id
    if (ctx.roles.includes('supplier')) {
      log('warn', 'mcp.supplier.ownership_check_needed', {
        request_id: ctx.request_id,
        user_id: ctx.user_id,
        note: 'Supplier ownership filtering not yet implemented'
      });
    }
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

  // TODO: Implement supplier ownership check via company_id
  if (type === 'supplier' && ctx.roles.includes('supplier')) {
    log('warn', 'mcp.supplier.ownership_check_needed', {
      request_id: ctx.request_id,
      user_id: ctx.user_id,
      resource_id: id,
      note: 'Supplier ownership check not yet implemented'
    });
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

  // Check policy before execution
  const policyCheck = checkActionPolicy(ctx, actionName);
  if (!policyCheck.allowed) {
    const policyResult = {
      decision: 'denied',
      reason: policyCheck.reason,
      checked_roles: ctx.roles,
      checked_at: new Date().toISOString()
    };

    // Log denied action
    await logAction(
      supabase,
      ctx,
      actionName,
      params,
      null,
      'error',
      0,
      policyCheck.reason || 'Policy denied',
      idempotencyKey,
      policyResult
    );

    log('warn', 'mcp.policy.denied', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      action: actionName,
      reason: policyCheck.reason,
      roles: ctx.roles.join(',')
    });

    throw new Error(policyCheck.reason || 'Insufficient permissions');
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

    // Build policy result for successful execution
    const policyResult = {
      decision: 'allowed',
      checked_roles: ctx.roles,
      checked_at: new Date().toISOString()
    };

    // Log action with policy result
    await logAction(supabase, ctx, actionName, params, result, 'success', duration, null, idempotencyKey, policyResult);

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

    // Build policy result for error case
    const policyResult = {
      decision: 'allowed',
      checked_roles: ctx.roles,
      checked_at: new Date().toISOString()
    };
    
    await logAction(supabase, ctx, actionName, params, null, 'error', duration, errorMessage, idempotencyKey, policyResult);

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
 * Log action to mcp_action_log with policy result
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
  idempotencyKey?: string | null,
  policyResult?: any
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
    policy_result: policyResult || {
      decision: 'allowed',
      checked_roles: ctx.roles || [],
      checked_at: new Date().toISOString()
    },
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
