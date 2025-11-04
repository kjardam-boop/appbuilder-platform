import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PermissionService } from "../services/permissionService";
import { PermissionMigrationService } from "../services/permissionMigrationService";
import { AppRole } from "@/modules/core/user/types/role.types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const usePermissions = () => {
  return {
    resources: useQuery({
      queryKey: ['permission-resources'],
      queryFn: () => PermissionService.getResources(),
    }),
    actions: useQuery({
      queryKey: ['permission-actions'],
      queryFn: () => PermissionService.getActions(),
    }),
  };
};

export const useRolePermissions = (role: AppRole) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['role-permissions', role],
    queryFn: () => PermissionService.getRolePermissionMatrix(role),
  });

  const updateMutation = useMutation({
    mutationFn: ({ resourceKey, actionKeys }: { resourceKey: string; actionKeys: string[] }) =>
      PermissionService.setRolePermissions(role, resourceKey, actionKeys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', role] });
      toast.success('Tilganger oppdatert');
    },
    onError: (error) => {
      console.error('Error updating permissions:', error);
      toast.error('Kunne ikke oppdatere tilganger');
    },
  });

  return {
    ...query,
    updatePermissions: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};

export const usePermissionImportExport = () => {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: PermissionService.importPermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Tilganger importert');
    },
    onError: (error) => {
      console.error('Error importing permissions:', error);
      toast.error('Kunne ikke importere tilganger');
    },
  });

  const exportMutation = useMutation({
    mutationFn: PermissionService.exportPermissions,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permissions-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Tilganger eksportert');
    },
    onError: (error) => {
      console.error('Error exporting permissions:', error);
      toast.error('Kunne ikke eksportere tilganger');
    },
  });

  return {
    importPermissions: importMutation.mutate,
    exportPermissions: exportMutation.mutate,
    isImporting: importMutation.isPending,
    isExporting: exportMutation.isPending,
  };
};

/**
 * Hook for bulk permission operations
 */
export const useBulkPermissions = (role: AppRole) => {
  const queryClient = useQueryClient();

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ actionKey, enable, resourceKeys }: { 
      actionKey: string; 
      enable: boolean; 
      resourceKeys: string[] 
    }) => {
      // Hent eksisterende permissions for denne rollen
      const { data: existingPerms } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role as any)
        .in('resource_key', resourceKeys);

      // Bygg oppdateringer
      const updates = [];
      for (const resourceKey of resourceKeys) {
        const existingActions = existingPerms
          ?.filter(p => p.resource_key === resourceKey)
          .map(p => p.action_key) || [];

        const hasAction = existingActions.includes(actionKey);

        if (enable && !hasAction) {
          // Legg til action
          updates.push({
            role: role as any,
            resource_key: resourceKey,
            action_key: actionKey,
            allowed: true,
          });
        } else if (!enable && hasAction) {
          // Fjern action - vi må slette den
          await supabase
            .from('role_permissions')
            .delete()
            .eq('role', role as any)
            .eq('resource_key', resourceKey)
            .eq('action_key', actionKey);
        }
      }

      // Bulk insert for nye permissions
      if (updates.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .upsert(updates, {
            onConflict: 'role,resource_key,action_key',
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions', role] });
      toast.success('Bulk-endring utført');
    },
    onError: (error) => {
      console.error('Bulk toggle error:', error);
      toast.error('Feil ved bulk-endring');
    },
  });

  return {
    bulkToggle: bulkToggleMutation.mutate,
    isLoading: bulkToggleMutation.isPending,
  };
};

/**
 * Hook for permission health and migration
 */
export const usePermissionHealth = () => {
  const queryClient = useQueryClient();

  const healthQuery = useQuery({
    queryKey: ['permissionHealth'],
    queryFn: () => PermissionMigrationService.getHealthStats(),
  });

  const missingQuery = useQuery({
    queryKey: ['missingPermissions'],
    queryFn: () => PermissionMigrationService.findMissingPermissions(),
  });

  const fillMutation = useMutation({
    mutationFn: () => PermissionMigrationService.fillMissingPermissions(),
    onSuccess: (filled) => {
      queryClient.invalidateQueries({ queryKey: ['permissionHealth'] });
      queryClient.invalidateQueries({ queryKey: ['missingPermissions'] });
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      toast.success(`${filled} manglende tilganger ble lagt til`);
    },
    onError: (error) => {
      console.error('Fill missing permissions error:', error);
      toast.error('Feil ved automatisk reparasjon');
    },
  });

  return {
    health: healthQuery.data,
    missing: missingQuery.data || [],
    isLoading: healthQuery.isLoading || missingQuery.isLoading,
    fillMissing: fillMutation.mutate,
    isFilling: fillMutation.isPending,
  };
};
