// @ts-nocheck
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

    // Get all tenant memberships with roles
    const { data: tenantUsers, error: rolesError } = await supabase
      .from('tenant_users')
      .select('user_id, roles')
      .eq('is_active', true);

    if (rolesError) throw rolesError;

    // Map roles by user_id (using getUserRoles logic)
    const rolesByUser = new Map<string, Set<UserRole>>();
    
    (tenantUsers || []).forEach((record) => {
      const userId = record.user_id;
      if (!rolesByUser.has(userId)) {
        rolesByUser.set(userId, new Set<UserRole>());
      }
      
      const userRoles = rolesByUser.get(userId)!;
      
      (record.roles || []).forEach((role: string) => {
        if (role === 'platform_owner' || role === 'tenant_admin' || role === 'tenant_owner') {
          userRoles.add('admin');
        } else if (
          role === 'platform_support' || 
          role === 'project_owner' || 
          role === 'analyst' ||
          role === 'security_admin' ||
          role === 'compliance_officer'
        ) {
          userRoles.add('moderator');
        } else {
          userRoles.add('user');
        }
      });
    });

    // Combine profiles with roles
    return (profiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      profile,
      roles: Array.from(rolesByUser.get(profile.id) || new Set(['user'])),
    }));
  }

  /**
   * Get user roles from tenant_users
   * Maps app_role enum to UserRole (admin, moderator, user)
   */
  static async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('tenant_users')
      .select('roles')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    
    // Flatten all roles from all active tenant memberships
    const allRoles: string[] = [];
    (data || []).forEach(record => {
      if (Array.isArray(record.roles)) {
        allRoles.push(...record.roles);
      }
    });

    // Map app_role to UserRole
    const mappedRoles = new Set<UserRole>();
    
    allRoles.forEach(role => {
      if (role === 'platform_owner' || role === 'tenant_admin' || role === 'tenant_owner') {
        mappedRoles.add('admin');
      } else if (
        role === 'platform_support' || 
        role === 'project_owner' || 
        role === 'analyst' ||
        role === 'security_admin' ||
        role === 'compliance_officer'
      ) {
        mappedRoles.add('moderator');
      } else {
        mappedRoles.add('user');
      }
    });

    // If no roles, default to user
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
   * Add role to user on current admin's tenant
   * Maps UserRole to app_role and updates tenant_users
   */
  static async addRole(userId: string, role: UserRole): Promise<void> {
    // Map UserRole to app_role
    const appRoles: string[] = [];
    if (role === 'admin') {
      appRoles.push('tenant_admin');
    } else if (role === 'moderator') {
      appRoles.push('project_owner');
    } else {
      appRoles.push('contributor');
    }

    // Determine acting admin's tenant_id
    const { data: authData } = await supabase.auth.getUser();
    const actingUserId = authData.user?.id;
    if (!actingUserId) throw new Error('Not authenticated');

    const { data: myMemberships, error: membershipsError } = await supabase
      .from('tenant_users')
      .select('tenant_id, roles')
      .eq('user_id', actingUserId)
      .eq('is_active', true);

    if (membershipsError) throw membershipsError;
    let adminMembership = (myMemberships || []).find(m => (m.roles || []).some((r: string) => r === 'tenant_admin' || r === 'tenant_owner'))
      || (myMemberships || [])[0];

    // If no membership found, try default tenant, then any tenant
    let tenantId: string | undefined = adminMembership?.tenant_id;
    if (!tenantId) {
      const { data: defaultTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'default')
        .maybeSingle();
      tenantId = defaultTenant?.id;
    }
    if (!tenantId) {
      const { data: anyTenant } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .maybeSingle();
      tenantId = anyTenant?.id;
    }

    if (!tenantId) throw new Error('Ingen tenant funnet å legge rolle på');

    // Check existing membership for target user in this tenant
    const { data: existing, error: checkError } = await supabase
      .from('tenant_users')
      .select('id, roles')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId as any)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Update existing - add new roles
      const currentRoles = existing.roles || [];
      const updatedRoles = [...new Set([...currentRoles, ...appRoles])];
      const { error } = await supabase
        .from('tenant_users')
        .update({ roles: updatedRoles as any })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert new membership
      const { error } = await supabase
        .from('tenant_users')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          roles: appRoles as any,
          is_active: true,
        });
      if (error) throw error;
    }
  }

  /**
   * Remove role from user on default tenant (admin only)
   */
  static async removeRole(userId: string, role: UserRole): Promise<void> {
    // Map UserRole to app_role patterns
    const removePatterns: string[] = [];
    if (role === 'admin') {
      removePatterns.push('tenant_admin', 'platform_owner');
    } else if (role === 'moderator') {
      removePatterns.push('project_owner', 'analyst', 'platform_support', 'security_admin', 'compliance_officer');
    } else {
      removePatterns.push('contributor', 'viewer');
    }

    // Get default tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'default')
      .maybeSingle();

    if (tenantError) throw tenantError;
    if (!tenant) throw new Error('Default tenant not found');

    // Get existing membership
    const { data: existing, error: checkError } = await supabase
      .from('tenant_users')
      .select('id, roles')
      .eq('user_id', userId)
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!existing) return; // No membership = nothing to remove

    // Filter out matching roles
    const currentRoles = existing.roles || [];
    const updatedRoles = currentRoles.filter(r => !removePatterns.includes(r));

    const { error } = await supabase
      .from('tenant_users')
      .update({ roles: updatedRoles as any })
      .eq('id', existing.id);

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
