import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * Tenant External System Instance
 * Replaces company_apps with proper tenant isolation
 */
export interface TenantExternalSystem extends BaseEntity {
  tenant_id: string;
  app_product_id: string;
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

export const tenantExternalSystemSchema = z.object({
  app_product_id: z.string().uuid("Invalid product ID"),
  sku_id: z.string().uuid().optional().or(z.literal("")),
  enabled_modules: z.array(z.string()).default([]),
  domain: z.string().max(255).optional().or(z.literal("")),
  configuration_state: z.enum(["draft", "active", "suspended", "archived"]).default("draft"),
  mcp_enabled: z.boolean().default(false),
  version: z.string().max(50).optional().or(z.literal("")),
  environment: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type TenantExternalSystemInput = z.infer<typeof tenantExternalSystemSchema>;
