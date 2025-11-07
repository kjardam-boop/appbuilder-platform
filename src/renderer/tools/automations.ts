import { supabase } from '@/integrations/supabase/client';
import type { ToolExecutionResult } from './toolExecutor';

/**
 * Enqueue a job to n8n workflow
 * Uses tenant's n8n integration from tenant_integrations + mcp_tenant_workflow_map
 */
export async function automationsEnqueueJob(
  tenantId: string,
  params: { event: string; payload: Record<string, any> }
): Promise<ToolExecutionResult> {
  try {
    // 1. Get tenant's n8n integration
    const { data: integration, error: intError } = await supabase
      .from('tenant_integrations')
      .select('config, credentials')
      .eq('tenant_id', tenantId)
      .eq('adapter_id', 'n8n-mcp')
      .eq('is_active', true)
      .maybeSingle();

    if (intError) throw intError;
    if (!integration) {
      return {
        ok: false,
        error: {
          code: 'N8N_NOT_CONFIGURED',
          message: 'n8n integration not configured for this tenant',
        },
      };
    }

    // 2. Get workflow mapping
    const { data: workflow, error: workflowError } = await supabase
      .from('mcp_tenant_workflow_map')
      .select('webhook_path')
      .eq('tenant_id', tenantId)
      .eq('provider', 'n8n')
      .eq('workflow_key', params.event)
      .maybeSingle();

    if (workflowError) throw workflowError;
    if (!workflow) {
      return {
        ok: false,
        error: {
          code: 'WEBHOOK_NOT_CONFIGURED',
          message: `No webhook configured for event '${params.event}'`,
        },
      };
    }

    // 3. Call n8n webhook
    const config = integration.config as any;
    const webhookUrl = `${config.n8n_base_url}${workflow.webhook_path}`;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        event: params.event,
        payload: params.payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: 'N8N_ERROR',
          message: `n8n returned ${response.status}: ${response.statusText}`,
        },
      };
    }

    const result = await response.json();
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'AUTOMATION_FAILED',
        message: err instanceof Error ? err.message : 'Failed to enqueue job',
      },
    };
  }
}
