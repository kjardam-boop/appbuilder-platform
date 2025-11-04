/**
 * Compatibility Service
 * Pre-flight checks for app installation and updates
 */

import { supabase } from "@/integrations/supabase/client";
import type { CompatibilityCheck } from "../types/appRegistry.types";
import { AppRegistryService } from "./appRegistryService";

export class CompatibilityService {
  /**
   * Check if app version can be installed/updated for tenant
   */
  static async preflight(
    tenantId: string,
    appKey: string,
    targetVersion: string
  ): Promise<CompatibilityCheck> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Check if app definition exists
      const appDef = await AppRegistryService.getDefinitionByKey(appKey);

      if (!appDef) {
        reasons.push(`App '${appKey}' not found in registry`);
        return { ok: false, reasons, warnings };
      }

      if (!appDef.is_active) {
        reasons.push(`App '${appKey}' is not active`);
        return { ok: false, reasons, warnings };
      }

      // 2. Check if version exists or get latest
      let version;
      if (targetVersion === 'latest') {
        const versions = await AppRegistryService.listVersions(appKey);
        version = versions[0];
      } else {
        const { data } = await (supabase as any)
          .from('app_versions')
          .select('*')
          .eq('app_definition_id', appDef.id)
          .eq('version', targetVersion)
          .maybeSingle();
        
        version = data;
      }

      if (!version) {
        reasons.push(`Version '${targetVersion}' not found for '${appKey}'`);
        return { ok: false, reasons, warnings };
      }

      // 3. Check compatibility matrix
      const { data: compat } = await (supabase as any)
        .from('app_compatibility')
        .select('*')
        .eq('app_definition_id', appDef.id)
        .maybeSingle();

      if (compat) {
        // Check incompatible apps
        const { data: installedApps } = await (supabase as any)
          .from('applications')
          .select('key, installed_version')
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        const incompatible = (compat.incompatible_with as string[]) || [];
        for (const installed of installedApps || []) {
          const pattern = `${installed.key}@${installed.installed_version}`;
          if (incompatible.some((i: string) => pattern.match(new RegExp(i)))) {
            reasons.push(`Incompatible with ${installed.key}@${installed.installed_version}`);
          }
        }
      }

      // 4. Check breaking changes
      if (version.breaking_changes) {
        warnings.push('This version contains breaking changes. Review migration notes.');
      }

      // 5. Check if deprecated
      if (version.deprecated_at) {
        warnings.push(`This version is deprecated (since ${new Date(version.deprecated_at).toLocaleDateString()})`);
      }

      // 6. Check if end of life
      if (version.end_of_life_at) {
        const eolDate = new Date(version.end_of_life_at);
        if (eolDate < new Date()) {
          reasons.push('This version has reached end of life');
        } else {
          warnings.push(`This version will reach end of life on ${eolDate.toLocaleDateString()}`);
        }
      }

    } catch (error) {
      reasons.push(`Compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      ok: reasons.length === 0,
      reasons,
      warnings,
    };
  }

  /**
   * Check if tenant can upgrade from current to target version
   */
  static async canUpgrade(
    tenantId: string,
    appKey: string,
    fromVersion: string,
    toVersion: string
  ): Promise<CompatibilityCheck> {
    const check = await this.preflight(tenantId, appKey, toVersion);
    
    if (!check.ok) {
      return check;
    }

    // Additional upgrade-specific checks
    const { data: fromVersionData } = await (supabase as any)
      .from('app_versions')
      .select('*')
      .eq('version', fromVersion)
      .maybeSingle();

    const { data: toVersionData } = await (supabase as any)
      .from('app_versions')
      .select('*')
      .eq('version', toVersion)
      .maybeSingle();

    if (toVersionData?.breaking_changes && fromVersionData) {
      check.warnings.push('Upgrade contains breaking changes. Data migration may be required.');
    }

    return check;
  }
}
