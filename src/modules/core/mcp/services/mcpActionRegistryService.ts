/**
 * MCP Action Registry Service
 * Manages registration and discovery of Platform App MCP actions
 */

import { supabase } from '@/integrations/supabase/client';

export interface McpActionDefinition {
  key: string;
  description?: string;
  version: string;
  inputSchema?: any; // JSON Schema
  outputSchema?: any; // JSON Schema
}

export interface McpRegistryEntry {
  id: string;
  tenant_id: string;
  app_key: string;
  action_key: string;
  fq_action: string;
  version: string;
  description?: string;
  input_schema?: any;
  output_schema?: any;
  enabled: boolean;
  created_at: string;
  created_by: string;
}

export class McpActionRegistryService {
  /**
   * Register MCP actions for an app during install/upgrade
   */
  static async registerTenantActions(
    tenantId: string,
    appKey: string,
    actions: McpActionDefinition[],
    createdBy: string
  ): Promise<void> {
    if (!actions || actions.length === 0) {
      return;
    }

    const entries = actions.map(action => ({
      tenant_id: tenantId,
      app_key: appKey,
      action_key: action.key,
      fq_action: `${appKey}.${action.key}`,
      version: action.version,
      description: action.description,
      input_schema: action.inputSchema,
      output_schema: action.outputSchema,
      enabled: true,
      created_by: createdBy,
    }));

    const { error } = await supabase
      .from('mcp_action_registry')
      .upsert(entries, {
        onConflict: 'tenant_id,fq_action,version',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Failed to register MCP actions:', error);
      throw new Error(`Failed to register MCP actions: ${error.message}`);
    }

    console.log(`[MCP Registry] Registered ${actions.length} actions for ${appKey} in tenant ${tenantId}`);
  }

  /**
   * Disable all actions for an app (on uninstall or disable)
   */
  static async disableTenantAppActions(
    tenantId: string,
    appKey: string
  ): Promise<void> {
    const { error } = await supabase
      .from('mcp_action_registry')
      .update({ enabled: false })
      .eq('tenant_id', tenantId)
      .eq('app_key', appKey);

    if (error) {
      console.error('Failed to disable MCP actions:', error);
      throw new Error(`Failed to disable MCP actions: ${error.message}`);
    }

    console.log(`[MCP Registry] Disabled actions for ${appKey} in tenant ${tenantId}`);
  }

  /**
   * List all registered actions for a tenant
   */
  static async listActions(
    tenantId: string,
    filters?: { appKey?: string; enabled?: boolean }
  ): Promise<McpRegistryEntry[]> {
    let query = supabase
      .from('mcp_action_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.appKey) {
      query = query.eq('app_key', filters.appKey);
    }

    if (filters?.enabled !== undefined) {
      query = query.eq('enabled', filters.enabled);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to list MCP actions:', error);
      throw new Error(`Failed to list MCP actions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific action (latest version if not specified)
   */
  static async getAction(
    tenantId: string,
    fqAction: string,
    version?: string
  ): Promise<McpRegistryEntry | null> {
    let query = supabase
      .from('mcp_action_registry')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('fq_action', fqAction)
      .eq('enabled', true);

    if (version) {
      query = query.eq('version', version);
    } else {
      // Get latest version
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Failed to get MCP action:', error);
      throw new Error(`Failed to get MCP action: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Validate payload against stored input schema
   */
  static validatePayload(
    action: McpRegistryEntry,
    payload: any
  ): { valid: boolean; errors?: string[] } {
    if (!action.input_schema) {
      return { valid: true };
    }

    // Simple validation for now
    // In production, use a JSON Schema validator like Ajv
    const required = action.input_schema.required || [];
    const errors: string[] = [];

    for (const field of required) {
      if (!(field in payload)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check payload size
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 256 * 1024) { // 256KB
      errors.push('Payload exceeds 256KB limit');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get output schema for an action
   */
  static getOutputSchema(action: McpRegistryEntry): any {
    return action.output_schema;
  }
}
