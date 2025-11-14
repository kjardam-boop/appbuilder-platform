import { ReactNode } from 'react';
import { useTenantTheme } from '../hooks/useTenantTheme';
import { useTenantContext } from '@/hooks/useTenantContext';
import { Loader2 } from 'lucide-react';

interface TenantThemeProviderProps {
  children: ReactNode;
}

/**
 * TenantThemeProvider
 * Loads and applies tenant-specific theme tokens as CSS variables
 * Wraps the app to enable global tenant branding
 * Uses useTenantContext to support tenant override via ?tenant=slug
 */
export function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const context = useTenantContext();
  const { theme, loading } = useTenantTheme(context?.tenant_id);

  // Show minimal loading state only on initial load
  if (loading && !theme) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
