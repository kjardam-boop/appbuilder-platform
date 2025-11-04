/**
 * Tenant Apps Service
 * Tenant-level app installation and configuration management
 */

import { supabase } from "@/integrations/supabase/client";
import type { TenantAppInstall, AppConfig, AppOverrides } from "../types/appRegistry.types";
import { AppRegistryService } from "./appRegistryService";
import { CompatibilityService } from "./compatibilityService";
import { McpActionRegistryService } from "../../mcp/services/mcpActionRegistryService";

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

    const { data, error } = await (supabase as any)
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
      .maybeSingle();

    if (error) throw error;
    
    // Register MCP actions if defined in manifest
    if (definition.mcp_actions && definition.mcp_actions.length > 0) {
      try {
        await McpActionRegistryService.registerTenantActions(
          tenantId,
          appKey,
          definition.mcp_actions,
          'system'
        );
      } catch (regError) {
        console.error('Failed to register MCP actions during install:', regError);
        // Don't fail the install, just log the error
      }
    }
    
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

    const { data, error } = await (supabase as any)
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
      .maybeSingle();

    if (error) throw error;
    
    // Re-register MCP actions for new version
    const definition = await AppRegistryService.getDefinitionByKey(appKey);
    if (definition.mcp_actions && definition.mcp_actions.length > 0) {
      try {
        await McpActionRegistryService.registerTenantActions(
          tenantId,
          appKey,
          definition.mcp_actions,
          userId || 'system'
        );
      } catch (regError) {
        console.error('Failed to register MCP actions during update:', regError);
      }
    }
    
    return data as TenantAppInstall;
  }

  /**
   * Set app configuration
   */
  static async setConfig(tenantId: string, appKey: string, config: AppConfig) {
    const { data, error } = await (supabase as any)
      .from('applications')
      .update({ 
        config,
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Set app overrides
   */
  static async setOverrides(tenantId: string, appKey: string, overrides: AppOverrides) {
    const { data, error } = await (supabase as any)
      .from('applications')
      .update({ 
        overrides,
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Change app channel
   */
  static async setChannel(tenantId: string, appKey: string, channel: 'stable' | 'canary' | 'pinned') {
    const { data, error } = await (supabase as any)
      .from('applications')
      .update({ 
        channel,
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Get installed apps for tenant
   */
  static async listInstalled(tenantId: string) {
    const { data, error } = await (supabase as any)
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
    const { data, error } = await (supabase as any)
      .from('applications')
      .select(`
        *,
        app_definition:app_definitions(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .maybeSingle();

    if (error) throw error;
    return data as TenantAppInstall;
  }

  /**
   * Uninstall app
   */
  static async uninstall(tenantId: string, appKey: string) {
    const { error } = await (supabase as any)
      .from('applications')
      .update({ 
        is_active: false,
        install_status: 'disabled',
        last_updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey);

    if (error) throw error;
    
    // Disable MCP actions for this app
    try {
      await McpActionRegistryService.disableTenantAppActions(tenantId, appKey);
    } catch (regError) {
      console.error('Failed to disable MCP actions during uninstall:', regError);
    }
  }
}
