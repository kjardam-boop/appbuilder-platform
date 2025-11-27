import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { CompanyUser, CompanyMembership, CompanyRole } from '../types/companyUser.types';
import type { RequestContext } from '@/modules/tenant/types/tenant.types';
import { RoleService } from '@/modules/core/user/services/roleService';
import { COMPANY_ROLE_MAPPING, APP_TO_COMPANY_ROLE } from '@/modules/core/user/types/role.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CompanyRow = Database['public']['Tables']['companies']['Row'];

export class CompanyUserService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }
  /**
   * Get all users in a company (using user_roles table)
   */
  static async getCompanyUsers(ctx: RequestContext, companyId: string): Promise<CompanyUser[]> {
    // Get user_roles for this company
    const userRoles = await RoleService.getUsersInScope('company', companyId);
    
    if (userRoles.length === 0) return [];

    const userIds = userRoles.map(ur => ur.user_id);

    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, org_number')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError) throw companyError;

    // Combine data
    return userRoles.map(ur => {
      const profile = profiles?.find(p => p.id === ur.user_id);
      const companyRole = APP_TO_COMPANY_ROLE[ur.role] || 'viewer';
      
      return {
        id: `${ur.user_id}-${companyId}`,
        company_id: companyId,
        user_id: ur.user_id,
        role: companyRole as CompanyRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: profile ? {
          id: profile.id,
          email: profile.email,
          profile: {
            full_name: profile.full_name,
          },
        } : undefined,
        company: company || undefined,
      };
    });
  }

  /**
   * Get all companies a user belongs to (using user_roles table)
   */
  static async getUserCompanies(ctx: RequestContext, userId: string): Promise<CompanyMembership[]> {
    const roles = await RoleService.getUserRoles(userId, 'company');
    
    if (roles.length === 0) return [];

    const companyIds = roles.map(r => r.scope_id).filter(Boolean) as string[];
    
    if (companyIds.length === 0) return [];

    // Get company details
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, org_number')
      .in('id', companyIds);

    if (error) throw error;

    return roles
      .filter(r => r.scope_id)
      .map(role => {
        const company = companies?.find(c => c.id === role.scope_id);
        const companyRole = APP_TO_COMPANY_ROLE[role.role] || 'viewer';
        
        return {
          company_id: role.scope_id!,
          company_name: company?.name || 'Ukjent selskap',
          org_number: company?.org_number || '',
          role: companyRole as CompanyRole,
          joined_at: role.granted_at,
        };
      });
  }

  /**
   * Add user to company with role (using user_roles table)
   */
  static async addUserToCompany(
    ctx: RequestContext,
    companyId: string,
    userId: string,
    role: CompanyRole = 'member'
  ): Promise<void> {
    const appRole = COMPANY_ROLE_MAPPING[role] || COMPANY_ROLE_MAPPING['member'];
    const { data: { user } } = await supabase.auth.getUser();
    
    await RoleService.grantRole({
      userId,
      role: appRole,
      scopeType: 'company',
      scopeId: companyId,
      grantedBy: user?.id,
    });
  }

  /**
   * Update user's role in company (using user_roles table)
   */
  static async updateUserRole(
    ctx: RequestContext,
    companyId: string,
    userId: string,
    newRole: CompanyRole
  ): Promise<void> {
    // Get current role
    const roles = await RoleService.getUserRoles(userId, 'company', companyId);
    if (roles.length === 0) {
      throw new Error('User not found in company');
    }

    const currentRole = roles[0].role;
    const newAppRole = COMPANY_ROLE_MAPPING[newRole] || COMPANY_ROLE_MAPPING['member'];
    
    await RoleService.updateRole(userId, currentRole, newAppRole, 'company', companyId);
  }

  /**
   * Remove user from company (using user_roles table)
   */
  static async removeUserFromCompany(ctx: RequestContext, companyId: string, userId: string): Promise<void> {
    // Get all company roles for this user in this company
    const roles = await RoleService.getUserRoles(userId, 'company', companyId);
    
    // Remove all roles
    for (const role of roles) {
      await RoleService.revokeRole(userId, role.role, 'company', companyId);
    }
  }

  /**
   * Check if user has access to company (using user_roles table)
   */
  static async hasCompanyAccess(ctx: RequestContext, userId: string, companyId: string): Promise<boolean> {
    return await RoleService.hasAnyRoleInCompany(userId, companyId);
  }

  /**
   * Check if user has specific role in company (using user_roles table)
   */
  static async hasCompanyRole(
    ctx: RequestContext,
    userId: string,
    companyId: string,
    role: CompanyRole
  ): Promise<boolean> {
    const appRole = COMPANY_ROLE_MAPPING[role];
    return await RoleService.hasRole(userId, appRole, 'company', companyId);
  }

  /**
   * Get users who have access to a specific company (using user_roles table)
   * Returns profiles with their company role for user selection
   */
  static async getCompanyUsersForSelection(ctx: RequestContext, companyId: string): Promise<Array<{
    id: string;
    full_name: string;
    email: string;
    role: CompanyRole;
  }>> {
    const userRoles = await RoleService.getUsersInScope('company', companyId);
    
    if (userRoles.length === 0) return [];

    const userIds = userRoles.map(ur => ur.user_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
      .order('full_name');

    if (profilesError) throw profilesError;

    return (profilesData || []).map((profile) => {
      const userRole = userRoles.find(ur => ur.user_id === profile.id);
      const companyRole = userRole ? APP_TO_COMPANY_ROLE[userRole.role] : 'viewer';
      
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: companyRole as CompanyRole,
      };
    });
  }
}
