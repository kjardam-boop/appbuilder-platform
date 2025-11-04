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
  | "Platform";

export type CapabilityScope = "platform" | "app-specific";

export interface Capability {
  id: string;
  key: string; // e.g., "ai-text-generation"
  name: string;
  description: string | null;
  category: CapabilityCategory;
  
  // Scope
  scope: CapabilityScope;
  app_definition_id: string | null; // Only for app-specific capabilities
  
  // Versioning
  current_version: string;
  is_active: boolean;
  
  // Metadata
  estimated_dev_hours: number | null;
  price_per_month: number | null;
  dependencies: string[]; // Array of capability keys
  
  // Demo
  demo_url: string | null;
  documentation_url: string | null;
  icon_name: string | null;
  
  // Tags for search
  tags: string[];
  
  // Technical implementation details (visible to platform admins)
  frontend_files: string[]; // Frontend file paths
  backend_files: string[]; // Backend file paths (edge functions, etc)
  hooks: string[]; // Hook identifiers
  domain_tables: string[]; // Database tables used
  database_migrations: string[]; // Migration file references
  
  created_at: string;
  updated_at: string;
  
  // Relations (populated)
  usage_count?: number; // How many apps use this capability
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
  appDefinitionId?: string;
}

export interface CapabilityInput {
  key: string;
  name: string;
  description?: string;
  category: CapabilityCategory;
  scope?: CapabilityScope;
  app_definition_id?: string | null;
  current_version?: string;
  estimated_dev_hours?: number;
  price_per_month?: number;
  dependencies?: string[];
  demo_url?: string;
  documentation_url?: string;
  icon_name?: string;
  tags?: string[];
  code_reference?: string;
  frontend_files?: string[];
  backend_files?: string[];
  hooks?: string[];
  domain_tables?: string[];
  database_migrations?: string[];
}
