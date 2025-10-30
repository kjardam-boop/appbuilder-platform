import { useEffect, useState } from "react";
import { useAuth } from "@/modules/core/user";
import { RoleService } from "@/modules/core/user/services/roleService";

/**
 * Hook to check if current user is a platform admin
 * Platform admins have platform_owner or platform_support roles in platform scope
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
        const isAdmin = await RoleService.isPlatformAdmin(session.user.id);
        setIsPlatformAdmin(isAdmin);
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
