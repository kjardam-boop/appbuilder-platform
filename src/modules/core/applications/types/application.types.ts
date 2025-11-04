import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";
import type { ERPExtension } from "./erpExtension.types";

export type AppType = "ERP" | "CRM" | "EmailSuite" | "HRPayroll" | "BI" | "iPaaS" | "CMS" | "eCommerce" | "WMS" | "TMS" | "PLM" | "MES" | "ITSM" | "IAM" | "RPA" | "ProjectMgmt" | "ServiceMgmt";
export type DeploymentModel = "SaaS" | "Hosted" | "On-premises" | "Hybrid";
export type MarketSegment = "SMB" | "Midmarket" | "Enterprise";
export type AppStatus = "Active" | "Legacy";
export type IntegrationType = "API" | "iPaaS" | "Connector";
export type ProjectAppStage = "Longlist" | "Shortlist" | "Winner" | "Rejected";

export interface AppVendor extends BaseEntity {
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

export interface AppProduct extends BaseEntity {
  name: string;
  short_name: string | null;
  slug: string;
  vendor_id: string;
  app_types: string[];
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
  vendor?: AppVendor;
  skus?: SKU[];
  erp_extension?: ERPExtension;
}

export interface SKU extends BaseEntity {
  app_product_id: string;
  edition_name: string;
  code: string | null;
  notes: string | null;
}

export interface AppIntegration extends BaseEntity {
  app_product_id: string;
  type: IntegrationType;
  name: string;
  spec_url: string | null;
  notes: string | null;
}

export interface CompanyApp extends BaseEntity {
  company_id: string;
  app_product_id: string;
  sku_id: string | null;
  environment: string | null;
  version: string | null;
  notes: string | null;
  app_product?: AppProduct;
  sku?: SKU;
}

export interface ProjectAppProduct extends BaseEntity {
  project_id: string;
  app_product_id: string;
  stage: ProjectAppStage;
  rationale: string | null;
  partner_company_id: string | null;
  app_product?: AppProduct;
  partner?: {
    id: string;
    name: string;
    org_number: string;
  };
}

export interface PartnerCertification extends BaseEntity {
  partner_company_id: string;
  app_product_id: string;
  certification_level: string | null;
  certification_date: string | null;
  notes: string | null;
  partner?: {
    id: string;
    name: string;
    org_number: string;
  };
  app_product?: AppProduct;
}

export const appVendorSchema = z.object({
  company_id: z.string().uuid("Ugyldig selskap-ID"),
  name: z.string().min(1, "Navn er påkrevd").max(200),
  org_number: z.string().optional().or(z.literal("")),
  website: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const appProductSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd").max(200),
  short_name: z.string().max(50).optional().or(z.literal("")),
  slug: z.string().min(1, "Slug er påkrevd").regex(/^[a-z0-9-]+$/, "Slug må være kebab-case"),
  vendor_id: z.string().uuid("Ugyldig leverandør-ID"),
  app_types: z.array(z.enum(["ERP", "CRM", "EmailSuite", "HRPayroll", "BI", "iPaaS", "CMS", "eCommerce", "WMS", "TMS", "PLM", "MES", "ITSM", "IAM", "RPA", "ProjectMgmt", "ServiceMgmt"])).min(1, "Minst én applikasjonstype er påkrevd"),
  deployment_models: z.array(z.enum(["SaaS", "Hosted", "On-premises", "Hybrid"])).min(1, "Minst én deployment-modell er påkrevd"),
  target_industries: z.array(z.string()).optional(),
  market_segments: z.array(z.enum(["SMB", "Midmarket", "Enterprise"])).optional(),
  modules_supported: z.array(z.string()).optional(),
  localizations: z.array(z.string()).optional(),
  compliances: z.array(z.string()).optional(),
  pricing_model: z.string().optional().or(z.literal("")),
  status: z.enum(["Active", "Legacy"]).default("Active"),
  website: z.string().url("Ugyldig URL").optional().or(z.literal("")),
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
});

export const skuSchema = z.object({
  edition_name: z.string().min(1, "Utgavenavn er påkrevd").max(100),
  code: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const appIntegrationSchema = z.object({
  type: z.enum(["API", "iPaaS", "Connector"]),
  name: z.string().min(1, "Navn er påkrevd").max(200),
  spec_url: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const companyAppSchema = z.object({
  company_id: z.string().uuid("Ugyldig selskap-ID"),
  app_product_id: z.string().uuid("Ugyldig produkt-ID"),
  sku_id: z.string().uuid().optional().or(z.literal("")),
  environment: z.string().max(100).optional().or(z.literal("")),
  version: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const projectAppProductSchema = z.object({
  stage: z.enum(["Longlist", "Shortlist", "Winner", "Rejected"]),
  rationale: z.string().max(1000).optional().or(z.literal("")),
  partner_company_id: z.string().uuid().optional().or(z.literal("")),
});

export const partnerCertificationSchema = z.object({
  partner_company_id: z.string().uuid("Ugyldig partner-ID"),
  app_product_id: z.string().uuid("Ugyldig produkt-ID"),
  certification_level: z.string().max(100).optional().or(z.literal("")),
  certification_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type AppVendorInput = z.infer<typeof appVendorSchema>;
export type AppProductInput = z.infer<typeof appProductSchema>;
export type SKUInput = z.infer<typeof skuSchema>;
export type AppIntegrationInput = z.infer<typeof appIntegrationSchema>;
export type CompanyAppInput = z.infer<typeof companyAppSchema>;
export type ProjectAppProductInput = z.infer<typeof projectAppProductSchema>;
export type PartnerCertificationInput = z.infer<typeof partnerCertificationSchema>;

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
