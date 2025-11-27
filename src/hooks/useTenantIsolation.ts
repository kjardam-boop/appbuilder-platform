import { useTenantContext } from './useTenantContext';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export const useTenantIsolation = () => {
  const context = useTenantContext();

  /**
   * Add tenant_id filter to a Supabase query
   */
  const filterByTenant = <T extends PostgrestFilterBuilder<any, any, any>>(query: T): T => {
    if (!context) return query;
    return query.eq('tenant_id', context.tenant_id) as T;
  };

  /**
   * Ensure tenant_id is included in input data
   */
  const ensureTenantId = <T extends Record<string, unknown>>(input: T): T & { tenant_id: string } => {
    if (!context) throw new Error('No tenant context');
    return { ...input, tenant_id: context.tenant_id };
  };

  return {
    context,
    filterByTenant,
    ensureTenantId,
    tenantId: context?.tenant_id,
  };
};
