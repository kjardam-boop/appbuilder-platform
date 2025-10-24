import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/core/user";

/**
 * Hook to check if current user is a platform admin
 * Platform admins have platform_owner or platform_support roles
 */
export const usePlatformAdmin = () => {
  const { session } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPlatformAdmin = async () => {
      if (!session?.user?.id) {
        setIsPlatformAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenant_users')
          .select('roles')
          .eq('user_id', session.user.id)
          .eq('is_active', true);

        if (error) {
          console.error('Error checking platform admin role:', error);
          setIsPlatformAdmin(false);
        } else if (data) {
          // Check if user has platform_owner or platform_support role
          const hasPlatformRole = data.some((record) => 
            record.roles.includes('platform_owner') || 
            record.roles.includes('platform_support')
          );
          setIsPlatformAdmin(hasPlatformRole);
        }
      } catch (error) {
        console.error('Error in checkPlatformAdmin:', error);
        setIsPlatformAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPlatformAdmin();
  }, [session?.user?.id]);

  return { isPlatformAdmin, isLoading };
};
