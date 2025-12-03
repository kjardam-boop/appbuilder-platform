-- Seed integration_definitions with core integrations
-- This replaces the runtime fallback to external_systems

-- 1. AI Providers (type = 'ai_provider')
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, is_active)
VALUES 
  ('openai', 'OpenAI', 'GPT-4, GPT-3.5, DALL-E og Whisper', 'ai_provider', 'Brain', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('anthropic', 'Anthropic', 'Claude AI modeller', 'ai_provider', 'MessageSquare', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('google-ai', 'Google AI', 'Gemini og PaLM modeller', 'ai_provider', 'Sparkles', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('azure-openai', 'Azure OpenAI', 'OpenAI modeller via Azure', 'ai_provider', 'Cloud', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}, {"name": "endpoint", "label": "Azure Endpoint", "type": "text", "required": true}, {"name": "deployment_id", "label": "Deployment ID", "type": "text", "required": true}]'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  icon_name = EXCLUDED.icon_name,
  credential_fields = EXCLUDED.credential_fields,
  updated_at = NOW();

-- 2. Workflow automation (type = 'workflow')  
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, default_config, is_active)
VALUES 
  ('n8n', 'n8n Automation', 'Workflow automation platform for integrations', 'workflow', 'Workflow', true,
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

-- 3. Direct API integrations (type = 'direct_api')
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

-- 4. Sync existing workflow_templates to integration_definitions
INSERT INTO integration_definitions (
  key, name, description, type, icon_name,
  n8n_workflow_id, n8n_webhook_path, 
  requires_credentials, is_active
)
SELECT 
  COALESCE(wt.key, 'workflow-' || wt.id::text),
  wt.name,
  wt.description,
  'workflow'::text,
  'Workflow',
  wt.n8n_workflow_id,
  wt.n8n_webhook_path,
  wt.required_credentials IS NOT NULL AND array_length(wt.required_credentials, 1) > 0,
  true
FROM workflow_templates wt
WHERE NOT EXISTS (
  SELECT 1 FROM integration_definitions id 
  WHERE id.key = COALESCE(wt.key, 'workflow-' || wt.id::text)
)
ON CONFLICT (key) DO UPDATE SET
  n8n_workflow_id = EXCLUDED.n8n_workflow_id,
  n8n_webhook_path = EXCLUDED.n8n_webhook_path,
  updated_at = NOW();

-- 5. Add comment
COMMENT ON TABLE integration_definitions IS 'Master table for all integration definitions. Types: ai_provider, workflow, direct_api, mcp_tool';

