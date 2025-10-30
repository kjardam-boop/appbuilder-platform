// @ts-nocheck
import { useTenantContext } from './useTenantContext';

export const useTenantIsolation = () => {
  const context = useTenantContext();

  const filterByTenant = <T extends any>(query: T): T => {
    if (!context) return query;
    // @ts-ignore - Supabase query builder
    return query.eq('tenant_id', context.tenant_id);
  };

  const ensureTenantId = (input: any) => {
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
