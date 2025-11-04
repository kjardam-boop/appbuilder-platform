/**
 * MCP Server Types
 * Core types for MCP (Model Context Protocol) server implementation
 */

export type McpResourceType = 
  | 'company' 
  | 'supplier' 
  | 'project' 
  | 'task' 
  | 'external_system' 
  | 'application';

export type McpActionStatus = 'success' | 'error' | 'pending';

export interface McpContext {
  tenant_id: string;
  user_id?: string;
  roles: string[];
  request_id: string;
  timestamp: string;
}

export interface McpActionLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  action_name: string;
  payload_json?: any;
  result_json?: any;
  status: McpActionStatus;
  error_message?: string;
  duration_ms?: number;
  idempotency_key?: string;
  request_id?: string;
  policy_result?: any;
  created_at: string;
}

export const VALID_RESOURCE_TYPES = [
  'company',
  'supplier',
  'project',
  'task',
  'external_system',
  'application'
] as const;

export type ValidResourceType = typeof VALID_RESOURCE_TYPES[number];

export interface McpCursor {
  id: string;
  created_at: string;
}

export interface McpActionHandler {
  name: string;
  description: string;
  schema: any; // Zod schema for validation
  execute: (ctx: McpContext, params: any) => Promise<any>;
}

export interface McpResource {
  type: McpResourceType;
  operations: ('list' | 'get')[];
}

export interface McpAction {
  name: string;
  description: string;
}

export interface McpManifest {
  version: string;
  protocol: string;
  resources: McpResource[];
  actions: McpAction[];
}

export interface McpResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface McpListParams {
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface McpListResponse<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
}

export type McpPolicyDecision = 'allowed' | 'denied' | 'skipped';

export interface McpPolicyResult {
  decision: McpPolicyDecision;
  reason?: string;
  checked_roles: string[];
  checked_at: string;
  matched_rule?: McpPolicyRule;
}

export type McpPolicyRule = {
  role: string | string[];
  resource?: string | string[];
  action?: string | string[];
  effect: 'allow' | 'deny';
  conditions?: {
    tenantMatch?: boolean;
    ownerOnly?: boolean;
  };
};

export type McpPolicySet = McpPolicyRule[];
