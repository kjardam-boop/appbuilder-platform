import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PermissionService } from "../services/permissionService";
import { AppRole } from "@/modules/core/user/types/role.types";
import { toast } from "sonner";

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
