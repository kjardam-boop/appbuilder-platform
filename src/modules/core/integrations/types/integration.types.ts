/**
 * Integration Module Types
 * Common types for all third-party integrations
 */

export interface IntegrationConfig {
  name: string;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface IntegrationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    source: string;
    [key: string]: any;
  };
}

export interface SyncStatus {
  id: string;
  integrationName: string;
  entityType: string;
  entityId: string;
  lastSyncedAt?: string;
  nextSyncAt?: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
  error?: string;
}

export interface IntegrationCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  timeout?: number;
}
