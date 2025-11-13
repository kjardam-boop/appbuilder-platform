import { ReactNode, useEffect } from 'react';
import { useTenantTheme } from '../hooks/useTenantTheme';
import { Loader2 } from 'lucide-react';

interface TenantThemeProviderProps {
  children: ReactNode;
}

/**
 * TenantThemeProvider
 * Loads and applies tenant-specific theme tokens as CSS variables
 * Wraps the app to enable global tenant branding
 */
export function TenantThemeProvider({ children }: TenantThemeProviderProps) {
  const { theme, loading } = useTenantTheme();

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
