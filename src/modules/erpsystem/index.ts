/**
 * ERP System Module
 * Manages ERP systems (products/services owned by companies)
 */

// Types
export type {
  ERPSystem,
  ERPSku,
  ERPIntegration,
  ProjectERPSystem,
  PartnerCertification,
  ERPSystemInput,
  ERPSkuInput,
  ERPIntegrationInput,
  ProjectERPSystemInput,
  PartnerCertificationInput,
  DeploymentModel,
  MarketSegment,
  ERPStatus,
  IntegrationType,
  ProjectERPStage,
} from "./types/erpsystem.types";

export {
  erpSystemSchema,
  erpSkuSchema,
  erpIntegrationSchema,
  projectERPSystemSchema,
  partnerCertificationSchema,
  DEPLOYMENT_MODELS,
  MARKET_SEGMENTS,
  PROJECT_ERP_STAGES,
  INTEGRATION_TYPES,
} from "./types/erpsystem.types";

// Services
export { ERPSystemService } from "./services/erpSystemService";
export { PartnerCertificationService } from "./services/partnerCertificationService";
export { seedErpSystems } from "./services/seedErpSystems";

// Hooks
export {
  useErpSystems,
  useErpSystem,
  useCreateErpSystem,
  useUpdateErpSystem,
  useDeleteErpSystem,
  useProjectErpSystems,
  useAttachErpToProject,
  useUpdateProjectErp,
  useRemoveErpFromProject,
  useCreateSku,
  useDeleteSku,
  useCreateIntegration,
  useDeleteIntegration,
} from "./hooks/useErpSystems";

export {
  useCertifiedPartners,
  usePartnerCertifications,
  useErpCertifications,
  useAddCertification,
  useRemoveCertification,
} from "./hooks/usePartnerCertifications";

// Module metadata
export const ERPSYSTEM_MODULE = {
  name: "erpsystem",
  version: "1.0.0",
  description: "ERP system management and project integration",
} as const;