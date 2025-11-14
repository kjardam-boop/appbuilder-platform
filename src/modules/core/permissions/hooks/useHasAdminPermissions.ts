import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if user has ANY admin permissions
 * 
 * Uses the user_has_admin_access() database function for efficient checking.
 * This determines if the user should see the admin panel at all.
 */
export const useHasAdminPermissions = () => {
  const { user } = useAuth();

  const { data: hasAdminAccess, isLoading } = useQuery({
    queryKey: ['has-admin-access', user?.id],
    queryFn: async () => {
      console.log('[useHasAdminPermissions] Starting check for user:', user?.id);
      
      if (!user?.id) {
        console.log('[useHasAdminPermissions] No user ID, returning false');
        return false;
      }

      console.log('[useHasAdminPermissions] Calling RPC...');
      const { data, error } = await supabase.rpc('user_has_admin_access', {
        p_user_id: user.id
      });

      console.log('[useHasAdminPermissions] RPC response:', { data, error });

      if (error) {
        console.error('[useHasAdminPermissions] Error:', error);
        return false;
      }

      console.log('[useHasAdminPermissions] Final result:', data === true);
      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { hasAdminAccess: hasAdminAccess ?? false, isLoading };
};
