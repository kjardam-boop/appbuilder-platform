/**
 * AI MCP Integration Types
 * Types for AI agents using MCP tools
 */

export interface AIMcpChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  tenantId: string;
  systemPrompt?: string;
}

export interface AIMcpChatResponse {
  response: string;
  tokensUsed?: number;
  toolCallsMade?: number;
  fallbackApplied?: boolean; // ⭐ Track if backend fallback was applied
}

export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export const AVAILABLE_MCP_TOOLS: McpTool[] = [
  {
    name: 'search_content_library',
    description: 'Search tenant Knowledge Base for company information',
    parameters: {
      query: 'Search query (required)',
      category: 'Optional category filter'
    }
  },
  {
    name: 'list_companies',
    description: 'List and search companies',
    parameters: {
      q: 'Search query (optional)',
      limit: 'Max results (default 25)'
    }
  },
  {
    name: 'list_projects',
    description: 'List tenant projects',
    parameters: {
      q: 'Search query (optional)',
      limit: 'Max results (default 25)'
    }
  },
  {
    name: 'list_tasks',
    description: 'List tenant tasks',
    parameters: {
      q: 'Search query (optional)',
      limit: 'Max results (default 25)'
    }
  },
  {
    name: 'list_applications',
    description: 'List available applications (ERP, CRM, etc)',
    parameters: {
      q: 'Search query (optional)',
      limit: 'Max results (default 25)'
    }
  },
  {
    name: 'get_company',
    description: 'Get company details by ID',
    parameters: {
      id: 'Company UUID (required)'
    }
  },
  {
    name: 'get_project',
    description: 'Get project details by ID',
    parameters: {
      id: 'Project UUID (required)'
    }
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    parameters: {
      title: 'Project title (required)',
      description: 'Project description (required)',
      company_id: 'Company UUID (optional)'
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task',
    parameters: {
      title: 'Task title (required)',
      description: 'Task description (optional)',
      project_id: 'Project UUID (required)',
      priority: 'low, medium, or high (optional)'
    }
  },
  {
    name: 'search_companies',
    description: 'Search companies by name or org_number',
    parameters: {
      query: 'Search query (required)',
      limit: 'Max results (default 10)'
    }
  }
];
