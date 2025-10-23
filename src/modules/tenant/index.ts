/**
 * Tenant Module
 * Manages multitenancy for the platform
 */

import ModuleRegistry from "@/core/moduleRegistry";

// Export types
export * from "./types/tenant.types";

// Export services
export * from "./services/tenantService";
export * from "./services/tenantResolver";

// Module configuration
export const TENANT_MODULE = {
  name: "tenant",
  version: "1.0.0",
  description: "Multitenancy management for hybrid platform",
  enabled: true,
  dependencies: [],
  metadata: {
    category: "core",
    icon: "Building2",
  },
};

// Register module
ModuleRegistry.register(TENANT_MODULE);
