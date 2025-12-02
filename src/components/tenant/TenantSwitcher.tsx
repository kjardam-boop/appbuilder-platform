import { useState, useEffect } from 'react';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useAuth } from '@/modules/core/user/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, Check, ChevronDown, Loader2, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TenantOption {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  is_platform_tenant?: boolean;
}

export function TenantSwitcher() {
  const context = useTenantContext();
  const { user } = useAuth();
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserTenants = async () => {
      setIsLoading(true);
      try {
        // Check if user is platform admin (has platform scope role)
        const { data: platformRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('scope_type', 'platform')
          .limit(1);
        
        const isPlatformAdmin = platformRoles && platformRoles.length > 0;
        console.log('[TenantSwitcher] isPlatformAdmin:', isPlatformAdmin);
        
        let tenants: TenantOption[] = [];
        
        if (isPlatformAdmin) {
          // Platform admins can see ALL tenants
          const { data: allTenants, error } = await supabase
            .from('tenants')
            .select('id, slug, name, domain, is_platform_tenant')
            .eq('is_active', true)
            .order('is_platform_tenant', { ascending: false })
            .order('name');
          
          if (error) {
            console.error('[TenantSwitcher] Error fetching all tenants:', error);
          } else {
            tenants = allTenants || [];
          }
        } else {
          // Regular users: only see tenants they have roles on
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('scope_id')
            .eq('user_id', user.id)
            .eq('scope_type', 'tenant');

          if (rolesError) {
            console.error('[TenantSwitcher] Error fetching user roles:', rolesError);
            return;
          }

          const tenantIds = userRoles ? [...new Set(userRoles.map(role => role.scope_id))] : [];

          if (tenantIds.length > 0) {
            const { data: tenantData, error: tenantsError } = await supabase
              .from('tenants')
              .select('id, slug, name, domain, is_platform_tenant')
              .in('id', tenantIds);

            if (tenantsError) {
              console.error('[TenantSwitcher] Error fetching tenants:', tenantsError);
            } else {
              tenants = tenantData || [];
            }
          }
        }

        setAvailableTenants(tenants);
        console.log('[TenantSwitcher] Available tenants:', tenants.length, tenants.map(t => t.slug));
      } catch (error) {
        console.error('[TenantSwitcher] Unexpected error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTenants();
  }, [user]);

  const handleTenantSwitch = (tenant: TenantOption) => {
    console.log('[TenantSwitcher] Switching to tenant:', tenant.slug, tenant.is_platform_tenant ? '(platform)' : '');
    
    if (tenant.is_platform_tenant) {
      // Switching to platform tenant - set flag and clear all overrides
      sessionStorage.setItem('usePlatformTenant', 'true');
      localStorage.removeItem('tenantOverride');
      sessionStorage.removeItem('tenantOverride');
      document.cookie = 'tenantOverride=; path=/; max-age=0';
      
      // Navigate to clean URL and force reload
      const url = new URL(window.location.href);
      url.searchParams.delete('tenant');
      url.hash = '';
      
      // Use replace + reload to ensure full page refresh
      window.history.replaceState(null, '', url.toString());
      window.location.reload();
    } else {
      // Switching to a specific tenant - clear platform flag and set override
      sessionStorage.removeItem('usePlatformTenant');
      sessionStorage.setItem('tenantOverride', tenant.slug);
      
      // Update URL with tenant parameter in hash and force reload
      const url = new URL(window.location.href);
      url.searchParams.delete('tenant');
      url.hash = `tenant=${tenant.slug}`;
      
      // Use replace + reload to ensure full page refresh
      window.history.replaceState(null, '', url.toString());
      window.location.reload();
    }
  };

  const currentTenant = context?.tenant;
  
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="hidden sm:inline">Laster...</span>
      </Button>
    );
  }

  if (availableTenants.length === 0) {
    return null; // Don't show switcher if user has no tenant access
  }

  // Don't show switcher if user only has access to one tenant
  if (availableTenants.length === 1) {
    return (
      <Badge variant="outline" className="gap-2">
        <Building2 className="h-3 w-3" />
        {currentTenant?.name || availableTenants[0].name}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">{currentTenant?.name || 'Velg tenant'}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Bytt tenant
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableTenants.map((tenant) => {
          const isActive = currentTenant?.tenant_id === tenant.id;
          
          return (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => !isActive && handleTenantSwitch(tenant)}
              className="cursor-pointer"
              disabled={isActive}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {tenant.is_platform_tenant ? (
                    <Globe className="h-4 w-4 text-primary" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">{tenant.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {tenant.is_platform_tenant ? 'Platform' : tenant.slug}
                    </span>
                  </div>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
