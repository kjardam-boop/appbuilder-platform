import { executeBrand } from './brand';
import { executeContent } from './content';
import { executeAutomations } from './automations';
import { paymentsCreateCheckout, paymentsGetStatus } from './payments';

type ToolFn = (tenantId: string, params: any) => Promise<any>;

const registry: Record<string, ToolFn> = {
  'brand.extractFromSite': executeBrand,
  'content.scrape': executeContent,
  'automations.enqueueJob': executeAutomations,
  'payments.createCheckout': paymentsCreateCheckout,
  'payments.getStatus': paymentsGetStatus,
};

export function getTool(name: string): ToolFn {
  const fn = registry[name];
  if (!fn) throw new Error(`Tool not found: ${name}`);
  return fn;
}

export function getAvailableTools(): string[] {
  return Object.keys(registry);
}
