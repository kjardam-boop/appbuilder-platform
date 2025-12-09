-- Seed workflow template v2.3.0
-- This version fixes:
-- 1. Relative positions with parent frames
-- 2. geometry with only width (not height) for sticky notes
-- 3. Duplicate trigger issue

INSERT INTO integration_definitions (
  key,
  name,
  description,
  type,
  icon_name,
  is_active,
  default_config,
  tags
) VALUES (
  'prepare-miro-workshop',
  'Prepare Miro Workshop Board v2.3.0',
  'Oppretter et komplett Miro workshop-board med AI-genererte elementer, kategorisert i frames: Kontekst, Smertepunkter, Løsninger og MoSCoW prioritering. v2.3.0 bruker relative posisjoner inne i frames.',
  'workflow',
  'Layout',
  true,
  jsonb_build_object(
    'n8n_workflow_template', 'prepare-miro-workshop-v2.3.0',
    'trigger_type', 'webhook',
    'webhook_path', '/webhook/prepare-miro-workshop',
    'version', '2.3.0',
    'input_schema', jsonb_build_object(
      'project_id', 'string',
      'project_name', 'string',
      'company_name', 'string',
      'description', 'string',
      'ai_elements', 'array'
    ),
    'output_schema', jsonb_build_object(
      'board_id', 'string',
      'board_url', 'string',
      'elements_created', 'number'
    ),
    'required_credentials', ARRAY['miro'],
    'version_history', ARRAY['v2.0.0', 'v2.1.0', 'v2.1.1', 'v2.2.0', 'v2.3.0']
  ),
  ARRAY['workshop', 'miro', 'ai', 'v2.3.0']
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_config = EXCLUDED.default_config,
  tags = EXCLUDED.tags,
  updated_at = now();

COMMENT ON TABLE integration_definitions IS 'Unified integration catalog for workflows, AI providers, MCP tools, and direct APIs. v2.3.0 of prepare-miro-workshop uses relative positioning.';

