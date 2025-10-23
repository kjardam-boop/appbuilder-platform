/**
 * Industry Module
 * Manages industries/bransjer with NACE classification
 */

// Types
export type { Industry, IndustryInput } from "./types/industry.types";
export { industrySchema, STANDARD_INDUSTRIES } from "./types/industry.types";

// Services
export { IndustryService } from "./services/industryService";

// Hooks
export {
  useIndustries,
  useIndustry,
  useCreateIndustry,
  useUpdateIndustry,
  useDeleteIndustry,
  useSeedIndustries,
} from "./hooks/useIndustries";

// Module metadata
export const INDUSTRY_MODULE = {
  name: "industry",
  version: "1.0.0",
  description: "Industry/Bransje management with NACE classification",
} as const;
