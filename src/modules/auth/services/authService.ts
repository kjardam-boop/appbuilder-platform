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
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []).map(r => r.role as UserRole);
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
