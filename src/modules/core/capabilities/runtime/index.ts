/**
 * Capabilities Runtime
 * 
 * Components and utilities for loading and rendering capabilities at runtime.
 */

// Loader
export { CapabilityLoader, loadCapability, loadManifest, loadVariant } from "./CapabilityLoader";

// Slot system
export { 
  CapabilitySlot, 
  SlotProvider, 
  useSlotContext,
  type SlotCapability,
  type CapabilitySlotProps,
} from "./CapabilitySlot";

// App Shell
export {
  AppShell,
  type AppShellProps,
  type AppConfig,
  type AppCapabilityConfig,
  type LayoutConfig,
  type ThemeConfig,
  type BrandingConfig,
} from "./AppShell";

