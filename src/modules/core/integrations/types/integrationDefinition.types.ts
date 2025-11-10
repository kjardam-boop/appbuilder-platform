import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * Integration Definition - What system can be integrated
 */
export interface IntegrationDefinition extends BaseEntity {
  key: string;
  name: string;
  description: string | null;
  category_id: string | null;
  vendor_id: string | null;
  external_system_id: string | null;
  supported_delivery_methods: string[];
  default_delivery_method: string | null;
  icon_name: string;
  documentation_url: string | null;
  setup_guide_url: string | null;
  requires_credentials: boolean;
  credential_fields: any[];
  default_config: Record<string, any>;
  capabilities: Record<string, any>;
  tags: string[];
  is_active: boolean;
}

export interface IntegrationDefinitionWithRelations extends IntegrationDefinition {
  category_name?: string;
  vendor_name?: string;
  external_system_name?: string;
}

export const integrationDefinitionSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-z0-9_]+$/, "Key must be lowercase with underscores"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  vendor_id: z.string().uuid().optional().or(z.literal("")),
  external_system_id: z.string().uuid().optional().or(z.literal("")),
  supported_delivery_methods: z.array(z.string()).min(1, "At least one delivery method required"),
  default_delivery_method: z.string().optional().or(z.literal("")),
  icon_name: z.string().default("Plug"),
  documentation_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  setup_guide_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  requires_credentials: z.boolean().default(true),
  credential_fields: z.array(z.any()).default([]),
  default_config: z.record(z.any()).default({}),
  capabilities: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
});

export type IntegrationDefinitionInput = z.infer<typeof integrationDefinitionSchema>;
