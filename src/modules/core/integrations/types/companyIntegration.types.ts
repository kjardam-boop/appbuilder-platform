import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

export type IntegrationDirection = 'inbound' | 'outbound' | 'bidirectional';

/**
 * Company Integration - Integration instance at company level
 */
export interface CompanyIntegration extends BaseEntity {
  company_id: string;
  tenant_integration_id: string;
  integration_definition_id: string;
  active_delivery_method: string;
  direction: IntegrationDirection;
  config: Record<string, any>;
  credentials: Record<string, any> | null;
  is_active: boolean;
  override_tenant_config: boolean;
  notes: string | null;
}

export interface CompanyIntegrationWithRelations extends CompanyIntegration {
  company_name?: string;
  integration_name?: string;
  delivery_method_name?: string;
}

export const companyIntegrationSchema = z.object({
  company_id: z.string().uuid("Invalid company ID"),
  tenant_integration_id: z.string().uuid("Invalid tenant integration ID"),
  integration_definition_id: z.string().uuid("Invalid integration definition ID"),
  active_delivery_method: z.string().min(1, "Delivery method required"),
  direction: z.enum(['inbound', 'outbound', 'bidirectional']).default('bidirectional'),
  config: z.record(z.any()).default({}),
  credentials: z.record(z.any()).optional(),
  override_tenant_config: z.boolean().default(false),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type CompanyIntegrationInput = z.infer<typeof companyIntegrationSchema>;
