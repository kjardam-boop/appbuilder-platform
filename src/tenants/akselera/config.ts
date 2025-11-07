import { TenantStaticConfig } from '../types';

const config: TenantStaticConfig = {
  name: 'Akselera Norway AS',
  baseUrl: 'https://www.akselera.com',
  themeOverrides: {
    // Optional: override brand extractor results
  },
  routes: {
    home: '/akselera/demo',
  },
};

export default config;
