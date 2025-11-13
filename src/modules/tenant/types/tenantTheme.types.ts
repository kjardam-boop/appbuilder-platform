import { BaseEntity } from "@/core/types/common.types";

/**
 * Tenant Theme
 * Branding and styling configuration per tenant
 */
export interface TenantTheme extends BaseEntity {
  tenant_id: string;
  theme_key: string;
  tokens: TenantThemeTokens;
  is_active: boolean;
  extracted_from_url: string | null;
}

/**
 * Theme Tokens
 * Design tokens for tenant branding
 */
export interface TenantThemeTokens {
  primary: string;
  accent: string;
  secondary: string;
  surface: string;
  textOnSurface: string;
  destructive: string;
  success: string;
  warning: string;
  muted: string;
  fontStack: string;
  logoUrl: string;
}

/**
 * CSS Variable Mapping
 * Maps theme tokens to CSS custom properties
 */
export const THEME_TOKEN_CSS_MAP: Record<keyof Omit<TenantThemeTokens, 'logoUrl' | 'fontStack'>, string> = {
  primary: '--primary',
  accent: '--accent',
  secondary: '--secondary',
  surface: '--card',
  textOnSurface: '--foreground',
  destructive: '--destructive',
  success: '--success',
  warning: '--warning',
  muted: '--muted',
};
