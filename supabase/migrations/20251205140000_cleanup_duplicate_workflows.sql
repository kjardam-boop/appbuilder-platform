-- Cleanup duplicate workflow entries in integration_definitions
-- Issue: Multiple entries for same n8n workflow with different keys

-- 1. First, let's identify the correct workflow to keep
-- We want to keep ONE entry per n8n_workflow_id, preferring the one with key 'prepare-miro-workshop'

-- List current state (for debugging - can be removed)
-- SELECT id, key, name, n8n_workflow_id, n8n_webhook_path, sync_status, is_active 
-- FROM integration_definitions 
-- WHERE type = 'workflow' AND name ILIKE '%miro%workshop%';

-- 2. Deactivate duplicate entries, keep the one with the most commonly used key
-- Keep 'prepare-miro-workshop' as the canonical key

-- Deactivate 'prepare-miro-workshop-board' if 'prepare-miro-workshop' exists
UPDATE integration_definitions
SET is_active = false, 
    updated_at = NOW(),
    description = 'DEPRECATED: Duplicate of prepare-miro-workshop. ' || COALESCE(description, '')
WHERE key = 'prepare-miro-workshop-board'
  AND type = 'workflow'
  AND EXISTS (
    SELECT 1 FROM integration_definitions 
    WHERE key = 'prepare-miro-workshop' AND type = 'workflow'
  );

-- Deactivate any 'copy' versions
UPDATE integration_definitions
SET is_active = false,
    updated_at = NOW(),
    description = 'DEPRECATED: Copy workflow. ' || COALESCE(description, '')
WHERE key LIKE '%copy%'
  AND type = 'workflow';

-- 3. Ensure the canonical 'prepare-miro-workshop' entry has correct webhook path
UPDATE integration_definitions
SET n8n_webhook_path = '/webhook/prepare-miro-workshop',
    updated_at = NOW()
WHERE key = 'prepare-miro-workshop'
  AND type = 'workflow';

-- 4. If no 'prepare-miro-workshop' exists but 'prepare-miro-workshop-board' does,
-- update the key to be canonical
UPDATE integration_definitions
SET key = 'prepare-miro-workshop',
    updated_at = NOW()
WHERE key = 'prepare-miro-workshop-board'
  AND type = 'workflow'
  AND is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM integration_definitions 
    WHERE key = 'prepare-miro-workshop' AND type = 'workflow'
  );

-- 5. Add comment for future reference
COMMENT ON TABLE integration_definitions IS 
  'Unified integration catalog. For n8n workflows, use consistent key naming without -board suffix. 
   Canonical workshop key: prepare-miro-workshop';

-- 6. Create a unique partial index to prevent future duplicates
-- Only one active workflow per webhook path
DROP INDEX IF EXISTS idx_integration_definitions_unique_webhook;
CREATE UNIQUE INDEX idx_integration_definitions_unique_webhook 
ON integration_definitions (n8n_webhook_path) 
WHERE type = 'workflow' AND is_active = true AND n8n_webhook_path IS NOT NULL;

