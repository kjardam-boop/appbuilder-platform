/**
 * CapabilityLoader
 * 
 * Dynamically loads and renders capability micro-frontends.
 * Handles:
 * - Lazy loading from Supabase Storage
 * - Error boundaries
 * - Loading states
 * - Config injection
 * - Theme application
 * 
 * @example
 * ```tsx
 * <CapabilityLoader
 *   capabilityKey="ai-chat"
 *   slot="sidebar"
 *   variant="compact"
 *   config={{ theme: "dark" }}
 * />
 * ```
 */

import React, { 
  useState, 
  useEffect, 
  useCallback,
  useMemo,
  useId,
} from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { 
  CapabilityManifest, 
  CapabilityProps, 
  CapabilitySlot,
  LoadedCapability,
} from "../schemas/capability-manifest.schema";
import { mergeConfigs, validateManifest } from "../schemas/capability-manifest.schema";

// ============================================================================
// TYPES
// ============================================================================

interface CapabilityLoaderProps {
  /** Capability key (e.g., "ai-chat") */
  capabilityKey: string;
  
  /** Version to load (defaults to latest) */
  version?: string;
  
  /** Slot to render in */
  slot?: CapabilitySlot;
  
  /** Variant to use */
  variant?: string;
  
  /** Instance-specific config overrides */
  config?: Record<string, any>;
  
  /** Theme overrides */
  theme?: Record<string, string>;
  
  /** Tenant config (from tenant_capabilities) */
  tenantConfig?: Record<string, any>;
  
  /** App config (from app_capability_usage) */
  appConfig?: Record<string, any>;
  
  /** Context passed to capability */
  context: {
    tenantId: string;
    userId?: string;
    appId?: string;
    locale?: string;
  };
  
  /** Callbacks */
  onAction?: (action: string, payload?: any) => void;
  onError?: (error: Error) => void;
  onLoad?: (manifest: CapabilityManifest) => void;
  
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  
  /** Custom error component */
  errorComponent?: React.ReactNode;
  
  /** Additional class names */
  className?: string;
}

// ============================================================================
// CAPABILITY CACHE
// ============================================================================

// Global cache for loaded capabilities
const capabilityCache = new Map<string, LoadedCapability>();

// Manifest cache
const manifestCache = new Map<string, CapabilityManifest>();

// ============================================================================
// LOADER FUNCTIONS
// ============================================================================

/**
 * Get the storage path for a capability
 */
function getCapabilityPath(key: string, version: string): string {
  return `capabilities/${key}/${version}`;
}

/**
 * Load manifest from Supabase Storage
 */
async function loadManifest(key: string, version: string): Promise<CapabilityManifest> {
  const cacheKey = `${key}@${version}`;
  
  // Check cache first
  if (manifestCache.has(cacheKey)) {
    return manifestCache.get(cacheKey)!;
  }
  
  const path = `${getCapabilityPath(key, version)}/manifest.json`;
  
  const { data, error } = await supabase.storage
    .from("capabilities")
    .download(path);
  
  if (error) {
    throw new Error(`Failed to load manifest for ${key}@${version}: ${error.message}`);
  }
  
  const text = await data.text();
  const manifest = validateManifest(JSON.parse(text));
  
  // Cache it
  manifestCache.set(cacheKey, manifest);
  
  return manifest;
}

/**
 * Load capability bundle from Supabase Storage
 */
async function loadBundle(
  key: string, 
  version: string, 
  bundlePath: string
): Promise<React.ComponentType<CapabilityProps>> {
  const basePath = getCapabilityPath(key, version);
  const fullPath = `${basePath}/${bundlePath.replace(/^\.\//, "")}`;
  
  // Get public URL for the bundle
  const { data: urlData } = supabase.storage
    .from("capabilities")
    .getPublicUrl(fullPath);
  
  if (!urlData?.publicUrl) {
    throw new Error(`Failed to get public URL for ${fullPath}`);
  }
  
  // Dynamic import the ESM module
  try {
    const module = await import(/* @vite-ignore */ urlData.publicUrl);
    
    // Expect default export to be the React component
    if (!module.default) {
      throw new Error(`Capability ${key} bundle does not have a default export`);
    }
    
    return module.default as React.ComponentType<CapabilityProps>;
  } catch (err) {
    console.error(`Failed to load bundle for ${key}:`, err);
    throw new Error(`Failed to load capability ${key}: ${(err as Error).message}`);
  }
}

/**
 * Create a placeholder component for development
 */
function createDevPlaceholder(
  capabilityData: { key: string; name: string; category: string; description?: string }
): React.ComponentType<CapabilityProps> {
  return function DevPlaceholder({ config, slot, onAction }: CapabilityProps) {
    const categoryIcons: Record<string, string> = {
      "AI": "🤖",
      "Integration": "🔗",
      "UI Component": "🎨",
      "Business Logic": "⚙️",
      "Authentication": "🔐",
      "Data Management": "📊",
      "Communication": "💬",
      "Analytics": "📈",
      "Workflow": "🔄",
      "Security": "🛡️",
      "Platform": "🏗️",
    };
    
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span>{categoryIcons[capabilityData.category] || "📦"}</span>
            {capabilityData.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {capabilityData.description && (
            <p className="text-xs text-muted-foreground">
              {capabilityData.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">
              {capabilityData.category}
            </span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">
              slot: {slot}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Dev mode – bundle ikke lastet
          </p>
          {Object.keys(config).length > 0 && (
            <details className="text-[10px]">
              <summary className="cursor-pointer text-muted-foreground">Config</summary>
              <pre className="mt-1 p-2 bg-muted rounded text-[9px] overflow-auto max-h-24">
                {JSON.stringify(config, null, 2)}
              </pre>
            </details>
          )}
          {onAction && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 text-xs"
              onClick={() => onAction("test", { source: capabilityData.key })}
            >
              Test Action
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };
}

/**
 * Load capability metadata from database
 */
async function loadCapabilityFromDb(key: string) {
  const { data } = await supabase
    .from("capabilities")
    .select("id, key, name, category, description, current_version")
    .eq("key", key)
    .maybeSingle();
  
  return data;
}

/**
 * Load a complete capability with all variants
 */
async function loadCapability(
  key: string, 
  version: string = "latest"
): Promise<LoadedCapability> {
  const cacheKey = `${key}@${version}`;
  
  // Check cache
  if (capabilityCache.has(cacheKey)) {
    const cached = capabilityCache.get(cacheKey)!;
    if (cached.status === "ready") {
      return cached;
    }
  }
  
  // Initialize loading state
  const loading: LoadedCapability = {
    manifest: {} as CapabilityManifest,
    Component: () => null,
    variants: {},
    exports: { components: {}, hooks: {}, utils: {} },
    status: "loading",
  };
  
  capabilityCache.set(cacheKey, loading);
  
  try {
    // Try to load manifest from storage
    const manifest = await loadManifest(key, version);
    loading.manifest = manifest;
    
    // Load default variant
    const defaultVariant = manifest.variants[manifest.defaultVariant];
    if (!defaultVariant) {
      throw new Error(`Default variant "${manifest.defaultVariant}" not found in manifest`);
    }
    
    loading.Component = await loadBundle(key, version, defaultVariant.bundle);
    loading.variants[manifest.defaultVariant] = loading.Component;
    
    // Mark as ready
    loading.status = "ready";
    
    return loading;
  } catch (storageError) {
    // Fallback: Load metadata from DB and create dev placeholder
    console.warn(`[CapabilityLoader] Bundle not found for ${key}, using dev placeholder`);
    
    try {
      const capData = await loadCapabilityFromDb(key);
      
      if (!capData) {
        throw new Error(`Capability "${key}" not found in database`);
      }
      
      // Create dev placeholder manifest
      const devManifest: CapabilityManifest = {
        key: capData.key,
        name: capData.name,
        version: capData.current_version || "0.0.1",
        description: capData.description || undefined,
        category: capData.category,
        defaultVariant: "default",
        variants: {
          default: {
            name: "Default",
            bundle: "./placeholder.js",
          },
        },
        slots: ["main", "sidebar", "floating"],
        defaultConfig: {},
      };
      
      loading.manifest = devManifest;
      loading.Component = createDevPlaceholder(capData);
      loading.variants["default"] = loading.Component;
      loading.status = "ready";
      
      capabilityCache.set(cacheKey, loading);
      
      return loading;
    } catch (dbError) {
      loading.status = "error";
      loading.error = storageError as Error;
      throw storageError;
    }
  }
}

/**
 * Load a specific variant on demand
 */
async function loadVariant(
  capability: LoadedCapability,
  variantName: string
): Promise<React.ComponentType<CapabilityProps>> {
  // Check if already loaded
  if (capability.variants[variantName]) {
    return capability.variants[variantName];
  }
  
  const variant = capability.manifest.variants[variantName];
  if (!variant) {
    throw new Error(`Variant "${variantName}" not found for ${capability.manifest.key}`);
  }
  
  const Component = await loadBundle(
    capability.manifest.key,
    capability.manifest.version,
    variant.bundle
  );
  
  capability.variants[variantName] = Component;
  return Component;
}

// ============================================================================
// ERROR FALLBACK
// ============================================================================

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          Capability Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {error.message || "Failed to load capability"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={resetErrorBoundary}
          className="gap-2"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LOADING COMPONENT
// ============================================================================

function LoadingFallback({ capabilityKey }: { capabilityKey: string }) {
  return (
    <Card className="animate-pulse">
      <CardContent className="flex items-center justify-center py-8 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading {capabilityKey}...
        </span>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CAPABILITY RENDERER (Inner component)
// ============================================================================

interface CapabilityRendererProps extends CapabilityLoaderProps {
  capability: LoadedCapability;
}

function CapabilityRenderer({
  capability,
  slot = "main",
  variant,
  config = {},
  theme = {},
  tenantConfig = {},
  appConfig = {},
  context,
  onAction,
  onError,
  className,
}: CapabilityRendererProps) {
  const instanceId = useId();
  const [Component, setComponent] = useState<React.ComponentType<CapabilityProps> | null>(null);
  
  // Determine which variant to use
  const variantName = variant || capability.manifest.defaultVariant;
  
  // Load variant on demand
  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      try {
        const Comp = await loadVariant(capability, variantName);
        if (mounted) {
          setComponent(() => Comp);
        }
      } catch (err) {
        onError?.(err as Error);
      }
    };
    
    // Check if variant is already loaded
    if (capability.variants[variantName]) {
      setComponent(() => capability.variants[variantName]);
    } else {
      load();
    }
    
    return () => { mounted = false; };
  }, [capability, variantName, onError]);
  
  // Merge all configs
  const mergedConfig = useMemo(() => {
    return mergeConfigs(
      capability.manifest.defaultConfig || {},
      tenantConfig,
      appConfig,
      config
    );
  }, [capability.manifest.defaultConfig, tenantConfig, appConfig, config]);
  
  // Merge theme
  const mergedTheme = useMemo(() => {
    const capTheme = capability.manifest.theme;
    const presetName = mergedConfig.themePreset || "default";
    const preset = capTheme?.presets?.[presetName] || {};
    
    return {
      ...preset,
      ...theme,
    };
  }, [capability.manifest.theme, mergedConfig.themePreset, theme]);
  
  if (!Component) {
    return <LoadingFallback capabilityKey={capability.manifest.key} />;
  }
  
  const props: CapabilityProps = {
    instanceId,
    config: mergedConfig,
    theme: mergedTheme,
    slot,
    variant: variantName,
    onAction,
    onConfigChange: (newConfig) => {
      console.log(`Config change for ${capability.manifest.key}:`, newConfig);
    },
    onError,
    context: {
      ...context,
      locale: context.locale || "nb-NO",
    },
  };
  
  return (
    <div 
      className={cn(
        "capability-container",
        `capability-${capability.manifest.key}`,
        `slot-${slot}`,
        `variant-${variantName}`,
        className
      )}
      data-capability={capability.manifest.key}
      data-version={capability.manifest.version}
      data-slot={slot}
      data-variant={variantName}
    >
      <Component {...props} />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CapabilityLoader({
  capabilityKey,
  version = "latest",
  slot,
  variant,
  config,
  theme,
  tenantConfig,
  appConfig,
  context,
  onAction,
  onError,
  onLoad,
  loadingComponent,
  errorComponent,
  className,
}: CapabilityLoaderProps) {
  const [capability, setCapability] = useState<LoadedCapability | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load capability on mount
  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cap = await loadCapability(capabilityKey, version);
        if (mounted) {
          setCapability(cap);
          onLoad?.(cap.manifest);
        }
      } catch (err) {
        if (mounted) {
          const e = err as Error;
          setError(e);
          onError?.(e);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    load();
    
    return () => { mounted = false; };
  }, [capabilityKey, version, onLoad, onError]);
  
  // Reset error and retry
  const handleRetry = useCallback(() => {
    // Clear cache and reload
    const cacheKey = `${capabilityKey}@${version}`;
    capabilityCache.delete(cacheKey);
    manifestCache.delete(cacheKey);
    
    setCapability(null);
    setError(null);
    setLoading(true);
    
    loadCapability(capabilityKey, version)
      .then((cap) => {
        setCapability(cap);
        onLoad?.(cap.manifest);
      })
      .catch((err) => {
        setError(err);
        onError?.(err);
      })
      .finally(() => setLoading(false));
  }, [capabilityKey, version, onLoad, onError]);
  
  // Loading state
  if (loading) {
    return loadingComponent || <LoadingFallback capabilityKey={capabilityKey} />;
  }
  
  // Error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    return (
      <ErrorFallback 
        error={error} 
        resetErrorBoundary={handleRetry} 
      />
    );
  }
  
  // Not loaded (shouldn't happen)
  if (!capability) {
    return null;
  }
  
  // Render with error boundary
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={handleRetry}
      onError={onError}
    >
      <CapabilityRenderer
        capabilityKey={capabilityKey}
        version={version}
        capability={capability}
        slot={slot}
        variant={variant}
        config={config}
        theme={theme}
        tenantConfig={tenantConfig}
        appConfig={appConfig}
        context={context}
        onAction={onAction}
        onError={onError}
        className={className}
      />
    </ErrorBoundary>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { loadCapability, loadManifest, loadVariant };
export { capabilityCache, manifestCache };

