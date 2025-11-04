/**
 * Deployment Service
 * Handles canary deployments, promotions, and rollbacks
 */

import { supabase } from "@/integrations/supabase/client";
import { AppRegistryService } from "./appRegistryService";

export class DeploymentService {
  /**
   * Promote version from canary to stable
   */
  static async promoteToStable(appKey: string, version: string) {
    // 1. Check canary health
    const { data: canaryInstalls } = await supabase
      .from('applications')
      .select('*')
      .eq('key', appKey)
      .eq('channel', 'canary')
      .eq('installed_version', version);

    const failedInstalls = canaryInstalls?.filter(i => i.install_status === 'failed');
    if (failedInstalls && failedInstalls.length > 0) {
      throw new Error(`${failedInstalls.length} canary installs failed. Cannot promote to stable.`);
    }

    // 2. Promote to stable
    await AppRegistryService.promoteVersion(appKey, version, 'stable');

    // 3. Log event
    console.log(`[Deployment] Promoted ${appKey}@${version} to stable`);
    
    return {
      success: true,
      message: `Successfully promoted ${appKey}@${version} to stable`,
      affectedTenants: canaryInstalls?.length || 0,
    };
  }

  /**
   * Rollback to previous version
   */
  static async rollback(appKey: string, targetVersion: string, options?: {
    channel?: 'stable' | 'canary';
    tenantIds?: string[];
  }) {
    let query = supabase
      .from('applications')
      .update({ 
        installed_version: targetVersion, 
        install_status: 'active',
        last_updated_at: new Date().toISOString()
      })
      .eq('key', appKey);

    if (options?.channel) {
      query = query.eq('channel', options.channel);
    }

    if (options?.tenantIds && options.tenantIds.length > 0) {
      query = query.in('tenant_id', options.tenantIds);
    }

    const { error, count } = await query;

    if (error) throw error;

    console.log(`[Deployment] Rolled back ${appKey} to ${targetVersion} (${count} tenants affected)`);

    return {
      success: true,
      message: `Successfully rolled back ${appKey} to ${targetVersion}`,
      affectedTenants: count || 0,
    };
  }

  /**
   * Get deployment status for an app
   */
  static async getDeploymentStatus(appKey: string) {
    const { data: installs } = await supabase
      .from('applications')
      .select('channel, installed_version, install_status, tenant_id')
      .eq('key', appKey)
      .eq('is_active', true);

    if (!installs) {
      return {
        total: 0,
        by_channel: {},
        by_version: {},
        by_status: {},
      };
    }

    const byChannel: Record<string, number> = {};
    const byVersion: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const install of installs) {
      byChannel[install.channel] = (byChannel[install.channel] || 0) + 1;
      byVersion[install.installed_version] = (byVersion[install.installed_version] || 0) + 1;
      byStatus[install.install_status] = (byStatus[install.install_status] || 0) + 1;
    }

    return {
      total: installs.length,
      by_channel: byChannel,
      by_version: byVersion,
      by_status: byStatus,
      installs,
    };
  }

  /**
   * Schedule canary deployment
   */
  static async deployToCanary(appKey: string, version: string, tenantIds: string[]) {
    const definition = await AppRegistryService.getDefinitionByKey(appKey);

    const updates = tenantIds.map(tenantId => ({
      tenant_id: tenantId,
      app_definition_id: definition.id,
      installed_version: version,
      channel: 'canary' as const,
      install_status: 'updating' as const,
      last_updated_at: new Date().toISOString(),
    }));

    // Update tenants to canary channel with new version
    for (const update of updates) {
      await supabase
        .from('applications')
        .update(update)
        .eq('tenant_id', update.tenant_id)
        .eq('key', appKey);
    }

    console.log(`[Deployment] Deployed ${appKey}@${version} to ${tenantIds.length} canary tenants`);

    return {
      success: true,
      message: `Deployed to ${tenantIds.length} canary tenants`,
      tenants: tenantIds,
    };
  }
}
