import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/modules/core/user/types/role.types";
import { RolePermission, RolePermissionMatrix, PermissionResource, PermissionAction } from "../types/permission.types";

export class PermissionService {
  // Hent alle ressurser
  static async getResources(): Promise<PermissionResource[]> {
    const { data, error } = await supabase
      .from('permission_resources')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  // Hent alle actions
  static async getActions(): Promise<PermissionAction[]> {
    const { data, error } = await supabase
      .from('permission_actions')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  // Hent alle permissions for en rolle
  static async getRolePermissions(role: AppRole): Promise<RolePermission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', role as any)
      .eq('allowed', true);
    
    if (error) throw error;
    return (data || []) as RolePermission[];
  }

  // Hent permissions matrix for en rolle
  static async getRolePermissionMatrix(role: AppRole): Promise<RolePermissionMatrix> {
    const permissions = await this.getRolePermissions(role);
    
    const matrix: Record<string, string[]> = {};
    permissions.forEach(p => {
      if (!matrix[p.resource_key]) {
        matrix[p.resource_key] = [];
      }
      matrix[p.resource_key].push(p.action_key);
    });

    return { role, permissions: matrix };
  }

  // Sett permissions for en rolle
  static async setRolePermissions(
    role: AppRole,
    resourceKey: string,
    actionKeys: string[]
  ): Promise<void> {
    // Først, slett eksisterende permissions for denne resource
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role as any)
      .eq('resource_key', resourceKey);

    // Så, insert nye permissions
    if (actionKeys.length > 0) {
      const { error } = await supabase
        .from('role_permissions')
        .insert(
          actionKeys.map(actionKey => ({
            role: role as any,
            resource_key: resourceKey,
            action_key: actionKey,
            allowed: true,
          }))
        );

      if (error) throw error;
    }
  }

  // Sjekk om en rolle har en spesifikk permission
  static async checkPermission(
    role: AppRole,
    resourceKey: string,
    actionKey: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('id')
      .eq('role', role as any)
      .eq('resource_key', resourceKey)
      .eq('action_key', actionKey)
      .eq('allowed', true)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  // Bulk import av permissions (fra JSON fil)
  static async importPermissions(data: RolePermissionMatrix[]): Promise<void> {
    for (const roleMatrix of data) {
      for (const [resourceKey, actionKeys] of Object.entries(roleMatrix.permissions)) {
        await this.setRolePermissions(roleMatrix.role, resourceKey, actionKeys);
      }
    }
  }

  // Eksporter alle permissions til JSON
  static async exportPermissions(): Promise<RolePermissionMatrix[]> {
    const { data: allPermissions, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('allowed', true);

    if (error) throw error;

    // Grupper per rolle
    const roleGroups: Record<string, RolePermission[]> = {};
    (allPermissions || []).forEach(p => {
      const perm = p as unknown as RolePermission;
      if (!roleGroups[perm.role]) {
        roleGroups[perm.role] = [];
      }
      roleGroups[perm.role].push(perm);
    });

    // Konverter til matrix format
    return Object.entries(roleGroups).map(([role, permissions]) => {
      const matrix: Record<string, string[]> = {};
      permissions.forEach(p => {
        if (!matrix[p.resource_key]) {
          matrix[p.resource_key] = [];
        }
        matrix[p.resource_key].push(p.action_key);
      });
      return { role: role as AppRole, permissions: matrix };
    });
  }
}
