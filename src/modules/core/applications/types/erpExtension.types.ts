import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * ERP Extension for AppProduct
 * Additional ERP-specific fields when AppProduct.type === "ERP"
 */
export interface ERPExtension extends BaseEntity {
  app_product_id: string;
  modules: string[];
  localizations: string[];
  industries_served: string[];
  certification_level: string | null;
  partner_count: number;
  implementation_time_weeks: number | null;
  notes: string | null;
}

export const erpExtensionSchema = z.object({
  app_product_id: z.string().uuid("Ugyldig produkt-ID"),
  modules: z.array(z.string()).default([]),
  localizations: z.array(z.string()).default([]),
  industries_served: z.array(z.string()).default([]),
  certification_level: z.string().max(100).optional().or(z.literal("")),
  partner_count: z.number().int().min(0).default(0),
  implementation_time_weeks: z.number().int().min(0).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type ERPExtensionInput = z.infer<typeof erpExtensionSchema>;

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
