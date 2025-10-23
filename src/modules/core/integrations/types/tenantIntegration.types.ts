import type { BaseEntity } from "@/core/types/common.types";
import type { AdapterConfig } from "../adapters/base/BaseAdapter";

/**
 * Per-tenant integration configuration
 */
export interface TenantIntegration extends BaseEntity {
  tenant_id: string;
  adapter_id: string;
  config: AdapterConfig;
  credentials: Record<string, string> | null;
  rate_limit: {
    requests_per_minute?: number;
    requests_per_hour?: number;
    current_minute_count?: number;
    current_hour_count?: number;
    last_reset_minute?: string;
    last_reset_hour?: string;
  } | null;
  is_active: boolean;
  last_used_at: string | null;
  updated_at: string;
}

export interface TenantIntegrationInput {
  tenant_id: string;
  adapter_id: string;
  config: AdapterConfig;
  credentials?: Record<string, string>;
  rate_limit?: {
    requests_per_minute?: number;
    requests_per_hour?: number;
  };
}

/**
 * Integration usage log
 */
export interface IntegrationUsageLog extends BaseEntity {
  tenant_id: string;
  adapter_id: string;
  action: string;
  request_payload: Record<string, any> | null;
  response_status: number;
  response_time_ms: number;
  error_message: string | null;
  user_id: string | null;
  timestamp: string;
}
