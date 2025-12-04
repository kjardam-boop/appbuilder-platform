-- ============================================================================
-- Add test_payload column to n8n_workflow_mappings
-- Allows saving custom test payloads per workflow mapping
-- ============================================================================

-- Add test_payload column
ALTER TABLE n8n_workflow_mappings 
ADD COLUMN IF NOT EXISTS test_payload JSONB DEFAULT '{}';

-- Add template_key column to link to workflow_templates for input_schema
ALTER TABLE n8n_workflow_mappings 
ADD COLUMN IF NOT EXISTS template_key TEXT;

-- Add comments
COMMENT ON COLUMN n8n_workflow_mappings.test_payload IS 
'Custom test payload JSON for this workflow mapping. Used for test triggers.';

COMMENT ON COLUMN n8n_workflow_mappings.template_key IS 
'Optional reference to workflow_templates.key for input_schema suggestions.';

-- Create index for template_key lookups
CREATE INDEX IF NOT EXISTS idx_workflow_mappings_template_key 
ON n8n_workflow_mappings(template_key) 
WHERE template_key IS NOT NULL;


