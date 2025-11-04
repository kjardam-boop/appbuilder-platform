/**
 * Tenant Apps Service
 * Tenant-level app installation and configuration management
 */

import { supabase } from "@/integrations/supabase/client";
import type { TenantAppInstall, AppConfig, AppOverrides } from "../types/appRegistry.types";
import { AppRegistryService } from "./appRegistryService";
import { CompatibilityService } from "./compatibilityService";

export class TenantAppsService {
  /**
   * Install app for tenant
   */
  static async install(
    tenantId: string,
    appKey: string,
    options?: {
      version?: string;
      channel?: 'stable' | 'canary';
      config?: AppConfig;
    }
  ) {
    const definition = await AppRegistryService.getDefinitionByKey(appKey);
    
    // Preflight check
    const compatibility = await CompatibilityService.preflight(
      tenantId,
      appKey,
      options?.version || 'latest'
    );
    
    if (!compatibility.ok) {
      throw new Error(`Cannot install: ${compatibility.reasons.join(', ')}`);
    }

    // Get version to install
    const versions = await AppRegistryService.listVersions(appKey);
    const targetVersion = options?.version || versions[0]?.version || '1.0.0';

    const { data, error } = await supabase
      .from('applications')
      .insert({
        tenant_id: tenantId,
        key: appKey,
        name: definition.name,
        description: definition.description,
        icon_name: definition.icon_name,
        app_definition_id: definition.id,
        installed_version: targetVersion,
        channel: options?.channel || 'stable',
        install_status: 'active',
        config: options?.config || {},
        overrides: {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Update installed app to new version
   */
  static async update(
    tenantId: string,
    appKey: string,
    targetVersion: string,
    userId?: string
  ) {
    // Preflight check
    const compatibility = await CompatibilityService.preflight(
      tenantId,
      appKey,
      targetVersion
    );

    if (!compatibility.ok) {
      throw new Error(`Cannot update: ${compatibility.reasons.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('applications')
      .update({
        installed_version: targetVersion,
        install_status: 'active',
        last_updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .select()
      .single();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Set app configuration
   */
  static async setConfig(tenantId: string, appKey: string, config: AppConfig) {
    const { data, error } = await supabase
      .from('applications')
      .update({ 
        config,
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .select()
      .single();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Set app overrides
   */
  static async setOverrides(tenantId: string, appKey: string, overrides: AppOverrides) {
    const { data, error } = await supabase
      .from('applications')
      .update({ 
        overrides,
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .select()
      .single();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Change app channel
   */
  static async setChannel(tenantId: string, appKey: string, channel: 'stable' | 'canary' | 'pinned') {
    const { data, error } = await supabase
      .from('applications')
      .update({ 
        channel,
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .select()
      .single();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Get installed apps for tenant
   */
  static async listInstalled(tenantId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        app_definition:app_definitions(
          key,
          name,
          app_type,
          routes,
          modules,
          extension_points
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data as TenantAppInstall[];
  }

  /**
   * Get single installed app
   */
  static async getInstalled(tenantId: string, appKey: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        app_definition:app_definitions(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .single();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Uninstall app
   */
  static async uninstall(tenantId: string, appKey: string) {
    const { error } = await supabase
      .from('applications')
      .update({ 
        is_active: false,
        install_status: 'disabled',
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey);

    if (error) throw error;
  }
}
