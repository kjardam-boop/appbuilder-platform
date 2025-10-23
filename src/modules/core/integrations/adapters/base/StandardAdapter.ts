import type { RequestContext } from "@/modules/tenant/types/tenant.types";

/**
 * Standard integration adapter interface (NEW)
 */
export interface IntegrationAdapter {
  id: string;
  name: string;
  description: string;
  
  setup(ctx: RequestContext, config: AdapterConfig): Promise<void>;
  invoke(ctx: RequestContext, action: string, payload: any): Promise<any>;
  validate(config: AdapterConfig): boolean;
  getRequiredFields(): AdapterConfigField[];
  getActions(): AdapterAction[];
}

export interface AdapterConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  credentials?: Record<string, string>;
  rate_limit?: {
    requests_per_minute?: number;
    requests_per_hour?: number;
  };
  [key: string]: any;
}

export interface AdapterConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "boolean" | "json";
  required: boolean;
  description?: string;
  default?: any;
}

export interface AdapterAction {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
}

export abstract class StandardBaseAdapter implements IntegrationAdapter {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  
  protected config: AdapterConfig;

  constructor(config: AdapterConfig = { enabled: false }) {
    this.config = config;
  }

  async setup(ctx: RequestContext, config: AdapterConfig): Promise<void> {
    if (!this.validate(config)) {
      throw new Error(`Invalid configuration for adapter ${this.id}`);
    }
    this.config = config;
  }

  abstract invoke(ctx: RequestContext, action: string, payload: any): Promise<any>;
  
  validate(config: AdapterConfig): boolean {
    const required = this.getRequiredFields().filter(f => f.required);
    return required.every(field => config[field.key] !== undefined && config[field.key] !== null);
  }
  
  abstract getRequiredFields(): AdapterConfigField[];
  abstract getActions(): AdapterAction[];
  
  isConfigured(): boolean {
    return this.config.enabled && this.validate(this.config);
  }
  
  getConfig(): Partial<AdapterConfig> {
    const { apiKey, credentials, ...safeConfig } = this.config;
    return safeConfig;
  }
}
