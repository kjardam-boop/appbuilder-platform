import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * ERP Extension for ExternalSystem
 * Additional ERP-specific fields when ExternalSystem.system_types includes "ERP"
 */
export interface ExternalSystemERPData extends BaseEntity {
  external_system_id: string;
  modules: string[];
  localizations: string[];
  industries_served: string[];
  certification_level: string | null;
  partner_count: number;
  implementation_time_weeks: number | null;
  notes: string | null;
}

export const externalSystemERPDataSchema = z.object({
  external_system_id: z.string().uuid("Ugyldig system-ID"),
  modules: z.array(z.string()).default([]),
  localizations: z.array(z.string()).default([]),
  industries_served: z.array(z.string()).default([]),
  certification_level: z.string().max(100).optional().or(z.literal("")),
  partner_count: z.number().int().min(0).default(0),
  implementation_time_weeks: z.number().int().min(0).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type ExternalSystemERPDataInput = z.infer<typeof externalSystemERPDataSchema>;

// ============================================================
// BACKWARD COMPATIBILITY ALIASES (to be removed in Phase 4-6)
// ============================================================

/** @deprecated Use ExternalSystemERPData instead */
export type ERPExtension = ExternalSystemERPData;
/** @deprecated Use ExternalSystemERPDataInput instead */
export type ERPExtensionInput = ExternalSystemERPDataInput;
/** @deprecated Use externalSystemERPDataSchema instead */
export const erpExtensionSchema = externalSystemERPDataSchema;

// Common ERP modules
export const ERP_MODULES = [
  "Finans",
  "Regnskap",
  "Lønn",
  "Fakturering",
  "Ordre",
  "Lager",
  "Innkjøp",
  "Prosjekt",
  "Timeføring",
  "CRM",
  "Produksjon",
  "Distribusjon",
  "Rapportering",
  "Konsolidering",
] as const;

// Common localizations
export const ERP_LOCALIZATIONS = [
  "Norge",
  "Sverige",
  "Danmark",
  "Finland",
  "Island",
  "EU",
  "Global",
] as const;

// Industry categories
export const ERP_INDUSTRIES = [
  "Bygg og anlegg",
  "Handel",
  "Industri",
  "IT og teknologi",
  "Konsulent",
  "Offentlig sektor",
  "Eiendom",
  "Transport og logistikk",
  "Helse og omsorg",
  "Utdanning",
  "Finans",
  "Media",
  "Engros",
  "Service",
] as const;
