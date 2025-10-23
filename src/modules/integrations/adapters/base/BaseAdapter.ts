/**
 * Base Adapter
 * Abstract class for all external service integrations
 */

import { IntegrationConfig, IntegrationResponse, IntegrationCallOptions } from '../../types/integration.types';

export abstract class BaseAdapter<TConfig extends IntegrationConfig, TResponse = any> {
  protected config: TConfig;
  abstract name: string;

  constructor(config: TConfig) {
    this.config = config;
  }

  /**
   * Make an API call to the external service
   */
  abstract call<T = TResponse>(
    endpoint: string,
    options?: IntegrationCallOptions
  ): Promise<IntegrationResponse<T>>;

  /**
   * Handle errors consistently across all adapters
   */
  protected handleError(error: any, context: string): never {
    console.error(`[${this.name}] Error in ${context}:`, error);
    throw new Error(`${this.name} integration error: ${error.message || 'Unknown error'}`);
  }

  /**
   * Sync data back to database
   * Only called for entities that are explicitly saved (is_saved=true or have roles)
   */
  abstract syncToDatabase(data: TResponse): Promise<void>;

  /**
   * Check if entity should be synced
   * Returns true only if entity is saved or has roles/relations
   */
  abstract shouldSync(entityId: string): Promise<boolean>;

  /**
   * Log integration call for debugging
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console[level](`[${this.name}] ${timestamp} - ${message}`, data || '');
  }
}
