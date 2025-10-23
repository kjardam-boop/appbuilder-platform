import type { IntegrationAdapter } from "../adapters/base/BaseAdapter";
import { BrregAdapter } from "../adapters/brreg/BrregAdapter";

/**
 * Central registry for all integration adapters
 */
class AdapterRegistry {
  private adapters: Map<string, IntegrationAdapter> = new Map();

  constructor() {
    // Register built-in adapters
    this.register(new BrregAdapter({ enabled: true }));
  }

  /**
   * Register an adapter
   */
  register(adapter: IntegrationAdapter): void {
    this.adapters.set(adapter.id, adapter);
    console.log(`[AdapterRegistry] Registered adapter: ${adapter.id}`);
  }

  /**
   * Get adapter by ID
   */
  get(adapterId: string): IntegrationAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  /**
   * Get all registered adapters
   */
  getAll(): IntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Check if adapter exists
   */
  has(adapterId: string): boolean {
    return this.adapters.has(adapterId);
  }

  /**
   * Remove adapter
   */
  unregister(adapterId: string): boolean {
    return this.adapters.delete(adapterId);
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();
