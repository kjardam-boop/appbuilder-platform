/**
 * Runtime Loader
 * Dynamic loading of app context, config, overrides, and extensions
 */

import { supabase } from "@/integrations/supabase/client";
import type { AppContext, AppConfig, TenantAppExtension } from "../types/appRegistry.types";

export class RuntimeLoader {
  /**
   * Load complete app context for tenant (base + config + overrides + extensions)
   */
  static async loadAppContext(tenantId: string, appKey: string): Promise<AppContext> {
    // 1. Get base app definition + install
    const { data: install, error } = await (supabase as any)
      .from('applications')
      .select(`
        *,
        app_definition:app_definitions(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .maybeSingle();

    if (error || !install) {
      throw new Error(`App '${appKey}' not installed for tenant`);
    }

    if (install.install_status !== 'active') {
      throw new Error(`App '${appKey}' is not active (status: ${install.install_status})`);
    }

    // 2. Get extensions
    const { data: extensions } = await (supabase as any)
      .from('tenant_app_extensions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('app_definition_id', install.app_definition_id!)
      .eq('is_active', true);

    // 3. Merge config with defaults
    const defaultConfig = (install.app_definition as any)?.extension_points?.default_config || {};
    const config = this.mergeConfig(defaultConfig, install.config);

    // 4. Apply overrides
    const overrides = install.overrides;

    return {
      definition: install.app_definition as any,
      install: install as any,
      config,
      overrides,
      extensions: extensions || [],
    };
  }

  /**
   * Dynamically load extension module
   */
  static async loadExtension(
    tenantId: string,
    appDefinitionId: string,
    extensionKey: string
  ): Promise<{ module: any; config: Record<string, any> } | null> {
    const { data } = await (supabase as any)
      .from('tenant_app_extensions')
      .select('implementation_url, config')
      .eq('tenant_id', tenantId)
      .eq('app_definition_id', appDefinitionId)
      .eq('extension_key', extensionKey)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) return null;

    // Security: Only allow whitelisted extension paths
    if (!data.implementation_url.startsWith('/extensions/')) {
      throw new Error('Invalid extension path. Must start with /extensions/');
    }

    try {
      // Dynamic import (only for whitelisted paths)
      const module = await import(/* @vite-ignore */ data.implementation_url);
      return {
        module: module.default,
        config: data.config,
      };
    } catch (error) {
      console.error(`Failed to load extension ${extensionKey}:`, error);
      return null;
    }
  }

  /**
   * Get extension by key
   */
  static async getExtension(
    tenantId: string,
    appDefinitionId: string,
    extensionKey: string
  ): Promise<TenantAppExtension | null> {
    const { data } = await (supabase as any)
      .from('tenant_app_extensions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('app_definition_id', appDefinitionId)
      .eq('extension_key', extensionKey)
      .eq('is_active', true)
      .maybeSingle();

    return data;
  }

  /**
   * Check if feature is enabled in config
   */
  static isFeatureEnabled(config: AppConfig, featureKey: string): boolean {
    return config.features?.[featureKey] === true;
  }

  /**
   * Get feature value from config
   */
  static getFeatureValue<T = any>(config: AppConfig, featureKey: string, defaultValue?: T): T {
    const value = config.features?.[featureKey];
    return value !== undefined ? (value as T) : (defaultValue as T);
  }

  /**
   * Merge configs with proper precedence
   */
  private static mergeConfig(defaults: any, overrides: any): AppConfig {
    return {
      ...defaults,
      ...overrides,
      features: {
        ...defaults?.features,
        ...overrides?.features,
      },
      branding: {
        ...defaults?.branding,
        ...overrides?.branding,
      },
      ui_overrides: {
        ...defaults?.ui_overrides,
        ...overrides?.ui_overrides,
      },
      integrations: {
        ...defaults?.integrations,
        ...overrides?.integrations,
      },
      limits: {
        ...defaults?.limits,
        ...overrides?.limits,
      },
    };
  }
}
