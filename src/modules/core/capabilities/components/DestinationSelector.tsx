/**
 * DestinationSelector
 * 
 * Dropdown component for selecting where capability output should be routed.
 * Shows grouped options: Capabilities, Integrations (n8n), Custom Webhooks,
 * and "Create new workflow" option.
 * 
 * Features:
 * - Only shows 100% compatible workflows (via WorkflowCompatibilityService)
 * - Option to create new workflow if none are compatible
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import * as Icons from 'lucide-react';
import { LucideIcon, Link2, Workflow, Box, Webhook, Plus } from 'lucide-react';
import { DestinationService, type DestinationGroup, type DestinationOption } from '../services/destinationService';
import type { DestinationType, CapabilityIOType } from '../types/capability.types';
import { CreateWorkflowDialog } from './CreateWorkflowDialog';
import { supabase } from '@/integrations/supabase/client';

interface DestinationSelectorProps {
  capabilityId: string;
  outputTypes?: CapabilityIOType[];
  value?: {
    type: DestinationType | null;
    id: string | null;
    url?: string | null;
  };
  onChange: (destination: {
    type: DestinationType | null;
    id: string | null;
    url?: string | null;
  }) => void;
  disabled?: boolean;
}

export function DestinationSelector({
  capabilityId,
  outputTypes,
  value,
  onChange,
  disabled = false,
}: DestinationSelectorProps) {
  const queryClient = useQueryClient();
  const [customWebhookUrl, setCustomWebhookUrl] = useState(value?.url || '');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [capabilityInfo, setCapabilityInfo] = useState<{ key: string; name: string } | null>(null);

  // Fetch tenant ID and capability info
  useQuery({
    queryKey: ['tenant-and-capability', capabilityId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Try 1: Get from any user_role with scope_id
      const { data: roleWithScope } = await supabase
        .from('user_roles')
        .select('scope_id')
        .eq('user_id', user.id)
        .not('scope_id', 'is', null)
        .limit(1)
        .maybeSingle();
      
      let foundTenantId = roleWithScope?.scope_id;
      
      // Try 2: Platform user - get first active tenant
      if (!foundTenantId) {
        const { data: platformRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['platform_admin', 'platform_owner'])
          .limit(1)
          .maybeSingle();
        
        if (platformRole) {
          const { data: firstTenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          
          foundTenantId = firstTenant?.id;
        }
      }
      
      // Try 3: Check user metadata
      if (!foundTenantId && user.user_metadata?.tenant_id) {
        foundTenantId = user.user_metadata.tenant_id;
      }
      
      const { data: capability } = await supabase
        .from('capabilities')
        .select('key, name')
        .eq('id', capabilityId)
        .single();
      
      if (foundTenantId) setTenantId(foundTenantId);
      if (capability) setCapabilityInfo(capability);
      
      return { tenantId: foundTenantId, capability };
    },
    enabled: !!capabilityId,
  });

  // Fetch compatible destinations
  const { data: destinationGroups, isLoading, error } = useQuery({
    queryKey: ['destinations', capabilityId, outputTypes],
    queryFn: () => DestinationService.getCompatibleDestinations(capabilityId, outputTypes),
    enabled: !!capabilityId,
    retry: false, // Don't retry on errors (table might not exist)
  });

  // Handle select change
  const handleSelectChange = (selectValue: string) => {
    if (selectValue === 'none') {
      onChange({ type: null, id: null, url: null });
      return;
    }

    if (selectValue === 'custom-webhook') {
      onChange({ type: 'webhook', id: null, url: customWebhookUrl || null });
      return;
    }

    // Handle "create new workflow" option
    if (selectValue === 'create_workflow:create-new-workflow') {
      setShowCreateDialog(true);
      return;
    }

    // Parse the combined value (type:id)
    const [type, id] = selectValue.split(':') as [DestinationType, string];
    onChange({ type, id, url: null });
  };

  // Handle workflow created
  const handleWorkflowCreated = (result: { integrationDefId?: string; webhookUrl?: string }) => {
    // Invalidate destinations query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['destinations', capabilityId] });
    
    // Select the newly created workflow
    if (result.integrationDefId) {
      onChange({ 
        type: 'integration', 
        id: result.integrationDefId, 
        url: result.webhookUrl || null 
      });
    }
    
    setShowCreateDialog(false);
  };

  // Handle custom webhook URL change
  const handleWebhookUrlChange = (url: string) => {
    setCustomWebhookUrl(url);
    if (value?.type === 'webhook') {
      onChange({ type: 'webhook', id: null, url });
    }
  };

  // Get current select value
  const getSelectValue = () => {
    if (!value?.type) return 'none';
    if (value.type === 'webhook' && !value.id) return 'custom-webhook';
    return `${value.type}:${value.id}`;
  };

  // Get icon for destination type
  const getTypeIcon = (type: DestinationType | 'create_workflow'): LucideIcon => {
    switch (type) {
      case 'capability': return Box;
      case 'integration': return Workflow;
      case 'webhook': return Webhook;
      case 'create_workflow': return Plus;
      default: return Link2;
    }
  };

  // Get icon component
  const getIconComponent = (iconName: string | null): LucideIcon => {
    if (iconName && Icons[iconName as keyof typeof Icons]) {
      return Icons[iconName as keyof typeof Icons] as LucideIcon;
    }
    return Box;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Destinasjon</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Show error if table doesn't exist (migration not run)
  if (error) {
    return (
      <div className="space-y-2">
        <Label>Destinasjon</Label>
        <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
          <p className="font-medium text-amber-600 mb-1">Migrasjon mangler</p>
          <p className="text-xs">
            Kjør migrasjonene <code className="bg-muted px-1 rounded">20251211100000_add_capability_io_types.sql</code> og <code className="bg-muted px-1 rounded">20251211110000_update_ocr_capability.sql</code> for å aktivere destinasjonsvelger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="destination-select">Destinasjon for OCR-resultat</Label>
        <Select
          value={getSelectValue()}
          onValueChange={handleSelectChange}
          disabled={disabled}
        >
          <SelectTrigger id="destination-select">
            <SelectValue placeholder="Velg destinasjon..." />
          </SelectTrigger>
          <SelectContent>
            {/* None option */}
            <SelectItem value="none">
              <span className="text-muted-foreground">Ingen (bare vis resultat)</span>
            </SelectItem>

            {/* Grouped options */}
            {destinationGroups?.map((group) => (
              <SelectGroup key={group.type}>
                <SelectLabel className="flex items-center gap-2">
                  {(() => {
                    const TypeIcon = getTypeIcon(group.type);
                    return <TypeIcon className="h-3 w-3" />;
                  })()}
                  {group.label}
                </SelectLabel>
                {group.options.map((option) => (
                  <SelectItem 
                    key={option.id} 
                    value={option.type === 'webhook' && option.id === 'custom-webhook' 
                      ? 'custom-webhook' 
                      : `${option.type}:${option.id}`
                    }
                  >
                    <div className="flex items-center gap-2">
                      {(() => {
                        const OptionIcon = getIconComponent(option.icon_name);
                        return <OptionIcon className="h-4 w-4 text-muted-foreground" />;
                      })()}
                      <span>{option.name}</span>
                      {option.integration_type && (
                        <Badge variant="outline" className="text-xs">
                          {option.integration_type}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom webhook URL input */}
      {value?.type === 'webhook' && (
        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://api.example.com/webhook"
            value={customWebhookUrl}
            onChange={(e) => handleWebhookUrlChange(e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            OCR-resultatet sendes som JSON til denne URL-en via POST.
          </p>
        </div>
      )}

      {/* Show selected destination info */}
      {value?.type && value.type !== 'webhook' && destinationGroups && (
        <SelectedDestinationInfo
          groups={destinationGroups}
          type={value.type}
          id={value.id}
        />
      )}

      {/* Create Workflow Dialog */}
      {tenantId && (
        <CreateWorkflowDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          tenantId={tenantId}
          sourceCapability={capabilityInfo ? {
            key: capabilityInfo.key,
            name: capabilityInfo.name,
            outputFormat: '{ extractedText, confidence, provider, fileName, fileType }',
          } : undefined}
          onWorkflowCreated={handleWorkflowCreated}
        />
      )}
    </div>
  );
}

// Helper component to show selected destination info
function SelectedDestinationInfo({
  groups,
  type,
  id,
}: {
  groups: DestinationGroup[];
  type: DestinationType;
  id: string | null;
}) {
  const option = groups
    .flatMap(g => g.options)
    .find(o => o.type === type && o.id === id);

  if (!option) return null;

  return (
    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
      <p className="font-medium">{option.name}</p>
      {option.description && (
        <p className="mt-1">{option.description}</p>
      )}
      {option.accepts_types.length > 0 && (
        <div className="mt-1 flex gap-1">
          <span>Aksepterer:</span>
          {option.accepts_types.map(t => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

