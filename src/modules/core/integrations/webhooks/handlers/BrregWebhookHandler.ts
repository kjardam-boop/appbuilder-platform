/**
 * Brreg Webhook Handler
 * Processes webhooks from Brønnøysundregistrene
 */

import { WebhookHandler, WebhookPayload } from '../../types/webhook.types';
import { IntegrationService } from '../../services/IntegrationService';
import { BrregAdapter } from '../../adapters/brreg/BrregAdapter';

interface BrregWebhookData {
  organisasjonsnummer: string;
  changeType: 'update' | 'delete';
  timestamp: string;
}

export const BrregWebhookHandler: WebhookHandler<BrregWebhookData> = {
  source: 'brreg',
  eventTypes: ['company.updated', 'company.deleted'],

  /**
   * Validate webhook payload
   */
  validate: (payload: WebhookPayload<BrregWebhookData>): boolean => {
    const data = payload.data;
    return !!(
      data &&
      data.organisasjonsnummer &&
      data.changeType &&
      ['update', 'delete'].includes(data.changeType)
    );
  },

  /**
   * Handle webhook
   */
  handle: async (payload: WebhookPayload<BrregWebhookData>): Promise<void> => {
    console.log('[BrregWebhookHandler] Processing webhook:', payload.eventType);

    const { organisasjonsnummer, changeType } = payload.data;

    try {
      const brreg = IntegrationService.getAdapter<BrregAdapter>('brreg');

      if (changeType === 'update') {
        // Fetch updated data from Brreg
        const companyData = await brreg.getCompanyDetails(organisasjonsnummer);
        
        if (companyData) {
          // Sync to database (only if company is saved/has roles)
          await brreg.syncToDatabase(companyData);
          console.log(`[BrregWebhookHandler] Successfully synced company ${organisasjonsnummer}`);
        }
      } else if (changeType === 'delete') {
        // Handle company deletion
        console.log(`[BrregWebhookHandler] Company ${organisasjonsnummer} deleted in Brreg`);
        // You might want to mark it as inactive or log this
      }
    } catch (error) {
      console.error('[BrregWebhookHandler] Error processing webhook:', error);
      throw error;
    }
  },
};
