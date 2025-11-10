import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * Tenant System Instance
 * Represents a tenant's installation of an external system
 * @deprecated Use TenantSystem instead - being phased out for naming consistency
 */
export type TenantExternalSystem = TenantSystem;

/**
 * Tenant System Instance
 * Represents a tenant's installation/configuration of an external system
 */
export interface TenantSystem extends BaseEntity {
  tenant_id: string;
  external_system_id: string;
  sku_id: string | null;
  enabled_modules: string[];
  domain: string | null;
  configuration_state: ConfigurationState;
  mcp_enabled: boolean;
  version: string | null;
  environment: string | null;
  notes: string | null;
}

export type ConfigurationState = "draft" | "active" | "suspended" | "archived";

export const tenantSystemSchema = z.object({
  external_system_id: z.string().uuid("Invalid product ID"),
  sku_id: z.string().uuid().optional().or(z.literal("")),
  enabled_modules: z.array(z.string()).default([]),
  domain: z.string().max(255).optional().or(z.literal("")),
  configuration_state: z.enum(["draft", "active", "suspended", "archived"]).default("draft"),
  mcp_enabled: z.boolean().default(false),
  version: z.string().max(50).optional().or(z.literal("")),
  environment: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type TenantSystemInput = z.infer<typeof tenantSystemSchema>;

// Deprecated aliases for backward compatibility
export const tenantExternalSystemSchema = tenantSystemSchema;
export type TenantExternalSystemInput = TenantSystemInput;
