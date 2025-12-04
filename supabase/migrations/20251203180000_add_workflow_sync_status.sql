-- ============================================================================
-- Add sync_status column to integration_definitions
-- Tracks workflow lifecycle: draft → pushed → synced → outdated
-- ============================================================================

-- Add sync_status column
ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'draft';

-- Add check constraint for valid values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'integration_definitions_sync_status_check'
  ) THEN
    ALTER TABLE integration_definitions 
    ADD CONSTRAINT integration_definitions_sync_status_check 
    CHECK (sync_status IN ('draft', 'pushed', 'synced', 'outdated'));
  END IF;
END $$;

-- Update existing workflows that have been synced
UPDATE integration_definitions 
SET sync_status = 'synced' 
WHERE type = 'workflow' 
  AND n8n_workflow_id IS NOT NULL 
  AND workflow_json IS NOT NULL;

-- Update workflows that have n8n_webhook_path but no workflow_json (draft)
UPDATE integration_definitions 
SET sync_status = 'draft' 
WHERE type = 'workflow' 
  AND n8n_workflow_id IS NULL 
  AND workflow_json IS NULL;

-- Add comment
COMMENT ON COLUMN integration_definitions.sync_status IS 
'Workflow sync lifecycle: draft (created on platform), pushed (sent to n8n), synced (master from n8n), outdated (n8n has newer version)';


