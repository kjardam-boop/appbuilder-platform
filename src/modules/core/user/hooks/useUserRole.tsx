import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { UserService } from "../services/userService";

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
        const hasAdminRole = await UserService.isAdmin(session.user.id);
        setIsAdmin(hasAdminRole);
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
