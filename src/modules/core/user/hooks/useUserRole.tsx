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
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
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
