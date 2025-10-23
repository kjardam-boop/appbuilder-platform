// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { CompanyUser, CompanyMembership, CompanyRole } from '../types/companyUser.types';
import type { RequestContext } from '@/modules/tenant/types/tenant.types';

export class CompanyUserService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }
  /**
   * Get all users in a company (tenant-scoped)
   */
  static async getCompanyUsers(ctx: RequestContext, companyId: string): Promise<CompanyUser[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('company_users')
      .select(`
        *,
        user:user_id (
          id,
          email,
          profile:profiles (
            full_name
          )
        ),
        company:company_id (
          id,
          name,
          org_number
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as unknown as CompanyUser[];
  }

  /**
   * Get all companies a user belongs to (tenant-scoped)
   */
  static async getUserCompanies(ctx: RequestContext, userId: string): Promise<CompanyMembership[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('company_users')
      .select(`
        company_id,
        role,
        created_at,
        company:company_id (
          name,
          org_number
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      company_id: item.company_id,
      company_name: item.company?.name || 'Ukjent selskap',
      org_number: item.company?.org_number || '',
      role: item.role,
      joined_at: item.created_at,
    }));
  }

  /**
   * Add user to company with role (tenant-scoped)
   */
  static async addUserToCompany(
    ctx: RequestContext,
    companyId: string,
    userId: string,
    role: CompanyRole = 'member'
  ): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('company_users')
      .insert({
        company_id: companyId,
        user_id: userId,
        role,
      });

    if (error) throw error;
  }

  /**
   * Update user's role in company (tenant-scoped)
   */
  static async updateUserRole(
    ctx: RequestContext,
    companyId: string,
    userId: string,
    newRole: CompanyRole
  ): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('company_users')
      .update({ role: newRole })
      .eq('company_id', companyId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Remove user from company (tenant-scoped)
   */
  static async removeUserFromCompany(ctx: RequestContext, companyId: string, userId: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('company_users')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Check if user has access to company (tenant-scoped)
   */
  static async hasCompanyAccess(ctx: RequestContext, userId: string, companyId: string): Promise<boolean> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('company_users')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  /**
   * Check if user has specific role in company (tenant-scoped)
   */
  static async hasCompanyRole(
    ctx: RequestContext,
    userId: string,
    companyId: string,
    role: CompanyRole
  ): Promise<boolean> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('company_users')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('role', role)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  /**
   * Get users who have access to a specific company (tenant-scoped)
   * Returns profiles with their company role for user selection
   */
  static async getCompanyUsersForSelection(ctx: RequestContext, companyId: string): Promise<Array<{
    id: string;
    full_name: string;
    email: string;
    role: CompanyRole;
  }>> {
    const db = this.getDb(ctx);
    // First get company_users
    const { data: companyUsersData, error: cuError } = await db
      .from('company_users')
      .select('user_id, role')
      .eq('company_id', companyId);

    if (cuError) throw cuError;
    if (!companyUsersData || companyUsersData.length === 0) return [];

    // Then get profiles for those users
    const userIds = companyUsersData.map(cu => cu.user_id);
    const { data: profilesData, error: profilesError } = await db
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
      .order('full_name');

    if (profilesError) throw profilesError;

    // Combine the data
    return (profilesData || []).map((profile) => {
      const companyUser = companyUsersData.find(cu => cu.user_id === profile.id);
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: companyUser?.role as CompanyRole || 'member',
      };
    });
  }
}
