/**
 * Integration Service
 * Central service for managing all integrations
 */

/**
 * Integration Service
 * 
 * External integration management service.
 */
import { BaseAdapter } from '../adapters/base/BaseAdapter';
import { BrregAdapter } from '../adapters/brreg/BrregAdapter';
import { supabase } from '@/integrations/supabase/client';

export class IntegrationService {
  private static adapters = new Map<string, BaseAdapter<any, any>>();
  private static initialized = false;

  /**
   * Initialize all adapters
   */
  static initialize() {
    if (this.initialized) return;

    // Register Brreg adapter
    this.registerAdapter('brreg', new BrregAdapter());

    this.initialized = true;
    console.log('[IntegrationService] Initialized with adapters:', Array.from(this.adapters.keys()));
  }

  /**
   * Register a new adapter
   */
  static registerAdapter(name: string, adapter: BaseAdapter<any, any>) {
    this.adapters.set(name, adapter);
    console.log(`[IntegrationService] Registered adapter: ${name}`);
  }

  /**
   * Get adapter by name
   */
  static getAdapter<T extends BaseAdapter<any, any>>(name: string): T {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter '${name}' not found. Available: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    return adapter as T;
  }

  /**
   * Get all registered adapters
   */
  static getAllAdapters(): BaseAdapter<any, any>[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Sync all pending entities
   * Only syncs entities marked as is_saved=true or with roles
   */
  static async syncAllPending(): Promise<void> {
    console.log('[IntegrationService] Starting sync for all pending entities');

    try {
      // Get all companies that need syncing (only saved companies)
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, org_number, is_saved')
        .eq('is_saved', true);

      if (error) {
        console.error('[IntegrationService] Error fetching companies for sync:', error);
        return;
      }

      if (!companies || companies.length === 0) {
        console.log('[IntegrationService] No companies to sync');
        return;
      }

      console.log(`[IntegrationService] Found ${companies.length} companies to sync`);

      const brreg = this.getAdapter<BrregAdapter>('brreg');

      for (const company of companies) {
        try {
          console.log(`[IntegrationService] Syncing company ${company.org_number}`);
          
          const details = await brreg.getCompanyDetails(company.org_number);
          if (details) {
            await brreg.syncToDatabase(details);
          }
        } catch (error) {
          console.error(`[IntegrationService] Error syncing company ${company.org_number}:`, error);
        }
      }

      console.log('[IntegrationService] Sync completed');
    } catch (error) {
      console.error('[IntegrationService] Error in syncAllPending:', error);
    }
  }

  /**
   * Sync specific entity
   */
  static async syncEntity(integrationName: string, entityId: string): Promise<void> {
    const adapter = this.getAdapter(integrationName);

    // Check if entity should be synced
    const shouldSync = await adapter.shouldSync(entityId);
    if (!shouldSync) {
      console.log(`[IntegrationService] Entity ${entityId} not marked for sync, skipping`);
      return;
    }

    console.log(`[IntegrationService] Syncing entity ${entityId} via ${integrationName}`);
    // Implementation depends on entity type
    // This would be extended based on specific needs
  }
}

// Initialize on module load
IntegrationService.initialize();
