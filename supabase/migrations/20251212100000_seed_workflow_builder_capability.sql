-- Seed workflow-builder capability
-- This capability allows other capabilities to create new n8n workflows dynamically

INSERT INTO capabilities (
  key,
  name,
  description,
  category,
  scope,
  visibility,
  is_core,
  current_version,
  is_active,
  estimated_dev_hours,
  icon_name,
  tags,
  frontend_files,
  backend_files,
  hooks,
  domain_tables,
  output_types,
  input_types,
  destination_config,
  config_schema,
  documentation_path
)
VALUES (
  'workflow-builder',
  'Workflow Builder',
  'Opprett n8n workflows dynamisk fra plattformen. Kan brukes av andre capabilities for å sette opp destinasjoner automatisk.',
  'Integration',
  'platform',
  'internal',  -- Only visible to internal users/admins initially
  false,       -- Not a core capability
  '1.0.0',
  true,
  13,          -- Estimated 13 hours
  'Workflow',
  ARRAY['workflow', 'n8n', 'automation', 'integration', 'builder'],
  ARRAY[
    'src/modules/core/capabilities/services/workflowCreatorService.ts',
    'src/modules/core/capabilities/components/CreateWorkflowDialog.tsx'
  ],
  ARRAY[
    'supabase/functions/n8n-sync/index.ts'
  ],
  ARRAY['useWorkflowCreator'],
  ARRAY['integration_definitions'],
  ARRAY['json']::TEXT[],           -- Outputs workflow configuration
  ARRAY['json', 'text']::TEXT[],   -- Accepts any JSON config or text name
  '{
    "available_destinations": ["integration"],
    "auto_store": false
  }'::JSONB,
  '{
    "type": "object",
    "properties": {
      "defaultTemplate": {
        "type": "string",
        "enum": ["generic-webhook", "ocr-to-sheets", "invoice-to-erp", "data-transformer"],
        "default": "generic-webhook",
        "title": "Standard mal",
        "description": "Hvilken mal som skal være forhåndsvalgt"
      },
      "allowCustomWorkflows": {
        "type": "boolean",
        "default": true,
        "title": "Tillat egendefinerte workflows",
        "description": "Om brukere kan opprette helt egendefinerte workflows"
      }
    }
  }'::JSONB,
  'docs/capabilities/workflow-builder.md'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  estimated_dev_hours = EXCLUDED.estimated_dev_hours,
  frontend_files = EXCLUDED.frontend_files,
  backend_files = EXCLUDED.backend_files,
  tags = EXCLUDED.tags,
  output_types = EXCLUDED.output_types,
  input_types = EXCLUDED.input_types,
  destination_config = EXCLUDED.destination_config,
  config_schema = EXCLUDED.config_schema,
  documentation_path = EXCLUDED.documentation_path,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE capabilities IS 'Capability catalog - workflow-builder added for dynamic n8n workflow creation';

