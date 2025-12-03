-- Ensure core integration definitions exist
-- This migration ensures that basic integrations are seeded

-- First, verify the type column exists (added in 20251203100000)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'integration_definitions' AND column_name = 'type'
  ) THEN
    ALTER TABLE integration_definitions ADD COLUMN type TEXT DEFAULT 'direct_api';
  END IF;
END $$;

-- Upsert AI Providers
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, is_active)
VALUES 
  ('openai', 'OpenAI', 'GPT-4, GPT-3.5, DALL-E og Whisper', 'ai_provider', 'Brain', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('anthropic', 'Anthropic', 'Claude AI modeller', 'ai_provider', 'MessageSquare', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('google-ai', 'Google AI', 'Gemini og PaLM modeller', 'ai_provider', 'Sparkles', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb, true),
  ('azure-openai', 'Azure OpenAI', 'OpenAI modeller via Azure', 'ai_provider', 'Cloud', true,
   '[{"name": "api_key", "label": "API Key", "type": "secret", "required": true}, {"name": "endpoint", "label": "Azure Endpoint", "type": "text", "required": true}]'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  icon_name = EXCLUDED.icon_name,
  credential_fields = EXCLUDED.credential_fields,
  is_active = true,
  updated_at = NOW();

-- Upsert n8n
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, default_config, is_active)
VALUES 
  ('n8n', 'n8n Automation', 'Workflow automation platform', 'workflow', 'Workflow', true,
   '[{"name": "base_url", "label": "n8n Base URL", "type": "text", "required": true}, {"name": "api_key", "label": "API Key", "type": "secret", "required": true}]'::jsonb,
   '{"base_url": "https://jardam.app.n8n.cloud"}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  default_config = EXCLUDED.default_config,
  is_active = true,
  updated_at = NOW();

-- Upsert brreg
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, default_config, is_active)
VALUES 
  ('brreg', 'Brønnøysundregistrene', 'Norsk offentlig register for bedriftsinformasjon', 'direct_api', 'Building2', false,
   '{"base_url": "https://data.brreg.no"}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  default_config = EXCLUDED.default_config,
  is_active = true,
  updated_at = NOW();

-- Upsert Notion
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, is_active)
VALUES 
  ('notion', 'Notion', 'All-in-one workspace for notes and docs', 'direct_api', 'FileText', true,
   '[{"name": "api_key", "label": "Integration Token", "type": "secret", "required": true}]'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  is_active = true,
  updated_at = NOW();

-- Upsert Slack
INSERT INTO integration_definitions (key, name, description, type, icon_name, requires_credentials, credential_fields, is_active)
VALUES 
  ('slack', 'Slack', 'Team communication platform', 'direct_api', 'MessageCircle', true,
   '[{"name": "bot_token", "label": "Bot Token", "type": "secret", "required": true}]'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  is_active = true,
  updated_at = NOW();

-- Log what we have
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM integration_definitions WHERE is_active = true;
  RAISE NOTICE 'integration_definitions now has % active rows', cnt;
END $$;

