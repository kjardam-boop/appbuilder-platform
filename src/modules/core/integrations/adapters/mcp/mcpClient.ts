/**
 * MCP Client
 * HTTP client for calling n8n MCP Server
 */

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

  constructor(baseUrl: string, apiKey: string, tenantId: string = "unknown") {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
    this.tenantId = tenantId;
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
   * Invoke a tool on the MCP server
   */
  async invoke<T = any>(
    tool: string,
    params?: Record<string, any>
  ): Promise<McpInvokeResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}/invoke`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ tool, params }),
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
