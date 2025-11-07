import { supabase } from '@/integrations/supabase/client';

export interface Tool {
  key: string;
  displayName: string;
  description: string;
  category: string;
  inputSchema: any;
  requiresIntegration: boolean;
  requiredAdapterId?: string;
}

/**
 * Fetch available tools for a tenant
 * Filters based on tenant_integrations if tool requires integration
 */
export async function getAvailableTools(tenantId: string): Promise<Tool[]> {
  // 1. Get all active tools from registry
  const { data: tools, error: toolsError } = await supabase
    .from('mcp_tool_registry')
    .select('*')
    .eq('is_active', true);

  if (toolsError) throw toolsError;

  // 2. Get tenant's active integrations
  const { data: integrations, error: intError } = await supabase
    .from('tenant_integrations')
    .select('adapter_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (intError) throw intError;

  const activeAdapterIds = new Set(integrations?.map(i => i.adapter_id) || []);

  // 3. Filter tools that don't require integration OR have required integration active
  const availableTools = tools?.filter(tool => {
    if (!tool.requires_integration) return true;
    return tool.required_adapter_id && activeAdapterIds.has(tool.required_adapter_id);
  }) || [];

  return availableTools.map(t => ({
    key: t.tool_key,
    displayName: t.display_name,
    description: t.description,
    category: t.category,
    inputSchema: t.input_schema,
    requiresIntegration: t.requires_integration,
    requiredAdapterId: t.required_adapter_id,
  }));
}
