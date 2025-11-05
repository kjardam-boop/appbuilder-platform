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
  // 1. Fetch webhook_path from workflow mapping
  const { data: mapping, error: mappingError } = await supabase
    .from('mcp_tenant_workflow_map')
    .select('webhook_path')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('workflow_key', workflowKey)
    .eq('is_active', true)
    .maybeSingle();

  if (mappingError) {
    console.error('[tenantWorkflowService] Error resolving webhook:', mappingError);
    return null;
  }

  if (!mapping) {
    console.log(`[tenantWorkflowService] No mapping found for workflow: ${workflowKey}`);
    return null;
  }

  // 2. Fetch Base URL from tenant_integrations
  const { data: integration, error: integrationError } = await supabase
    .from('tenant_integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('adapter_id', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (integrationError) {
    console.error('[tenantWorkflowService] Error fetching integration config:', integrationError);
  }

  // 3. Extract base URL (prioritize database, fallback to env)
  const baseUrl = (integration?.config as any)?.n8n_mcp_url || import.meta.env.VITE_N8N_BASE_URL;
  
  if (!baseUrl) {
    console.warn('[tenantWorkflowService] N8N Base URL not configured in database or environment');
    return null;
  }

  // 4. Combine base URL with webhook path
  const fullUrl = `${baseUrl}${mapping.webhook_path}`;
  console.log(`[tenantWorkflowService] Resolved webhook URL: ${fullUrl}`);
  return fullUrl;
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
