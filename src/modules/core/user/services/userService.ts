// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, Profile, UserRole, UserRoleRecord } from "../types/user.types";
import { RoleService } from "./roleService";
import { AppRole } from "../types/role.types";

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
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (profilesError) throw profilesError;

    // Get roles for all users
    const rolesByUser = new Map<string, Set<UserRole>>();
    
    for (const profile of profiles || []) {
      const userRoles = await this.getUserRoles(profile.id);
      rolesByUser.set(profile.id, new Set(userRoles));
    }

    return (profiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      profile,
      roles: Array.from(rolesByUser.get(profile.id) || new Set(['user'])),
    }));
  }

  /**
   * Get user roles from user_roles table
   * Maps app_role enum to UserRole (admin, moderator, user)
   */
  static async getUserRoles(userId: string): Promise<UserRole[]> {
    const roles = await RoleService.getUserRoles(userId);
    
    const mappedRoles = new Set<UserRole>();
    
    roles.forEach(record => {
      const role = record.role;
      
      if (role === 'platform_owner' || role === 'tenant_admin' || role === 'tenant_owner') {
        mappedRoles.add('admin');
      } else if (
        role === 'platform_support' || 
        role === 'project_owner' || 
        role === 'analyst' ||
        role === 'security_admin' ||
        role === 'data_protection'
      ) {
        mappedRoles.add('moderator');
      } else {
        mappedRoles.add('user');
      }
    });

    if (mappedRoles.size === 0) {
      return ['user'];
    }

    return Array.from(mappedRoles);
  }

  /**
   * Check if user has specific role (mapped from tenant_users)
   */
  static async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(role);
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
  }

  /**
   * Add role to user (maps to platform scope)
   * Maps UserRole to app_role and uses RoleService
   */
  static async addRole(userId: string, role: UserRole): Promise<void> {
    const appRole: AppRole = role === 'admin' 
      ? 'platform_owner' 
      : role === 'moderator' 
      ? 'platform_support' 
      : 'contributor';

    const { data: { user } } = await supabase.auth.getUser();
    
    await RoleService.grantRole({
      userId,
      role: appRole,
      scopeType: 'platform',
      grantedBy: user?.id,
    });
  }

  /**
   * Remove role from user (platform scope)
   */
  static async removeRole(userId: string, role: UserRole): Promise<void> {
    const removePatterns: AppRole[] = [];
    if (role === 'admin') {
      removePatterns.push('platform_owner', 'tenant_admin', 'tenant_owner');
    } else if (role === 'moderator') {
      removePatterns.push('platform_support', 'project_owner', 'analyst', 'security_admin', 'data_protection');
    } else {
      removePatterns.push('contributor', 'viewer');
    }

    // Remove all matching roles from platform scope
    for (const appRole of removePatterns) {
      try {
        await RoleService.revokeRole(userId, appRole, 'platform');
      } catch (error) {
        // Continue even if role doesn't exist
        console.error(`Could not remove role ${appRole}:`, error);
      }
    }
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
