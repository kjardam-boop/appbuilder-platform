/**
 * Integration Registry Types
 * Unified types for all integration types with hierarchical scope support
 */

import { z } from "zod";

// ============================================================================
// Integration Types
// ============================================================================

export type IntegrationType = 'ai_provider' | 'workflow' | 'direct_api' | 'mcp_tool';

export type IntegrationScopeType = 'platform' | 'tenant' | 'app' | 'capability';

// ============================================================================
// Integration Definition (catalog entry)
// ============================================================================

export interface IntegrationDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: IntegrationType;
  category_id: string | null;
  vendor_id: string | null;
  external_system_id: string | null;
  supported_delivery_methods: string[];
  default_delivery_method: string | null;
  icon_name: string;
  documentation_url: string | null;
  setup_guide_url: string | null;
  requires_credentials: boolean;
  credential_fields: CredentialField[];
  default_config: Record<string, any>;
  capabilities: Record<string, any>;
  tags: string[];
  // Workflow-specific
  n8n_workflow_id: string | null;
  n8n_webhook_path: string | null;
  workflow_json: Record<string, any> | null;
  last_synced_at: string | null;
  sync_status: 'draft' | 'pushed' | 'synced' | 'outdated' | null;
  // MCP-specific
  mcp_enabled: boolean;
  available_trigger_methods: ('webhook' | 'mcp' | 'schedule' | 'form' | 'chat')[];
  mcp_description: string | null;
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'secret' | 'url' | 'number' | 'boolean' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

// ============================================================================
// Tenant Integration (per-tenant config with scope)
// ============================================================================

export interface TenantIntegrationWithScope {
  id: string;
  tenant_id: string;
  adapter_id: string;
  config: Record<string, any>;
  credentials: Record<string, string> | null;
  rate_limit: RateLimitConfig | null;
  scope_type: IntegrationScopeType;
  scope_id: string | null;
  priority: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RateLimitConfig {
  requests_per_minute?: number;
  requests_per_hour?: number;
  requests_per_day?: number;
}

// ============================================================================
// Effective Integration (resolved from hierarchy)
// ============================================================================

export interface EffectiveIntegration extends TenantIntegrationWithScope {
  integration_name: string;
  integration_type: IntegrationType;
  icon_name: string;
}

// ============================================================================
// n8n Workflow Sync
// ============================================================================

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: Record<string, any>;
  settings: Record<string, any>;
  staticData: any;
  tags: { name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface N8nSyncResult {
  success: boolean;
  workflow_id?: string;
  webhook_path?: string;
  error?: string;
}

// ============================================================================
// Input Schemas
// ============================================================================

export const integrationDefinitionInputSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['ai_provider', 'workflow', 'direct_api', 'mcp_tool']),
  icon_name: z.string().default('Plug'),
  requires_credentials: z.boolean().default(true),
  credential_fields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'secret', 'url', 'number', 'boolean', 'select']),
    required: z.boolean(),
    placeholder: z.string().optional(),
    options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  })).default([]),
  default_config: z.record(z.any()).default({}),
  n8n_workflow_id: z.string().optional(),
  n8n_webhook_path: z.string().optional(),
  workflow_json: z.record(z.any()).optional(),
  mcp_enabled: z.boolean().default(false),
  available_trigger_methods: z.array(z.enum(['webhook', 'mcp', 'schedule', 'form', 'chat'])).default(['webhook']),
  mcp_description: z.string().optional(),
});

export type IntegrationDefinitionInput = z.infer<typeof integrationDefinitionInputSchema>;

export const tenantIntegrationInputSchema = z.object({
  tenant_id: z.string().uuid(),
  adapter_id: z.string(),
  config: z.record(z.any()),
  credentials: z.record(z.string()).optional(),
  scope_type: z.enum(['platform', 'tenant', 'app', 'capability']).default('tenant'),
  scope_id: z.string().uuid().optional(),
  priority: z.number().int().default(0),
  rate_limit: z.object({
    requests_per_minute: z.number().optional(),
    requests_per_hour: z.number().optional(),
    requests_per_day: z.number().optional(),
  }).optional(),
});

export type TenantIntegrationInput = z.infer<typeof tenantIntegrationInputSchema>;

// ============================================================================
// Filter Types
// ============================================================================

export interface IntegrationFilters {
  type?: IntegrationType | IntegrationType[];
  is_active?: boolean;
  has_n8n_workflow?: boolean;
  category_id?: string;
}

export interface TenantIntegrationFilters {
  tenant_id: string;
  scope_type?: IntegrationScopeType;
  scope_id?: string;
  adapter_id?: string;
  is_active?: boolean;
}

