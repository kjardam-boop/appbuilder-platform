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

// Structured event logging for observability
const logEvent = (level: string, event: string, payload: Record<string, any> = {}) => {
  console.log(JSON.stringify({ 
    level, 
    event, 
    timestamp: new Date().toISOString(), 
    ...payload 
  }));
};

// Enhanced response headers with observability metadata
const buildResponseHeaders = (requestId: string, tenantId?: string, latencyMs?: number) => {
  return {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
    ...(latencyMs !== undefined ? { 'X-Latency-Ms': String(latencyMs) } : {})
  };
};

// Standard error response
const errorResponse = (
  code: string, 
  message: string, 
  status: number = 400, 
  requestId?: string,
  tenantId?: string,
  latencyMs?: number
) => {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message } }),
    { 
      status, 
      headers: buildResponseHeaders(requestId || crypto.randomUUID(), tenantId, latencyMs)
    }
  );
};

// Standard success response
const successResponse = (
  data: any, 
  status: number = 200, 
  requestId?: string,
  tenantId?: string,
  latencyMs?: number
) => {
  return new Response(
    JSON.stringify({ ok: true, data }),
    { 
      status, 
      headers: buildResponseHeaders(requestId || crypto.randomUUID(), tenantId, latencyMs)
    }
  );
};

Deno.serve(async (req) => {
  // Accept X-Request-Id from client or generate new UUID
  const requestId = req.headers.get('X-Request-Id') || crypto.randomUUID();
  const startTime = Date.now();
  const userAgent = req.headers.get('User-Agent') || null;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/mcp/', '').replace('/mcp', '');

    logEvent('info', 'mcp.request.received', { 
      request_id: requestId, 
      method: req.method, 
      path,
      user_agent: userAgent
    });

    // Health check (no auth required)
    if (path === 'health' || path === '') {
      const latency = Date.now() - startTime;
      return successResponse({ status: 'ok', version: '1.0.0' }, 200, requestId, undefined, latency);
    }

    // Manifest endpoint (no auth required)
    if (path === 'manifest') {
      const latency = Date.now() - startTime;
      const manifest = await Deno.readTextFile('./manifest.json');
      return new Response(manifest, {
        headers: buildResponseHeaders(requestId, undefined, latency)
      });
    }

    // All other endpoints require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log('warn', 'mcp.auth.missing', { request_id: requestId });
      return errorResponse('UNAUTHORIZED', 'Missing Authorization header', 401, requestId);
    }

    // Extract tenant and user from headers
    const tenantId = req.headers.get('X-Tenant-Id');
    const userId = req.headers.get('X-User-Id');
    const idempotencyKey = req.headers.get('Idempotency-Key');

    if (!tenantId) {
      log('warn', 'mcp.tenant.missing', { request_id: requestId });
      return errorResponse('FORBIDDEN_TENANT', 'Missing X-Tenant-Id header', 403, requestId);
    }

    if (!userId) {
      log('warn', 'mcp.user.missing', { request_id: requestId });
      return errorResponse('FORBIDDEN_TENANT', 'Missing X-User-Id header', 403, requestId);
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
      return errorResponse('UNAUTHORIZED', 'Invalid token', 401, requestId);
    }

    // Validate X-User-Id matches JWT user
    if (userId !== user.id) {
      log('warn', 'mcp.user.mismatch', { request_id: requestId, jwt_user: user.id, header_user: userId });
      return errorResponse('FORBIDDEN', 'X-User-Id does not match authenticated user', 403, requestId);
    }

    // Create per-request role cache
    const roleCache = new Map<string, string[]>();

    // Load roles from database
    const roles = await loadUserRoles(supabase, userId || user.id, tenantId, roleCache);

    // Build context with cache reference
    const ctx = {
      tenant_id: tenantId,
      user_id: userId || user.id,
      roles,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      roleCache, // Include cache for supplier company lookups
      user_agent: userAgent,
      http_method: req.method,
    };

    logEvent('info', 'mcp.context.built', {
      request_id: requestId,
      tenant_id: tenantId,
      user_id: ctx.user_id,
      roles: roles.join(','),
      user_agent: userAgent
    });

    // Route to handlers
    if (path.startsWith('resources/')) {
      return await handleResourceRequest(supabase, ctx, path, url, req.method);
    } else if (path.startsWith('actions/')) {
      return await handleActionRequest(supabase, ctx, path, url, req, idempotencyKey);
    }

    logEvent('warn', 'mcp.route.notfound', { request_id: requestId, path });
    const latency = Date.now() - startTime;
    return errorResponse('NOT_FOUND', 'Endpoint not found', 404, requestId, undefined, latency);

  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logEvent('error', 'mcp.error.unhandled', { 
      request_id: requestId, 
      error: errorMessage, 
      latency_ms: latency
    });

    // Try to log to audit table even on failure
    try {
      const tenantId = req.headers.get('X-Tenant-Id');
      const userId = req.headers.get('X-User-Id');
      if (tenantId && userId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from('mcp_action_log').insert({
          tenant_id: tenantId,
          user_id: userId,
          action_name: 'unknown',
          status: 'error',
          error_message: errorMessage,
          error_code: 'INTERNAL_ERROR',
          duration_ms: latency,
          request_id: requestId,
          http_method: req.method,
          user_agent: userAgent,
          policy_result: { decision: 'skipped', reason: 'Unhandled exception' },
        });
      }
    } catch (auditError) {
      log('error', 'mcp.audit.failed', { error: String(auditError) });
    }

    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500, requestId, undefined, latency);
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
 * Load company IDs where user has supplier role
 * Returns array of company IDs for ownership filtering
 */
async function loadSupplierCompanies(
  supabase: any,
  userId: string,
  cache: Map<string, string[]>
): Promise<string[]> {
  const cacheKey = `supplier:${userId}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('scope_id')
      .eq('user_id', userId)
      .eq('scope_type', 'company')
      .eq('role', 'supplier');

    if (error) {
      log('error', 'mcp.supplier.load_companies_error', {
        user_id: userId,
        error: error.message
      });
      return [];
    }

    const companyIds = (data || []).map((r: any) => r.scope_id).filter(Boolean);
    cache.set(cacheKey, companyIds);

    log('info', 'mcp.supplier.companies_loaded', {
      user_id: userId,
      company_count: companyIds.length
    });

    return companyIds;
  } catch (err) {
    log('error', 'mcp.supplier.load_companies_exception', {
      user_id: userId,
      error: String(err)
    });
    return [];
  }
}

// Import DSL policy evaluation (inline for edge function)
// Note: In production, this would be imported from a shared module

type McpPolicyRule = {
  role: string | string[];
  resource?: string | string[];
  action?: string | string[];
  effect: 'allow' | 'deny';
  conditions?: {
    tenantMatch?: boolean;
    ownerOnly?: boolean;
  };
};

type McpPolicySet = McpPolicyRule[];

const DEFAULT_POLICY: McpPolicySet = [
  // Platform admins
  { role: ['platform_owner', 'platform_support'], effect: 'allow' },
  // Tenant admins
  { role: ['tenant_owner', 'tenant_admin'], effect: 'allow' },
  // Project manager read resources
  { role: ['project_owner', 'analyst'], resource: '*', action: ['list', 'get'], effect: 'allow' },
  // Project manager limited writes
  { role: ['project_owner', 'analyst'], action: ['create_project', 'assign_task', 'list_projects', 'search_companies'], effect: 'allow' },
  // Contributor limited actions
  { role: 'contributor', action: ['assign_task', 'list_projects'], effect: 'allow' },
  // Viewer read-only
  { role: 'viewer', action: ['list_projects', 'search_companies'], effect: 'allow' },
  { role: 'viewer', action: ['list', 'get'], effect: 'allow' },
  // Supplier read only their own supplier record
  { role: 'supplier', resource: 'supplier', action: ['get'], effect: 'allow', conditions: { ownerOnly: true } },
  { role: 'supplier', action: ['evaluate_supplier'], effect: 'allow', conditions: { ownerOnly: true } },
  // External partner read metadata
  { role: 'external_partner', resource: ['company', 'external_system'], action: ['list', 'get'], effect: 'allow' },
  { role: 'external_partner', action: ['search_companies'], effect: 'allow' },
  // Default deny
  { role: '*', effect: 'deny' }
];

// DSL Policy Evaluator
function evaluateDslPolicy(
  ctx: any,
  evalCtx: { resourceType?: string; resourceId?: string; actionName?: string; method?: string },
  policySet: McpPolicySet = DEFAULT_POLICY
): any {
  const roles = ctx.roles || [];

  // Step 1: Check DENY rules first
  for (const rule of policySet) {
    if (rule.effect === 'deny') {
      if (ruleMatches(rule, roles, evalCtx)) {
        logEvent('info', 'mcp.policy.dsl.applied', {
          request_id: ctx.request_id,
          roles,
          resource_type: evalCtx.resourceType,
          action: evalCtx.actionName,
          matched_rule: rule,
          decision: 'denied',
        });
        return {
          decision: 'denied',
          reason: `Deny rule matched for roles: ${roles.join(', ')}`,
          checked_roles: roles,
          checked_at: new Date().toISOString(),
          matched_rule: rule,
        };
      }
    }
  }

  // Step 2: Check ALLOW rules
  for (const rule of policySet) {
    if (rule.effect === 'allow') {
      if (ruleMatches(rule, roles, evalCtx)) {
        logEvent('info', 'mcp.policy.dsl.applied', {
          request_id: ctx.request_id,
          roles,
          resource_type: evalCtx.resourceType,
          action: evalCtx.actionName,
          matched_rule: rule,
          decision: 'allowed',
        });
        return {
          decision: 'allowed',
          reason: 'Allow rule matched',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
          matched_rule: rule,
        };
      }
    }
  }

  // Step 3: Default deny
  logEvent('info', 'mcp.policy.dsl.applied', {
    request_id: ctx.request_id,
    roles,
    resource_type: evalCtx.resourceType,
    action: evalCtx.actionName,
    matched_rule: null,
    decision: 'denied',
  });
  return {
    decision: 'denied',
    reason: `No matching allow rule for roles: ${roles.join(', ')}`,
    checked_roles: roles,
    checked_at: new Date().toISOString(),
  };
}

function ruleMatches(
  rule: McpPolicyRule,
  userRoles: string[],
  evalCtx: { resourceType?: string; actionName?: string }
): boolean {
  // Check role match
  if (!roleMatches(rule.role, userRoles)) {
    return false;
  }

  // Check resource match
  if (rule.resource && evalCtx.resourceType) {
    if (!fieldMatches(rule.resource, evalCtx.resourceType)) {
      return false;
    }
  }

  // Check action match
  if (rule.action && evalCtx.actionName) {
    if (!fieldMatches(rule.action, evalCtx.actionName)) {
      return false;
    }
  }

  return true;
}

function roleMatches(ruleRole: string | string[], userRoles: string[]): boolean {
  const requiredRoles = Array.isArray(ruleRole) ? ruleRole : [ruleRole];
  if (requiredRoles.includes('*')) return true;
  return requiredRoles.some(role => userRoles.includes(role));
}

function fieldMatches(ruleValue: string | string[], actualValue: string): boolean {
  const allowed = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
  if (allowed.includes('*')) return true;
  return allowed.includes(actualValue);
}

/**
 * Check resource access policy using DSL
 * Returns whether access is allowed and policy result with matched rule
 */
function checkResourcePolicy(
  ctx: any,
  resourceType: string,
  operation: 'list' | 'get'
): { allowed: boolean; policyResult: any } {
  const policyResult = evaluateDslPolicy(ctx, {
    resourceType,
    actionName: operation,
    method: 'GET',
  });

  return {
    allowed: policyResult.decision === 'allowed',
    policyResult,
  };
}

/**
 * Check action execution policy using DSL
 * Returns whether access is allowed and policy result with matched rule
 */
function checkActionPolicy(
  ctx: any,
  actionName: string
): { allowed: boolean; policyResult: any } {
  const policyResult = evaluateDslPolicy(ctx, {
    actionName,
    method: 'POST',
  });

  return {
    allowed: policyResult.decision === 'allowed',
    policyResult,
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
  const startTime = Date.now();
  
  if (method !== 'GET') {
    const latency = Date.now() - startTime;
    return errorResponse('METHOD_NOT_ALLOWED', 'Only GET is supported for resources', 405, ctx.request_id, ctx.tenant_id, latency);
  }

  const parts = path.replace('resources/', '').split('/');
  const type = parts[0];
  const id = parts[1];

  logEvent('info', 'mcp.resource.request', {
    request_id: ctx.request_id,
    tenant_id: ctx.tenant_id,
    user_id: ctx.user_id,
    resource_type: type,
    resource_id: id || 'list',
    operation: id ? 'get' : 'list'
  });

  // Validate resource type
  const validTypes = ['company', 'supplier', 'project', 'task', 'external_system', 'application'];
  if (!validTypes.includes(type)) {
    const latency = Date.now() - startTime;
    
    logEvent('warn', 'mcp.resource.invalid_type', { 
      request_id: ctx.request_id, 
      tenant_id: ctx.tenant_id,
      type,
      latency_ms: latency
    });

    // Log to audit table
    await logResourceAudit(supabase, ctx, type, id, 'error', latency, 'INVALID_RESOURCE', `Invalid resource type: ${type}`);

    return errorResponse('INVALID_RESOURCE', `Invalid resource type. Valid types: ${validTypes.join(', ')}`, 400, ctx.request_id, ctx.tenant_id, latency);
  }

  // Check policy before data access
  const policyCheck = checkResourcePolicy(ctx, type, id ? 'get' : 'list');
  if (!policyCheck.allowed) {
    const latency = Date.now() - startTime;

    logEvent('warn', 'mcp.policy.denied', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      resource_type: type,
      resource_id: id,
      operation: id ? 'get' : 'list',
      reason: policyCheck.policyResult.reason,
      roles: ctx.roles.join(','),
      matched_rule: policyCheck.policyResult.matched_rule,
      latency_ms: latency
    });

    // Log to audit table with matched rule
    await logResourceAudit(supabase, ctx, type, id, 'error', latency, 'POLICY_DENIED', policyCheck.policyResult.reason, policyCheck.policyResult);

    return errorResponse('POLICY_DENIED', policyCheck.policyResult.reason || 'Insufficient permissions', 403, ctx.request_id, ctx.tenant_id, latency);
  }

  try {
    if (id) {
      // GET single resource
      const resource = await getResource(supabase, ctx, type, id);
      if (!resource) {
        const latency = Date.now() - startTime;
        
        logEvent('info', 'mcp.resource.not_found', {
          request_id: ctx.request_id,
          tenant_id: ctx.tenant_id,
          resource_type: type,
          resource_id: id,
          latency_ms: latency
        });

        await logResourceAudit(supabase, ctx, type, id, 'error', latency, 'NOT_FOUND', `${type} not found`);
        
        return errorResponse('NOT_FOUND', `${type} not found`, 404, ctx.request_id, ctx.tenant_id, latency);
      }

      const latency = Date.now() - startTime;
      
      logEvent('info', 'mcp.resource.fetched', {
        request_id: ctx.request_id,
        tenant_id: ctx.tenant_id,
        resource_type: type,
        resource_id: id,
        latency_ms: latency
      });

      await logResourceAudit(supabase, ctx, type, id, 'success', latency);

      return successResponse(resource, 200, ctx.request_id, ctx.tenant_id, latency);
    } else {
      // LIST resources
      const q = url.searchParams.get('q') || undefined;
      const limit = parseInt(url.searchParams.get('limit') || '25');
      const cursor = url.searchParams.get('cursor') || undefined;

      const result = await listResources(supabase, ctx, type, { q, limit, cursor });
      
      const latency = Date.now() - startTime;

      logEvent('info', 'mcp.resource.fetched', {
        request_id: ctx.request_id,
        tenant_id: ctx.tenant_id,
        resource_type: type,
        count: result.items.length,
        has_more: result.hasMore,
        latency_ms: latency
      });

      await logResourceAudit(supabase, ctx, type, null, 'success', latency);

      return successResponse(result, 200, ctx.request_id, ctx.tenant_id, latency);
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logEvent('error', 'mcp.resource.error', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      resource_type: type,
      resource_id: id,
      error: errorMessage,
      latency_ms: latency
    });

    await logResourceAudit(supabase, ctx, type, id, 'error', latency, 'INTERNAL_ERROR', errorMessage);

    return errorResponse('INTERNAL_ERROR', errorMessage, 500, ctx.request_id, ctx.tenant_id, latency);
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
  const startTime = Date.now();

  if (req.method !== 'POST') {
    const latency = Date.now() - startTime;
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST is supported for actions', 405, ctx.request_id, ctx.tenant_id, latency);
  }

  const actionName = path.replace('actions/', '');
  let params = {};

  try {
    params = await req.json();
  } catch {
    const latency = Date.now() - startTime;
    
    logEvent('warn', 'mcp.action.validation_error', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      action: actionName,
      error: 'Invalid JSON',
      latency_ms: latency
    });

    return errorResponse('VALIDATION_ERROR', 'Invalid JSON in request body', 400, ctx.request_id, ctx.tenant_id, latency);
  }

  try {
    const result = await executeAction(supabase, ctx, actionName, params, idempotencyKey, startTime);
    const latency = Date.now() - startTime;
    return successResponse(result, 200, ctx.request_id, ctx.tenant_id, latency);
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine error code based on message
    let errorCode = 'INTERNAL_ERROR';
    if (errorMessage.includes('permission') || errorMessage.includes('Insufficient')) {
      errorCode = 'POLICY_DENIED';
    } else if (errorMessage.includes('not found')) {
      errorCode = 'NOT_FOUND';
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      errorCode = 'VALIDATION_ERROR';
    }

    logEvent('error', 'mcp.action.error', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      action: actionName,
      error: errorMessage,
      error_code: errorCode,
      latency_ms: latency
    });

    return errorResponse(errorCode, errorMessage, 500, ctx.request_id, ctx.tenant_id, latency);
  }
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
    
    // Enforce supplier ownership - suppliers can only see their own companies
    if (ctx.roles.includes('supplier')) {
      const supplierCompanies = await loadSupplierCompanies(supabase, ctx.user_id, ctx.roleCache || new Map());
      
      if (supplierCompanies.length === 0) {
        // Supplier has no associated companies - return empty result
        log('info', 'mcp.supplier.no_companies', {
          request_id: ctx.request_id,
          user_id: ctx.user_id
        });
        return { items: [], cursor: undefined, hasMore: false };
      }
      
      // Filter to only companies where user is a supplier
      query = query.in('id', supplierCompanies);
      
      log('info', 'mcp.supplier.ownership_filtered', {
        request_id: ctx.request_id,
        user_id: ctx.user_id,
        company_count: supplierCompanies.length
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

  // Enforce supplier ownership - suppliers can only access their own companies
  if (type === 'supplier' && ctx.roles.includes('supplier')) {
    const supplierCompanies = await loadSupplierCompanies(supabase, ctx.user_id, ctx.roleCache || new Map());
    
    if (!supplierCompanies.includes(id)) {
      log('warn', 'mcp.supplier.unauthorized_access', {
        request_id: ctx.request_id,
        user_id: ctx.user_id,
        resource_id: id,
        reason: 'Supplier does not have access to this company'
      });
      return null; // Return null to trigger 404/403 response
    }
    
    log('info', 'mcp.supplier.ownership_verified', {
      request_id: ctx.request_id,
      user_id: ctx.user_id,
      resource_id: id
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
  idempotencyKey?: string | null,
  handlerStartTime?: number
) {
  const startTime = handlerStartTime || Date.now();

  logEvent('info', 'mcp.action.start', {
    request_id: ctx.request_id,
    tenant_id: ctx.tenant_id,
    user_id: ctx.user_id,
    action: actionName,
    idempotency_key: idempotencyKey
  });

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
      const latency = Date.now() - startTime;

      logEvent('info', 'mcp.action.duplicate', {
        request_id: ctx.request_id,
        tenant_id: ctx.tenant_id,
        action: actionName,
        idempotency_key: idempotencyKey,
        latency_ms: latency
      });

      // Return cached result without re-execution
      return existing.result_json;
    }
  }

  // Check policy before execution
  const policyCheck = checkActionPolicy(ctx, actionName);
  if (!policyCheck.allowed) {
    const latency = Date.now() - startTime;

    logEvent('warn', 'mcp.policy.denied', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      action: actionName,
      reason: policyCheck.policyResult.reason,
      roles: ctx.roles.join(','),
      matched_rule: policyCheck.policyResult.matched_rule,
      latency_ms: latency
    });

    // Log denied action with error code and matched rule
    await logAction(
      supabase,
      ctx,
      actionName,
      params,
      null,
      'error',
      latency,
      policyCheck.policyResult.reason || 'Policy denied',
      idempotencyKey,
      policyCheck.policyResult,
      'POLICY_DENIED'
    );

    throw new Error(policyCheck.policyResult.reason || 'Insufficient permissions');
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

    const latency = Date.now() - startTime;

    // Build policy result for successful execution
    const policyResult = {
      decision: 'allowed',
      checked_roles: ctx.roles,
      checked_at: new Date().toISOString()
    };

    logEvent('info', 'mcp.action.success', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      action: actionName,
      latency_ms: latency
    });

    // Log action with policy result
    await logAction(supabase, ctx, actionName, params, result, 'success', latency, null, idempotencyKey, policyResult, null);

    return result;

  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine error code
    let errorCode = 'INTERNAL_ERROR';
    if (errorMessage.includes('permission') || errorMessage.includes('Insufficient')) {
      errorCode = 'POLICY_DENIED';
    } else if (errorMessage.includes('not found')) {
      errorCode = 'NOT_FOUND';
    } else if (errorMessage.includes('validation')) {
      errorCode = 'VALIDATION_ERROR';
    }

    // Build policy result for error case
    const policyResult = {
      decision: errorCode === 'POLICY_DENIED' ? 'denied' : 'allowed',
      checked_roles: ctx.roles,
      checked_at: new Date().toISOString()
    };

    logEvent('error', 'mcp.action.error', {
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      action: actionName,
      error: errorMessage,
      error_code: errorCode,
      latency_ms: latency
    });
    
    await logAction(supabase, ctx, actionName, params, null, 'error', latency, errorMessage, idempotencyKey, policyResult, errorCode);

    throw error;
  }
}

/**
 * Log action to mcp_action_log with full observability metadata
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
  policyResult?: any,
  errorCode?: string | null
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
      error_code: errorCode,
      duration_ms: durationMs,
      idempotency_key: idempotencyKey,
      request_id: ctx.request_id,
      http_method: ctx.http_method || 'POST',
      user_agent: ctx.user_agent,
      policy_result: policyResult || {
        decision: 'allowed',
        checked_roles: ctx.roles || [],
        checked_at: new Date().toISOString()
      },
    });
  } catch (error) {
    log('error', 'mcp.audit.log_failed', { 
      error: error instanceof Error ? error.message : String(error),
      action: actionName 
    });
  }
}

/**
 * Log resource access to mcp_action_log
 */
async function logResourceAudit(
  supabase: any,
  ctx: any,
  resourceType: string,
  resourceId: string | null | undefined,
  status: string,
  durationMs: number,
  errorCode?: string | null,
  errorMessage?: string | null,
  policyResult?: any
) {
  try {
    await supabase.from('mcp_action_log').insert({
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id,
      action_name: resourceId ? `get_${resourceType}` : `list_${resourceType}`,
      status,
      error_message: errorMessage || null,
      error_code: errorCode || null,
      duration_ms: durationMs,
      request_id: ctx.request_id,
      http_method: ctx.http_method || 'GET',
      resource_type: resourceType,
      resource_id: resourceId || null,
      user_agent: ctx.user_agent,
      policy_result: policyResult || {
        decision: 'allowed',
        checked_roles: ctx.roles || [],
        checked_at: new Date().toISOString()
      },
    });
  } catch (error) {
    log('error', 'mcp.audit.resource_log_failed', { 
      error: error instanceof Error ? error.message : String(error),
      resource_type: resourceType 
    });
  }
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
