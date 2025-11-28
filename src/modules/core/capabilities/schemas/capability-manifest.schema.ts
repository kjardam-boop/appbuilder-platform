/**
 * Capability Manifest Schema
 * 
 * Defines the structure for micro-frontend capability bundles.
 * Each capability that has a UI component must provide a manifest.
 * 
 * @example
 * ```json
 * {
 *   "key": "ai-chat",
 *   "version": "1.2.0",
 *   "displayName": "AI Chat Assistant",
 *   "slots": ["sidebar", "modal", "inline"],
 *   "defaultSlot": "sidebar",
 *   "variants": {
 *     "default": { "bundle": "./index.esm.js" },
 *     "compact": { "bundle": "./variants/compact.esm.js" }
 *   },
 *   "configSchema": { ... },
 *   "dependencies": ["auth", "user-profile"],
 *   "exports": {
 *     "components": ["AIChatWidget", "AIChatButton"],
 *     "hooks": ["useAIChat", "useAIChatHistory"]
 *   }
 * }
 * ```
 */

import { z } from "zod";

// ============================================================================
// SLOT DEFINITIONS
// ============================================================================

/**
 * Available slots where capabilities can be rendered
 * - header: Top navigation area
 * - sidebar: Left/right sidebar
 * - main: Primary content area
 * - modal: Overlay/dialog
 * - inline: Embedded within other content
 * - floating: Fixed position (FAB, chat bubble)
 * - footer: Bottom area
 */
export const CapabilitySlotSchema = z.enum([
  "header",
  "sidebar",
  "main",
  "modal",
  "inline",
  "floating",
  "footer",
  "drawer",
  "panel",
]);

export type CapabilitySlot = z.infer<typeof CapabilitySlotSchema>;

// ============================================================================
// CONFIG SCHEMA (JSON Schema subset for UI generation)
// ============================================================================

/**
 * Simplified JSON Schema for capability configuration
 * Supports: string, number, boolean, select, color, array
 */
export const ConfigFieldSchema = z.object({
  type: z.enum(["string", "number", "boolean", "select", "color", "array", "object"]),
  title: z.string(),
  description: z.string().optional(),
  default: z.any().optional(),
  required: z.boolean().optional().default(false),
  
  // For string type
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  placeholder: z.string().optional(),
  
  // For number type
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  step: z.number().optional(),
  
  // For select type
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    icon: z.string().optional(),
  })).optional(),
  
  // For array type
  items: z.lazy(() => ConfigFieldSchema).optional(),
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  
  // UI hints
  group: z.string().optional(), // Group fields in UI
  order: z.number().optional(), // Display order
  hidden: z.boolean().optional(), // Hide from UI (advanced)
  condition: z.string().optional(), // Show only if condition met (e.g., "theme === 'custom'")
});

export type ConfigField = z.infer<typeof ConfigFieldSchema>;

export const ConfigSchemaSchema = z.record(z.string(), ConfigFieldSchema);
export type ConfigSchema = z.infer<typeof ConfigSchemaSchema>;

// ============================================================================
// VARIANT DEFINITION
// ============================================================================

/**
 * A variant is an alternative UI implementation of a capability
 * - default: Standard full-featured UI
 * - compact: Smaller, condensed version
 * - minimal: Just the essentials
 * - custom: Tenant-specific customization
 */
export const CapabilityVariantSchema = z.object({
  bundle: z.string(), // Path to ESM bundle (relative to capability root)
  styles: z.string().optional(), // Optional CSS file
  slots: z.array(CapabilitySlotSchema).optional(), // Override supported slots
  configOverrides: z.record(z.string(), z.any()).optional(), // Default config for this variant
  description: z.string().optional(),
  thumbnail: z.string().optional(), // Preview image URL
});

export type CapabilityVariant = z.infer<typeof CapabilityVariantSchema>;

// ============================================================================
// THEME SUPPORT
// ============================================================================

/**
 * Theme customization options for the capability
 */
export const ThemeOptionsSchema = z.object({
  // Whether the capability supports theme customization
  supportsTheming: z.boolean().default(true),
  
  // CSS variables the capability exposes for theming
  cssVariables: z.array(z.object({
    name: z.string(), // e.g., "--cap-ai-chat-bg"
    description: z.string(),
    type: z.enum(["color", "size", "font", "spacing"]),
    default: z.string(),
  })).optional(),
  
  // Pre-built theme presets
  presets: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

export type ThemeOptions = z.infer<typeof ThemeOptionsSchema>;

// ============================================================================
// EXPORTS DEFINITION
// ============================================================================

/**
 * What the capability exports for use by other capabilities/apps
 */
export const CapabilityExportsSchema = z.object({
  // React components that can be imported
  components: z.array(z.string()).optional(),
  
  // React hooks
  hooks: z.array(z.string()).optional(),
  
  // Utility functions
  utils: z.array(z.string()).optional(),
  
  // TypeScript types (for documentation)
  types: z.array(z.string()).optional(),
  
  // Event types this capability emits
  events: z.array(z.object({
    name: z.string(),
    payload: z.string(), // TypeScript type as string
    description: z.string().optional(),
  })).optional(),
  
  // Actions that can be triggered externally
  actions: z.array(z.object({
    name: z.string(),
    params: z.string().optional(), // TypeScript params type
    description: z.string().optional(),
  })).optional(),
});

export type CapabilityExports = z.infer<typeof CapabilityExportsSchema>;

// ============================================================================
// FULL MANIFEST
// ============================================================================

/**
 * Complete Capability Manifest
 * 
 * This is the contract between the platform and the capability.
 * Every capability with a UI must provide this manifest.
 */
export const CapabilityManifestSchema = z.object({
  // Identity
  key: z.string().regex(/^[a-z0-9-]+$/), // Unique identifier (e.g., "ai-chat")
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semantic version
  displayName: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(), // Lucide icon name or URL
  
  // Categorization
  category: z.enum([
    "AI",
    "Integration",
    "UI Component",
    "Business Logic",
    "Authentication",
    "Data Management",
    "Communication",
    "Analytics",
    "Workflow",
  ]),
  tags: z.array(z.string()).optional(),
  
  // Slot configuration
  slots: z.array(CapabilitySlotSchema), // Where this can be rendered
  defaultSlot: CapabilitySlotSchema, // Default slot if not specified
  
  // Variants (different UI implementations)
  variants: z.record(z.string(), CapabilityVariantSchema),
  defaultVariant: z.string().default("default"),
  
  // Configuration
  configSchema: ConfigSchemaSchema.optional(),
  defaultConfig: z.record(z.string(), z.any()).optional(),
  
  // Theming
  theme: ThemeOptionsSchema.optional(),
  
  // Dependencies
  dependencies: z.array(z.string()).optional(), // Other capability keys
  peerDependencies: z.record(z.string(), z.string()).optional(), // NPM packages (version ranges)
  
  // What this capability provides
  exports: CapabilityExportsSchema.optional(),
  
  // Size info (for loading indicators)
  bundleSize: z.object({
    js: z.number(), // bytes
    css: z.number().optional(),
  }).optional(),
  
  // Lifecycle hooks
  lifecycle: z.object({
    // Called when capability is first loaded
    onLoad: z.string().optional(), // Exported function name
    // Called when capability is mounted
    onMount: z.string().optional(),
    // Called when capability is unmounted
    onUnmount: z.string().optional(),
    // Called when config changes
    onConfigChange: z.string().optional(),
  }).optional(),
  
  // Documentation
  documentation: z.object({
    readme: z.string().optional(), // Markdown content or URL
    examples: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      code: z.string(),
    })).optional(),
    apiReference: z.string().optional(), // URL
  }).optional(),
  
  // Platform requirements
  platform: z.object({
    minVersion: z.string().optional(), // Minimum platform version
    maxVersion: z.string().optional(), // Maximum platform version
  }).optional(),
});

export type CapabilityManifest = z.infer<typeof CapabilityManifestSchema>;

// ============================================================================
// LOADED CAPABILITY (Runtime representation)
// ============================================================================

/**
 * Runtime representation of a loaded capability
 */
export interface LoadedCapability {
  manifest: CapabilityManifest;
  
  // The actual React component
  Component: React.ComponentType<CapabilityProps>;
  
  // Variant components if loaded
  variants: Record<string, React.ComponentType<CapabilityProps>>;
  
  // Exported items
  exports: {
    components: Record<string, React.ComponentType<any>>;
    hooks: Record<string, (...args: any[]) => any>;
    utils: Record<string, (...args: any[]) => any>;
  };
  
  // Loading state
  status: "loading" | "ready" | "error";
  error?: Error;
}

/**
 * Props passed to every capability component
 */
export interface CapabilityProps {
  // Unique instance ID
  instanceId: string;
  
  // Current configuration (merged: default + tenant + app)
  config: Record<string, any>;
  
  // Theme variables
  theme: Record<string, string>;
  
  // Slot this instance is rendered in
  slot: CapabilitySlot;
  
  // Selected variant
  variant: string;
  
  // Callbacks
  onAction?: (action: string, payload?: any) => void;
  onConfigChange?: (newConfig: Record<string, any>) => void;
  onError?: (error: Error) => void;
  
  // Context from app shell
  context: {
    tenantId: string;
    userId?: string;
    appId?: string;
    locale: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate a capability manifest
 */
export function validateManifest(manifest: unknown): CapabilityManifest {
  return CapabilityManifestSchema.parse(manifest);
}

/**
 * Create a minimal valid manifest
 */
export function createManifest(
  key: string,
  displayName: string,
  options: Partial<CapabilityManifest> = {}
): CapabilityManifest {
  return {
    key,
    version: "1.0.0",
    displayName,
    category: "UI Component",
    slots: ["main"],
    defaultSlot: "main",
    variants: {
      default: { bundle: "./index.esm.js" },
    },
    defaultVariant: "default",
    ...options,
  };
}

/**
 * Merge configs: default < tenant < app < instance
 */
export function mergeConfigs(
  defaultConfig: Record<string, any>,
  tenantConfig: Record<string, any> = {},
  appConfig: Record<string, any> = {},
  instanceConfig: Record<string, any> = {}
): Record<string, any> {
  return {
    ...defaultConfig,
    ...tenantConfig,
    ...appConfig,
    ...instanceConfig,
  };
}

