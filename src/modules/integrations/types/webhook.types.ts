/**
 * Webhook Types
 * Types for webhook handling and logging
 */

export interface WebhookPayload<T = any> {
  source: string;
  eventType: string;
  data: T;
  timestamp: string;
  signature?: string;
}

export interface WebhookLog {
  id: string;
  source: string;
  eventType: string;
  payload: any;
  processed: boolean;
  processedAt?: string;
  error?: string;
  createdAt: string;
}

export interface WebhookHandler<T = any> {
  source: string;
  eventTypes: string[];
  handle: (payload: WebhookPayload<T>) => Promise<void>;
  validate?: (payload: WebhookPayload<T>) => boolean;
}
