import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (session?.user) {
      loadCurrentUser();
    } else {
      setCurrentUser(null);
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

  const isAdmin = currentUser?.roles.includes('admin') || false;
  const isModerator = currentUser?.roles.includes('moderator') || false;

  return {
    currentUser,
    loading,
    isAdmin,
    isModerator,
    reload: loadCurrentUser,
  };
}
