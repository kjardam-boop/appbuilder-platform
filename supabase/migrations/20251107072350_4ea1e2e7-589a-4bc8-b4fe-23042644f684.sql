-- Fase 1: Database migrations for autogenererte sider

-- 1.1 Tenant Themes (branding tokens)
CREATE TABLE tenant_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_key TEXT NOT NULL DEFAULT 'default',
  tokens JSONB NOT NULL, -- { primary, accent, surface, textOnSurface, fontStack, logoUrl }
  extracted_from_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, theme_key)
);

-- 1.2 Tenant Pages (Experience JSON storage)
CREATE TABLE tenant_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  experience_json JSONB NOT NULL,
  theme_key TEXT DEFAULT 'default',
  metadata JSONB,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, page_key)
);

-- 1.3 Page Generation Sessions (audit trail)
CREATE TABLE page_generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_prompt TEXT NOT NULL,
  questionnaire_responses JSONB,
  generated_experience JSONB,
  theme_used TEXT,
  tools_called JSONB,
  ai_provider TEXT,
  ai_model TEXT,
  tokens_used INT,
  cost_estimate NUMERIC(10,6),
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 1.4 MCP Tool Registry
CREATE TABLE mcp_tool_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  input_schema JSONB NOT NULL,
  requires_integration BOOLEAN DEFAULT false,
  required_adapter_id TEXT,
  is_platform_tool BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for tenant_themes
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage their themes"
ON tenant_themes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = tenant_themes.tenant_id
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- RLS Policies for tenant_pages
ALTER TABLE tenant_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage pages"
ON tenant_pages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = tenant_pages.tenant_id
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
  )
);

CREATE POLICY "Tenant members can view published pages"
ON tenant_pages
FOR SELECT
USING (
  published = true AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = tenant_pages.tenant_id
  )
);

-- RLS Policies for page_generation_sessions
ALTER TABLE page_generation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view generation sessions"
ON page_generation_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = page_generation_sessions.tenant_id
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- RLS Policies for mcp_tool_registry
ALTER TABLE mcp_tool_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage tools"
ON mcp_tool_registry
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'platform'
      AND user_roles.role IN ('platform_owner', 'platform_support')
  )
);

CREATE POLICY "Authenticated users can view active tools"
ON mcp_tool_registry
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Seed data for MCP Tool Registry
INSERT INTO mcp_tool_registry (tool_key, display_name, description, category, input_schema, requires_integration, is_platform_tool) VALUES
('brand.extractFromSite', 'Extract Brand', 'Extract colors, fonts, and logo from website', 'brand', '{"type":"object","properties":{"url":{"type":"string","format":"uri"}},"required":["url"]}', false, true),
('content.scrape', 'Scrape Content', 'Scrape text content from public web pages', 'content', '{"type":"object","properties":{"urls":{"type":"array","items":{"type":"string","format":"uri"}}},"required":["urls"]}', false, true);

INSERT INTO mcp_tool_registry (tool_key, display_name, description, category, input_schema, requires_integration, required_adapter_id, is_platform_tool) VALUES
('automations.enqueueJob', 'Enqueue n8n Job', 'Trigger an n8n workflow', 'automations', '{"type":"object","properties":{"event":{"type":"string"},"payload":{"type":"object"}},"required":["event","payload"]}', true, 'n8n-mcp', true);

INSERT INTO mcp_tool_registry (tool_key, display_name, description, category, input_schema, requires_integration, required_adapter_id, is_platform_tool) VALUES
('payments.createCheckout', 'Create Checkout', 'Create Stripe checkout session', 'payments', '{"type":"object","properties":{"amount":{"type":"number"},"currency":{"type":"string"},"reference":{"type":"string"}},"required":["amount","currency"]}', true, 'stripe', true),
('payments.getStatus', 'Get Payment Status', 'Check payment status by reference', 'payments', '{"type":"object","properties":{"reference":{"type":"string"}},"required":["reference"]}', true, 'stripe', true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_tenant_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_themes_updated_at
BEFORE UPDATE ON tenant_themes
FOR EACH ROW
EXECUTE FUNCTION update_tenant_themes_updated_at();

CREATE OR REPLACE FUNCTION update_tenant_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_pages_updated_at
BEFORE UPDATE ON tenant_pages
FOR EACH ROW
EXECUTE FUNCTION update_tenant_pages_updated_at();