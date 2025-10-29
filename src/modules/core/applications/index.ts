/**
 * Applications Module
 * Manages business applications (ERP, CRM, etc.) and vendor relationships
 */

// Types
export type {
  AppVendor,
  AppProduct,
  SKU,
  AppIntegration,
  CompanyApp,
  ProjectAppProduct,
  PartnerCertification,
  AppVendorInput,
  AppProductInput,
  SKUInput,
  AppIntegrationInput,
  CompanyAppInput,
  ProjectAppProductInput,
  PartnerCertificationInput,
  AppType,
  DeploymentModel,
  MarketSegment,
  AppStatus,
  IntegrationType,
  ProjectAppStage,
} from "./types/application.types";

export type {
  ERPExtension,
  ERPExtensionInput,
} from "./types/erpExtension.types";

export {
  erpExtensionSchema,
  ERP_MODULES,
  ERP_LOCALIZATIONS,
  ERP_INDUSTRIES,
} from "./types/erpExtension.types";

export {
  appVendorSchema,
  appProductSchema,
  skuSchema,
  appIntegrationSchema,
  companyAppSchema,
  projectAppProductSchema,
  partnerCertificationSchema,
  APP_TYPES,
  DEPLOYMENT_MODELS,
  MARKET_SEGMENTS,
  PROJECT_APP_STAGES,
  INTEGRATION_TYPES,
} from "./types/application.types";

// Services
export { ApplicationService } from "./services/applicationService";
export { VendorService } from "./services/vendorService";
export { PartnerCertificationService } from "./services/partnerCertificationService";
export { ERPExtensionService } from "./services/erpExtensionService";
export { seedApplications } from "./services/seedApplications";

// Hooks
export {
  useAppProducts,
  useAppProduct,
  useCreateAppProduct,
  useUpdateAppProduct,
  useProjectAppProducts,
  useAttachAppToProject,
  useAppVendors,
  useCertifiedPartners,
  usePartnerCertifications,
  useAddCertification,
} from "./hooks/useApplications";

export { useSKUs, useCreateSKU, useDeleteSKU } from "./hooks/useSKUs";
export { useCompanyApps, useCreateCompanyApp, useDeleteCompanyApp } from "./hooks/useCompanyApps";
export { useApplicationGeneration } from "./hooks/useApplicationGeneration";

// Components
export { AppProductCard } from "./components/AppProductCard";
export { AppVendorSelector } from "./components/AppVendorSelector";
export { SKUManager } from "./components/SKUManager";
export { CompanyAppsList } from "./components/CompanyAppsList";
export { ApplicationForm } from "./components/ApplicationForm";

// Module metadata
export const APPLICATIONS_MODULE = {
  name: "applications",
  version: "1.0.0",
  description: "Business applications management (ERP, CRM, etc.)",
} as const;
