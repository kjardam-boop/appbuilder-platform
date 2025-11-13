import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TenantTheme, TenantThemeTokens } from '../types/tenantTheme.types';
import { resolveTenantByHost } from '../services/tenantResolver';

/**
 * Hook to load and apply tenant theme
 * Fetches active theme for current tenant and injects CSS variables
 */
export function useTenantTheme() {
  const [theme, setTheme] = useState<TenantTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Resolve current tenant from host
    resolveTenantByHost(window.location.host).then((tenant) => {
      if (tenant) {
        setTenantId(tenant.tenant_id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadTheme();
    }
  }, [tenantId]);

  const loadTheme = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tenant_themes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Failed to load tenant theme:', error);
        setTheme(null);
      } else if (data) {
        setTheme(data as any);
        if (data.tokens) {
          applyThemeTokens(data.tokens as any);
        }
      }
    } catch (error) {
      console.error('Error loading tenant theme:', error);
      setTheme(null);
    } finally {
      setLoading(false);
    }
  };

  return { theme, loading, reload: loadTheme };
}

/**
 * Apply theme tokens as CSS variables to document root
 */
function applyThemeTokens(tokens: TenantThemeTokens) {
  const root = document.documentElement;

  // Map tokens to CSS variables
  if (tokens.primary) {
    root.style.setProperty('--primary', convertToHSL(tokens.primary));
  }
  if (tokens.accent) {
    root.style.setProperty('--accent', convertToHSL(tokens.accent));
  }
  if (tokens.secondary) {
    root.style.setProperty('--secondary', convertToHSL(tokens.secondary));
  }
  if (tokens.surface) {
    root.style.setProperty('--card', convertToHSL(tokens.surface));
  }
  if (tokens.textOnSurface) {
    root.style.setProperty('--foreground', convertToHSL(tokens.textOnSurface));
  }
  if (tokens.destructive) {
    root.style.setProperty('--destructive', convertToHSL(tokens.destructive));
  }
  if (tokens.success) {
    root.style.setProperty('--success', convertToHSL(tokens.success));
  }
  if (tokens.warning) {
    root.style.setProperty('--warning', convertToHSL(tokens.warning));
  }
  if (tokens.muted) {
    root.style.setProperty('--muted', convertToHSL(tokens.muted));
  }
  if (tokens.fontStack) {
    root.style.setProperty('--font-sans', tokens.fontStack);
  }
}

/**
 * Convert color to HSL format if needed
 * Supports: hex, rgb, rgba, hsl formats
 */
function convertToHSL(color: string): string {
  if (!color) return '';

  // Already in HSL format (e.g., "220 13% 91%" or "hsl(220, 13%, 91%)")
  if (color.includes(' ') && !color.startsWith('hsl') && !color.startsWith('rgb')) {
    return color;
  }

  // Remove hsl() wrapper if present
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\(([\\d\\s,%]+)\)/);
    if (match) {
      return match[1].replace(/,/g, '').replace(/%/g, '%');
    }
  }

  // For hex/rgb colors, we'll keep them as-is and let CSS handle it
  // In production, you might want to use a color conversion library
  return color;
}
