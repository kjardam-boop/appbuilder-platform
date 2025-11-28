/**
 * CapabilitySlot
 * 
 * Named slots for capability placement in the app layout.
 * Manages multiple capabilities in a single slot with layout options.
 * 
 * @example
 * ```tsx
 * // In your app layout:
 * <CapabilitySlot 
 *   name="sidebar"
 *   capabilities={[
 *     { key: "ai-chat", variant: "compact" },
 *     { key: "quick-actions" }
 *   ]}
 *   layout="stack"
 *   context={context}
 * />
 * ```
 */

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CapabilityLoader } from "./CapabilityLoader";
import type { CapabilitySlot as SlotType } from "../schemas/capability-manifest.schema";

// ============================================================================
// TYPES
// ============================================================================

export interface SlotCapability {
  /** Capability key */
  key: string;
  
  /** Version (defaults to latest) */
  version?: string;
  
  /** Variant to use */
  variant?: string;
  
  /** Instance-specific config */
  config?: Record<string, any>;
  
  /** Instance-specific theme overrides */
  theme?: Record<string, string>;
  
  /** Order in the slot (lower = first) */
  order?: number;
  
  /** Whether this capability is visible */
  visible?: boolean;
  
  /** Unique instance ID (auto-generated if not provided) */
  instanceId?: string;
}

export interface CapabilitySlotProps {
  /** Slot name (e.g., "sidebar", "main", "header") */
  name: SlotType;
  
  /** Capabilities to render in this slot */
  capabilities: SlotCapability[];
  
  /** Layout mode */
  layout?: "stack" | "grid" | "tabs" | "accordion";
  
  /** Gap between capabilities */
  gap?: "none" | "sm" | "md" | "lg";
  
  /** Grid columns (for grid layout) */
  columns?: 1 | 2 | 3 | 4;
  
  /** Tenant config to pass to all capabilities */
  tenantConfig?: Record<string, Record<string, any>>;
  
  /** App config to pass to all capabilities */
  appConfig?: Record<string, Record<string, any>>;
  
  /** Context for all capabilities */
  context: {
    tenantId: string;
    userId?: string;
    appId?: string;
    locale?: string;
  };
  
  /** Global action handler */
  onAction?: (capabilityKey: string, action: string, payload?: any) => void;
  
  /** Error handler */
  onError?: (capabilityKey: string, error: Error) => void;
  
  /** Additional class names */
  className?: string;
  
  /** Empty state when no capabilities */
  emptyState?: React.ReactNode;
}

// ============================================================================
// SLOT STYLES
// ============================================================================

const slotStyles: Record<SlotType, string> = {
  header: "w-full",
  sidebar: "h-full",
  main: "flex-1 w-full",
  modal: "w-full max-w-2xl",
  inline: "w-full",
  floating: "fixed z-50",
  footer: "w-full",
  drawer: "h-full w-80",
  panel: "h-full",
};

const layoutStyles = {
  stack: "flex flex-col",
  grid: "grid",
  tabs: "flex flex-col",
  accordion: "flex flex-col",
};

const gapStyles = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

const columnStyles = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Stack layout - capabilities stacked vertically
 */
function StackLayout({ 
  capabilities, 
  gap,
  renderCapability,
}: {
  capabilities: SlotCapability[];
  gap: "none" | "sm" | "md" | "lg";
  renderCapability: (cap: SlotCapability, index: number) => React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", gapStyles[gap])}>
      {capabilities.map((cap, index) => renderCapability(cap, index))}
    </div>
  );
}

/**
 * Grid layout - capabilities in a grid
 */
function GridLayout({ 
  capabilities, 
  gap,
  columns,
  renderCapability,
}: {
  capabilities: SlotCapability[];
  gap: "none" | "sm" | "md" | "lg";
  columns: 1 | 2 | 3 | 4;
  renderCapability: (cap: SlotCapability, index: number) => React.ReactNode;
}) {
  return (
    <div className={cn("grid", gapStyles[gap], columnStyles[columns])}>
      {capabilities.map((cap, index) => renderCapability(cap, index))}
    </div>
  );
}

/**
 * Tabs layout - capabilities in tabs
 */
function TabsLayout({ 
  capabilities, 
  name,
  renderCapability,
}: {
  capabilities: SlotCapability[];
  name: string;
  renderCapability: (cap: SlotCapability, index: number) => React.ReactNode;
}) {
  const [activeTab, setActiveTab] = React.useState(0);
  
  return (
    <div className="flex flex-col">
      {/* Tab headers */}
      <div className="flex border-b">
        {capabilities.map((cap, index) => (
          <button
            key={cap.instanceId || `${name}-${cap.key}-${index}`}
            onClick={() => setActiveTab(index)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === index
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {cap.key}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      <div className="pt-4">
        {capabilities.map((cap, index) => (
          <div 
            key={cap.instanceId || `${name}-${cap.key}-${index}`}
            className={cn(activeTab === index ? "block" : "hidden")}
          >
            {renderCapability(cap, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Accordion layout - collapsible capabilities
 */
function AccordionLayout({ 
  capabilities, 
  name,
  gap,
  renderCapability,
}: {
  capabilities: SlotCapability[];
  name: string;
  gap: "none" | "sm" | "md" | "lg";
  renderCapability: (cap: SlotCapability, index: number) => React.ReactNode;
}) {
  const [expandedItems, setExpandedItems] = React.useState<number[]>([0]);
  
  const toggleItem = (index: number) => {
    setExpandedItems((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };
  
  return (
    <div className={cn("flex flex-col", gapStyles[gap])}>
      {capabilities.map((cap, index) => (
        <div 
          key={cap.instanceId || `${name}-${cap.key}-${index}`}
          className="border rounded-lg overflow-hidden"
        >
          <button
            onClick={() => toggleItem(index)}
            className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm">{cap.key}</span>
            <span className={cn(
              "transition-transform",
              expandedItems.includes(index) ? "rotate-180" : ""
            )}>
              ▼
            </span>
          </button>
          
          <div className={cn(
            "transition-all duration-200",
            expandedItems.includes(index) 
              ? "max-h-[2000px] opacity-100 p-4" 
              : "max-h-0 opacity-0 overflow-hidden p-0"
          )}>
            {renderCapability(cap, index)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CapabilitySlot({
  name,
  capabilities,
  layout = "stack",
  gap = "md",
  columns = 2,
  tenantConfig = {},
  appConfig = {},
  context,
  onAction,
  onError,
  className,
  emptyState,
}: CapabilitySlotProps) {
  // Filter and sort capabilities
  const sortedCapabilities = useMemo(() => {
    return capabilities
      .filter((cap) => cap.visible !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [capabilities]);
  
  // Render a single capability
  const renderCapability = (cap: SlotCapability, index: number) => {
    const instanceId = cap.instanceId || `${name}-${cap.key}-${index}`;
    
    return (
      <CapabilityLoader
        key={instanceId}
        capabilityKey={cap.key}
        version={cap.version}
        slot={name}
        variant={cap.variant}
        config={cap.config}
        theme={cap.theme}
        tenantConfig={tenantConfig[cap.key]}
        appConfig={appConfig[cap.key]}
        context={context}
        onAction={(action, payload) => onAction?.(cap.key, action, payload)}
        onError={(error) => onError?.(cap.key, error)}
      />
    );
  };
  
  // Empty state
  if (sortedCapabilities.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    return null;
  }
  
  // Render based on layout
  let content: React.ReactNode;
  
  switch (layout) {
    case "grid":
      content = (
        <GridLayout
          capabilities={sortedCapabilities}
          gap={gap}
          columns={columns}
          renderCapability={renderCapability}
        />
      );
      break;
      
    case "tabs":
      content = (
        <TabsLayout
          capabilities={sortedCapabilities}
          name={name}
          renderCapability={renderCapability}
        />
      );
      break;
      
    case "accordion":
      content = (
        <AccordionLayout
          capabilities={sortedCapabilities}
          name={name}
          gap={gap}
          renderCapability={renderCapability}
        />
      );
      break;
      
    case "stack":
    default:
      content = (
        <StackLayout
          capabilities={sortedCapabilities}
          gap={gap}
          renderCapability={renderCapability}
        />
      );
  }
  
  return (
    <div
      className={cn(
        "capability-slot",
        `slot-${name}`,
        slotStyles[name],
        className
      )}
      data-slot={name}
      data-layout={layout}
      data-capability-count={sortedCapabilities.length}
    >
      {content}
    </div>
  );
}

// ============================================================================
// SLOT CONTEXT
// ============================================================================

interface SlotContextValue {
  slots: Record<string, SlotCapability[]>;
  registerCapability: (slot: SlotType, capability: SlotCapability) => void;
  unregisterCapability: (slot: SlotType, capabilityKey: string) => void;
  updateCapability: (slot: SlotType, capabilityKey: string, updates: Partial<SlotCapability>) => void;
}

const SlotContext = React.createContext<SlotContextValue | null>(null);

export function useSlotContext() {
  const context = React.useContext(SlotContext);
  if (!context) {
    throw new Error("useSlotContext must be used within a SlotProvider");
  }
  return context;
}

export function SlotProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = React.useState<Record<string, SlotCapability[]>>({});
  
  const registerCapability = React.useCallback((slot: SlotType, capability: SlotCapability) => {
    setSlots((prev) => ({
      ...prev,
      [slot]: [...(prev[slot] || []), capability],
    }));
  }, []);
  
  const unregisterCapability = React.useCallback((slot: SlotType, capabilityKey: string) => {
    setSlots((prev) => ({
      ...prev,
      [slot]: (prev[slot] || []).filter((c) => c.key !== capabilityKey),
    }));
  }, []);
  
  const updateCapability = React.useCallback((
    slot: SlotType, 
    capabilityKey: string, 
    updates: Partial<SlotCapability>
  ) => {
    setSlots((prev) => ({
      ...prev,
      [slot]: (prev[slot] || []).map((c) =>
        c.key === capabilityKey ? { ...c, ...updates } : c
      ),
    }));
  }, []);
  
  return (
    <SlotContext.Provider value={{ slots, registerCapability, unregisterCapability, updateCapability }}>
      {children}
    </SlotContext.Provider>
  );
}

