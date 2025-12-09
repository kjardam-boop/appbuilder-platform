/**
 * Capabilities Module
 * Catalog of reusable functions, services, and integrations
 */

// Types
export type {
  Capability,
  CapabilityVersion,
  TenantCapability,
  CustomerAppProject,
  CapabilityCategory,
  CapabilityScope,
  CapabilityVisibility,
  CapabilityFilters,
  CapabilityInput,
  // Bundles
  CapabilityBundle,
  CapabilityBundleInput,
  // Workflows (uses existing workflow_templates table)
  WorkflowTemplate,
  WorkflowCategory,
  TenantWorkflow,
} from "./types/capability.types";

// Services
export { CapabilityService } from "./services/capabilityService";
export { TenantCapabilityService } from "./services/tenantCapabilityService";
export { seedCapabilities } from "./services/seedCapabilities";
export { syncCapabilityToNotion, syncAllCapabilitiesToNotion } from "./services/notionSyncService";

// Hooks
export {
  useCapabilities,
  useCapability,
  useCreateCapability,
  useUpdateCapability,
  useDeleteCapability,
  useCapabilityVersions,
} from "./hooks/useCapabilities";

export {
  useTenantCapabilities,
  useEnableCapability,
  useDisableCapability,
  useHasCapability,
} from "./hooks/useTenantCapabilities";

// Components
export { CapabilityCard } from "./components/CapabilityCard";
export { CapabilityBrowser } from "./components/CapabilityBrowser";
export { AppCapabilityDrawer } from "./components/AppCapabilityDrawer";
export { CapabilityTestSandbox } from "./components/CapabilityTestSandbox";

// Capability Testers
export { OCRCapabilityTester } from "./components/testers/OCRCapabilityTester";

// Services
export { AppCapabilityService } from "./services/appCapabilityService";

// Schemas (Micro-frontend manifest)
export type {
  CapabilityManifest,
  CapabilitySlot,
  CapabilityVariant,
  CapabilityProps,
  LoadedCapability,
  ConfigSchema,
  ConfigField,
  ThemeOptions,
  CapabilityExports,
} from "./schemas/capability-manifest.schema";

export {
  CapabilityManifestSchema,
  CapabilitySlotSchema,
  validateManifest,
  createManifest,
  mergeConfigs,
} from "./schemas/capability-manifest.schema";

// Runtime (Loader, Slots & AppShell)
export {
  CapabilityLoader,
  loadCapability,
  loadManifest,
  loadVariant,
  CapabilitySlot,
  SlotProvider,
  useSlotContext,
  AppShell,
  type SlotCapability,
  type CapabilitySlotProps,
  type AppShellProps,
  type AppConfig,
  type AppCapabilityConfig,
  type LayoutConfig,
  type ThemeConfig,
  type BrandingConfig,
} from "./runtime";

// Module metadata
export const CAPABILITIES_MODULE = {
  name: "capabilities",
  version: "2.0.0",
  description: "Capability catalog with micro-frontend runtime support",
} as const;
