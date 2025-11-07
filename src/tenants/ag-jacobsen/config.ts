import { TenantStaticConfig } from '../types';

const config: TenantStaticConfig = {
  name: 'AG JACOBSEN CONSULTING',
  baseUrl: 'https://www.ag-jacobsen.no',
  apps: {
    jul25: {
      enabled: true,
      routes: {
        app: '/apps/jul25',
        admin: '/apps/jul25-admin',
      },
    },
  },
};

export default config;
