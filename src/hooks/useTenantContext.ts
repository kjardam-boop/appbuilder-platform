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

// Cookie helpers for persisting tenant override across redirects/new tabs
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};
const setCookie = (name: string, value: string, maxAgeSec = 60 * 60 * 24) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; samesite=lax`;
};

export const useTenantContext = (): RequestContext | null => {
  const { user } = useAuth();
  const [context, setContext] = useState<RequestContext | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      // Capture and persist tenant override ASAP (even before auth)
      try {
        // PRIORITY 1: Check if we're on an admin tenant page with path parameter
        const pathMatch = window.location.pathname.match(/^\/admin\/tenants\/([^\/]+)/);
        let tenantOverride: string | null = null;
        let captureSource = '';
        
        if (pathMatch) {
          // Path parameter takes absolute priority on admin pages
          tenantOverride = pathMatch[1];
          captureSource = 'path-parameter';
          
          // Check if query parameter conflicts with path parameter
          const urlParamsEarly = new URLSearchParams(window.location.search);
          const qTenant = urlParamsEarly.get('tenant');
          
          if (qTenant && qTenant !== tenantOverride) {
            // Remove conflicting query parameter
            console.info(`[TenantContext] Removing conflicting query param { query: '${qTenant}', path: '${tenantOverride}' }`);
            urlParamsEarly.delete('tenant');
            const newSearch = urlParamsEarly.toString();
            const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}${window.location.hash}`;
            window.history.replaceState({}, '', newUrl);
          }
        } else {
          // PRIORITY 2: Check query parameter
          const urlParamsEarly = new URLSearchParams(window.location.search);
          tenantOverride = urlParamsEarly.get('tenant');
          if (tenantOverride) captureSource = 'url-query';
          
          // PRIORITY 3: Check referrer if not in URL (for editor iframe scenarios)
          if (!tenantOverride && document.referrer) {
            try {
              const refUrl = new URL(document.referrer);
              tenantOverride = new URLSearchParams(refUrl.search).get('tenant');
              if (tenantOverride) captureSource = 'referrer';
            } catch {}
          }
        }
        
        if (tenantOverride) {
          console.info(`[TenantContext] Early capture override { source: '${captureSource}', slug: '${tenantOverride}' }`);
          localStorage.setItem('tenantOverride', tenantOverride);
          sessionStorage.setItem('tenantOverride', tenantOverride);
          setCookie('tenantOverride', tenantOverride);
        }
      } catch {}

      if (!user) return;

      try {
        const host = window.location.hostname;
        
        // Check for explicit "use platform" flag (set by TenantSwitcher)
        const usePlatform = sessionStorage.getItem('usePlatformTenant') === 'true';
        if (usePlatform) {
          console.info('[TenantContext] Using platform tenant (explicit switch)');
          sessionStorage.removeItem('usePlatformTenant');
          // Clear any stored overrides
          localStorage.removeItem('tenantOverride');
          sessionStorage.removeItem('tenantOverride');
          document.cookie = 'tenantOverride=; path=/; max-age=0';
          // Continue to dev mode logic which will use platform tenant
        }
        
        // Check for tenant override from URL only
        const urlParams = new URLSearchParams(window.location.search);
        let tenantSlugOverride: string | null = urlParams.get('tenant');
        let overrideSource: string | null = tenantSlugOverride ? 'query' : null;
        
        // Fallback: allow #tenant=slug in hash
        if (!tenantSlugOverride && !usePlatform) {
          const rawHash = window.location.hash;
          const hashParams = new URLSearchParams(rawHash.replace(/^#/, ''));
          const hashTenant = hashParams.get('tenant');
          console.log('[TenantContext] Hash check:', { rawHash, hashTenant });
          if (hashTenant) {
            tenantSlugOverride = hashTenant;
            overrideSource = 'hash';
          }
        }
        
        // In DEV mode: Only use storage fallback if NOT explicitly switching to platform
        // In PROD mode: Always check storage for cross-tab persistence
        const isDev = host === 'localhost' || host.startsWith('127.0.0.1');
        
        if (!tenantSlugOverride && !usePlatform) {
          if (!isDev) {
            // Production: use storage for cross-tab persistence
            const ls = localStorage.getItem('tenantOverride');
            const ss = sessionStorage.getItem('tenantOverride');
            const ck = getCookie('tenantOverride');
            tenantSlugOverride = ls || ss || ck || null;
            if (tenantSlugOverride) overrideSource = ls ? 'localStorage' : ss ? 'sessionStorage' : 'cookie';
          }
          // Dev mode: Don't auto-read from storage - require explicit URL param
        }
        
        // Fallback for Lovable editor: read from parent page referrer query (?tenant=slug)
        if (!tenantSlugOverride && !usePlatform && document.referrer) {
          try {
            const refUrl = new URL(document.referrer);
            const refTenant = refUrl.searchParams.get('tenant');
            if (refTenant) {
              tenantSlugOverride = refTenant;
              overrideSource = 'referrer';
              console.info('[TenantContext] Using tenant override from referrer', { refTenant });
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        
        // If override exists from URL, persist it for this session
        if (tenantSlugOverride && overrideSource && ['query', 'hash'].includes(overrideSource)) {
          try {
            sessionStorage.setItem('tenantOverride', tenantSlugOverride);
            // In production, also use localStorage for cross-tab
            if (!isDev) {
              localStorage.setItem('tenantOverride', tenantSlugOverride);
              setCookie('tenantOverride', tenantSlugOverride);
            }
          } catch {}
        }
        
        // Dev mode: handle tenant context (isDev already defined above)
        console.log('[TenantContext] Pre-resolve state:', { 
          isDev, 
          usePlatform, 
          tenantSlugOverride, 
          overrideSource 
        });
        
        if (isDev) {
          // Check for specific tenant paths (static configs)
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
          
          // If tenant override exists, use it (same as production)
          if (tenantSlugOverride) {
            console.log('[TenantContext] Dev mode: looking up tenant slug:', tenantSlugOverride);
            const { data: overrideTenant, error } = await supabase
              .from('tenants')
              .select('*')
              .eq('slug', tenantSlugOverride)
              .single();
            
            console.log('[TenantContext] Dev mode: lookup result:', { 
              found: !!overrideTenant, 
              error: error?.message,
              tenant: overrideTenant?.name 
            });
            
            if (overrideTenant && !error) {
              console.info('[TenantContext] Dev mode: using tenant override', { 
                slug: tenantSlugOverride, 
                name: overrideTenant.name 
              });
              const ctx: RequestContext = {
                tenant_id: overrideTenant.id,
                tenant: {
                  tenant_id: overrideTenant.id,
                  id: overrideTenant.id,
                  name: overrideTenant.name,
                  slug: overrideTenant.slug,
                  host,
                  enabled_modules: [],
                  custom_config: overrideTenant.settings || {},
                  is_platform_tenant: overrideTenant.is_platform_tenant || false,
                } as any,
                user_id: user.id,
                user_role: overrideTenant.is_platform_tenant ? 'platform_owner' : 'tenant_owner',
                request_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
              };
              setContext(ctx);
              return;
            } else {
              console.warn('[TenantContext] Dev mode: override slug not found:', tenantSlugOverride);
              // Clear invalid override
              localStorage.removeItem('tenantOverride');
              sessionStorage.removeItem('tenantOverride');
            }
          }
          
          // No override: use platform tenant from database
          const { data: platformTenant } = await supabase
            .from('tenants')
            .select('*')
            .or('slug.eq.default,is_platform_tenant.eq.true')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();
          
          if (platformTenant) {
            console.info('[TenantContext] Dev mode: using platform tenant', platformTenant.name);
            
            // Clear any stale tenant override when falling back to platform
            // This prevents mismatch between URL hash and actual context
            const currentHash = window.location.hash;
            if (currentHash.includes('tenant=') && !currentHash.includes(`tenant=${platformTenant.slug}`)) {
              const hashParams = new URLSearchParams(currentHash.replace(/^#/, ''));
              hashParams.delete('tenant');
              const newHash = hashParams.toString();
              history.replaceState(null, '', `${window.location.pathname}${window.location.search}${newHash ? '#' + newHash : ''}`);
              localStorage.removeItem('tenantOverride');
              sessionStorage.removeItem('tenantOverride');
            }
            
            const ctx: RequestContext = {
              tenant_id: platformTenant.id,
              tenant: {
                tenant_id: platformTenant.id,
                id: platformTenant.id,
                name: platformTenant.name,
                slug: platformTenant.slug,
                host,
                enabled_modules: [],
                custom_config: platformTenant.settings || {},
                is_platform_tenant: true,
              } as any,
              user_id: user.id,
              user_role: 'platform_owner',
              request_id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            };
            setContext(ctx);
            return;
          }
          
          // Fallback: create minimal dev context (will fail on DB writes)
          console.warn('[TenantContext] No platform tenant found in database!');
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
            localStorage.removeItem('tenantOverride');
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
