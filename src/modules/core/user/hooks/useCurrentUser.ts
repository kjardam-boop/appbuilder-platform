import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserService } from '../services/userService';
import { AuthUser } from '../types/user.types';
import { useAuth } from './useAuth';

/**
 * Hook for getting current user with profile and roles
 */
export function useCurrentUser() {
  const { user, session } = useAuth();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session?.user) {
      loadCurrentUser();
      checkAdminStatus();
    } else {
      setCurrentUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [session?.user?.id]);

  const loadCurrentUser = async () => {
    try {
      setLoading(true);
      const userData = await UserService.getCurrentUser();
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    if (!session?.user?.id) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_has_platform_role', {
        check_user_id: session.user.id
      });

      if (!error) {
        setIsAdmin(data === true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const isModerator = currentUser?.roles.includes('moderator') || false;

  return {
    currentUser,
    loading,
    isAdmin,
    isModerator,
    reload: loadCurrentUser,
  };
}
