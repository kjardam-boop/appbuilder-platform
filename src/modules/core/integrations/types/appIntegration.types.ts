import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";
import { IntegrationDirection } from "./companyIntegration.types";

/**
 * App Integration - Integration instance at application level
 */
export interface AppIntegration extends BaseEntity {
  app_id: string;
  company_integration_id: string | null;
  tenant_integration_id: string | null;
  integration_definition_id: string;
  active_delivery_method: string;
  direction: IntegrationDirection;
  config: Record<string, any>;
  credentials: Record<string, any> | null;
  is_active: boolean;
  override_parent_config: boolean;
  notes: string | null;
}

export interface AppIntegrationWithRelations extends AppIntegration {
  app_name?: string;
  integration_name?: string;
  delivery_method_name?: string;
  parent_name?: string;
}

export const appIntegrationSchema = z.object({
  app_id: z.string().uuid("Invalid app ID"),
  company_integration_id: z.string().uuid().optional().or(z.literal("")),
  tenant_integration_id: z.string().uuid().optional().or(z.literal("")),
  integration_definition_id: z.string().uuid("Invalid integration definition ID"),
  active_delivery_method: z.string().min(1, "Delivery method required"),
  direction: z.enum(['inbound', 'outbound', 'bidirectional']).default('bidirectional'),
  config: z.record(z.any()).default({}),
  credentials: z.record(z.any()).optional(),
  override_parent_config: z.boolean().default(false),
  notes: z.string().max(1000).optional().or(z.literal("")),
}).refine(
  (data) => data.company_integration_id || data.tenant_integration_id,
  { message: "Either company_integration_id or tenant_integration_id must be provided" }
);

export type AppIntegrationInput = z.infer<typeof appIntegrationSchema>;
