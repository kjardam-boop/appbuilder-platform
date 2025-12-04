-- ============================================================================
-- Add MCP trigger support to integration_definitions
-- Allows workflows to be triggered via n8n's MCP Server
-- ============================================================================

-- Add mcp_enabled column
ALTER TABLE integration_definitions
ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN DEFAULT FALSE;

-- Add available_trigger_methods column
ALTER TABLE integration_definitions
ADD COLUMN IF NOT EXISTS available_trigger_methods TEXT[] DEFAULT ARRAY['webhook'];

-- Add mcp_description for AI clients
ALTER TABLE integration_definitions
ADD COLUMN IF NOT EXISTS mcp_description TEXT;

-- Comments
COMMENT ON COLUMN integration_definitions.mcp_enabled IS 
  'Whether this workflow is available via n8n MCP Server for AI clients';
  
COMMENT ON COLUMN integration_definitions.available_trigger_methods IS 
  'Available trigger methods: webhook, mcp, schedule, form, chat';
  
COMMENT ON COLUMN integration_definitions.mcp_description IS 
  'Description shown to MCP clients (AI assistants) when listing available workflows';

-- Update existing workflows to have webhook as default trigger method
UPDATE integration_definitions 
SET available_trigger_methods = ARRAY['webhook']
WHERE type = 'workflow' 
  AND (available_trigger_methods IS NULL OR available_trigger_methods = '{}');

-- Set mcp_enabled = true for workflows that have n8n_workflow_id (can be enabled)
-- Note: This doesn't automatically enable MCP, just sets the default based on n8n presence
-- UPDATE integration_definitions 
-- SET mcp_enabled = true
-- WHERE type = 'workflow' AND n8n_workflow_id IS NOT NULL;


