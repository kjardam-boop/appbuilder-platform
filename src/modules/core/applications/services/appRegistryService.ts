/**
 * App Registry Service
 * Platform-level management of app definitions and versions
 */

import { supabase } from "@/integrations/supabase/client";
import type { AppDefinition, AppVersion } from "../types/appRegistry.types";

export class AppRegistryService {
  /**
   * List all app definitions in the registry
   */
  static async listDefinitions(filters?: { app_type?: string; is_active?: boolean }) {
    let query = supabase
      .from('app_definitions')
      .select('*')
      .order('name');

    if (filters?.app_type) {
      query = query.eq('app_type', filters.app_type);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AppDefinition[];
  }

  /**
   * Get app definition by key
   */
  static async getDefinitionByKey(key: string) {
    const { data, error } = await supabase
      .from('app_definitions')
      .select('*')
      .eq('key', key)
      .single();

    if (error) throw error;
    return data as AppDefinition;
  }

  /**
   * Get app definition by ID
   */
  static async getDefinitionById(id: string) {
    const { data, error } = await supabase
      .from('app_definitions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as AppDefinition;
  }

  /**
   * Publish new version of an app
   */
  static async publishVersion(
    appKey: string,
    version: string,
    manifest: {
      changelog?: string;
      migrations?: any[];
      breaking_changes?: boolean;
      manifest_url?: string;
    }
  ) {
    const definition = await this.getDefinitionByKey(appKey);

    const { data, error } = await supabase
      .from('app_versions')
      .insert({
        app_definition_id: definition.id,
        version,
        changelog: manifest.changelog,
        migrations: manifest.migrations || [],
        breaking_changes: manifest.breaking_changes || false,
        manifest_url: manifest.manifest_url,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AppVersion;
  }

  /**
   * List all versions for an app
   */
  static async listVersions(appKey: string) {
    const definition = await this.getDefinitionByKey(appKey);

    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('app_definition_id', definition.id)
      .order('released_at', { ascending: false });

    if (error) throw error;
    return data as AppVersion[];
  }

  /**
   * Get latest version for an app
   */
  static async getLatestVersion(appKey: string) {
    const versions = await this.listVersions(appKey);
    return versions[0];
  }

  /**
   * Promote version to channel (canary -> stable)
   */
  static async promoteVersion(appKey: string, version: string, toChannel: 'stable' | 'canary') {
    const definition = await this.getDefinitionByKey(appKey);

    // Update all tenants on this channel to the new version
    const { error } = await supabase
      .from('applications')
      .update({ 
        installed_version: version,
        last_updated_at: new Date().toISOString()
      })
      .eq('app_definition_id', definition.id)
      .eq('channel', toChannel);

    if (error) throw error;
  }

  /**
   * Create new app definition
   */
  static async createDefinition(definition: Omit<AppDefinition, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('app_definitions')
      .insert(definition)
      .select()
      .single();

    if (error) throw error;
    return data as AppDefinition;
  }

  /**
   * Update app definition
   */
  static async updateDefinition(id: string, updates: Partial<AppDefinition>) {
    const { data, error } = await supabase
      .from('app_definitions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AppDefinition;
  }
}
