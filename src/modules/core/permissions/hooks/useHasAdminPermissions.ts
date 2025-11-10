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
      if (!user?.id) return false;

      const { data, error } = await supabase.rpc('user_has_admin_access', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking admin access:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { hasAdminAccess: hasAdminAccess ?? false, isLoading };
};
