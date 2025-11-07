// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/core/user/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RequestContext } from '@/modules/tenant/types/tenant.types';
import { resolveTenantByHost } from '@/modules/tenant/services/tenantResolver';

// Static configs for dev/demo
import akselera from '@/tenants/akselera/config';
import agJacobsen from '@/tenants/ag-jacobsen/config';

const staticConfigs: Record<string, any> = {
  'akselera': akselera,
  'ag-jacobsen': agJacobsen,
};

export const useTenantContext = (): RequestContext | null => {
  const { user } = useAuth();
  const [context, setContext] = useState<RequestContext | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      if (!user) return;

      try {
        const host = window.location.hostname;
        
        // Dev mode: fallback to static config if localhost
        const isDev = host === 'localhost' || host.startsWith('127.0.0.1');
        
        if (isDev && window.location.pathname.startsWith('/akselera')) {
          // Use static Akselera config for demo
          const staticConfig = staticConfigs['akselera'];
          const ctx: RequestContext = {
            tenant_id: 'akselera-demo',
            tenant: {
              tenant_id: 'akselera-demo',
              name: staticConfig.name,
              host,
              enabled_modules: [],
              custom_config: staticConfig,
            } as any,
            user_id: user.id,
            user_role: 'tenant_owner', // Mock for dev
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          };
          setContext(ctx);
          return;
        }

        // Production: resolve from database
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
