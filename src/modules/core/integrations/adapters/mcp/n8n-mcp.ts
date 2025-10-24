/**
 * N8N MCP Adapter
 * Wrapper for MCP Client specifically for n8n integration
 */

import { McpClient } from './mcpClient';
import type { McpToolListResponse, McpInvokeResponse } from './mcpClient';

export interface N8nMcpConfig {
  baseUrl: string;
  apiKey: string;
}

export interface N8nMcpAdapter {
  id: string;
  listTools: () => Promise<McpToolListResponse>;
  invoke: <T = any>(tool: string, params?: Record<string, any>) => Promise<McpInvokeResponse<T>>;
}

/**
 * Create N8N MCP Adapter instance
 */
export function createN8nMcpAdapter(
  config: N8nMcpConfig,
  tenantId?: string
): N8nMcpAdapter {
  const client = new McpClient(config.baseUrl, config.apiKey, tenantId);

  return {
    id: 'n8n-mcp',
    listTools: () => client.listTools(),
    invoke: <T = any>(tool: string, params?: Record<string, any>) => 
      client.invoke<T>(tool, params),
  };
}
