/**
 * Integration Module
 * Standardized API interface for third-party integrations
 */

// Types
export type {
  IntegrationConfig,
  IntegrationResponse,
  IntegrationCallOptions,
  SyncStatus,
} from './types/integration.types';

export type {
  WebhookPayload,
  WebhookLog,
  WebhookHandler,
} from './types/webhook.types';

// Base Adapter
export { BaseAdapter } from './adapters/base/BaseAdapter';

// Adapters
export { BrregAdapter } from './adapters/brreg/BrregAdapter';
export type { BrregConfig, BrregCompanyData, BrregSearchResult } from './adapters/brreg/types';

// Services
export { IntegrationService } from './services/IntegrationService';
export { WebhookService } from './services/WebhookService';

// Webhook Handlers
export { BrregWebhookHandler } from './webhooks/handlers/BrregWebhookHandler';

// Module metadata
export const INTEGRATION_MODULE = {
  name: 'integrations',
  version: '1.0.0',
  description: 'Standardized third-party integration module with webhooks and adapters',
} as const;
