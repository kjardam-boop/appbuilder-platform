/**
 * Migration utility to transform old app_types[] format to new category_id format
 * Run this to process uploaded seed data files
 */

import { supabase } from "@/integrations/supabase/client";

// Map old app_types to category slugs
const APP_TYPE_TO_CATEGORY_SLUG: Record<string, string> = {
  "ERP": "erp",
  "CRM": "crm",
  "HRPayroll": "hr-payroll",
  "ProjectMgmt": "project-management",
  "BI": "business-intelligence",
  "IAM": "iam-identity",
  "CMS": "cms",
  "eCommerce": "ecommerce",
  "WMS": "wms",
  "TMS": "tms",
  "EmailSuite": "email-suite",
  "iPaaS": "ipaas",
  "PLM": "plm",
  "MES": "mes",
  "ITSM": "itsm",
  "RPA": "rpa",
  "ServiceMgmt": "service-management",
};

// Map deployment model variations
const DEPLOYMENT_MODEL_NORMALIZATION: Record<string, string> = {
  "On-premises": "OnPrem",
  "Cloud": "SaaS",
  "Hosted": "SaaS",
};

export async function fetchCategoryMapping(): Promise<Map<string, string>> {
  const { data: categories, error } = await supabase
    .from("app_categories")
    .select("id, slug")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch categories:", error);
    return new Map();
  }

  return new Map(categories.map(c => [c.slug, c.id]));
}

export function normalizeDeploymentModel(model: string): string {
  return DEPLOYMENT_MODEL_NORMALIZATION[model] || model;
}

export function mapAppTypeToCategory(
  appTypes: string[] | undefined,
  categoryMap: Map<string, string>
): string | undefined {
  if (!appTypes || appTypes.length === 0) return undefined;
  
  const primaryType = appTypes[0];
  const categorySlug = APP_TYPE_TO_CATEGORY_SLUG[primaryType];
  
  if (!categorySlug) {
    console.warn(`Unknown app_type: ${primaryType}`);
    return undefined;
  }

  return categoryMap.get(categorySlug);
}

/**
 * Process a product entry from old format to new format
 */
export async function transformProductEntry(
  entry: any,
  categoryMap: Map<string, string>
): Promise<any> {
  const { app_types, deployment_models, ...rest } = entry;

  // Map app_types to category_id
  const category_id = mapAppTypeToCategory(app_types, categoryMap);

  // Normalize deployment models
  const normalized_deployment_models = deployment_models?.map(normalizeDeploymentModel) || [];

  return {
    ...rest,
    category_id,
    deployment_models: normalized_deployment_models,
  };
}

console.log("Migration utilities loaded. Use fetchCategoryMapping() and transformProductEntry() to process seed data.");
