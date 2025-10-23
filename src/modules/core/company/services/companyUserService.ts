// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { CompanyUser, CompanyMembership, CompanyRole } from '../types/companyUser.types';

export class CompanyUserService {
  /**
   * Get all users in a company
   */
  static async getCompanyUsers(companyId: string): Promise<CompanyUser[]> {
    const { data, error } = await supabase
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
   * Get all companies a user belongs to
   */
  static async getUserCompanies(userId: string): Promise<CompanyMembership[]> {
    const { data, error } = await supabase
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
   * Add user to company with role
   */
  static async addUserToCompany(
    companyId: string,
    userId: string,
    role: CompanyRole = 'member'
  ): Promise<void> {
    const { error } = await supabase
      .from('company_users')
      .insert({
        company_id: companyId,
        user_id: userId,
        role,
      });

    if (error) throw error;
  }

  /**
   * Update user's role in company
   */
  static async updateUserRole(
    companyId: string,
    userId: string,
    newRole: CompanyRole
  ): Promise<void> {
    const { error } = await supabase
      .from('company_users')
      .update({ role: newRole })
      .eq('company_id', companyId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Remove user from company
   */
  static async removeUserFromCompany(companyId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('company_users')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Check if user has access to company
   */
  static async hasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('company_users')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  /**
   * Check if user has specific role in company
   */
  static async hasCompanyRole(
    userId: string,
    companyId: string,
    role: CompanyRole
  ): Promise<boolean> {
    const { data, error } = await supabase
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
   * Get users who have access to a specific company
   * Returns profiles with their company role for user selection
   */
  static async getCompanyUsersForSelection(companyId: string): Promise<Array<{
    id: string;
    full_name: string;
    email: string;
    role: CompanyRole;
  }>> {
    // First get company_users
    const { data: companyUsersData, error: cuError } = await supabase
      .from('company_users')
      .select('user_id, role')
      .eq('company_id', companyId);

    if (cuError) throw cuError;
    if (!companyUsersData || companyUsersData.length === 0) return [];

    // Then get profiles for those users
    const userIds = companyUsersData.map(cu => cu.user_id);
    const { data: profilesData, error: profilesError } = await supabase
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
