/**
 * Tenant Workflow Service
 * Manages tenant-specific n8n workflow mappings
 */

import { supabase } from '@/integrations/supabase/client';

export interface WorkflowMappingRow {
  id: string;
  tenant_id: string;
  provider: string;
  workflow_key: string;
  webhook_path: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Resolve webhook URL for a workflow
 * Checks tenant-specific mapping first, falls back to static config
 */
export async function resolveWebhook(
  tenantId: string,
  provider: string,
  workflowKey: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('mcp_tenant_workflow_map')
    .select('webhook_path')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('workflow_key', workflowKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[tenantWorkflowService] Error resolving webhook:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Compose full URL
  const baseUrl = import.meta.env.VITE_N8N_BASE_URL;
  if (!baseUrl) {
    console.warn('[tenantWorkflowService] N8N_BASE_URL not configured');
    return null;
  }

  return `${baseUrl}${data.webhook_path}`;
}

/**
 * List all workflow mappings for a tenant
 */
export async function listWorkflows(tenantId: string): Promise<WorkflowMappingRow[]> {
  const { data, error } = await supabase
    .from('mcp_tenant_workflow_map')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[tenantWorkflowService] Error listing workflows:', error);
    throw error;
  }

  return data || [];
}

/**
 * Upsert a workflow mapping
 */
export async function upsertWorkflowMap(
  tenantId: string,
  payload: {
    workflow_key: string;
    provider?: string;
    webhook_path: string;
    description?: string;
    is_active?: boolean;
    created_by: string;
  }
): Promise<WorkflowMappingRow> {
  const provider = payload.provider || 'n8n';

  // Check if mapping exists
  const { data: existing } = await supabase
    .from('mcp_tenant_workflow_map')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('workflow_key', payload.workflow_key)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('mcp_tenant_workflow_map')
      .update({
        webhook_path: payload.webhook_path,
        description: payload.description,
        is_active: payload.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('mcp_tenant_workflow_map')
      .insert({
        tenant_id: tenantId,
        provider,
        workflow_key: payload.workflow_key,
        webhook_path: payload.webhook_path,
        description: payload.description,
        is_active: payload.is_active ?? true,
        created_by: payload.created_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Deactivate a workflow mapping
 */
export async function deactivateWorkflowMap(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('mcp_tenant_workflow_map')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[tenantWorkflowService] Error deactivating workflow:', error);
    throw error;
  }
}
