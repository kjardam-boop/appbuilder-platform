/**
 * Step 4: Capaotilities Selection
 * 
 * Fourth step of the App Creation Wizard.
 * Select reusable capabilities to include in the app.
 * Auto-saves when capabilities are selected/deselected.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Sparkles, Check, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { 
  LoadingState,
  EmptyState,
} from '@/components/shared';
import { 
  useCapabilities, 
  useTenantCapabilities,
  type Capability 
} from '@/modules/core/capabilities';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import type { WizardState } from '../types/wizard.types';

interface Step4Props {
  state: WizardState;
  onStateChange: (updates: Partial<WizardState>) => void;
  tenantId: string;
}

interface SelectedCapability {
  id: string;
  key: string;
  name: string;
  category: string;
}

// Category icons/colors for visual grouping
const CATEGORY_STYLES: Record<string, { color: string; bg: string }> = {
  AI: { color: 'text-purple-600', bg: 'bg-purple-100' },
  Integration: { color: 'text-blue-600', bg: 'bg-blue-100' },
  Storage: { color: 'text-green-600', bg: 'bg-green-100' },
  Communication: { color: 'text-orange-600', bg: 'bg-orange-100' },
  Authentication: { color: 'text-red-600', bg: 'bg-red-100' },
  Analytics: { color: 'text-cyan-600', bg: 'bg-cyan-100' },
  Workflow: { color: 'text-yellow-600', bg: 'bg-yellow-100' },
};

export function Step4Capabilities({
  state,
  onStateChange,
  tenantId,
}: Step4Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isInitialMount = useRef(true);
  
  // Fetch all available capabilities
  const { data: capabilities, isLoading: loadingCaps } = useCapabilities({ is_active: true });
  
  // Fetch tenant's enabled capabilities
  const { data: tenantCaps, isLoading: loadingTenantCaps } = useTenantCapabilities(tenantId);

  // Track selected capabilities locally
  const selectedCapabilities: SelectedCapability[] = (state as any).selectedCapabilities || [];
  
  // Debounce selected capabilities for auto-save
  const debouncedCapabilities = useDebounce(selectedCapabilities, 1000);
  
  const setSelectedCapabilities = (caps: SelectedCapability[]) => {
    onStateChange({ selectedCapabilities: caps } as any);
  };

  // Auto-save capabilities when they change (debounced)
  useEffect(() => {
    // Skip initial mount to avoid saving on load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Only save if we have a project ID
    if (!state.projectId) return;
    
    const saveCapabilities = async () => {
      setSaveStatus('saving');
      try {
        // Delete existing capabilities for this project
        // Try project_id first (new schema), fallback to app_definition_id
        await supabase
          .from('app_capability_usage')
          .delete()
          .eq('project_id', state.projectId);
        
        // Also delete any with app_definition_id (for migration compatibility)
        await supabase
          .from('app_capability_usage')
          .delete()
          .eq('app_definition_id', state.projectId);

        // Insert new capabilities
        if (debouncedCapabilities.length > 0) {
          // Try with project_id first (new schema)
          const { error: err1 } = await supabase
            .from('app_capability_usage')
            .insert(debouncedCapabilities.map(cap => ({
              project_id: state.projectId,
              capability_id: cap.id,
              is_required: false,
              config_schema: null,
            })));
          
          // If project_id fails (column doesn't exist), try app_definition_id
          if (err1 && err1.code === '42703') {
            console.log('[Step4] project_id column not found, using app_definition_id');
            const { error: err2 } = await supabase
              .from('app_capability_usage')
              .insert(debouncedCapabilities.map(cap => ({
                app_definition_id: state.projectId,
                capability_id: cap.id,
                is_required: false,
                config_schema: null,
              })));
            
            if (err2) throw err2;
          } else if (err1) {
            throw err1;
          }
        }
        
        console.log('[Step4] Capabilities saved:', debouncedCapabilities.length);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Kunne ikke lagre capabilities');
        setSaveStatus('idle');
      }
    };
    
    saveCapabilities();
  }, [debouncedCapabilities, state.projectId]);

  // Toggle capability selection
  const toggleCapability = (capability: Capability) => {
    const isSelected = selectedCapabilities.some(c => c.id === capability.id);
    if (isSelected) {
      setSelectedCapabilities(selectedCapabilities.filter(c => c.id !== capability.id));
    } else {
      setSelectedCapabilities([
        ...selectedCapabilities,
        {
          id: capability.id,
          key: capability.key,
          name: capability.name,
          category: capability.category,
        },
      ]);
    }
  };

  // Check if capability is enabled for tenant
  const isEnabledForTenant = (capabilityId: string) => {
    return tenantCaps?.some(tc => tc.capability_id === capabilityId && tc.is_enabled);
  };

  // Get unique categories
  const categories = capabilities 
    ? ['all', ...Array.from(new Set(capabilities.map(c => c.category)))]
    : ['all'];

  // Filter capabilities by category
  const filteredCapabilities = capabilities?.filter(c => 
    activeCategory === 'all' || c.category === activeCategory
  ) || [];

  // Group capabilities by category
  const groupedCapabilities = filteredCapabilities.reduce((acc, cap) => {
    if (!acc[cap.category]) acc[cap.category] = [];
    acc[cap.category].push(cap);
    return acc;
  }, {} as Record<string, Capability[]>);

  if (loadingCaps || loadingTenantCaps) {
    return <LoadingState message="Laster capabilities..." />;
  }

  if (!capabilities?.length) {
    return (
      <EmptyState
        title="Ingen capabilities tilgjengelig"
        description="Det er ingen capabilities registrert i systemet ennå."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Capabilities Summary */}
      {selectedCapabilities.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Valgte capabilities ({selectedCapabilities.length})
              </span>
              {/* Auto-save status indicator */}
              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Lagrer...
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Lagret
                  </>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedCapabilities.map((cap) => {
                const style = CATEGORY_STYLES[cap.category] || { color: 'text-gray-600', bg: 'bg-gray-100' };
                return (
                  <Badge 
                    key={cap.id} 
                    variant="secondary"
                    className="pl-2 pr-1 py-1"
                  >
                    <span className={`mr-1 text-xs ${style.color}`}>●</span>
                    {cap.name}
                    <button
                      type="button"
                      onClick={() => toggleCapability(cap as any)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capability Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Velg capabilities
          </CardTitle>
          <CardDescription>
            Capabilities er gjenbrukbare funksjoner som AI, integrasjoner, og workflows.
            Velg hvilke capabilities denne applikasjonen skal ha tilgang til.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="mb-4 flex flex-wrap h-auto">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat === 'all' ? 'Alle' : cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory}>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {Object.entries(groupedCapabilities).map(([category, caps]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${CATEGORY_STYLES[category]?.bg || 'bg-gray-200'}`} />
                        {category}
                      </h4>
                      <div className="grid gap-3">
                        {caps.map((capability) => {
                          const isSelected = selectedCapabilities.some(c => c.id === capability.id);
                          const enabledForTenant = isEnabledForTenant(capability.id);
                          const style = CATEGORY_STYLES[capability.category] || { color: 'text-gray-600', bg: 'bg-gray-100' };

                          return (
                            <div
                              key={capability.id}
                              className={`
                                flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer
                                ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
                                ${!enabledForTenant && 'opacity-60'}
                              `}
                              onClick={() => toggleCapability(capability)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCapability(capability)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{capability.name}</span>
                                  <Badge variant="outline" className={`text-xs ${style.color}`}>
                                    {capability.category}
                                  </Badge>
                                  {capability.current_version && (
                                    <Badge variant="secondary" className="text-xs">
                                      v{capability.current_version}
                                    </Badge>
                                  )}
                                  {!enabledForTenant && (
                                    <Badge variant="destructive" className="text-xs">
                                      Ikke aktivert
                                    </Badge>
                                  )}
                                </div>
                                {capability.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {capability.description}
                                  </p>
                                )}
                                {capability.tags && capability.tags.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {capability.tags.slice(0, 3).map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Info hover card */}
                              {capability.documentation_url && (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Info className="h-3 w-3" />
                                    </Button>
                                  </HoverCardTrigger>
                                  <HoverCardContent>
                                    <div className="space-y-2">
                                      <h5 className="font-semibold">{capability.name}</h5>
                                      <p className="text-sm text-muted-foreground">
                                        {capability.description}
                                      </p>
                                      <a 
                                        href={capability.documentation_url}
                                        className="text-sm text-primary underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Se dokumentasjon →
                                      </a>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Help text */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Om capabilities</p>
              <p className="mt-1">
                Capabilities som vises her er aktivert for din tenant. Capabilities 
                merket "Ikke aktivert" kan brukes etter at en administrator aktiverer dem 
                i tenant-innstillingene.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

