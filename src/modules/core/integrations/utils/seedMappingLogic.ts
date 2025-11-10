/**
 * Data mapping utilities for migrating external_systems to integration_definitions
 * These pure functions can be used in seed scripts and sync operations
 */

export interface ExternalSystemCapabilities {
  rest_api?: boolean;
  oauth2?: boolean;
  webhooks?: boolean;
  sso?: boolean;
  scim?: boolean;
  mcp_connector?: boolean;
  file_export?: boolean;
  email_parse?: boolean;
  zapier_app?: boolean;
  n8n_node?: boolean;
  pipedream_support?: boolean;
  graphql?: boolean;
  ai_plugins?: boolean;
  event_subscriptions?: boolean;
  ip_allowlist?: boolean;
  rate_limits?: any;
}

export interface ExternalSystemData {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category_id?: string;
  vendor_id?: string;
  api_docs_url?: string;
  website?: string;
  status?: string;
  deployment_models?: string[];
  localizations?: string[];
  compliances?: string[];
  pricing_model?: string;
  app_types?: string[];
  rest_api?: boolean;
  oauth2?: boolean;
  webhooks?: boolean;
  graphql?: boolean;
  sso?: boolean;
  scim?: boolean;
  mcp_connector?: boolean;
  file_export?: boolean;
  email_parse?: boolean;
  zapier_app?: boolean;
  n8n_node?: boolean;
  pipedream_support?: boolean;
  ai_plugins?: boolean;
  event_subscriptions?: boolean;
  ip_allowlist?: boolean;
  rate_limits?: any;
}

/**
 * Maps external_systems boolean capabilities to integration delivery method keys
 */
export function mapCapabilitiesToDeliveryMethods(
  capabilities: ExternalSystemCapabilities
): string[] {
  const methods: string[] = [];
  
  if (capabilities.rest_api) methods.push('rest_api');
  if (capabilities.oauth2) methods.push('oauth2');
  if (capabilities.webhooks) methods.push('webhook');
  if (capabilities.sso) methods.push('sso');
  if (capabilities.mcp_connector) methods.push('mcp');
  if (capabilities.file_export) methods.push('file_export');
  if (capabilities.email_parse) methods.push('email_parse');
  if (capabilities.zapier_app || capabilities.n8n_node || capabilities.pipedream_support) {
    methods.push('ipaas');
  }
  
  return methods;
}

/**
 * Determines the default delivery method based on priority order
 * Priority: MCP > REST API > OAuth2 > Webhook > iPaaS > File Export
 */
export function getDefaultDeliveryMethod(
  capabilities: ExternalSystemCapabilities
): string | null {
  if (capabilities.mcp_connector) return 'mcp';
  if (capabilities.rest_api) return 'rest_api';
  if (capabilities.oauth2) return 'oauth2';
  if (capabilities.webhooks) return 'webhook';
  if (capabilities.zapier_app) return 'ipaas';
  if (capabilities.file_export) return 'file_export';
  return null;
}

/**
 * Transforms an external_system record to integration_definition format
 */
export function transformExternalSystemToDefinition(system: ExternalSystemData) {
  const supportedMethods = mapCapabilitiesToDeliveryMethods(system);
  const defaultMethod = getDefaultDeliveryMethod(system);

  return {
    key: system.slug,
    name: system.name,
    description: system.description || null,
    category_id: system.category_id || null,
    vendor_id: system.vendor_id || null,
    external_system_id: system.id,
    supported_delivery_methods: supportedMethods,
    default_delivery_method: defaultMethod,
    icon_name: 'Plug',
    documentation_url: system.api_docs_url || null,
    setup_guide_url: system.website || null,
    requires_credentials: !!(system.rest_api || system.oauth2 || system.webhooks),
    credential_fields: [],
    default_config: {
      deployment_models: system.deployment_models || [],
      localizations: system.localizations || [],
      compliances: system.compliances || [],
      pricing_model: system.pricing_model || null,
    },
    capabilities: {
      rest_api: !!system.rest_api,
      oauth2: !!system.oauth2,
      webhooks: !!system.webhooks,
      graphql: !!system.graphql,
      sso: !!system.sso,
      scim: !!system.scim,
      mcp_connector: !!system.mcp_connector,
      file_export: !!system.file_export,
      email_parse: !!system.email_parse,
      zapier_app: !!system.zapier_app,
      n8n_node: !!system.n8n_node,
      pipedream_support: !!system.pipedream_support,
      ai_plugins: !!system.ai_plugins,
      event_subscriptions: !!system.event_subscriptions,
      ip_allowlist: !!system.ip_allowlist,
      rate_limits: system.rate_limits || null,
    },
    tags: system.app_types || [],
    is_active: system.status === 'Active',
  };
}

/**
 * Delivery method metadata for reference
 */
export const DELIVERY_METHOD_METADATA = [
  {
    key: 'rest_api',
    name: 'REST API',
    description: 'Direct API calls from client or server',
    icon_name: 'Globe',
    requires_server: false,
    requires_credentials: true,
    typical_use_cases: ['Real-time data sync', 'CRUD operations'],
    sort_order: 1,
  },
  {
    key: 'webhook',
    name: 'Webhook',
    description: 'Event-driven push notifications',
    icon_name: 'Webhook',
    requires_server: true,
    requires_credentials: true,
    typical_use_cases: ['Real-time updates', 'Event notifications'],
    sort_order: 2,
  },
  {
    key: 'oauth2',
    name: 'OAuth 2.0',
    description: 'Secure delegated authorization',
    icon_name: 'Key',
    requires_server: false,
    requires_credentials: true,
    typical_use_cases: ['User authorization', 'Third-party access'],
    sort_order: 3,
  },
  {
    key: 'mcp',
    name: 'MCP Protocol',
    description: 'Model Context Protocol integration',
    icon_name: 'Boxes',
    requires_server: false,
    requires_credentials: true,
    typical_use_cases: ['AI workflows', 'Context sharing'],
    sort_order: 4,
  },
  {
    key: 'file_export',
    name: 'File Export',
    description: 'Batch file downloads and imports',
    icon_name: 'FileDown',
    requires_server: false,
    requires_credentials: false,
    typical_use_cases: ['Batch processing', 'Data migration'],
    sort_order: 5,
  },
  {
    key: 'email_parse',
    name: 'Email Parsing',
    description: 'Extract data from emails',
    icon_name: 'Mail',
    requires_server: true,
    requires_credentials: false,
    typical_use_cases: ['Invoice processing', 'Order capture'],
    sort_order: 6,
  },
  {
    key: 'rpa',
    name: 'RPA/Scraping',
    description: 'Robotic Process Automation',
    icon_name: 'Bot',
    requires_server: true,
    requires_credentials: true,
    typical_use_cases: ['Legacy systems', 'No API available'],
    sort_order: 7,
  },
  {
    key: 'ipaas',
    name: 'iPaaS/Zapier',
    description: 'Third-party integration platform',
    icon_name: 'Workflow',
    requires_server: false,
    requires_credentials: true,
    typical_use_cases: ['No-code workflows', 'Multi-step automation'],
    sort_order: 8,
  },
  {
    key: 'sso',
    name: 'SSO/SAML',
    description: 'Single Sign-On authentication',
    icon_name: 'Shield',
    requires_server: false,
    requires_credentials: true,
    typical_use_cases: ['User authentication', 'Identity federation'],
    sort_order: 9,
  },
] as const;
