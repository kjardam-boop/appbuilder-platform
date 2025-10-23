import { supabase } from "@/integrations/supabase/client";
import { AuthUser, Profile, UserRole, UserRoleRecord } from "../types/user.types";

export class UserService {
  /**
   * Get current authenticated user
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
   * Get user profile by ID
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
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Get all users with their profiles and roles (admin only)
   */
  static async getAllUsers(): Promise<AuthUser[]> {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (profilesError) throw profilesError;

    // Get all roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) throw rolesError;

    // Map roles by user_id
    const rolesByUser = new Map<string, UserRole[]>();
    (rolesData || []).forEach((roleRecord) => {
      const userId = roleRecord.user_id;
      if (!rolesByUser.has(userId)) {
        rolesByUser.set(userId, []);
      }
      rolesByUser.get(userId)!.push(roleRecord.role as UserRole);
    });

    // Combine profiles with roles
    return (profiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      profile,
      roles: rolesByUser.get(profile.id) || [],
    }));
  }

  /**
   * Get user roles
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
   * Check if user has specific role
   */
  static async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const { data } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: role,
    });

    return data || false;
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  /**
   * Add role to user (admin only)
   */
  static async addRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw error;
    }
  }

  /**
   * Remove role from user (admin only)
   */
  static async removeRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string): Promise<{ error: any }> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  }

  /**
   * Sign up with email and password
   */
  static async signUp(email: string, password: string, fullName?: string): Promise<{ error: any }> {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      }
    });
    
    return { error };
  }
}
