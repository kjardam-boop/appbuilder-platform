/**
 * Auth Service
 * 
 * Authentication and authorization service.
 */
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, Profile, UserRole } from "../../user/types/user.types";

export class AuthService {
  /**
   * @deprecated Use UserService.getCurrentUser() instead
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await this.getProfile(user.id);
    const roles = await this.getUserRoles(user.id);

    return {
      id: user.id,
      email: user.email!,
      profile: profile || undefined,
      roles,
    };
  }

  /**
   * @deprecated Use UserService.getProfile() instead
   */
  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as Profile | null;
  }

  /**
   * @deprecated Use UserService.getUserRoles() instead
   */
  static async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('tenant_users')
      .select('roles')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    
    // Map app_role to UserRole
    const allRoles: string[] = [];
    (data || []).forEach(record => {
      if (Array.isArray(record.roles)) {
        allRoles.push(...record.roles);
      }
    });

    const mappedRoles = new Set<UserRole>();
    allRoles.forEach(role => {
      if (role === 'platform_owner' || role === 'tenant_admin') {
        mappedRoles.add('admin');
      } else if (
        role === 'platform_support' || 
        role === 'project_owner' || 
        role === 'analyst' ||
        role === 'security_admin'
      ) {
        mappedRoles.add('moderator');
      } else {
        mappedRoles.add('user');
      }
    });

    return Array.from(mappedRoles).length > 0 ? Array.from(mappedRoles) : ['user'];
  }

  /**
   * @deprecated Use UserService.hasRole() instead
   */
  static async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const { data } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: role,
    });

    return data || false;
  }

  /**
   * @deprecated Use UserService.isAdmin() instead
   */
  static async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  /**
   * @deprecated Use UserService.signOut() instead
   */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}
