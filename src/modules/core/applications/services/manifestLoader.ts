/**
 * Manifest Loader Service
 * Validates and registers Platform Apps from manifests
 */

import { supabase } from "@/integrations/supabase/client";
import { appManifestSchema, type AppManifest } from "../types/manifest.types";
import { AppRegistryService } from "./appRegistryService";

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export class ManifestLoader {
  /**
   * Validate app manifest against schema and database
   */
  static async validateManifest(manifest: AppManifest): Promise<ValidationResult> {
    // Validate against Zod schema
    const result = appManifestSchema.safeParse(manifest);
    if (!result.success) {
      return {
        ok: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    
    // Validate domain_tables exist in database
    for (const table of manifest.domain_tables) {
      const { error } = await (supabase as any)
        .from(table)
        .select('*')
        .limit(1);
      
      // PGRST116 = empty result (table exists but no data)
      if (error && error.code !== 'PGRST116') {
        return {
          ok: false,
          errors: [`Domain table '${table}' does not exist or is not accessible: ${error.message}`]
        };
      }
    }
    
    return { ok: true, errors: [] };
  }
  
  /**
   * Check if migration is needed by comparing domain_tables
   */
  static async checkMigrationNeeded(
    tenantId: string,
    appKey: string,
    targetVersion: string
  ): Promise<boolean> {
    // Get current install
    const { data: currentInstall } = await (supabase as any)
      .from('applications')
      .select('*, app_definition:app_definitions(*)')
      .eq('tenant_id', tenantId)
      .eq('key', appKey)
      .maybeSingle();
    
    if (!currentInstall) return false;
    
    // Get target version definition
    const { data: appDef } = await (supabase as any)
      .from('app_definitions')
      .select('*')
      .eq('key', appKey)
      .maybeSingle();
    
    if (!appDef) return false;
    
    // Compare domain_tables
    const currentTables = (currentInstall.app_definition?.domain_tables || []) as string[];
    const targetTables = (appDef.domain_tables || []) as string[];
    
    // Sort and compare
    const currentSorted = [...currentTables].sort().join(',');
    const targetSorted = [...targetTables].sort().join(',');
    
    return currentSorted !== targetSorted;
  }
  
  /**
   * Register app from manifest
   */
  static async registerFromManifest(manifest: AppManifest) {
    // Validate
    const validation = await this.validateManifest(manifest);
    if (!validation.ok) {
      throw new Error(`Manifest validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Check if app already exists
    const { data: existing } = await (supabase as any)
      .from('app_definitions')
      .select('*')
      .eq('key', manifest.key)
      .maybeSingle();
    
    if (existing) {
      // Update existing
      const { error } = await (supabase as any)
        .from('app_definitions')
        .update({
          name: manifest.name,
          domain_tables: manifest.domain_tables,
          shared_tables: manifest.shared_tables || [],
          hooks: manifest.hooks || [],
          ui_components: manifest.ui_components || [],
          capabilities: manifest.capabilities || [],
          integration_requirements: manifest.integration_requirements || {},
          schema_version: manifest.version,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      if (error) throw error;
      return existing;
    }
    
    // Create new
    const { data, error } = await (supabase as any)
      .from('app_definitions')
      .insert({
        key: manifest.key,
        name: manifest.name,
        app_type: 'custom',
        domain_tables: manifest.domain_tables,
        shared_tables: manifest.shared_tables || [],
        hooks: manifest.hooks || [],
        ui_components: manifest.ui_components || [],
        capabilities: manifest.capabilities || [],
        integration_requirements: manifest.integration_requirements || {},
        schema_version: manifest.version,
        is_active: true,
        icon_name: 'Package',
        routes: [],
        modules: [],
        extension_points: {},
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
