-- Add AI Chat app definition
-- This registers AI Chat as an available application in the platform

INSERT INTO app_definitions (
  key,
  name,
  app_type,
  icon_name,
  description,
  domain_tables,
  shared_tables,
  is_active,
  schema_version
) VALUES (
  'ai-chat',
  'AI Chat Assistent',
  'utility',
  'Bot',
  'Intelligent AI-assistent med tilgang til plattformens data via MCP-verktøy. Kan hjelpe med selskaper, prosjekter, oppgaver og mer.',
  ARRAY['ai_usage_logs', 'ai_policies', 'ai_app_content_library']::text[],
  ARRAY['companies', 'projects', 'tasks', 'external_systems']::text[],
  true,
  '1.0.0'
);

-- Add comment explaining the app
COMMENT ON TABLE app_definitions IS 'AI Chat app provides intelligent assistance with MCP tool access to platform data';
