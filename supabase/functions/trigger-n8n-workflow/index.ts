import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const TriggerRequestSchema = z.object({
  workflowKey: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workflow key format'),
  action: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid action format'),
  input: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional()
});

interface TriggerRequest {
  workflowKey: string;
  action: string;
  input: Record<string, any>;
  idempotencyKey?: string;
  tenantId?: string; // Allow UI to override tenant ID
}

interface N8nTriggerOptions {
  tenantId: string;
  userId?: string;
  roles: string[];
  requestId: string;
  workflowKey: string;
  action: string;
  input: Record<string, any>;
  idempotencyKey?: string;
}

interface N8nTriggerResult {
  ok: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  runId?: string;
  status?: 'succeeded' | 'in_progress' | 'failed';
}

/**
 * Resolve webhook URL for a workflow
 */
async function resolveWebhook(
  supabase: any,
  tenantId: string,
  provider: string,
  workflowKey: string
): Promise<string | null> {
  // 1. Fetch webhook_path from workflow mapping
  const { data: mapping, error: mappingError } = await supabase
    .from('mcp_tenant_workflow_map')
    .select('webhook_path')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('workflow_key', workflowKey)
    .eq('is_active', true)
    .maybeSingle();

  if (mappingError || !mapping) {
    console.error('[resolveWebhook] No mapping found:', mappingError || 'null mapping');
    return null;
  }

  // 2. Try to fetch Base URL from tenant_integrations
  const adapterCandidates = [provider, `${provider}_mcp`, `${provider}-mcp`];
  let integrationConfig: any = null;
  let integrationCreds: any = null;

  for (const adapterId of adapterCandidates) {
    const { data: integ, error: integrationError } = await supabase
      .from('tenant_integrations')
      .select('config, credentials')
      .eq('tenant_id', tenantId)
      .eq('adapter_id', adapterId)
      .eq('is_active', true)
      .maybeSingle();

    if (!integrationError && (integ?.config || integ?.credentials)) {
      integrationConfig = (integ.config as any) || null;
      integrationCreds = (integ.credentials as any) || null;
      break;
    }
  }

  // 3. Extract base URL
  const baseUrl =
    integrationConfig?.n8n_mcp_url ||
    integrationConfig?.n8n_base_url ||
    integrationConfig?.base_url ||
    integrationConfig?.url ||
    integrationCreds?.N8N_MCP_BASE_URL ||
    integrationCreds?.N8N_BASE_URL ||
    integrationCreds?.BASE_URL ||
    integrationCreds?.URL ||
    Deno.env.get('VITE_N8N_BASE_URL');

  if (!baseUrl) {
    console.error('[resolveWebhook] No base URL found');
    return null;
  }

  // 4. Combine base URL with webhook path
  const normalizedBase = String(baseUrl).replace(/\/+$/, '');
  const path = String(mapping.webhook_path || '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Sanitize payload to redact sensitive fields before logging
 */
function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sensitiveKeys = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'apikey', 'api_key',
    'authorization', 'auth', 'credential', 'private_key', 'access_token',
    'refresh_token', 'client_secret', 'bearer'
  ];

  const redact = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => redact(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof value === 'object') {
          sanitized[key] = redact(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  return redact(payload);
}

/**
 * Trigger an n8n workflow with retry logic
 */
async function triggerN8nWorkflow(
  supabase: any,
  webhookUrl: string,
  options: N8nTriggerOptions
): Promise<N8nTriggerResult> {
  const {
    tenantId,
    userId,
    roles,
    requestId,
    workflowKey,
    action,
    input,
    idempotencyKey,
  } = options;

  const startTime = Date.now();

  // Sanitize input before logging to database
  const sanitizedInput = sanitizePayload(input);

  // Create integration_run record
  const { data: runRecord, error: insertError } = await supabase
    .from('integration_run')
    .insert({
      tenant_id: tenantId,
      provider: 'n8n',
      workflow_key: workflowKey,
      request_id: requestId,
      action_name: action,
      status: 'started',
      idempotency_key: idempotencyKey,
      request_payload: sanitizedInput, // Store sanitized payload
    })
    .select()
    .single();

  if (insertError) {
    console.error('[triggerN8nWorkflow] Failed to create integration_run:', insertError);
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create integration run record',
      },
    };
  }

  const runId = runRecord.id;

  console.log(JSON.stringify({
    level: 'info',
    event: 'mcp.integration.trigger.start',
    request_id: requestId,
    tenant_id: tenantId,
    user_id: userId,
    workflow_key: workflowKey,
    action,
    run_id: runId,
  }));

  // Prepare payload for n8n
  const payload = {
    context: {
      tenant_id: tenantId,
      user_id: userId,
      roles,
      request_id: requestId,
    },
    action,
    input,
    idempotency_key: idempotencyKey || null,
  };

  // Trigger n8n with retry logic (extended in test mode)
  let lastError: any = null;
  const isTestMode = webhookUrl.includes('/webhook-test/');
  const maxRetries = isTestMode ? 5 : 2;
  const backoffMs = isTestMode ? [200, 400, 800, 1200, 2000] : [250, 750];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
          'X-Request-Id': requestId,
        },
        body: JSON.stringify(payload),
      });

      const httpStatus = response.status;
      const latencyMs = Date.now() - startTime;

      // Handle 202 Accepted (async)
      if (httpStatus === 202) {
        await supabase
          .from('integration_run')
          .update({
            status: 'in_progress',
            http_status: httpStatus,
          })
          .eq('id', runId);

        console.log(JSON.stringify({
          level: 'info',
          event: 'mcp.integration.trigger.success',
          request_id: requestId,
          tenant_id: tenantId,
          workflow_key: workflowKey,
          run_id: runId,
          http_status: httpStatus,
          latency_ms: latencyMs,
          async: true,
        }));

        return {
          ok: true,
          data: { status: 'in_progress', run_id: runId },
          runId,
          status: 'in_progress',
        };
      }

      // Handle 2xx success
      if (httpStatus >= 200 && httpStatus < 300) {
        const responseData = await response.json().catch(() => ({}));
        const sanitizedResponse = sanitizePayload(responseData);

        await supabase
          .from('integration_run')
          .update({
            status: 'succeeded',
            http_status: httpStatus,
            finished_at: new Date().toISOString(),
            response_json: sanitizedResponse, // Store sanitized response
          })
          .eq('id', runId);

        console.log(JSON.stringify({
          level: 'info',
          event: 'mcp.integration.trigger.success',
          request_id: requestId,
          tenant_id: tenantId,
          workflow_key: workflowKey,
          run_id: runId,
          http_status: httpStatus,
          latency_ms: latencyMs,
        }));

        return {
          ok: true,
          data: responseData,
          runId,
          status: 'succeeded',
        };
      }

      // Handle 4xx/5xx errors
      const errorText = await response.text().catch(() => 'Unknown error');

      // In test mode, a 404 often means the webhook isn't registered yet.
      if (isTestMode && httpStatus === 404 && attempt < maxRetries) {
        console.warn(`[triggerN8nWorkflow] Test-mode 404, retrying in ${backoffMs[attempt]}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
        continue; // try again without marking the run as failed yet
      }

      // If n8n suggests GET, try method fallback once
      if (httpStatus === 404 && /not registered for POST/i.test(errorText)) {
        try {
          const url = new URL(webhookUrl);
          url.searchParams.set('action', action);
          url.searchParams.set('request_id', requestId);
          if (idempotencyKey) url.searchParams.set('idempotency_key', idempotencyKey);
          // Encode payloads to avoid very long/unsafe URLs for unicode
          url.searchParams.set('context_b64', btoa(unescape(encodeURIComponent(JSON.stringify(payload.context)))));
          url.searchParams.set('input_b64', btoa(unescape(encodeURIComponent(JSON.stringify(input)))));

          const getResp = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'X-Tenant-Id': tenantId,
              'X-Request-Id': requestId,
            },
          });

          const getStatus = getResp.status;
          const getLatencyMs = Date.now() - startTime;

          if (getStatus === 202) {
            await supabase
              .from('integration_run')
              .update({
                status: 'in_progress',
                http_status: getStatus,
              })
              .eq('id', runId);

            console.log(JSON.stringify({
              level: 'info',
              event: 'mcp.integration.trigger.success',
              request_id: requestId,
              tenant_id: tenantId,
              workflow_key: workflowKey,
              run_id: runId,
              http_status: getStatus,
              latency_ms: getLatencyMs,
              async: true,
              method_fallback: 'GET',
            }));

            return {
              ok: true,
              data: { status: 'in_progress', run_id: runId },
              runId,
              status: 'in_progress',
            };
          }

          if (getStatus >= 200 && getStatus < 300) {
            const getData = await getResp.json().catch(() => ({}));

            await supabase
              .from('integration_run')
              .update({
                status: 'succeeded',
                http_status: getStatus,
                finished_at: new Date().toISOString(),
                response_json: getData,
              })
              .eq('id', runId);

            console.log(JSON.stringify({
              level: 'info',
              event: 'mcp.integration.trigger.success',
              request_id: requestId,
              tenant_id: tenantId,
              workflow_key: workflowKey,
              run_id: runId,
              http_status: getStatus,
              latency_ms: getLatencyMs,
              method_fallback: 'GET',
            }));

            return {
              ok: true,
              data: getData,
              runId,
              status: 'succeeded',
            };
          }
        } catch (fallbackErr) {
          console.warn('[triggerN8nWorkflow] GET fallback failed:', (fallbackErr as any)?.message || fallbackErr);
        }
      }

      // Only mark as failed when we are not going to retry anymore
      await supabase
        .from('integration_run')
        .update({
          status: 'failed',
          http_status: httpStatus,
          finished_at: new Date().toISOString(),
          error_message: errorText,
        })
        .eq('id', runId);

      console.error(JSON.stringify({
        level: 'error',
        event: 'mcp.integration.trigger.error',
        request_id: requestId,
        tenant_id: tenantId,
        workflow_key: workflowKey,
        run_id: runId,
        http_status: httpStatus,
        error: errorText,
        latency_ms: latencyMs,
      }));

      return {
        ok: false,
        error: {
          code: 'INTEGRATION_ERROR',
          message: `n8n workflow failed with status ${httpStatus}: ${errorText}`,
        },
        runId,
        status: 'failed',
      };
    } catch (err: any) {
      lastError = err;

      // Retry on network errors
      if (attempt < maxRetries) {
        console.warn(`[triggerN8nWorkflow] Attempt ${attempt + 1} failed, retrying...`, err.message);
        await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
        continue;
      }
    }
  }

  // All retries exhausted
  const errorMessage = lastError?.message || 'Network error';
  
  await supabase
    .from('integration_run')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', runId);

  console.error(JSON.stringify({
    level: 'error',
    event: 'mcp.integration.trigger.error',
    request_id: requestId,
    tenant_id: tenantId,
    workflow_key: workflowKey,
    run_id: runId,
    error: errorMessage,
    latency_ms: Date.now() - startTime,
  }));

  return {
    ok: false,
    error: {
      code: 'INTEGRATION_ERROR',
      message: `Failed to trigger n8n workflow after ${maxRetries + 1} attempts: ${errorMessage}`,
    },
    runId,
    status: 'failed',
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user roles to determine tenant
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role, scope_type, scope_id')
      .eq('user_id', user.id);

    // Parse and validate request body
    const body = await req.json();
    
    // Validate input with zod schema
    const validationResult = TriggerRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('[Validation Error]', validationResult.error.format());
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: validationResult.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { workflowKey, action, input, idempotencyKey, tenantId: requestTenantId } = validationResult.data;

    // Use tenant ID from request if provided, otherwise from user role
    const tenantRole = userRoles?.find(r => r.scope_type === 'tenant');
    const tenantId = requestTenantId || tenantRole?.scope_id;
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'No tenant found for user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = userRoles?.map(r => r.role) || [];

    // Generate request ID
    const requestId = crypto.randomUUID();

    console.log(JSON.stringify({
      level: 'info',
      event: 'mcp.edge_function.request',
      request_id: requestId,
      tenant_id: tenantId,
      user_id: user.id,
      workflow_key: workflowKey,
      action,
    }));

    // Resolve webhook URL
    const webhookUrl = await resolveWebhook(supabaseClient, tenantId, 'n8n', workflowKey);
    
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Workflow not found or not configured',
          code: 'WORKFLOW_NOT_FOUND' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger workflow
    const result = await triggerN8nWorkflow(supabaseClient, webhookUrl, {
      tenantId,
      userId: user.id,
      roles,
      requestId,
      workflowKey,
      action,
      input: input || {},
      idempotencyKey,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({ 
          error: result.error?.message || 'Failed to trigger workflow',
          code: result.error?.code || 'UNKNOWN_ERROR',
          runId: result.runId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        runId: result.runId,
        status: result.status,
        data: result.data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Edge Function Error]', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
