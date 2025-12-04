-- ============================================================================
-- Add test webhook path to n8n_workflow_mappings
-- Allows separate test/production URLs for each workflow mapping
-- ============================================================================

-- Add test webhook path column
ALTER TABLE n8n_workflow_mappings 
ADD COLUMN IF NOT EXISTS webhook_path_test TEXT;

-- Add use_test_mode column to track current mode
ALTER TABLE n8n_workflow_mappings 
ADD COLUMN IF NOT EXISTS use_test_mode BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN n8n_workflow_mappings.webhook_path_test IS 
'Test webhook path (typically /webhook-test/...). Used when use_test_mode is true.';

COMMENT ON COLUMN n8n_workflow_mappings.use_test_mode IS 
'When true, use webhook_path_test instead of webhook_path for triggers.';


