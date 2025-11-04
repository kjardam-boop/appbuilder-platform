/**
 * App Manifest Types
 * Types for app manifests, defining structure for Platform Apps
 */

import { z } from "zod";
import type { AppHook, UIComponent, IntegrationRequirements } from "./appRegistry.types";

export interface Migration {
  version: string;
  description: string;
  sql?: string;
  rollback_sql?: string;
}

export interface AppManifest {
  key: string;
  name: string;
  version: string;
  domain_tables: string[];
  shared_tables?: string[];
  hooks?: AppHook[];
  ui_components?: UIComponent[];
  capabilities?: string[];
  integration_requirements?: IntegrationRequirements;
  migrations?: Migration[];
}

// Zod schemas
const hookSchema = z.object({
  key: z.string(),
  type: z.enum(['event', 'filter', 'action']),
  description: z.string().optional(),
});

const uiComponentSchema = z.object({
  key: z.string(),
  path: z.string(),
  type: z.enum(['page', 'widget', 'modal']),
});

const integrationRequirementsSchema = z.object({
  requires_email: z.boolean().optional(),
  requires_calendar: z.boolean().optional(),
  required_external_systems: z.array(z.string()).optional(),
});

const migrationSchema = z.object({
  version: z.string(),
  description: z.string(),
  sql: z.string().optional(),
  rollback_sql: z.string().optional(),
});

export const appManifestSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  domain_tables: z.array(z.string()).min(1),
  shared_tables: z.array(z.string()).optional(),
  hooks: z.array(hookSchema).optional(),
  ui_components: z.array(uiComponentSchema).optional(),
  capabilities: z.array(z.string()).optional(),
  integration_requirements: integrationRequirementsSchema.optional(),
  migrations: z.array(migrationSchema).optional(),
});
