/**
 * Applications Module
 * Manages business applications (ERP, CRM, etc.) and vendor relationships
 * Also includes App Registry for platform-level app management
 */

// App Registry Types
export type {
  AppDefinition,
  AppVersion,
  TenantAppInstall,
  TenantAppExtension,
  AppConfig,
  AppOverrides,
  AppContext,
  CompatibilityCheck,
  AppType as AppRegistryType,
  AppChannel,
  InstallStatus,
  ExtensionType,
  AppHook,
  UIComponent,
  IntegrationRequirements,
  MigrationStatus,
} from "./types/appRegistry.types";

export {
  appConfigSchema,
  appOverridesSchema,
} from "./types/appRegistry.types";

export type { AppManifest, Migration } from "./types/manifest.types";
export { appManifestSchema } from "./types/manifest.types";

// Application Types (New names)
export type {
  ExternalSystemVendor,
  ExternalSystem,
  ExternalSystemSKU,
  ExternalSystemIntegration,
  CompanyExternalSystem,
  ProjectExternalSystem,
  PartnerSystemCertification,
  ExternalSystemVendorInput,
  ExternalSystemInput,
  ExternalSystemSKUInput,
  ExternalSystemIntegrationInput,
  CompanyExternalSystemInput,
  ProjectExternalSystemInput,
  PartnerSystemCertificationInput,
  // Backward compatibility aliases (deprecated)
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
  UseCase,
} from "./types/application.types";

export type {
  // New type names
  ExternalSystemERPData,
  ExternalSystemERPDataInput,
  // Backward compatibility aliases
  ERPExtension,
  ERPExtensionInput,
} from "./types/erpExtension.types";

export {
  // New schema name
  externalSystemERPDataSchema,
  // Backward compatibility alias
  erpExtensionSchema,
  ERP_MODULES,
  ERP_LOCALIZATIONS,
  ERP_INDUSTRIES,
} from "./types/erpExtension.types";

export {
  // New schema names
  externalSystemVendorSchema,
  externalSystemSchema,
  externalSystemSKUSchema,
  externalSystemIntegrationSchema,
  companyExternalSystemSchema,
  projectExternalSystemSchema,
  partnerSystemCertificationSchema,
  // Backward compatibility aliases
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

// App Registry Services
export { AppRegistryService } from "./services/appRegistryService";
export { TenantAppsService } from "./services/tenantAppsService";
export { CompatibilityService } from "./services/compatibilityService";
export { RuntimeLoader } from "./services/runtimeLoader";
export { DeploymentService } from "./services/deploymentService";

// Application Services
export { ApplicationService } from "./services/applicationService";
export { VendorService } from "./services/vendorService";
export { PartnerCertificationService } from "./services/partnerCertificationService";
export { ERPExtensionService } from "./services/erpExtensionService";
export { seedApplications } from "./services/seedApplications";
export { seedAppDefinitions } from "./services/seedAppDefinitions";
export { ManifestLoader } from "./services/manifestLoader";
export { ObservabilityService } from "./services/observabilityService";

// App Registry Hooks
export {
  useAppDefinitions,
  useAppDefinition,
  useAppVersions,
  useInstallApp,
  useUpdateApp,
  useUpdateAppConfig,
  useUpdateAppOverrides,
  useChangeAppChannel,
  useUninstallApp,
  useCompatibilityCheck,
  useDeploymentStatus,
  usePromoteToStable,
  useRollback,
} from "./hooks/useAppRegistry";

// Application Hooks
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
  useAppProductsByCapability,
  useAppProductsByUseCase,
  useMcpReference,
} from "./hooks/useApplications";

export { useSKUs, useCreateSKU, useDeleteSKU } from "./hooks/useSKUs";
export { useCompanyApps, useCreateCompanyApp, useDeleteCompanyApp } from "./hooks/useCompanyApps";
export { useApplicationGeneration } from "./hooks/useApplicationGeneration";
export { useAppUsageStats } from "./hooks/useObservability";

// Components
export { AppProductCard } from "./components/AppProductCard";
export { AppVendorSelector } from "./components/AppVendorSelector";
export { SKUManager } from "./components/SKUManager";
export { CompanyAppsList } from "./components/CompanyAppsList";
export { ApplicationForm } from "./components/ApplicationForm";
export { UnknownTypeDialog } from "./components/UnknownTypeDialog";

// Module metadata
export const APPLICATIONS_MODULE = {
  name: "applications",
  version: "1.0.0",
  description: "Business applications management (ERP, CRM, etc.)",
} as const;
