/**
 * Tenant Policy Service
 * Manages tenant-specific MCP policy overrides
 */

import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_POLICY } from '../policy/defaultPolicy';
import type { McpPolicySet } from '../types/mcp.types';

export interface TenantPolicyRow {
  id: string;
  tenant_id: string;
  source: string;
  policy_json: McpPolicySet;
  version: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Get the effective policy for a tenant (DEFAULT + active tenant override)
 */
export async function getActivePolicy(tenantId: string): Promise<McpPolicySet> {
  const { data, error } = await supabase
    .from('mcp_tenant_policy')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[tenantPolicyService] Error fetching active policy:', error);
    return DEFAULT_POLICY;
  }

  if (!data) {
    // No tenant override, return default
    return DEFAULT_POLICY;
  }

  // Merge: DEFAULT rules + tenant rules
  // Tenant rules come last so they can override with deny
  return [...DEFAULT_POLICY, ...(data.policy_json as McpPolicySet)];
}

/**
 * List all policies for a tenant
 */
export async function listPolicies(tenantId: string): Promise<TenantPolicyRow[]> {
  const { data, error } = await supabase
    .from('mcp_tenant_policy')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[tenantPolicyService] Error listing policies:', error);
    throw error;
  }

  return (data || []) as TenantPolicyRow[];
}

/**
 * Create or update a tenant policy (creates new version, deactivates old)
 */
export async function upsertPolicy(
  tenantId: string,
  payload: {
    policy_json: McpPolicySet;
    version: string;
    created_by: string;
  }
): Promise<TenantPolicyRow> {
  // First, deactivate all existing active policies for this tenant
  const { error: deactivateError } = await supabase
    .from('mcp_tenant_policy')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (deactivateError) {
    console.error('[tenantPolicyService] Error deactivating old policies:', deactivateError);
    throw deactivateError;
  }

  // Insert new policy
  const { data, error } = await supabase
    .from('mcp_tenant_policy')
    .insert({
      tenant_id: tenantId,
      source: 'tenant',
      policy_json: payload.policy_json as any,
      version: payload.version,
      is_active: true,
      created_by: payload.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('[tenantPolicyService] Error creating policy:', error);
    throw error;
  }

  return data as TenantPolicyRow;
}

/**
 * Deactivate a specific policy
 */
export async function deactivatePolicy(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('mcp_tenant_policy')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[tenantPolicyService] Error deactivating policy:', error);
    throw error;
  }
}

/**
 * Activate a specific policy version (deactivates others)
 */
export async function activatePolicy(id: string, tenantId: string): Promise<void> {
  // Deactivate all others first
  const { error: deactivateError } = await supabase
    .from('mcp_tenant_policy')
    .update({ is_active: false })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (deactivateError) {
    throw deactivateError;
  }

  // Activate the target
  const { error } = await supabase
    .from('mcp_tenant_policy')
    .update({ is_active: true })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    throw error;
  }
}
