import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { UserRoleRecord, RoleScope, AppRole, RoleGrant } from "../types/role.types";

type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];
type UserRoleInsert = Database['public']['Tables']['user_roles']['Insert'];

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
    console.log('[RoleService.getUserRoles] Called with:', { userId, scopeType, scopeId });
    
    try {
      // Check if current user is platform admin to determine access method
      const authRes = await supabase.auth.getUser();
      const user = authRes?.data?.user ?? null;
      
      console.log('[RoleService.getUserRoles] Current user:', user?.id);
      
      if (user) {
        const rpcRes = await supabase.rpc('admin_has_platform_role', {
          check_user_id: user.id
        });
        
        console.log('[RoleService.getUserRoles] RPC admin check result:', rpcRes);
        
        const isAdmin = rpcRes?.data === true;
        const isOwnRoles = user.id === userId;

        console.log('[RoleService.getUserRoles] Access check:', { isAdmin, isOwnRoles });

        // If admin or querying own roles, use direct query
        if (isAdmin || isOwnRoles) {
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

          if (error) {
            console.error('[RoleService.getUserRoles] Query error:', error);
            throw error;
          }
          
          console.log('[RoleService.getUserRoles] Found roles:', data?.length || 0);
          return data as UserRoleRecord[];
        }
      }

      // Non-admin users can only view their own roles
      console.warn('[RoleService.getUserRoles] Access denied - not admin or own roles');
      return []; // Return empty array instead of throwing
    } catch (error) {
      console.error('[RoleService.getUserRoles] Error:', error);
      return []; // Return empty array on error
    }
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
