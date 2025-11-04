/**
 * N8N Integration Service Types
 * Type definitions for n8n integration
 */

export interface N8nTriggerOptions {
  tenantId: string;
  userId?: string;
  roles: string[];
  requestId: string;
  workflowKey: string;
  action: string;
  input: Record<string, any>;
  idempotencyKey?: string;
}

export interface N8nTriggerResult {
  ok: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  runId?: string;
  status?: 'succeeded' | 'in_progress' | 'failed';
}

export interface IntegrationRunRecord {
  id: string;
  tenant_id: string;
  provider: string;
  workflow_key: string;
  request_id: string;
  action_name: string;
  status: string;
  started_at: string;
  finished_at?: string;
  http_status?: number;
  error_message?: string;
  response_json?: any;
  external_run_id?: string;
  idempotency_key?: string;
}

/**
 * Trigger an n8n workflow with retry logic
 * Note: webhookUrl must be resolved by caller
 */
export async function triggerN8nWorkflow(
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
    })
    .select()
    .single();

  if (insertError) {
    console.error('[N8nService] Failed to create integration_run:', insertError);
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

  // Trigger n8n with retry logic
  let lastError: any = null;
  const maxRetries = 2;
  const backoffMs = [250, 750];

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

        await supabase
          .from('integration_run')
          .update({
            status: 'succeeded',
            http_status: httpStatus,
            finished_at: new Date().toISOString(),
            response_json: responseData,
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
        console.warn(`[N8nService] Attempt ${attempt + 1} failed, retrying...`, err.message);
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

/**
 * Process n8n callback
 */
export async function processN8nCallback(
  supabase: any,
  callbackData: {
    request_id?: string;
    run_id?: string;
    status: 'succeeded' | 'failed';
    external_run_id?: string;
    result?: any;
    error?: { message: string; code?: string };
  }
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  const { request_id, run_id, status, external_run_id, result, error } = callbackData;

  console.log(JSON.stringify({
    level: 'info',
    event: 'mcp.integration.callback.received',
    request_id,
    run_id,
    status,
  }));

  // Locate integration_run record
  let query = supabase.from('integration_run').select('*');

  if (run_id) {
    query = query.eq('id', run_id);
  } else if (request_id) {
    query = query.eq('request_id', request_id);
  } else {
    return {
      ok: false,
      error: {
        code: 'CALLBACK_UPDATE_ERROR',
        message: 'Either run_id or request_id must be provided',
      },
    };
  }

  const { data: runRecords, error: fetchError } = await query;

  if (fetchError || !runRecords || runRecords.length === 0) {
    console.error('[N8nService] Integration run not found:', { run_id, request_id });
    return {
      ok: false,
      error: {
        code: 'CALLBACK_UPDATE_ERROR',
        message: 'Integration run not found',
      },
    };
  }

  const runRecord = runRecords[0];

  // Update the record
  const updateData: any = {
    status,
    finished_at: new Date().toISOString(),
  };

  if (external_run_id) {
    updateData.external_run_id = external_run_id;
  }

  if (status === 'succeeded' && result) {
    updateData.response_json = result;
  }

  if (status === 'failed' && error) {
    updateData.error_message = error.message;
  }

  const { error: updateError } = await supabase
    .from('integration_run')
    .update(updateData)
    .eq('id', runRecord.id);

  if (updateError) {
    console.error('[N8nService] Failed to update integration_run:', updateError);
    return {
      ok: false,
      error: {
        code: 'CALLBACK_UPDATE_ERROR',
        message: 'Failed to update integration run',
      },
    };
  }

  return { ok: true };
}
