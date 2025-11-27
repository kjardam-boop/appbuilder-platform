import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";
import type { ExternalSystemERPData } from "./erpExtension.types";
import { normalizeUrl } from "@/lib/utils";

export type AppType = "ERP" | "CRM" | "EmailSuite" | "HRPayroll" | "BI" | "iPaaS" | "CMS" | "eCommerce" | "WMS" | "TMS" | "PLM" | "MES" | "ITSM" | "IAM" | "RPA" | "ProjectMgmt" | "ServiceMgmt";
export type DeploymentModel = "SaaS" | "Hosted" | "On-premises" | "Hybrid";
export type MarketSegment = "SMB" | "Midmarket" | "Enterprise";
export type AppStatus = "Active" | "Legacy";
export type IntegrationType = "API" | "iPaaS" | "Connector";
export type ProjectAppStage = "Longlist" | "Shortlist" | "Winner" | "Rejected";

export interface ExternalSystemVendor extends BaseEntity {
  company_id: string;
  name: string;
  org_number: string;
  website: string | null;
  description: string | null;
}

export interface UseCase {
  key: string;
  description: string;
  industry_specific?: boolean;
}

export interface ExternalSystem extends BaseEntity {
  name: string;
  short_name: string | null;
  slug: string;
  vendor_id: string;
  system_types: string[];
  deployment_models: DeploymentModel[];
  target_industries: string[] | null;
  market_segments: MarketSegment[] | null;
  modules_supported: string[] | null;
  localizations: string[] | null;
  compliances: string[] | null;
  pricing_model: string | null;
  status: AppStatus;
  website: string | null;
  description: string | null;
  capabilities?: string[];
  use_cases?: UseCase[];
  mcp_reference?: string | null;
  integration_providers?: {
    n8n?: boolean;
    pipedream?: boolean;
    zapier?: boolean;
  };
  vendor?: ExternalSystemVendor;
  skus?: ExternalSystemSKU[];
  erp_extension?: ExternalSystemERPData;
  category_id?: string | null;
}

export interface ExternalSystemSKU extends BaseEntity {
  external_system_id: string;
  edition_name: string;
  code: string | null;
  notes: string | null;
  // Backward compat: DB still returns old column name
  app_product_id?: string; // Maps to external_system_id
}

export interface ExternalSystemIntegration extends BaseEntity {
  external_system_id: string;
  type: IntegrationType;
  name: string;
  spec_url: string | null;
  notes: string | null;
}

export interface CompanyExternalSystem extends BaseEntity {
  company_id: string;
  external_system_id: string;
  sku_id: string | null;
  environment: string | null;
  version: string | null;
  notes: string | null;
  external_system?: ExternalSystem;
  sku?: ExternalSystemSKU;
}

export interface ProjectExternalSystem extends BaseEntity {
  project_id: string;
  external_system_id: string;
  stage: ProjectAppStage;
  rationale: string | null;
  partner_company_id: string | null;
  external_system?: ExternalSystem;
  partner?: {
    id: string;
    name: string;
    org_number: string;
  };
}

export interface PartnerSystemCertification extends BaseEntity {
  partner_company_id: string;
  external_system_id: string;
  certification_level: string | null;
  certification_date: string | null;
  notes: string | null;
  partner?: {
    id: string;
    name: string;
    org_number: string;
  };
  external_system?: ExternalSystem;
}

export const externalSystemVendorSchema = z.object({
  company_id: z.string().uuid("Ugyldig selskap-ID"),
  name: z.string().min(1, "Navn er påkrevd").max(200),
  org_number: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")).transform(val => {
    if (!val || val.trim() === "") return "";
    return normalizeUrl(val);
  }).refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Ugyldig URL"
  }),
  description: z.string().max(2000).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  contact_url: z.string().optional().or(z.literal("")).transform(val => {
    if (!val || val.trim() === "") return "";
    return normalizeUrl(val);
  }).refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Ugyldig URL"
  }),
});

export const externalSystemSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd").max(200),
  short_name: z.string().max(50).optional().or(z.literal("")),
  slug: z.string().min(1, "Slug er påkrevd").regex(/^[a-z0-9-]+$/, "Slug må være kebab-case"),
  vendor_id: z.string().uuid("Ugyldig leverandør-ID"),
  category_id: z.string().uuid().optional().or(z.literal("")),
  system_types: z.array(z.enum(["ERP", "CRM", "EmailSuite", "HRPayroll", "BI", "iPaaS", "CMS", "eCommerce", "WMS", "TMS", "PLM", "MES", "ITSM", "IAM", "RPA", "ProjectMgmt", "ServiceMgmt", "WorkflowAutomation", "Integrasjonsplattform"])).min(1, "Minst én systemtype er påkrevd"),
  deployment_models: z.array(z.enum(["SaaS", "Hosted", "On-premises", "Hybrid"])).min(1, "Minst én deployment-modell er påkrevd"),
  target_industries: z.array(z.string()).optional(),
  market_segments: z.array(z.enum(["SMB", "Midmarket", "Enterprise"])).optional(),
  modules_supported: z.array(z.string()).optional(),
  localizations: z.array(z.string()).optional(),
  compliances: z.array(z.string()).optional(),
  pricing_model: z.string().optional().or(z.literal("")),
  status: z.enum(["Active", "Legacy"]).default("Active"),
  website: z.string().optional().or(z.literal("")).transform(val => {
    if (!val || val.trim() === "") return "";
    return normalizeUrl(val);
  }).refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Ugyldig URL"
  }),
  description: z.string().max(2000).optional().or(z.literal("")),
  capabilities: z.array(z.string()).optional(),
  use_cases: z.array(z.object({
    key: z.string(),
    description: z.string(),
    industry_specific: z.boolean().optional(),
  })).optional(),
  mcp_reference: z.string().nullable().optional(),
  integration_providers: z.object({
    n8n: z.boolean().optional(),
    pipedream: z.boolean().optional(),
    zapier: z.boolean().optional(),
  }).optional(),
  // Integration capabilities (from DB schema)
  rest_api: z.boolean().optional(),
  graphql: z.boolean().optional(),
  webhooks: z.boolean().optional(),
  oauth2: z.boolean().optional(),
  api_keys: z.boolean().optional(),
  event_subscriptions: z.boolean().optional(),
  n8n_node: z.boolean().optional(),
  zapier_app: z.boolean().optional(),
  pipedream_support: z.boolean().optional(),
  mcp_connector: z.boolean().optional(),
  sso: z.boolean().optional(),
  scim: z.boolean().optional(),
  ai_plugins: z.boolean().optional(),
  email_parse: z.boolean().optional(),
  file_export: z.boolean().optional(),
  ip_allowlist: z.boolean().optional(),
  rate_limits: z.record(z.any()).optional(),
  // Compliance
  eu_data_residency: z.boolean().optional(),
  dual_region: z.boolean().optional(),
  gdpr_statement_url: z.string().optional().or(z.literal("")).transform(val => {
    if (!val || val.trim() === "") return "";
    return normalizeUrl(val);
  }).refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Ugyldig URL"
  }),
  privacy_risk_level: z.enum(["low", "medium", "high"]).optional(),
  // Documentation
  api_docs_url: z.string().optional().or(z.literal("")).transform(val => {
    if (!val || val.trim() === "") return "";
    return normalizeUrl(val);
  }).refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Ugyldig URL"
  }),
});

export const externalSystemSKUSchema = z.object({
  edition_name: z.string().min(1, "Utgavenavn er påkrevd").max(100),
  code: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const externalSystemIntegrationSchema = z.object({
  type: z.enum(["API", "iPaaS", "Connector"]),
  name: z.string().min(1, "Navn er påkrevd").max(200),
  spec_url: z.string().optional().or(z.literal("")).transform(val => {
    if (!val || val.trim() === "") return "";
    return normalizeUrl(val);
  }).refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Ugyldig URL"
  }),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const companyExternalSystemSchema = z.object({
  company_id: z.string().uuid("Ugyldig selskap-ID"),
  external_system_id: z.string().uuid("Ugyldig system-ID").optional(),
  sku_id: z.string().uuid().optional().or(z.literal("")),
  environment: z.string().max(100).optional().or(z.literal("")),
  version: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  // Backward compat: allow old column name
  app_product_id: z.string().uuid().optional(),
});

export const projectExternalSystemSchema = z.object({
  stage: z.enum(["Longlist", "Shortlist", "Winner", "Rejected"]),
  rationale: z.string().max(1000).optional().or(z.literal("")),
  partner_company_id: z.string().uuid().optional().or(z.literal("")),
});

export const partnerSystemCertificationSchema = z.object({
  partner_company_id: z.string().uuid("Ugyldig partner-ID"),
  external_system_id: z.string().uuid("Ugyldig system-ID"),
  certification_level: z.string().max(100).optional().or(z.literal("")),
  certification_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type ExternalSystemVendorInput = z.infer<typeof externalSystemVendorSchema>;
export type ExternalSystemInput = z.infer<typeof externalSystemSchema>;
export type ExternalSystemSKUInput = z.infer<typeof externalSystemSKUSchema>;
export type ExternalSystemIntegrationInput = z.infer<typeof externalSystemIntegrationSchema>;
export type CompanyExternalSystemInput = z.infer<typeof companyExternalSystemSchema>;
export type ProjectExternalSystemInput = z.infer<typeof projectExternalSystemSchema>;
export type PartnerSystemCertificationInput = z.infer<typeof partnerSystemCertificationSchema>;

// ============================================================
// TYPE MAPPINGS
// ============================================================

export const APP_TYPES: Record<AppType, string> = {
  ERP: "ERP",
  CRM: "CRM",
  EmailSuite: "E-post/Kalender",
  HRPayroll: "HR/Lønn",
  BI: "BI/Rapportering",
  iPaaS: "Integrasjonsplattform",
  CMS: "CMS",
  eCommerce: "E-handel",
  WMS: "Lager (WMS)",
  TMS: "Transport (TMS)",
  PLM: "Produktlivssyklus (PLM)",
  MES: "Produksjonsstyring (MES)",
  ITSM: "IT Service Management",
  IAM: "Identity & Access",
  RPA: "RPA/Automatisering",
  ProjectMgmt: "Prosjektstyring",
  ServiceMgmt: "Servicestyring",
};

export const DEPLOYMENT_MODELS: Record<DeploymentModel, string> = {
  SaaS: "SaaS (Cloud)",
  Hosted: "Hosted",
  "On-premises": "On-premises",
  Hybrid: "Hybrid",
};

export const MARKET_SEGMENTS: Record<MarketSegment, string> = {
  SMB: "SMB (Små og mellomstore bedrifter)",
  Midmarket: "Midmarket",
  Enterprise: "Enterprise",
};

export const PROJECT_APP_STAGES: Record<ProjectAppStage, string> = {
  Longlist: "Longlist",
  Shortlist: "Shortlist",
  Winner: "Vinner",
  Rejected: "Avvist",
};

export const INTEGRATION_TYPES: Record<IntegrationType, string> = {
  API: "API",
  iPaaS: "iPaaS",
  Connector: "Connector",
};
