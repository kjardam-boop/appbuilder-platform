import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

export type DeploymentModel = "SaaS" | "Hosted" | "On-premises" | "Hybrid";
export type MarketSegment = "SMB" | "Midmarket" | "Enterprise";
export type ERPStatus = "Active" | "Legacy";
export type IntegrationType = "API" | "iPaaS" | "Connector";
export type ProjectERPStage = "Longlist" | "Shortlist" | "Winner" | "Rejected";

export interface ERPSystem extends BaseEntity {
  name: string;
  short_name: string | null;
  slug: string;
  vendor_company_id: string;
  deployment_model: DeploymentModel[];
  target_industries: string[] | null;
  market_segment: MarketSegment[] | null;
  modules_supported: string[] | null;
  localizations: string[] | null;
  compliances: string[] | null;
  pricing_model: string | null;
  status: ERPStatus;
  website: string | null;
  description: string | null;
  vendor?: {
    id: string;
    name: string;
    org_number: string;
    website: string | null;
  };
}

export interface ERPSku extends BaseEntity {
  erp_system_id: string;
  edition_name: string;
  notes: string | null;
}

export interface ERPIntegration extends BaseEntity {
  erp_system_id: string;
  type: IntegrationType;
  name: string;
  spec_url: string | null;
  notes: string | null;
}

export interface ProjectERPSystem extends BaseEntity {
  project_id: string;
  erp_system_id: string;
  stage: ProjectERPStage;
  rationale: string | null;
  partner_company_id: string | null;
  erp_system?: ERPSystem;
  partner?: {
    id: string;
    name: string;
    org_number: string;
  };
}

export interface PartnerCertification extends BaseEntity {
  partner_company_id: string;
  erp_system_id: string;
  certification_level: string | null;
  certification_date: string | null;
  notes: string | null;
  partner?: {
    id: string;
    name: string;
    org_number: string;
  };
  erp_system?: ERPSystem;
}

export const erpSystemSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd").max(200),
  short_name: z.string().max(50).optional().or(z.literal("")),
  slug: z.string().min(1, "Slug er påkrevd").regex(/^[a-z0-9-]+$/, "Slug må være kebab-case"),
  vendor_company_id: z.string().uuid("Ugyldig leverandør-ID"),
  deployment_model: z.array(z.enum(["SaaS", "Hosted", "On-premises", "Hybrid"])).min(1, "Minst én deployment-modell er påkrevd"),
  target_industries: z.array(z.string()).optional(),
  market_segment: z.array(z.enum(["SMB", "Midmarket", "Enterprise"])).optional(),
  modules_supported: z.array(z.string()).optional(),
  localizations: z.array(z.string()).optional(),
  compliances: z.array(z.string()).optional(),
  pricing_model: z.string().optional().or(z.literal("")),
  status: z.enum(["Active", "Legacy"]).default("Active"),
  website: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const erpSkuSchema = z.object({
  edition_name: z.string().min(1, "Utgavenavn er påkrevd").max(100),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const erpIntegrationSchema = z.object({
  type: z.enum(["API", "iPaaS", "Connector"]),
  name: z.string().min(1, "Navn er påkrevd").max(200),
  spec_url: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const projectERPSystemSchema = z.object({
  stage: z.enum(["Longlist", "Shortlist", "Winner", "Rejected"]),
  rationale: z.string().max(1000).optional().or(z.literal("")),
  partner_company_id: z.string().uuid().optional().or(z.literal("")),
});

export const partnerCertificationSchema = z.object({
  partner_company_id: z.string().uuid("Ugyldig partner-ID"),
  erp_system_id: z.string().uuid("Ugyldig ERP-system-ID"),
  certification_level: z.string().max(100).optional().or(z.literal("")),
  certification_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type ERPSystemInput = z.infer<typeof erpSystemSchema>;
export type ERPSkuInput = z.infer<typeof erpSkuSchema>;
export type ERPIntegrationInput = z.infer<typeof erpIntegrationSchema>;
export type ProjectERPSystemInput = z.infer<typeof projectERPSystemSchema>;
export type PartnerCertificationInput = z.infer<typeof partnerCertificationSchema>;

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

export const PROJECT_ERP_STAGES: Record<ProjectERPStage, string> = {
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