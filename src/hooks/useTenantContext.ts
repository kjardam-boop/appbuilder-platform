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
        
        // Check for tenant override (for multi-tenant on same domain)
        const urlParams = new URLSearchParams(window.location.search);
        const tenantSlugOverride = urlParams.get('tenant') || sessionStorage.getItem('tenantOverride');
        
        // If override exists, store in sessionStorage for navigation persistence
        if (urlParams.get('tenant')) {
          sessionStorage.setItem('tenantOverride', urlParams.get('tenant')!);
        }
        
        // Dev mode: fallback to static config if localhost
        const isDev = host === 'localhost' || host.startsWith('127.0.0.1');
        
        if (isDev) {
          // Check for specific tenant paths
          if (window.location.pathname.startsWith('/akselera')) {
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
              user_role: 'tenant_owner',
              request_id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            };
            setContext(ctx);
            return;
          }
          
          // Default dev tenant for other paths (jul25, admin, etc.)
          const ctx: RequestContext = {
            tenant_id: 'dev-tenant',
            tenant: {
              tenant_id: 'dev-tenant',
              name: 'Development Tenant',
              host,
              enabled_modules: [],
              custom_config: {},
            } as any,
            user_id: user.id,
            user_role: 'tenant_owner',
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          };
          setContext(ctx);
          return;
        }

        // Production: resolve from database or override
        let tenant;
        let resolveSource = 'domain';
        
        if (tenantSlugOverride) {
          // Fetch tenant by slug override
          const { data: tenantData, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', tenantSlugOverride)
            .single();
          
          if (tenantData && !error) {
            // Map database columns to TenantConfig interface
            tenant = {
              id: tenantData.id,
              tenant_id: tenantData.id,                    // Map id -> tenant_id
              name: tenantData.name,
              slug: tenantData.slug,
              host: window.location.hostname,
              domain: tenantData.domain || undefined,
              subdomain: tenantData.slug || undefined,
              enabled_modules: [],
              custom_config: tenantData.settings || {},    // Map settings -> custom_config
              is_platform_tenant: tenantData.is_platform_tenant || false,
              created_at: tenantData.created_at,
              updated_at: tenantData.updated_at,
            } as TenantConfig;
            
            resolveSource = 'override';
            console.info('[TenantContext] Using tenant override', { 
              source: resolveSource,
              slug: tenantSlugOverride, 
              tenantId: tenant.tenant_id,
              name: tenant.name,
              host: window.location.hostname
            });
          } else {
            console.warn('[TenantContext] Override slug not found:', tenantSlugOverride, error);
            sessionStorage.removeItem('tenantOverride');
          }
        }
        
        if (!tenant) {
          tenant = await resolveTenantByHost(host);
        }

        if (!tenant) {
          console.error('[useTenantContext] No tenant found for host:', host);
          return;
        }
        
        console.info('[TenantContext] Resolved tenant', { 
          source: resolveSource,
          tenantId: tenant.tenant_id,
          slug: tenant.slug,
          name: tenant.name,
          host 
        });

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
