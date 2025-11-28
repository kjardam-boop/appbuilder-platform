/**
 * AppShell
 * 
 * Main container for rendering generated applications.
 * Loads app configuration and renders capabilities in their designated slots.
 * 
 * @example
 * ```tsx
 * // Render a generated app
 * <AppShell 
 *   appId="my-app-id"
 *   tenantId="tenant-123"
 *   userId="user-456"
 * />
 * 
 * // Or with custom layout
 * <AppShell
 *   appId="my-app-id"
 *   tenantId="tenant-123"
 *   layout="dashboard"
 *   theme={{ primary: "#007bff" }}
 * />
 * ```
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CapabilitySlot, SlotProvider, type SlotCapability } from "./CapabilitySlot";
import type { CapabilitySlot as SlotType } from "../schemas/capability-manifest.schema";

// ============================================================================
// TYPES
// ============================================================================

export interface AppShellProps {
  /** App ID (from app_definitions or customer_app_projects) */
  appId: string;
  
  /** Tenant ID */
  tenantId: string;
  
  /** Current user ID */
  userId?: string;
  
  /** Layout template */
  layout?: "default" | "dashboard" | "minimal" | "fullscreen";
  
  /** Theme overrides */
  theme?: {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
  };
  
  /** Locale */
  locale?: string;
  
  /** Custom header content */
  headerContent?: React.ReactNode;
  
  /** Custom footer content */
  footerContent?: React.ReactNode;
  
  /** Show sidebar */
  showSidebar?: boolean;
  
  /** Sidebar default state */
  sidebarOpen?: boolean;
  
  /** Global action handler */
  onAction?: (capabilityKey: string, action: string, payload?: any) => void;
  
  /** Error handler */
  onError?: (capabilityKey: string, error: Error) => void;
  
  /** App loaded callback */
  onAppLoaded?: (appConfig: AppConfig) => void;
  
  /** Additional class names */
  className?: string;
}

export interface AppConfig {
  id: string;
  name: string;
  description?: string;
  capabilities: AppCapabilityConfig[];
  layout: LayoutConfig;
  theme: ThemeConfig;
  branding?: BrandingConfig;
}

export interface AppCapabilityConfig {
  capabilityId: string;
  capabilityKey: string;
  capabilityName: string;
  slot: SlotType;
  variant?: string;
  order: number;
  config: Record<string, any>;
  isRequired: boolean;
}

export interface LayoutConfig {
  type: "default" | "dashboard" | "minimal" | "fullscreen";
  showHeader: boolean;
  showSidebar: boolean;
  showFooter: boolean;
  sidebarPosition: "left" | "right";
  sidebarWidth: number;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  fontFamily: string;
  borderRadius: string;
}

export interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  appName?: string;
  tagline?: string;
}

// ============================================================================
// DEFAULT CONFIGS
// ============================================================================

const DEFAULT_LAYOUT: LayoutConfig = {
  type: "default",
  showHeader: true,
  showSidebar: true,
  showFooter: false,
  sidebarPosition: "left",
  sidebarWidth: 280,
};

const DEFAULT_THEME: ThemeConfig = {
  primary: "hsl(222.2 47.4% 11.2%)",
  secondary: "hsl(210 40% 96.1%)",
  accent: "hsl(210 40% 96.1%)",
  background: "hsl(0 0% 100%)",
  surface: "hsl(0 0% 100%)",
  text: "hsl(222.2 84% 4.9%)",
  muted: "hsl(215.4 16.3% 46.9%)",
  fontFamily: "Inter, system-ui, sans-serif",
  borderRadius: "0.5rem",
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch app configuration from database
 */
function useAppConfig(appId: string, tenantId: string) {
  return useQuery({
    queryKey: ["app-config", appId, tenantId],
    queryFn: async (): Promise<AppConfig> => {
      // First try customer_app_projects (for wizard-created apps)
      const { data: project, error: projectError } = await supabase
        .from("customer_app_projects")
        .select(`
          id,
          name,
          description,
          branding,
          app_capability_usage (
            id,
            capability_id,
            is_required,
            config_schema,
            capabilities (
              id,
              key,
              name,
              category
            )
          )
        `)
        .eq("id", appId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (project) {
        // Map capabilities to slots based on category
        const capabilities: AppCapabilityConfig[] = (project.app_capability_usage || []).map(
          (usage: any, index: number) => ({
            capabilityId: usage.capability_id,
            capabilityKey: usage.capabilities?.key || "unknown",
            capabilityName: usage.capabilities?.name || "Unknown",
            slot: mapCategoryToSlot(usage.capabilities?.category),
            variant: "default",
            order: index,
            config: usage.config_schema || {},
            isRequired: usage.is_required || false,
          })
        );

        return {
          id: project.id,
          name: project.name,
          description: project.description || undefined,
          capabilities,
          layout: DEFAULT_LAYOUT,
          theme: DEFAULT_THEME,
          branding: project.branding as BrandingConfig | undefined,
        };
      }

      // Try app_definitions (for pre-built apps)
      const { data: appDef, error: appDefError } = await supabase
        .from("app_definitions")
        .select(`
          id,
          name,
          description,
          default_config,
          app_capability_usage (
            id,
            capability_id,
            is_required,
            config_schema,
            capabilities (
              id,
              key,
              name,
              category
            )
          )
        `)
        .eq("id", appId)
        .maybeSingle();

      if (appDef) {
        const capabilities: AppCapabilityConfig[] = (appDef.app_capability_usage || []).map(
          (usage: any, index: number) => ({
            capabilityId: usage.capability_id,
            capabilityKey: usage.capabilities?.key || "unknown",
            capabilityName: usage.capabilities?.name || "Unknown",
            slot: mapCategoryToSlot(usage.capabilities?.category),
            variant: "default",
            order: index,
            config: usage.config_schema || {},
            isRequired: usage.is_required || false,
          })
        );

        const defaultConfig = appDef.default_config as Record<string, any> | null;

        return {
          id: appDef.id,
          name: appDef.name,
          description: appDef.description || undefined,
          capabilities,
          layout: (defaultConfig?.layout as LayoutConfig) || DEFAULT_LAYOUT,
          theme: (defaultConfig?.theme as ThemeConfig) || DEFAULT_THEME,
          branding: defaultConfig?.branding as BrandingConfig | undefined,
        };
      }

      throw new Error(`App not found: ${appId}`);
    },
    enabled: !!appId && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Map capability category to default slot
 */
function mapCategoryToSlot(category?: string): SlotType {
  switch (category) {
    case "AI":
      return "floating";
    case "Integration":
      return "main";
    case "UI Component":
      return "main";
    case "Business Logic":
      return "main";
    case "Authentication":
      return "header";
    case "Data Management":
      return "main";
    case "Communication":
      return "sidebar";
    case "Analytics":
      return "main";
    case "Workflow":
      return "sidebar";
    case "Security":
      return "header";
    case "Platform":
      return "main";
    default:
      return "main";
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AppHeaderProps {
  appConfig: AppConfig;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  headerContent?: React.ReactNode;
}

function AppHeader({ appConfig, sidebarOpen, onToggleSidebar, headerContent }: AppHeaderProps) {
  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="flex h-full items-center px-4 gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo / App name */}
        <div className="flex items-center gap-3">
          {appConfig.branding?.logoUrl ? (
            <img 
              src={appConfig.branding.logoUrl} 
              alt={appConfig.name}
              className="h-8 w-auto"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                {appConfig.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className="font-semibold text-sm">{appConfig.name}</h1>
            {appConfig.branding?.tagline && (
              <p className="text-xs text-muted-foreground">{appConfig.branding.tagline}</p>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Custom header content */}
        {headerContent}

        {/* Settings button */}
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

interface AppSidebarProps {
  capabilities: SlotCapability[];
  context: {
    tenantId: string;
    userId?: string;
    appId: string;
    locale: string;
  };
  onAction?: (capabilityKey: string, action: string, payload?: any) => void;
  onError?: (capabilityKey: string, error: Error) => void;
}

function AppSidebar({ capabilities, context, onAction, onError }: AppSidebarProps) {
  if (capabilities.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No sidebar capabilities
      </div>
    );
  }

  return (
    <CapabilitySlot
      name="sidebar"
      capabilities={capabilities}
      layout="stack"
      gap="md"
      context={context}
      onAction={onAction}
      onError={onError}
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AppShell({
  appId,
  tenantId,
  userId,
  layout: layoutOverride,
  theme: themeOverride,
  locale = "nb-NO",
  headerContent,
  footerContent,
  showSidebar: showSidebarOverride,
  sidebarOpen: sidebarOpenDefault = true,
  onAction,
  onError,
  onAppLoaded,
  className,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(sidebarOpenDefault);
  
  // Fetch app configuration
  const { data: appConfig, isLoading, error } = useAppConfig(appId, tenantId);

  // Notify when app is loaded
  useEffect(() => {
    if (appConfig) {
      onAppLoaded?.(appConfig);
    }
  }, [appConfig, onAppLoaded]);

  // Context for all capabilities
  const context = useMemo(() => ({
    tenantId,
    userId,
    appId,
    locale,
  }), [tenantId, userId, appId, locale]);

  // Group capabilities by slot
  const capabilitiesBySlot = useMemo(() => {
    if (!appConfig) return {};
    
    const grouped: Record<SlotType, SlotCapability[]> = {
      header: [],
      sidebar: [],
      main: [],
      modal: [],
      inline: [],
      floating: [],
      footer: [],
      drawer: [],
      panel: [],
    };

    appConfig.capabilities.forEach((cap) => {
      grouped[cap.slot].push({
        key: cap.capabilityKey,
        variant: cap.variant,
        config: cap.config,
        order: cap.order,
      });
    });

    // Sort by order
    Object.keys(grouped).forEach((slot) => {
      grouped[slot as SlotType].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return grouped;
  }, [appConfig]);

  // Merge layout config
  const layoutConfig = useMemo(() => {
    if (!appConfig) return DEFAULT_LAYOUT;
    return {
      ...appConfig.layout,
      type: layoutOverride || appConfig.layout.type,
      showSidebar: showSidebarOverride ?? appConfig.layout.showSidebar,
    };
  }, [appConfig, layoutOverride, showSidebarOverride]);

  // Merge theme config
  const themeConfig = useMemo(() => {
    if (!appConfig) return DEFAULT_THEME;
    return {
      ...appConfig.theme,
      ...themeOverride,
    };
  }, [appConfig, themeOverride]);

  // Apply theme as CSS variables
  const themeStyle = useMemo(() => ({
    "--app-primary": themeConfig.primary,
    "--app-secondary": themeConfig.secondary,
    "--app-accent": themeConfig.accent,
    "--app-background": themeConfig.background,
    "--app-surface": themeConfig.surface,
    "--app-text": themeConfig.text,
    "--app-muted": themeConfig.muted,
    "--app-font-family": themeConfig.fontFamily,
    "--app-border-radius": themeConfig.borderRadius,
  } as React.CSSProperties), [themeConfig]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !appConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">Failed to load application</h2>
          <p className="text-muted-foreground">
            {error?.message || "Application configuration could not be loaded."}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render based on layout type
  return (
    <SlotProvider>
      <div 
        className={cn(
          "app-shell min-h-screen flex flex-col",
          `layout-${layoutConfig.type}`,
          className
        )}
        style={themeStyle}
        data-app-id={appId}
        data-tenant-id={tenantId}
      >
        {/* Header */}
        {layoutConfig.showHeader && (
          <AppHeader
            appConfig={appConfig}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            headerContent={headerContent}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex">
          {/* Desktop Sidebar */}
          {layoutConfig.showSidebar && capabilitiesBySlot.sidebar.length > 0 && (
            <aside 
              className={cn(
                "hidden md:block border-r bg-muted/30 overflow-y-auto",
                layoutConfig.sidebarPosition === "right" && "order-2 border-l border-r-0"
              )}
              style={{ width: layoutConfig.sidebarWidth }}
            >
              <div className="p-4">
                <AppSidebar
                  capabilities={capabilitiesBySlot.sidebar}
                  context={context}
                  onAction={onAction}
                  onError={onError}
                />
              </div>
            </aside>
          )}

          {/* Mobile Sidebar (Sheet) */}
          {layoutConfig.showSidebar && capabilitiesBySlot.sidebar.length > 0 && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent 
                side={layoutConfig.sidebarPosition} 
                className="w-[280px] p-4"
              >
                <AppSidebar
                  capabilities={capabilitiesBySlot.sidebar}
                  context={context}
                  onAction={onAction}
                  onError={onError}
                />
              </SheetContent>
            </Sheet>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              {capabilitiesBySlot.main.length > 0 ? (
                <CapabilitySlot
                  name="main"
                  capabilities={capabilitiesBySlot.main}
                  layout="stack"
                  gap="lg"
                  context={context}
                  onAction={onAction}
                  onError={onError}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No capabilities configured for this application.</p>
                  <p className="text-sm mt-2">
                    Add capabilities in the App Wizard to get started.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Footer */}
        {layoutConfig.showFooter && (
          <footer className="border-t py-4 px-6">
            {footerContent || (
              <div className="text-center text-sm text-muted-foreground">
                Powered by AppBuilder Platform
              </div>
            )}
          </footer>
        )}

        {/* Floating capabilities (e.g., AI Chat bubble) */}
        {capabilitiesBySlot.floating.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <CapabilitySlot
              name="floating"
              capabilities={capabilitiesBySlot.floating}
              layout="stack"
              gap="sm"
              context={context}
              onAction={onAction}
              onError={onError}
            />
          </div>
        )}
      </div>
    </SlotProvider>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { SlotCapability };

