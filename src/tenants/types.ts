/**
 * Static tenant configuration for development and demos
 */
export interface TenantStaticConfig {
  name: string;
  baseUrl: string;
  themeOverrides?: {
    primary?: string;
    accent?: string;
    surface?: string;
    textOnSurface?: string;
    fontStack?: string;
    logoUrl?: string;
  };
  routes?: {
    home?: string;
    [key: string]: string | undefined;
  };
  apps?: {
    [appKey: string]: {
      enabled: boolean;
      routes: Record<string, string>;
    };
  };
}
