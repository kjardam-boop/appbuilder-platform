/**
 * Permission Migration Service
 * Handles automatic permission setup for new resources and roles
 */

import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/modules/core/user/types/role.types";

interface MissingPermission {
  role: AppRole;
  resourceKey: string;
  resourceName: string;
}

const ROLE_TEMPLATES: Record<string, string[]> = {
  // Platform roles
  platform_owner: ["admin", "create", "read", "update", "delete", "list", "export", "import"],
  platform_support: ["read", "list", "export"],
  platform_auditor: ["read", "list"],
  
  // Tenant roles
  tenant_owner: ["admin", "create", "read", "update", "delete", "list", "export", "import"],
  tenant_admin: ["create", "read", "update", "delete", "list", "export"],
  security_admin: ["read", "update", "list"],
  data_protection: ["read", "export", "delete", "list"],
  
  // Company roles
  integration_service: ["create", "read", "update", "list"],
  supplier_user: ["read", "update"],
  
  // Project roles
  project_owner: ["admin", "create", "read", "update", "delete", "list", "export"],
  analyst: ["create", "read", "update", "list", "export"],
  contributor: ["read", "update", "list"],
  approver: ["read", "update", "list"],
  viewer: ["read", "list"],
  external_reviewer: ["read"],
  
  // App roles
  app_admin: ["admin", "create", "read", "update", "delete", "list"],
  app_user: ["read", "update", "list"],
};

export class PermissionMigrationService {
  /**
   * Sync permissions for a newly created resource
   * Applies standard templates for all roles
   */
  static async syncNewResource(resourceKey: string): Promise<void> {
    console.log(`[PermissionMigration] Syncing new resource: ${resourceKey}`);

    for (const [role, actions] of Object.entries(ROLE_TEMPLATES)) {
      await this.applyTemplate(role, resourceKey, actions);
    }

    console.log(`[PermissionMigration] ✓ Synced resource: ${resourceKey}`);
  }

  /**
   * Find all roles that are missing permissions for existing resources
   */
  static async findMissingPermissions(): Promise<MissingPermission[]> {
    console.log("[PermissionMigration] Finding missing permissions...");

    // Hent alle ressurser
    const { data: resources, error: resourceError } = await supabase
      .from("permission_resources")
      .select("key, name")
      .eq("is_active", true);

    if (resourceError) {
      console.error("[PermissionMigration] Error fetching resources:", resourceError);
      return [];
    }

    // Hent alle eksisterende permissions
    const { data: existingPermissions, error: permError } = await supabase
      .from("role_permissions")
      .select("role, resource_key");

    if (permError) {
      console.error("[PermissionMigration] Error fetching permissions:", permError);
      return [];
    }

    const missing: MissingPermission[] = [];
    const roles = Object.keys(ROLE_TEMPLATES);

    // Sjekk hver kombinasjon av rolle og ressurs
    for (const role of roles) {
      for (const resource of resources || []) {
        const hasPermission = existingPermissions?.some(
          p => p.role === role && p.resource_key === resource.key
        );

        if (!hasPermission) {
          missing.push({
            role: role as AppRole,
            resourceKey: resource.key,
            resourceName: resource.name,
          });
        }
      }
    }

    console.log(`[PermissionMigration] Found ${missing.length} missing permissions`);
    return missing;
  }

  /**
   * Fill all missing permissions for all roles and resources
   */
  static async fillMissingPermissions(): Promise<number> {
    console.log("[PermissionMigration] Filling missing permissions...");

    const missing = await this.findMissingPermissions();
    
    // Grupper etter rolle for effektiv bulk insert
    const byRole: Record<string, string[]> = {};
    missing.forEach(m => {
      if (!byRole[m.role]) {
        byRole[m.role] = [];
      }
      byRole[m.role].push(m.resourceKey);
    });

    let filled = 0;
    for (const [role, resourceKeys] of Object.entries(byRole)) {
      const actions = ROLE_TEMPLATES[role] || [];
      for (const resourceKey of resourceKeys) {
        await this.applyTemplate(role, resourceKey, actions);
        filled++;
      }
    }

    console.log(`[PermissionMigration] ✓ Filled ${filled} missing permissions`);
    return filled;
  }

  /**
   * Apply a template for a specific role and resource
   */
  private static async applyTemplate(
    role: string,
    resourceKey: string,
    actions: string[]
  ): Promise<void> {
    if (actions.length === 0) return;

    const { error } = await supabase
      .from("role_permissions")
      .upsert(
        actions.map(actionKey => ({
          role: role as any,
          resource_key: resourceKey,
          action_key: actionKey,
          allowed: true,
        })),
        {
          onConflict: "role,resource_key,action_key",
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error(`[PermissionMigration] Error applying template:`, error);
    }
  }

  /**
   * Get permission health stats
   */
  static async getHealthStats(): Promise<{
    totalResources: number;
    totalRoles: number;
    missingPermissions: number;
    coveragePercent: number;
  }> {
    const { data: resources } = await supabase
      .from("permission_resources")
      .select("key")
      .eq("is_active", true);

    const totalResources = resources?.length || 0;
    const totalRoles = Object.keys(ROLE_TEMPLATES).length;
    const expectedTotal = totalResources * totalRoles;

    const missing = await this.findMissingPermissions();
    const missingCount = missing.length;

    return {
      totalResources,
      totalRoles,
      missingPermissions: missingCount,
      coveragePercent: expectedTotal > 0 
        ? Math.round(((expectedTotal - missingCount) / expectedTotal) * 100)
        : 100,
    };
  }
}
