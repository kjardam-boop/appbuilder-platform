import { useEffect, useState } from "react";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if current user is a platform admin
 * Platform admins have platform_owner or platform_support roles in platform scope
 * Uses a SECURITY DEFINER function to bypass RLS issues
 */
export const usePlatformAdmin = () => {
  const { session } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPlatformAdmin = async () => {
      console.log('[usePlatformAdmin] Starting check, session user id:', session?.user?.id);
      
      if (!session?.user?.id) {
        console.log('[usePlatformAdmin] No session user ID, setting false');
        setIsPlatformAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[usePlatformAdmin] Calling RPC with user_id:', session.user.id);
        
        // Call the SECURITY DEFINER function directly via RPC
        // This bypasses RLS and avoids circular policy issues
        const { data, error } = await supabase.rpc('admin_has_platform_role', {
          check_user_id: session.user.id
        });

        console.log('[usePlatformAdmin] RPC result - data:', data, 'error:', error);

        if (error) {
          console.error('Error calling admin_has_platform_role:', error);
          setIsPlatformAdmin(false);
        } else {
          const isPlatform = data === true;
          console.log('[usePlatformAdmin] Setting isPlatformAdmin to:', isPlatform);
          setIsPlatformAdmin(isPlatform);
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
