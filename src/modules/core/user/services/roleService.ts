// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { UserRoleRecord, RoleScope, AppRole, RoleGrant } from "../types/role.types";

export class RoleService {
  /**
   * Grant a role to a user in a specific scope
   */
  static async grantRole(grant: RoleGrant): Promise<void> {
    const { userId, role, scopeType, scopeId, grantedBy } = grant;

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        scope_type: scopeType,
        scope_id: scopeId || null,
        granted_by: grantedBy || null,
      });

    if (error) throw error;
  }

  /**
   * Revoke a role from a user in a specific scope
   */
  static async revokeRole(
    userId: string,
    role: AppRole,
    scopeType: RoleScope,
    scopeId?: string
  ): Promise<void> {
    let query = supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role)
      .eq('scope_type', scopeType);

    if (scopeId) {
      query = query.eq('scope_id', scopeId);
    } else {
      query = query.is('scope_id', null);
    }

    const { error } = await query;
    if (error) throw error;
  }

  /**
   * Get all roles for a user (optionally filtered by scope)
   * Uses RPC to avoid RLS issues when called by admins
   */
  static async getUserRoles(
    userId: string,
    scopeType?: RoleScope,
    scopeId?: string
  ): Promise<UserRoleRecord[]> {
    // Check if current user is platform admin to determine access method
    const authRes = await supabase.auth.getUser();
    const user = authRes?.data?.user ?? null;
    
    if (user) {
      const rpcRes = await supabase.rpc('admin_has_platform_role', {
        check_user_id: user.id
      });
      const isAdmin = rpcRes?.data === true;

      // If admin or querying own roles, use direct query
      if (isAdmin || user.id === userId) {
        let query = supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId);

        if (scopeType) {
          query = query.eq('scope_type', scopeType);
        }

        if (scopeId !== undefined) {
          if (scopeId) {
            query = query.eq('scope_id', scopeId);
          } else {
            query = query.is('scope_id', null);
          }
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data as UserRoleRecord[];
      }
    }

    // Non-admin users can only view their own roles
    throw new Error('Access denied');
  }

  /**
   * Check if a user has a specific role in a scope
   */
  static async hasRole(
    userId: string,
    role: AppRole,
    scopeType: RoleScope,
    scopeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .eq('scope_type', scopeType);

    if (scopeId) {
      query = query.eq('scope_id', scopeId);
    } else {
      query = query.is('scope_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) return false;
    return !!data;
  }

  /**
   * Check if user has any role in a specific company
   */
  static async hasAnyRoleInCompany(userId: string, companyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('scope_type', 'company')
      .eq('scope_id', companyId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  /**
   * Get all users with roles in a specific scope
   */
  static async getUsersInScope(
    scopeType: RoleScope,
    scopeId?: string
  ): Promise<Array<{ user_id: string; role: AppRole }>> {
    let query = supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('scope_type', scopeType);

    if (scopeId) {
      query = query.eq('scope_id', scopeId);
    } else {
      query = query.is('scope_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Update a user's role in a scope (replace existing role with new one)
   */
  static async updateRole(
    userId: string,
    oldRole: AppRole,
    newRole: AppRole,
    scopeType: RoleScope,
    scopeId?: string
  ): Promise<void> {
    // Remove old role
    await this.revokeRole(userId, oldRole, scopeType, scopeId);
    
    // Add new role
    const authRes2 = await supabase.auth.getUser();
    const currentUserId = authRes2?.data?.user?.id;
    await this.grantRole({
      userId,
      role: newRole,
      scopeType,
      scopeId,
      grantedBy: currentUserId,
    });
  }

  /**
   * Get all roles grouped by scope for a user
   */
  static async getUserRolesByScope(userId: string): Promise<Record<RoleScope, UserRoleRecord[]>> {
    const roles = await this.getUserRoles(userId);
    
    const grouped: Record<RoleScope, UserRoleRecord[]> = {
      platform: [],
      tenant: [],
      company: [],
      project: [],
      app: [],
    };

    roles.forEach(role => {
      grouped[role.scope_type].push(role);
    });

    return grouped;
  }

  /**
   * Check if user is platform admin
   */
  static async isPlatformAdmin(userId: string): Promise<boolean> {
    const hasOwner = await this.hasRole(userId, 'platform_owner', 'platform');
    const hasSupport = await this.hasRole(userId, 'platform_support', 'platform');
    return hasOwner || hasSupport;
  }

  /**
   * Check if user is tenant admin in any tenant
   */
  static async isTenantAdmin(userId: string, tenantId?: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId, 'tenant', tenantId);
    return roles.some(r => r.role === 'tenant_owner' || r.role === 'tenant_admin');
  }

  /**
   * Check if user is company admin in a specific company
   */
  static async isCompanyAdmin(userId: string, companyId: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId, 'company', companyId);
    return roles.some(r => r.role === 'tenant_owner' || r.role === 'tenant_admin');
  }
}
