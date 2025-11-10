-- Fix migration: remove unsupported IF NOT EXISTS on CREATE POLICY and ensure idempotency
-- 1) Tables
CREATE TABLE IF NOT EXISTS public.integration_delivery_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Zap',
  requires_server BOOLEAN DEFAULT false,
  requires_credentials BOOLEAN DEFAULT true,
  typical_use_cases TEXT[],
  documentation_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.app_categories(id),
  vendor_id UUID REFERENCES public.external_system_vendors(id),
  external_system_id UUID REFERENCES public.external_systems(id),
  supported_delivery_methods TEXT[] NOT NULL DEFAULT '{}',
  default_delivery_method TEXT,
  icon_name TEXT DEFAULT 'Plug',
  documentation_url TEXT,
  setup_guide_url TEXT,
  requires_credentials BOOLEAN DEFAULT true,
  credential_fields JSONB DEFAULT '[]',
  default_config JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_integration_definitions_category ON public.integration_definitions(category_id);
CREATE INDEX IF NOT EXISTS idx_integration_definitions_vendor ON public.integration_definitions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_integration_definitions_external_system ON public.integration_definitions(external_system_id);
CREATE INDEX IF NOT EXISTS idx_integration_definitions_key ON public.integration_definitions(key);
CREATE INDEX IF NOT EXISTS idx_integration_delivery_methods_key ON public.integration_delivery_methods(key);

-- 3) RLS
ALTER TABLE public.integration_delivery_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_definitions ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then recreate (CREATE POLICY doesn't support IF NOT EXISTS)
DROP POLICY IF EXISTS delivery_methods_select ON public.integration_delivery_methods;
DROP POLICY IF EXISTS delivery_methods_admin ON public.integration_delivery_methods;
DROP POLICY IF EXISTS definitions_select ON public.integration_definitions;
DROP POLICY IF EXISTS definitions_admin ON public.integration_definitions;

CREATE POLICY delivery_methods_select
  ON public.integration_delivery_methods
  FOR SELECT
  USING (is_active = true);

CREATE POLICY delivery_methods_admin
  ON public.integration_delivery_methods
  FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY definitions_select
  ON public.integration_definitions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY definitions_admin
  ON public.integration_definitions
  FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- 4) Seed delivery methods
INSERT INTO public.integration_delivery_methods (key, name, description, icon_name, requires_server, requires_credentials, typical_use_cases, sort_order)
VALUES
  ('rest_api', 'REST API', 'Direct API calls', 'Globe', false, true, ARRAY['Real-time data sync','CRUD operations'], 1),
  ('webhook', 'Webhook', 'Event-driven push', 'Webhook', true, true, ARRAY['Real-time updates','Event notifications'], 2),
  ('oauth2', 'OAuth 2.0', 'Secure authorization', 'Key', false, true, ARRAY['User authorization','Third-party access'], 3),
  ('mcp', 'MCP Protocol', 'Model Context Protocol', 'Boxes', false, true, ARRAY['AI workflows','Context sharing'], 4),
  ('file_export', 'File Export', 'Batch file processing', 'FileDown', false, false, ARRAY['Batch processing','Data migration'], 5),
  ('email_parse', 'Email Parsing', 'Extract data from emails', 'Mail', true, false, ARRAY['Invoice processing','Order capture'], 6),
  ('rpa', 'RPA/Scraping', 'Robotic automation', 'Bot', true, true, ARRAY['Legacy systems','No API available'], 7),
  ('ipaas', 'iPaaS/Zapier', 'Integration platform', 'Workflow', false, true, ARRAY['No-code workflows','Multi-step automation'], 8),
  ('sso', 'SSO/SAML', 'Single Sign-On', 'Shield', false, true, ARRAY['User authentication','Identity federation'], 9)
ON CONFLICT (key) DO NOTHING;

-- 5) Seed integration_definitions from external_systems (idempotent)
INSERT INTO public.integration_definitions (
  key,
  name,
  description,
  category_id,
  vendor_id,
  external_system_id,
  supported_delivery_methods,
  default_delivery_method,
  icon_name,
  documentation_url,
  setup_guide_url,
  requires_credentials,
  default_config,
  capabilities,
  tags,
  is_active
)
SELECT 
  es.slug,
  es.name,
  es.description,
  es.category_id,
  es.vendor_id,
  es.id,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN es.rest_api THEN 'rest_api' END,
    CASE WHEN es.oauth2 THEN 'oauth2' END,
    CASE WHEN es.webhooks THEN 'webhook' END,
    CASE WHEN es.sso THEN 'sso' END,
    CASE WHEN es.mcp_connector THEN 'mcp' END,
    CASE WHEN es.file_export THEN 'file_export' END,
    CASE WHEN es.email_parse THEN 'email_parse' END,
    CASE WHEN es.zapier_app THEN 'ipaas' END
  ], NULL) AS supported_delivery_methods,
  CASE 
    WHEN es.mcp_connector THEN 'mcp'
    WHEN es.rest_api THEN 'rest_api'
    WHEN es.oauth2 THEN 'oauth2'
    WHEN es.webhooks THEN 'webhook'
    WHEN es.zapier_app THEN 'ipaas'
    WHEN es.file_export THEN 'file_export'
    ELSE NULL
  END AS default_delivery_method,
  'Plug' AS icon_name,
  es.api_docs_url,
  es.website,
  (es.rest_api OR es.oauth2 OR es.webhooks) AS requires_credentials,
  jsonb_build_object(
    'deployment_models', es.deployment_models,
    'localizations', es.localizations,
    'compliances', es.compliances,
    'pricing_model', es.pricing_model
  ) AS default_config,
  jsonb_build_object(
    'rest_api', es.rest_api,
    'oauth2', es.oauth2,
    'webhooks', es.webhooks,
    'graphql', es.graphql,
    'sso', es.sso,
    'scim', es.scim,
    'mcp_connector', es.mcp_connector,
    'file_export', es.file_export,
    'email_parse', es.email_parse,
    'zapier_app', es.zapier_app,
    'n8n_node', es.n8n_node,
    'pipedream_support', es.pipedream_support,
    'ai_plugins', es.ai_plugins,
    'event_subscriptions', es.event_subscriptions,
    'ip_allowlist', es.ip_allowlist,
    'rate_limits', es.rate_limits
  ) AS capabilities,
  COALESCE(es.app_types, '{}') AS tags,
  (es.status = 'Active') AS is_active
FROM public.external_systems es
ON CONFLICT (key) DO NOTHING;