-- Add AI Chat app definition
-- This registers AI Chat as an available application in the platform

-- First check if it already exists and delete if so (for re-running)
DELETE FROM app_definitions WHERE key = 'ai-chat';

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
  'core',
  'Bot',
  'Intelligent AI-assistent med tilgang til plattformens data via MCP-verktøy. Kan hjelpe med selskaper, prosjekter, oppgaver og mer.',
  ARRAY['ai_usage_logs', 'ai_policies', 'ai_app_content_library'],
  ARRAY['companies', 'projects', 'tasks', 'external_systems'],
  true,
  '1.0.0'
);
