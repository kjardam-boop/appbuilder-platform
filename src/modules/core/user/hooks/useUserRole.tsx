import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAdminRole = () => {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!session?.user?.id) {
        setIsAdmin(false);
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
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else if (data) {
          // Check if user has admin-level roles (platform_owner or tenant_admin)
          const hasAdminRole = data.some((record) => 
            Array.isArray(record.roles) && (
              record.roles.includes('platform_owner') || 
              record.roles.includes('tenant_admin')
            )
          );
          setIsAdmin(hasAdminRole);
        }
      } catch (error) {
        console.error('Error in checkAdminRole:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminRole();
  }, [session?.user?.id]);

  return { isAdmin, isLoading };
};
