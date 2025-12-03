-- ============================================================================
-- Integration Architecture v2
-- Consolidates integration systems with clear type separation
-- Adds hierarchical scope for AI provider selection
-- Enables bi-directional n8n sync
-- ============================================================================

-- 1. Add 'type' column to integration_definitions for clear categorization
ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'direct_api' 
  CHECK (type IN ('ai_provider', 'workflow', 'direct_api', 'mcp_tool'));

-- 2. Add n8n-specific columns to integration_definitions for workflow type
ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT;

ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS n8n_webhook_path TEXT;

ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS workflow_json JSONB;

ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 3. Add scope support to tenant_integrations for hierarchical config
ALTER TABLE tenant_integrations 
ADD COLUMN IF NOT EXISTS scope_type TEXT DEFAULT 'tenant' 
  CHECK (scope_type IN ('platform', 'tenant', 'app', 'capability'));

ALTER TABLE tenant_integrations 
ADD COLUMN IF NOT EXISTS scope_id UUID;

ALTER TABLE tenant_integrations 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- 4. Add index for scope lookups
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_scope 
ON tenant_integrations(scope_type, scope_id);

CREATE INDEX IF NOT EXISTS idx_integration_definitions_type 
ON integration_definitions(type);

-- 5. Comments for documentation
COMMENT ON COLUMN integration_definitions.type IS 'Integration type: ai_provider (OpenAI, etc), workflow (n8n), direct_api (brreg), mcp_tool (MCP protocol)';
COMMENT ON COLUMN integration_definitions.n8n_workflow_id IS 'n8n workflow ID for syncing';
COMMENT ON COLUMN integration_definitions.n8n_webhook_path IS 'Webhook path for triggering workflow';
COMMENT ON COLUMN integration_definitions.workflow_json IS 'Full workflow definition from n8n';
COMMENT ON COLUMN integration_definitions.last_synced_at IS 'Last sync with n8n';

COMMENT ON COLUMN tenant_integrations.scope_type IS 'Scope level: platform (global default), tenant (tenant default), app (per app), capability (per capability)';
COMMENT ON COLUMN tenant_integrations.scope_id IS 'ID of app or capability if scope is app/capability';
COMMENT ON COLUMN tenant_integrations.priority IS 'Priority for resolution (higher = more specific)';

-- 6. Seed AI provider integration definitions
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, is_active)
VALUES 
  ('openai', 'OpenAI', 'GPT-4, GPT-4o, o1, o3 modeller for AI-generering', 'ai_provider', 'Brain', true, 
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('anthropic', 'Anthropic Claude', 'Claude 3.5 Sonnet, Claude 4 for AI-generering', 'ai_provider', 'Brain', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('google_ai', 'Google AI (Gemini)', 'Gemini 2.5 Flash/Pro for AI-generering', 'ai_provider', 'Brain', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('azure_openai', 'Azure OpenAI', 'Azure-hosted OpenAI modeller', 'ai_provider', 'Cloud', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}, {"name": "endpoint", "label": "Endpoint URL", "type": "text", "required": true}, {"name": "deployment", "label": "Deployment Name", "type": "text", "required": true}]'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  icon_name = EXCLUDED.icon_name,
  credential_fields = EXCLUDED.credential_fields,
  updated_at = NOW();

-- 7. Seed n8n as MCP tool integration
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, default_config, is_active)
VALUES 
  ('n8n', 'n8n Automation', 'Workflow automation platform for integrations', 'mcp_tool', 'Workflow', true,
   '[{"name": "base_url", "label": "n8n Base URL", "type": "text", "required": true}, {"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb,
   '{"base_url": "https://jardam.app.n8n.cloud"}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  icon_name = EXCLUDED.icon_name,
  credential_fields = EXCLUDED.credential_fields,
  default_config = EXCLUDED.default_config,
  updated_at = NOW();

-- 8. Seed brreg as direct_api integration
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, default_config, is_active)
VALUES 
  ('brreg', 'Brønnøysundregistrene', 'Norsk offentlig register for bedriftsinformasjon', 'direct_api', 'Building2', false,
   '{"base_url": "https://data.brreg.no"}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  icon_name = EXCLUDED.icon_name,
  default_config = EXCLUDED.default_config,
  updated_at = NOW();

-- 9. Update existing integrations to correct type based on delivery method
UPDATE integration_definitions 
SET type = 'direct_api'
WHERE type IS NULL OR type = 'direct_api';

-- 9. Migrate workflow_templates to integration_definitions (type='workflow')
INSERT INTO integration_definitions (
  key, name, description, type, icon_name,
  n8n_workflow_id, n8n_webhook_path, 
  requires_credentials, is_active
)
SELECT 
  wt.key,
  wt.name,
  wt.description,
  'workflow',
  'Workflow',
  wt.n8n_workflow_id,
  wt.n8n_webhook_path,
  true,
  wt.is_active
FROM workflow_templates wt
WHERE NOT EXISTS (
  SELECT 1 FROM integration_definitions WHERE key = wt.key
)
ON CONFLICT (key) DO UPDATE SET
  n8n_workflow_id = EXCLUDED.n8n_workflow_id,
  n8n_webhook_path = EXCLUDED.n8n_webhook_path,
  type = 'workflow',
  updated_at = NOW();

-- 10. Create view for hierarchical integration resolution
CREATE OR REPLACE VIEW v_effective_integrations AS
WITH ranked_integrations AS (
  SELECT 
    ti.*,
    id.name AS integration_name,
    id.type AS integration_type,
    id.icon_name,
    ROW_NUMBER() OVER (
      PARTITION BY ti.tenant_id, ti.adapter_id 
      ORDER BY 
        CASE ti.scope_type 
          WHEN 'capability' THEN 4
          WHEN 'app' THEN 3
          WHEN 'tenant' THEN 2
          WHEN 'platform' THEN 1
        END DESC,
        ti.priority DESC
    ) AS rank
  FROM tenant_integrations ti
  LEFT JOIN integration_definitions id ON id.key = ti.adapter_id
  WHERE ti.is_active = true
)
SELECT * FROM ranked_integrations WHERE rank = 1;

COMMENT ON VIEW v_effective_integrations IS 'Resolves the effective integration config using hierarchical scope (capability > app > tenant > platform)';

-- 11. Function to get effective AI provider for a context
CREATE OR REPLACE FUNCTION get_effective_ai_provider(
  p_tenant_id UUID,
  p_app_id UUID DEFAULT NULL,
  p_capability_key TEXT DEFAULT NULL
) RETURNS TABLE (
  adapter_id TEXT,
  config JSONB,
  credentials JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.adapter_id,
    ti.config,
    ti.credentials
  FROM tenant_integrations ti
  JOIN integration_definitions id ON id.key = ti.adapter_id
  WHERE id.type = 'ai_provider'
    AND ti.is_active = true
    AND (
      -- Capability scope (highest priority)
      (ti.scope_type = 'capability' AND ti.scope_id = (
        SELECT c.id FROM capabilities c WHERE c.key = p_capability_key
      ))
      -- App scope
      OR (ti.scope_type = 'app' AND ti.scope_id = p_app_id)
      -- Tenant scope
      OR (ti.scope_type = 'tenant' AND ti.tenant_id = p_tenant_id)
      -- Platform scope (lowest priority)
      OR ti.scope_type = 'platform'
    )
  ORDER BY 
    CASE ti.scope_type 
      WHEN 'capability' THEN 4
      WHEN 'app' THEN 3
      WHEN 'tenant' THEN 2
      WHEN 'platform' THEN 1
    END DESC,
    ti.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_effective_ai_provider IS 'Returns the most specific AI provider config for given context (capability > app > tenant > platform)';

