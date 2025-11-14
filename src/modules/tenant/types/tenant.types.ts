import { BaseEntity } from "@/core/types/common.types";

/**
 * Tenant Configuration
 * Defines the structure for each tenant in the platform
 */
export interface TenantConfig extends BaseEntity {
  tenant_id: string;
  name: string;
  slug?: string; // Tenant slug for URL override (e.g., "innowin-as", "ag-jacobsen-consulting")
  host: string;
  domain?: string; // Custom domain (e.g., customer.com)
  subdomain?: string; // Subdomain (e.g., customer.platform.com)
  database_schema?: string;
  enabled_modules: string[];
  custom_config: Record<string, any>;
  is_platform_tenant?: boolean; // Flag indicating if this is the platform meta-tenant
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  features?: {
    ai_enabled?: boolean;
    integrations_enabled?: boolean;
    custom_modules?: string[];
  };
  limits?: {
    max_users?: number;
    max_projects?: number;
    max_storage_mb?: number;
  };
}

/**
 * Request Context
 * Built from incoming requests to identify tenant and user
 */
export interface RequestContext {
  tenant_id: string;
  tenant: TenantConfig;
  user_id?: string;
  user_role?: string;
  request_id: string;
  timestamp: string;
}

/**
 * Tenant Connection Cache
 * For managing database connections per tenant
 */
export interface TenantConnection {
  tenant_id: string;
  connection_string?: string;
  last_accessed: string;
  is_active: boolean;
}

/**
 * Module Activation Status per Tenant
 */
export interface TenantModuleStatus {
  tenant_id: string;
  module_name: string;
  enabled: boolean;
  config?: Record<string, any>;
}
