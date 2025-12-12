/**
 * Capability Types
 * Defines reusable functions, services, and integrations
 */

export type CapabilityCategory = 
  | "AI" 
  | "Integration" 
  | "UI Component" 
  | "Business Logic"
  | "Authentication"
  | "Data Management"
  | "Security"
  | "Platform"
  | "Core Auth";  // New category for required auth capabilities

export type CapabilityScope = "platform" | "app-specific";

/**
 * Visibility determines who can see and use a capability
 * - internal: Only platform team (tenant-management, permissions-rbac, etc.)
 * - partner: Partners and internal team (erp-system-management, supplier-evaluation)
 * - public: All customers (task-management, document-management, etc.)
 */
export type CapabilityVisibility = "internal" | "partner" | "public";

export interface Capability {
  id: string;
  key: string; // e.g., "ai-text-generation"
  name: string;
  description: string | null;
  category: CapabilityCategory;
  
  // Scope & Visibility
  scope: CapabilityScope;
  app_definition_id: string | null; // Only for app-specific capabilities
  visibility: CapabilityVisibility; // Who can see/use this capability
  is_core: boolean; // If true, always included in customer apps
  
  // Versioning
  current_version: string;
  is_active: boolean;
  
  // Metadata
  estimated_dev_hours: number | null;
  price_per_month: number | null;
  dependencies: string[]; // Array of capability keys
  
  // Demo & Preview
  demo_url: string | null;
  documentation_url: string | null;
  documentation_path: string | null; // Path to markdown file (e.g., "docs/capabilities/ai-generation.md")
  icon_name: string | null;
  preview_bundle_url: string | null; // URL to preview/demo bundle
  config_schema: Record<string, any> | null; // JSON Schema for configuration
  
  // Tags for search
  tags: string[];
  
  // Technical implementation details (visible to platform admins)
  frontend_files: string[]; // Frontend file paths
  backend_files: string[]; // Backend file paths (edge functions, etc)
  hooks: string[]; // Hook identifiers
  domain_tables: string[]; // Database tables used
  database_migrations: string[]; // Migration file references
  
  // Input/Output types for capability chaining
  output_types: CapabilityIOType[]; // What this capability produces
  input_types: CapabilityIOType[]; // What this capability accepts
  destination_config: DestinationConfig | null; // Default routing configuration
  
  created_at: string;
  updated_at: string;
  
  // Relations (populated)
  usage_count?: number; // How many apps use this capability
}

/**
 * Data types that capabilities can produce or consume
 */
export type CapabilityIOType = 'text' | 'json' | 'file' | 'image' | 'structured_data';

/**
 * Destination configuration for capability output routing
 */
export interface DestinationConfig {
  default_destination?: string;
  available_destinations?: ('content_library' | 'integration' | 'capability' | 'webhook')[];
  auto_store?: boolean;
}

/**
 * Types of destinations for capability output
 */
export type DestinationType = 'capability' | 'integration' | 'webhook' | 'create_workflow';

/**
 * A destination where capability output can be routed
 */
export interface CapabilityDestination {
  id: string;
  source_capability_id: string;
  destination_type: DestinationType;
  destination_id: string | null; // capability_id or integration_definition_id
  destination_url: string | null; // For custom webhooks
  config: Record<string, unknown>;
  priority: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  
  // Populated fields
  destination_capability?: Capability;
  destination_integration?: {
    id: string;
    key: string;
    name: string;
    type: string;
  };
}

export interface CapabilityVersion {
  id: string;
  capability_id: string;
  version: string;
  
  // What changed
  changelog: string | null;
  breaking_changes: boolean;
  
  // Implementation details
  code_reference: string | null;
  edge_functions: string[];
  database_migrations: string[];
  
  released_at: string;
  deprecated_at: string | null;
  end_of_life_at: string | null;
}

export interface TenantCapability {
  id: string;
  tenant_id: string;
  capability_id: string;
  
  // Version management
  version_locked: string | null;
  auto_update: boolean;
  version_locked_until: string | null;
  
  // Configuration
  is_enabled: boolean;
  config: Record<string, any>;
  
  // Audit
  activated_at: string;
  activated_by: string | null;
  last_used_at: string | null;
  
  // Populated
  capability?: Capability;
}

export interface CustomerAppProject {
  id: string;
  tenant_id: string;
  
  name: string;
  description: string | null;
  
  // App configuration
  subdomain: string | null;
  
  // Status
  status: 'planning' | 'building' | 'preview' | 'approved' | 'production';
  
  // Selected capabilities
  selected_capabilities: Array<{
    capability_id: string;
    version: string;
  }>;
  
  // Estimates
  estimated_hours: number | null;
  estimated_cost: number | null;
  
  // Workflow
  approved_at: string | null;
  approved_by: string | null;
  deployed_to_preview_at: string | null;
  deployed_to_production_at: string | null;
  
  // Theme/branding
  branding: Record<string, any> | null;
  
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface AppCapabilityUsage {
  id: string;
  app_definition_id: string;
  capability_id: string;
  is_required: boolean;
  config_schema: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  
  // Populated
  capability?: Capability;
}

export interface CapabilityFilters {
  category?: CapabilityCategory;
  query?: string;
  tags?: string[];
  isActive?: boolean;
  scope?: CapabilityScope;
  visibility?: CapabilityVisibility;
  isCore?: boolean;
  appDefinitionId?: string;
}

export interface CapabilityInput {
  key: string;
  name: string;
  description?: string;
  category: CapabilityCategory;
  scope?: CapabilityScope;
  visibility?: CapabilityVisibility;
  is_core?: boolean;
  app_definition_id?: string | null;
  current_version?: string;
  estimated_dev_hours?: number;
  price_per_month?: number;
  dependencies?: string[];
  demo_url?: string;
  documentation_url?: string;
  documentation_path?: string; // Path to markdown documentation file
  icon_name?: string;
  preview_bundle_url?: string;
  config_schema?: Record<string, any>;
  tags?: string[];
  code_reference?: string;
  frontend_files?: string[];
  backend_files?: string[];
  hooks?: string[];
  domain_tables?: string[];
  database_migrations?: string[];
  // Input/Output types for capability chaining
  output_types?: CapabilityIOType[];
  input_types?: CapabilityIOType[];
  destination_config?: DestinationConfig;
}

// ============================================================================
// Capability Bundles - Pre-configured groups of capabilities
// ============================================================================

export interface CapabilityBundle {
  id: string;
  key: string;
  name: string;
  description: string | null;
  capabilities: string[]; // Array of capability keys
  suggested_config: Record<string, any>;
  target_industries: string[];
  price_per_month: number | null;
  icon_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CapabilityBundleInput {
  key: string;
  name: string;
  description?: string;
  capabilities: string[];
  suggested_config?: Record<string, any>;
  target_industries?: string[];
  price_per_month?: number;
  icon_name?: string;
}

// ============================================================================
// Workflow Templates (uses existing workflow_templates table)
// See: supabase/migrations/20251126000001_workshop_integration.sql
// ============================================================================

export type WorkflowCategory = 'workshop' | 'crm_sync' | 'erp_sync' | 'alerts' | 'custom';

export interface WorkflowTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: WorkflowCategory;
  n8n_workflow_id: string | null;
  n8n_webhook_path: string | null;
  required_systems: string[];
  required_credentials: string[];
  input_schema: Record<string, any> | null;
  output_schema: Record<string, any> | null;
  default_mapping: Record<string, any> | null;
  schedule_options: string[];
  documentation_url: string | null;
  example_output: Record<string, any> | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantWorkflow {
  id: string;
  tenant_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  credentials_config: Record<string, any> | null;
  schedule: string | null;
  custom_mapping: Record<string, any> | null;
  webhook_secret: string | null;
  is_active: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
  
  // Populated
  template?: WorkflowTemplate;
}
