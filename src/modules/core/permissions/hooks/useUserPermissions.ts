import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RolePermission } from "../types/permission.types";

/**
 * Hook to fetch current user's permissions
 * 
 * Fetches all role_permissions for the user's assigned roles.
 * Returns flattened list of allowed permissions.
 */
export const useUserPermissions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Get all user's roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;
      if (!userRoles || userRoles.length === 0) return [];

      // 2. Get all permissions for these roles
      const roles = userRoles.map(r => r.role);
      const { data: permissions, error: permError } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role', roles)
        .eq('allowed', true);

      if (permError) throw permError;

      return permissions as RolePermission[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Helper to check if user has specific permission
 */
export const useHasPermission = (resource: string, action: string) => {
  const { data: permissions, isLoading } = useUserPermissions();

  const hasPermission = permissions?.some(
    p => p.resource_key === resource && 
         (p.action_key === action || p.action_key === 'admin')
  ) ?? false;

  return { hasPermission, isLoading };
};
