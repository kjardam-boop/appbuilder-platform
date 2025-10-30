// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/core/user/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RequestContext } from '@/modules/tenant/types/tenant.types';
import { resolveTenantByHost } from '@/modules/tenant/services/tenantResolver';

export const useTenantContext = (): RequestContext | null => {
  const { user } = useAuth();
  const [context, setContext] = useState<RequestContext | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      if (!user) return;

      try {
        // Resolve tenant from hostname
        const host = window.location.hostname;
        const tenant = await resolveTenantByHost(host);

        if (!tenant) {
          console.error('[useTenantContext] No tenant found for host:', host);
          return;
        }

        // Get user's roles for this tenant
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role, scope_id')
          .eq('user_id', user.id)
          .eq('scope_type', 'tenant')
          .eq('scope_id', tenant.tenant_id);

        const ctx: RequestContext = {
          tenant_id: tenant.tenant_id,
          tenant,
          user_id: user.id,
          user_role: roles?.[0]?.role,
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };

        setContext(ctx);
      } catch (error) {
        console.error('[useTenantContext] Error loading context:', error);
      }
    };

    loadContext();
  }, [user]);

  return context;
};
