import { useTenantContext } from './useTenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

/**
 * Hook to check if current tenant is the platform tenant
 * Platform tenant is the meta-tenant that manages all other tenants
 */
export const useIsPlatformTenant = () => {
  const context = useTenantContext();
  const [isPlatformTenant, setIsPlatformTenant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPlatformTenant = async () => {
      if (!context?.tenant_id) {
        setIsPlatformTenant(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('is_platform_tenant')
          .eq('id', context.tenant_id)
          .maybeSingle();

        if (error) {
          console.error('[useIsPlatformTenant] Error:', error);
          setIsPlatformTenant(false);
        } else {
          setIsPlatformTenant(data?.is_platform_tenant === true);
        }
      } catch (error) {
        console.error('[useIsPlatformTenant] Error:', error);
        setIsPlatformTenant(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPlatformTenant();
  }, [context?.tenant_id]);

  return { isPlatformTenant, isLoading };
};
