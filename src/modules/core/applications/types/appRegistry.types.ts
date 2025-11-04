/**
 * App Registry Types
 * Types for platform-level app definitions, versioning, and tenant installations
 */

import { z } from "zod";

export type AppType = "core" | "addon" | "custom";
export type AppChannel = "stable" | "canary" | "pinned";
export type InstallStatus = "active" | "installing" | "updating" | "failed" | "disabled";
export type ExtensionType = "component" | "function" | "adapter" | "hook";

export interface AppDefinition {
  id: string;
  key: string;
  name: string;
  app_type: AppType;
  description: string | null;
  icon_name: string;
  routes: string[];
  modules: string[];
  extension_points: Record<string, any>;
  schema_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppVersion {
  id: string;
  app_definition_id: string;
  version: string;
  manifest_url: string | null;
  changelog: string | null;
  migrations: any[];
  breaking_changes: boolean;
  released_at: string;
  deprecated_at: string | null;
  end_of_life_at: string | null;
}

export interface TenantAppInstall {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  app_definition_id: string | null;
  installed_version: string | null;
  channel: AppChannel;
  install_status: InstallStatus;
  config: AppConfig;
  overrides: AppOverrides;
  is_active: boolean;
  last_updated_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  app_definition?: AppDefinition;
}

export interface AppConfig {
  branding?: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
  features?: Record<string, boolean | number | string>;
  ui_overrides?: Record<string, any>;
  integrations?: Record<string, string>;
  limits?: {
    max_records?: number;
    max_users?: number;
  };
}

export interface AppOverrides {
  forms?: FormSchema[];
  score_models?: ScoreModel[];
  ui_layouts?: UILayout[];
  workflows?: WorkflowDefinition[];
}

export interface FormSchema {
  form_key: string;
  fields: FormField[];
}

export interface FormField {
  key: string;
  type: string;
  label: string;
  required?: boolean;
  validation?: any;
}

export interface ScoreModel {
  model_key: string;
  criteria: ScoringCriteria[];
}

export interface ScoringCriteria {
  key: string;
  weight: number;
  calculation?: string;
}

export interface UILayout {
  layout_key: string;
  sections: LayoutSection[];
}

export interface LayoutSection {
  id: string;
  component: string;
  props?: Record<string, any>;
}

export interface WorkflowDefinition {
  workflow_key: string;
  steps: string[];
}

export interface TenantAppExtension {
  id: string;
  tenant_id: string;
  app_definition_id: string;
  extension_type: ExtensionType;
  extension_key: string;
  implementation_url: string;
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompatibilityCheck {
  ok: boolean;
  reasons: string[];
  warnings: string[];
}

export interface AppContext {
  definition: AppDefinition;
  install: TenantAppInstall;
  config: AppConfig;
  overrides: AppOverrides;
  extensions: TenantAppExtension[];
}

// Schemas
export const appConfigSchema = z.object({
  branding: z.object({
    primary_color: z.string().optional(),
    secondary_color: z.string().optional(),
    logo_url: z.string().url().optional(),
  }).optional(),
  features: z.record(z.union([z.boolean(), z.number(), z.string()])).optional(),
  ui_overrides: z.record(z.any()).optional(),
  integrations: z.record(z.string()).optional(),
  limits: z.object({
    max_records: z.number().optional(),
    max_users: z.number().optional(),
  }).optional(),
});

export const appOverridesSchema = z.object({
  forms: z.array(z.any()).optional(),
  score_models: z.array(z.any()).optional(),
  ui_layouts: z.array(z.any()).optional(),
  workflows: z.array(z.any()).optional(),
});
