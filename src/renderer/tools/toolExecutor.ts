import { brandExtractFromSite } from './brand';
import { contentScrape } from './content';
import { automationsEnqueueJob } from './automations';
import { paymentsCreateCheckout, paymentsGetStatus } from './payments';

export type ToolExecutionResult = {
  ok: boolean;
  data?: any;
  error?: { code: string; message: string };
};

/**
 * Execute a tool call
 * Dispatches to the correct implementation based on tool key
 */
export async function executeTool(
  tenantId: string,
  toolKey: string,
  params: Record<string, any>
): Promise<ToolExecutionResult> {
  try {
    switch (toolKey) {
      case 'brand.extractFromSite':
        return await brandExtractFromSite(tenantId, params as { url: string });
      
      case 'content.scrape':
        return await contentScrape(tenantId, params as { urls: string[] });
      
      case 'automations.enqueueJob':
        return await automationsEnqueueJob(tenantId, params as { event: string; payload: Record<string, any> });
      
      case 'payments.createCheckout':
        return await paymentsCreateCheckout(tenantId, params as { amount: number; currency: string; reference?: string });
      
      case 'payments.getStatus':
        return await paymentsGetStatus(tenantId, params as { reference: string });
      
      default:
        return {
          ok: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool '${toolKey}' not implemented`,
          },
        };
    }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'TOOL_EXECUTION_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}
