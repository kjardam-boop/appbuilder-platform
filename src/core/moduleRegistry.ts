/**
 * Module Registry
 * Central registry for managing application modules
 */

interface ModuleConfig {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

class ModuleRegistry {
  private static modules: Map<string, ModuleConfig> = new Map();

  static register(config: ModuleConfig) {
    this.modules.set(config.name, config);
    console.log(`[Module Registry] Registered: ${config.name} v${config.version}`);
  }

  static get(name: string): ModuleConfig | undefined {
    return this.modules.get(name);
  }

  static getAll(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  static getEnabled(): ModuleConfig[] {
    return Array.from(this.modules.values()).filter(m => m.enabled);
  }

  static isEnabled(name: string): boolean {
    const module = this.modules.get(name);
    return module?.enabled ?? false;
  }

  static enable(name: string) {
    const module = this.modules.get(name);
    if (module) {
      module.enabled = true;
      this.modules.set(name, module);
    }
  }

  static disable(name: string) {
    const module = this.modules.get(name);
    if (module) {
      module.enabled = false;
      this.modules.set(name, module);
    }
  }
}

export default ModuleRegistry;
