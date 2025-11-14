import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TenantTheme, TenantThemeTokens } from '../types/tenantTheme.types';

/**
 * Hook to load and apply tenant theme
 * Fetches active theme for current tenant and injects CSS variables
 * @param tenantId - Optional tenant ID to load theme for. If not provided, no theme is loaded.
 */
export function useTenantTheme(tenantId?: string | null) {
  const [theme, setTheme] = useState<TenantTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, [tenantId]);

  const loadTheme = async () => {
    if (!tenantId) {
      setLoading(false);
      console.info('[TenantTheme] No tenantId provided, skipping theme load');
      return;
    }

    console.info('[TenantTheme] Loading theme for tenant', { tenantId });

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
 * Convert hex color to HSL format
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  // Return in Tailwind format: "217 91% 60%"
  return `${h} ${s}% ${lPercent}%`;
}

/**
 * Convert color to HSL format if needed
 * Supports: hex, rgb, rgba, hsl formats
 */
function convertToHSL(color: string): string {
  if (!color) return '';

  // Already in HSL format (e.g., "220 13% 91%" or "hsl(220, 13%, 91%)")
  if (color.includes(' ') && !color.startsWith('hsl') && !color.startsWith('rgb') && !color.startsWith('#')) {
    return color;
  }

  // Remove hsl() wrapper if present and convert to Tailwind format
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\(([\\d\\s,%]+)\)/);
    if (match) {
      return match[1].replace(/,/g, '').trim();
    }
  }

  // Convert hex to HSL
  if (color.startsWith('#')) {
    return hexToHSL(color);
  }

  // For rgb colors, keep as-is (could add rgb-to-hsl conversion if needed)
  return color;
}
