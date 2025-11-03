import { useEffect, useState } from "react";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if current user has admin role for a specific app
 * Uses the is_app_admin function which checks:
 * 1. If user is tenant_owner or tenant_admin (automatic admin access)
 * 2. If user has explicit app_admin role for this app
 * 
 * @param appKey - Unique identifier for the app (e.g., 'jul25')
 */
export const useAppAdmin = (appKey: string) => {
  const { session } = useAuth();
  const [isAppAdmin, setIsAppAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAppAdmin = async () => {
      if (!session?.user?.id) {
        setIsAppAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        // Call the function with text app_key parameter
        const { data, error } = await supabase.rpc('is_app_admin', {
          _user_id: session.user.id,
          _app_key: appKey
        });

        if (error) {
          console.error('[useAppAdmin] Error checking app admin:', error);
          setIsAppAdmin(false);
        } else {
          setIsAppAdmin(data === true);
        }
      } catch (error) {
        console.error('[useAppAdmin] Error:', error);
        setIsAppAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAppAdmin();
  }, [session?.user?.id, appKey]);

  return { isAppAdmin, isLoading };
};

/**
 * Hook to check if current user has any role in a specific app
 * Uses the has_app_role function which checks:
 * 1. If user has any tenant role (basic app access)
 * 2. If user has explicit app role for this app
 * 
 * @param appKey - Unique identifier for the app (e.g., 'jul25')
 */
export const useAppAccess = (appKey: string) => {
  const { session } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAppAccess = async () => {
      if (!session?.user?.id) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_app_role', {
          _user_id: session.user.id,
          _app_key: appKey
        });

        if (error) {
          console.error('[useAppAccess] Error checking app access:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data === true);
        }
      } catch (error) {
        console.error('[useAppAccess] Error:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAppAccess();
  }, [session?.user?.id, appKey]);

  return { hasAccess, isLoading };
};
