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
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TenantOption {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
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
        // First, fetch all tenant scope_ids the user has access to
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('scope_id')
          .eq('user_id', user.id)
          .eq('scope_type', 'tenant');

        if (rolesError) {
          console.error('[TenantSwitcher] Error fetching user roles:', rolesError);
          return;
        }

        if (!userRoles || userRoles.length === 0) {
          setAvailableTenants([]);
          return;
        }

        // Extract unique tenant IDs
        const tenantIds = [...new Set(userRoles.map(role => role.scope_id))];

        // Then fetch the tenant details
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, slug, name, domain')
          .in('id', tenantIds);

        if (tenantsError) {
          console.error('[TenantSwitcher] Error fetching tenants:', tenantsError);
          return;
        }

        setAvailableTenants(tenants || []);
        console.log('[TenantSwitcher] Available tenants:', tenants);
      } catch (error) {
        console.error('[TenantSwitcher] Unexpected error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTenants();
  }, [user]);

  const handleTenantSwitch = (tenantSlug: string) => {
    console.log('[TenantSwitcher] Switching to tenant:', tenantSlug);
    
    // Persist override in all storages
    localStorage.setItem('tenantOverride', tenantSlug);
    sessionStorage.setItem('tenantOverride', tenantSlug);
    document.cookie = `tenantOverride=${encodeURIComponent(tenantSlug)}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
    
    // Update URL with tenant parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', tenantSlug);
    
    // Reload to apply new tenant context
    window.location.href = url.toString();
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
          const isActive = currentTenant?.id === tenant.id;
          
          return (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => !isActive && handleTenantSwitch(tenant.slug)}
              className="cursor-pointer"
              disabled={isActive}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{tenant.name}</span>
                  <span className="text-xs text-muted-foreground">{tenant.slug}</span>
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
