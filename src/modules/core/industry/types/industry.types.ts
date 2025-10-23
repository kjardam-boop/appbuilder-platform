import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * Industry/Bransje with NACE classification
 */
export interface Industry extends BaseEntity {
  key: string;
  name: string;
  description: string | null;
  nace_codes: string[];
  default_modules: string[] | null;
  parent_key: string | null;
  sort_order: number;
  is_active: boolean;
}

export const industrySchema = z.object({
  key: z.string().min(1, "Nøkkel er påkrevd").max(50).regex(/^[a-z0-9_]+$/, "Kun små bokstaver, tall og underscore"),
  name: z.string().min(1, "Navn er påkrevd").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  nace_codes: z.array(z.string()).default([]),
  default_modules: z.array(z.string()).optional(),
  parent_key: z.string().max(50).optional().or(z.literal("")),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type IndustryInput = z.infer<typeof industrySchema>;

// Standard Norwegian industries with NACE codes
export const STANDARD_INDUSTRIES = [
  { key: "bygg_anlegg", name: "Bygg og anlegg", naceCodes: ["41", "42", "43"] },
  { key: "handel", name: "Handel", naceCodes: ["45", "46", "47"] },
  { key: "industri", name: "Industri og produksjon", naceCodes: ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33"] },
  { key: "it_teknologi", name: "IT og teknologi", naceCodes: ["62", "63"] },
  { key: "konsulent", name: "Konsulent og rådgivning", naceCodes: ["70", "71", "73", "74"] },
  { key: "offentlig", name: "Offentlig sektor", naceCodes: ["84"] },
  { key: "eiendom", name: "Eiendom", naceCodes: ["68"] },
  { key: "transport_logistikk", name: "Transport og logistikk", naceCodes: ["49", "50", "51", "52", "53"] },
  { key: "helse_omsorg", name: "Helse og omsorg", naceCodes: ["86", "87", "88"] },
  { key: "utdanning", name: "Utdanning", naceCodes: ["85"] },
  { key: "finans", name: "Finans og forsikring", naceCodes: ["64", "65", "66"] },
  { key: "media", name: "Media og kommunikasjon", naceCodes: ["58", "59", "60", "61"] },
  { key: "engros", name: "Engros", naceCodes: ["46"] },
  { key: "service", name: "Service og tjenester", naceCodes: ["55", "56", "69", "77", "78", "79", "80", "81", "82"] },
  { key: "landbruk", name: "Landbruk og naturforvaltning", naceCodes: ["01", "02", "03"] },
  { key: "energi", name: "Energi og forsyning", naceCodes: ["35", "36", "37", "38", "39"] },
] as const;
