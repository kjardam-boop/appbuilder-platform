-- Force cleanup of duplicate workflow entries
-- This migration aggressively deactivates duplicate workflows

-- 1. Deactivate workflows with 'board' suffix (duplicates of prepare-miro-workshop)
UPDATE integration_definitions
SET is_active = false, 
    updated_at = NOW(),
    description = CASE 
      WHEN description IS NULL OR description = '' 
      THEN 'DEPRECATED: Duplicate workflow' 
      ELSE 'DEPRECATED: ' || description 
    END
WHERE key = 'prepare-miro-workshop-board'
  AND type = 'workflow';

-- 2. Deactivate ALL workflows with 'copy' in the key
UPDATE integration_definitions
SET is_active = false,
    updated_at = NOW(),
    description = CASE 
      WHEN description IS NULL OR description = '' 
      THEN 'DEPRECATED: Copy of workflow' 
      ELSE 'DEPRECATED: ' || description 
    END
WHERE key LIKE '%copy%'
  AND type = 'workflow';

-- 3. Log what we have now (for debugging)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Current workflow state after cleanup:';
  FOR rec IN 
    SELECT key, name, is_active, sync_status 
    FROM integration_definitions 
    WHERE type = 'workflow'
    ORDER BY key
  LOOP
    RAISE NOTICE '  % | active: % | status: %', rec.key, rec.is_active, rec.sync_status;
  END LOOP;
END $$;

