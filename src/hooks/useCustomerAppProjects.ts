import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomerAppProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  subdomain: string | null;
  created_at: string;
  selected_capabilities: any;
  deployed_to_preview_at: string | null;
  deployed_to_production_at: string | null;
  app_key: string | null;
  tenant_id: string;
}

export const useCustomerAppProjects = (tenantId: string, statusFilter?: string[]) => {
  return useQuery({
    queryKey: ['customer-app-projects', tenantId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('customer_app_projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerAppProject[];
    },
    enabled: !!tenantId,
  });
};

export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      newStatus,
      tenantId 
    }: { 
      projectId: string; 
      newStatus: string;
      tenantId: string;
    }) => {
      const updates: any = { status: newStatus };

      // Set deployed_at timestamps based on status
      if (newStatus === 'preview') {
        updates.deployed_to_preview_at = new Date().toISOString();
      } else if (newStatus === 'production') {
        updates.deployed_to_production_at = new Date().toISOString();
      }

      // Update project status
      const { error: updateError } = await supabase
        .from('customer_app_projects')
        .update(updates)
        .eq('id', projectId);

      if (updateError) throw updateError;

      // If status is 'production', also migrate to applications table
      if (newStatus === 'production') {
        const { data: project, error: fetchError } = await supabase
          .from('customer_app_projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (fetchError) throw fetchError;

        // Insert into applications table
        const { error: insertError } = await supabase
          .from('applications')
          .insert({
            tenant_id: tenantId,
            app_definition_id: null,
            installed_version: '1.0.0',
            app_type: 'tenant_ai_generated',
            status: 'active',
            subdomain: project.subdomain,
            deployed_at: new Date().toISOString(),
            installed_at: project.created_at,
            source_project_id: project.id,
            is_active: true,
          });

        if (insertError) throw insertError;

        // Update project status to 'deployed'
        await supabase
          .from('customer_app_projects')
          .update({ status: 'deployed' })
          .eq('id', projectId);
      }

      return { projectId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['customer-app-projects', variables.tenantId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['tenant-applications', variables.tenantId] 
      });
      
      if (variables.newStatus === 'preview') {
        toast.success('Deployed til preview!');
      } else if (variables.newStatus === 'production') {
        toast.success('Aktivert i produksjon!', {
          description: 'Appen er nå tilgjengelig for brukere'
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Kunne ikke oppdatere status', {
        description: error.message
      });
    },
  });
};
