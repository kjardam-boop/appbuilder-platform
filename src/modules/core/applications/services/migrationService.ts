/**
 * Migration Service
 * Handles database migration tracking and execution for app updates
 */

import { supabase } from "@/integrations/supabase/client";

export class MigrationService {
  /**
   * Check if migration is needed for app update
   */
  static async needsMigration(
    tenantId: string,
    appKey: string,
    fromVersion: string,
    toVersion: string
  ): Promise<boolean> {
    // Get app definition
    const { data: definition } = await (supabase as any)
      .from('app_definitions')
      .select('id')
      .eq('key', appKey)
      .maybeSingle();

    if (!definition) return false;

    // Check if versions have different domain tables
    const { data: versions } = await (supabase as any)
      .from('app_versions')
      .select('version, migrations')
      .eq('app_definition_id', definition.id)
      .in('version', [fromVersion, toVersion]);

    if (!versions || versions.length !== 2) return false;

    const fromMigrations = versions.find((v: any) => v.version === fromVersion)?.migrations || [];
    const toMigrations = versions.find((v: any) => v.version === toVersion)?.migrations || [];

    return JSON.stringify(fromMigrations) !== JSON.stringify(toMigrations);
  }

  /**
   * Mark app as requiring migration
   */
  static async markPendingMigration(tenantId: string, appKey: string, targetVersion: string) {
    await (supabase as any)
      .from('applications')
      .update({
        migration_status: 'pending_migration',
        install_status: 'updating',
        last_updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey);
  }

  /**
   * Mark migration as complete
   */
  static async markMigrationComplete(tenantId: string, appKey: string) {
    await (supabase as any)
      .from('applications')
      .update({
        migration_status: 'current',
        install_status: 'active',
        migration_error: null,
        last_updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey);
  }

  /**
   * Mark migration as failed
   */
  static async markMigrationFailed(tenantId: string, appKey: string, error: string) {
    await (supabase as any)
      .from('applications')
      .update({
        migration_status: 'failed',
        install_status: 'failed',
        migration_error: error,
        last_updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('key', appKey);
  }

  /**
   * Get pending migrations for tenant
   */
  static async getPendingMigrations(tenantId: string) {
    const { data } = await (supabase as any)
      .from('applications')
      .select('key, name, installed_version, migration_status, migration_error')
      .eq('tenant_id', tenantId)
      .in('migration_status', ['pending_migration', 'failed']);

    return data || [];
  }
}
