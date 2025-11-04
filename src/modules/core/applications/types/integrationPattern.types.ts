import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * Integration Pattern - Pre-built integration templates
 */
export interface IntegrationPattern extends BaseEntity {
  key: string;
  name: string;
  description: string | null;
  category_id: string | null;
  source_product_id: string | null;
  target_product_id: string | null;
  pattern_type: PatternType;
  trigger_event: string | null;
  workflow_template: Record<string, any> | null;
  required_capabilities: string[];
  difficulty_level: DifficultyLevel;
  estimated_setup_minutes: number | null;
  documentation_url: string | null;
  is_featured: boolean;
  usage_count: number;
}

export type PatternType = "sync" | "webhook" | "import" | "export" | "bidirectional";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export const integrationPatternSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-z0-9-_]+$/, "Key must be lowercase"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  source_product_id: z.string().uuid().optional().or(z.literal("")),
  target_product_id: z.string().uuid().optional().or(z.literal("")),
  pattern_type: z.enum(["sync", "webhook", "import", "export", "bidirectional"]),
  trigger_event: z.string().max(100).optional().or(z.literal("")),
  workflow_template: z.record(z.any()).optional(),
  required_capabilities: z.array(z.string()).default([]),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  estimated_setup_minutes: z.number().int().min(0).optional(),
  documentation_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  is_featured: z.boolean().default(false),
});

export type IntegrationPatternInput = z.infer<typeof integrationPatternSchema>;

/**
 * MCP Action Mapping
 */
export interface AppProductMcpAction extends BaseEntity {
  app_product_id: string;
  mcp_action_key: string;
  resource_type: string;
  operation: McpOperation;
  requires_auth: boolean;
  required_scopes: string[];
  documentation_url: string | null;
  example_payload: Record<string, any> | null;
  is_active: boolean;
}

export type McpOperation = "create" | "read" | "update" | "delete" | "list" | "search";

export const appProductMcpActionSchema = z.object({
  app_product_id: z.string().uuid("Invalid product ID"),
  mcp_action_key: z.string().min(1, "Action key is required"),
  resource_type: z.string().min(1, "Resource type is required"),
  operation: z.enum(["create", "read", "update", "delete", "list", "search"]),
  requires_auth: z.boolean().default(true),
  required_scopes: z.array(z.string()).default([]),
  documentation_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  example_payload: z.record(z.any()).optional(),
  is_active: z.boolean().default(true),
});

export type AppProductMcpActionInput = z.infer<typeof appProductMcpActionSchema>;
