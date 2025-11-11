import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExternalSystemIntegration {
  id: string;
  external_system_id: string;
  integration_definition_id?: string;
  integration_type: string;
  name: string;
  description?: string;
  documentation_url?: string;
  is_official: boolean;
  implementation_status: 'available' | 'implemented' | 'planned' | 'deprecated';
  auth_methods?: string[];
  features?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useExternalSystemIntegrations(externalSystemId: string) {
  return useQuery({
    queryKey: ['external-system-integrations', externalSystemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_system_integrations')
        .select('*')
        .eq('external_system_id', externalSystemId)
        .order('implementation_status', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return (data || []) as ExternalSystemIntegration[];
    },
    enabled: !!externalSystemId,
  });
}

export function useImplementedIntegrations(externalSystemId: string) {
  return useQuery({
    queryKey: ['implemented-integrations', externalSystemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_definitions')
        .select('*')
        .eq('external_system_id', externalSystemId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!externalSystemId,
  });
}

export function useScanSystemIntegrations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      externalSystemId, 
      websiteUrl 
    }: { 
      externalSystemId: string; 
      websiteUrl: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('scan-system-integrations', {
        body: { externalSystemId, websiteUrl }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['external-system-integrations', variables.externalSystemId] 
      });
      toast.success("Integrasjoner oppdatert med AI");
    },
    onError: (error: Error) => {
      console.error('Integration scan error:', error);
      toast.error(error.message || "Kunne ikke scanne for integrasjoner");
    },
  });
}

export function useCreateIntegrationDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: ExternalSystemIntegration) => {
      // Create integration_definition from external_system_integration
      const { data, error } = await supabase
        .from('integration_definitions')
        .insert({
          key: `${integration.integration_type.toLowerCase()}-${integration.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: integration.name,
          description: integration.description,
          external_system_id: integration.external_system_id,
          supported_delivery_methods: ['native'],
          requires_credentials: integration.auth_methods && integration.auth_methods.length > 0,
          credential_fields: integration.auth_methods?.map(method => ({
            key: method,
            label: method.toUpperCase(),
            type: 'password',
            required: true,
          })) || [],
          setup_guide_url: integration.documentation_url,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the external_system_integration to mark as implemented
      await supabase
        .from('external_system_integrations')
        .update({ 
          implementation_status: 'implemented',
          integration_definition_id: data.id,
        })
        .eq('id', integration.id);

      return data;
    },
    onSuccess: (_, integration) => {
      queryClient.invalidateQueries({ 
        queryKey: ['external-system-integrations', integration.external_system_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['implemented-integrations', integration.external_system_id] 
      });
      toast.success("Integrasjonsdefinisjon opprettet");
    },
    onError: (error: Error) => {
      console.error('Create integration definition error:', error);
      toast.error(error.message || "Kunne ikke opprette integrasjonsdefinisjon");
    },
  });
}
