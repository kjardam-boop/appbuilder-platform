-- ============================================================================
-- Migration: Add Integration Capabilities & Enhanced Metadata to app_products
-- ============================================================================

-- Add integration capability flags to app_products
ALTER TABLE public.app_products
ADD COLUMN IF NOT EXISTS rest_api boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS graphql boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS webhooks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS oauth2 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS api_keys boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS event_subscriptions boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rate_limits jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ip_allowlist boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pipedream_support boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS n8n_node boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS zapier_app boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mcp_connector boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS file_export boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_parse boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_plugins boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS scim boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sso boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS api_docs_url text DEFAULT NULL;

-- Add compliance metadata to app_products
ALTER TABLE public.app_products
ADD COLUMN IF NOT EXISTS eu_data_residency boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dual_region boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gdpr_statement_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS privacy_risk_level text DEFAULT 'medium' CHECK (privacy_risk_level IN ('low', 'medium', 'high', 'critical'));

-- Add vendor metadata to app_vendors
ALTER TABLE public.app_vendors
ADD COLUMN IF NOT EXISTS country text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contact_url text DEFAULT NULL;

-- Create index for faster capability queries
CREATE INDEX IF NOT EXISTS idx_app_products_capabilities 
ON public.app_products(rest_api, webhooks, oauth2, mcp_connector) 
WHERE rest_api = true OR webhooks = true OR oauth2 = true OR mcp_connector = true;

-- Create index for compliance queries
CREATE INDEX IF NOT EXISTS idx_app_products_compliance 
ON public.app_products(eu_data_residency, privacy_risk_level);

COMMENT ON COLUMN public.app_products.rest_api IS 'Product supports REST API integration';
COMMENT ON COLUMN public.app_products.webhooks IS 'Product supports webhook events';
COMMENT ON COLUMN public.app_products.oauth2 IS 'Product supports OAuth2 authentication';
COMMENT ON COLUMN public.app_products.mcp_connector IS 'Product has MCP connector available';
COMMENT ON COLUMN public.app_products.privacy_risk_level IS 'GDPR privacy impact assessment level';