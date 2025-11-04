/**
 * MCP Client
 * HTTP client for calling n8n MCP Server with optional HMAC signing
 */

import { signPayload } from '@/modules/core/mcp/utils/hmacSign';

export interface McpToolListResponse {
  ok: boolean;
  data?: {
    tools: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, any>;
    }>;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface McpInvokeResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class McpClient {
  private baseUrl: string;
  private apiKey: string;
  private tenantId: string;
  private signingSecret?: string;

  constructor(
    baseUrl: string, 
    apiKey: string, 
    tenantId: string = "unknown",
    signingSecret?: string
  ) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
    this.tenantId = tenantId;
    this.signingSecret = signingSecret;
  }

  /**
   * Get common headers for all requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Tenant-Id': this.tenantId,
    };
  }

  /**
   * List available tools from MCP server
   */
  async listTools(): Promise<McpToolListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/tools`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          error: {
            code: `HTTP_${response.status}`,
            message: `Failed to list tools: ${response.statusText}`,
            details: errorText,
          },
        };
      }

      const data = await response.json();
      return {
        ok: true,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }

  /**
   * Invoke a tool on the MCP server with optional HMAC signing
   */
  async invoke<T = any>(
    tool: string,
    params?: Record<string, any>
  ): Promise<McpInvokeResponse<T>> {
    try {
      const body = JSON.stringify({ tool, params });
      const headers = { ...this.getHeaders() };
      const requestId = crypto.randomUUID();
      
      headers['X-Request-Id'] = requestId;

      // Add HMAC signature if signing secret is configured
      if (this.signingSecret) {
        const signature = await signPayload(this.signingSecret, body);
        headers['X-MCP-Signature'] = signature;
        headers['X-MCP-Tenant'] = this.tenantId;

        console.log(JSON.stringify({
          level: 'info',
          msg: 'mcp.secret.used_outbound',
          tenant_id: this.tenantId,
          tool,
          request_id: requestId,
          signed: true,
        }));
      }

      const response = await fetch(`${this.baseUrl}/invoke`, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          error: {
            code: `HTTP_${response.status}`,
            message: `Failed to invoke tool '${tool}': ${response.statusText}`,
            details: errorText,
          },
        };
      }

      const data = await response.json();
      return {
        ok: true,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }
}
