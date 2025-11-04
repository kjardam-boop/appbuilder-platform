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
  CapabilityFilters,
  CapabilityInput,
} from "./types/capability.types";

// Services
export { CapabilityService } from "./services/capabilityService";
export { TenantCapabilityService } from "./services/tenantCapabilityService";
export { seedCapabilities } from "./services/seedCapabilities";

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

// Services
export { AppCapabilityService } from "./services/appCapabilityService";

// Module metadata
export const CAPABILITIES_MODULE = {
  name: "capabilities",
  version: "1.0.0",
  description: "Capability catalog for reusable platform features",
} as const;
