/**
 * Webhook Service
 * Handles webhook registration and processing
 */

import { WebhookHandler, WebhookPayload, WebhookLog } from '../types/webhook.types';
// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

export class WebhookService {
  private static handlers = new Map<string, WebhookHandler<any>>();

  /**
   * Register a webhook handler
   */
  static registerHandler<T>(handler: WebhookHandler<T>) {
    const key = `${handler.source}`;
    this.handlers.set(key, handler);
    console.log(`[WebhookService] Registered handler for ${handler.source}`);
  }

  /**
   * Get handler for source
   */
  static getHandler(source: string): WebhookHandler<any> | undefined {
    return this.handlers.get(source);
  }

  /**
   * Process incoming webhook
   */
  static async processWebhook<T>(payload: WebhookPayload<T>): Promise<void> {
    console.log(`[WebhookService] Processing webhook from ${payload.source}, event: ${payload.eventType}`);

    // Log webhook
    const logId = await this.logWebhook(payload);

    try {
      // Get handler
      const handler = this.getHandler(payload.source);
      if (!handler) {
        throw new Error(`No handler registered for source: ${payload.source}`);
      }

      // Validate payload
      if (handler.validate && !handler.validate(payload)) {
        throw new Error('Webhook payload validation failed');
      }

      // Check if event type is supported
      if (!handler.eventTypes.includes(payload.eventType)) {
        console.log(`[WebhookService] Event type ${payload.eventType} not handled by ${payload.source} handler`);
        await this.markWebhookProcessed(logId, null);
        return;
      }

      // Process webhook
      await handler.handle(payload);

      // Mark as processed
      await this.markWebhookProcessed(logId, null);

      console.log(`[WebhookService] Successfully processed webhook ${logId}`);
    } catch (error: any) {
      console.error('[WebhookService] Error processing webhook:', error);
      await this.markWebhookProcessed(logId, error.message);
      throw error;
    }
  }

  /**
   * Log webhook to database
   */
  private static async logWebhook<T>(payload: WebhookPayload<T>): Promise<string> {
    const { data, error } = await supabase
      .from('webhook_logs')
      .insert({
        source: payload.source,
        event_type: payload.eventType,
        payload: payload as any,
        processed: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[WebhookService] Error logging webhook:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Mark webhook as processed
   */
  private static async markWebhookProcessed(logId: string, error: string | null): Promise<void> {
    await supabase
      .from('webhook_logs')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error,
      })
      .eq('id', logId);
  }

  /**
   * Get webhook logs
   */
  static async getWebhookLogs(filters?: {
    source?: string;
    processed?: boolean;
    limit?: number;
  }): Promise<WebhookLog[]> {
    let query = supabase.from('webhook_logs').select('*').order('created_at', { ascending: false });

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    if (filters?.processed !== undefined) {
      query = query.eq('processed', filters.processed);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[WebhookService] Error fetching webhook logs:', error);
      return [];
    }

    // Map database columns to WebhookLog type
    return (data || []).map((log) => ({
      id: log.id,
      source: log.source,
      eventType: log.event_type,
      payload: log.payload,
      processed: log.processed,
      processedAt: log.processed_at,
      error: log.error,
      createdAt: log.created_at,
    }));
  }
}
