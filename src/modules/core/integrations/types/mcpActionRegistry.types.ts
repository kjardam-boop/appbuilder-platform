import type { BaseEntity } from "@/core/types/common.types";

/**
 * MCP Action Registry Entry
 */
export interface McpActionRegistry extends BaseEntity {
  adapter_id: string;
  action_name: string;
  description: string | null;
  parameters: Record<string, any>;
  required_scopes: string[];
  is_enabled_by_default: boolean;
}

export interface McpActionRegistryInput {
  adapter_id: string;
  action_name: string;
  description?: string;
  parameters?: Record<string, any>;
  required_scopes?: string[];
  is_enabled_by_default?: boolean;
}
