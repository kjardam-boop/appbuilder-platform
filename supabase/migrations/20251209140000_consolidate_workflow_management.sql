-- ============================================================================
-- Consolidate Workflow Management
-- Single source of truth: integration_definitions with type='workflow'
-- ============================================================================

-- 1. Add version/changelog columns to integration_definitions
ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';

ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS changelog TEXT;

-- 2. Add sync_status for workflow state tracking
ALTER TABLE integration_definitions 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'draft'
  CHECK (sync_status IS NULL OR sync_status IN ('draft', 'pushed', 'synced', 'outdated'));

-- 3. Comments for documentation
COMMENT ON COLUMN integration_definitions.version IS 'Semantic version (e.g., 2.3.0) for workflow templates';
COMMENT ON COLUMN integration_definitions.changelog IS 'Description of changes in this version';
COMMENT ON COLUMN integration_definitions.sync_status IS 'Sync status with n8n: draft, pushed, synced, outdated';

-- 4. Update existing workflows in integration_definitions with data from workflow_templates
-- (Only update, don't try to insert new ones to avoid webhook path conflicts)
UPDATE integration_definitions id
SET 
  workflow_json = COALESCE(wt.workflow_json, id.workflow_json),
  version = COALESCE(wt.version, id.version, '1.0.0'),
  changelog = COALESCE(wt.changelog, id.changelog),
  updated_at = NOW()
FROM workflow_templates wt
WHERE id.key = wt.key 
  AND id.type = 'workflow'
  AND wt.workflow_json IS NOT NULL;

-- 5. Ensure prepare-miro-workshop exists with latest version
INSERT INTO integration_definitions (
  key,
  name,
  description,
  type,
  icon_name,
  n8n_webhook_path,
  version,
  changelog,
  sync_status,
  is_active,
  requires_credentials,
  tags
)
VALUES (
  'prepare-miro-workshop',
  'Prepare Miro Workshop Board',
  'Oppretter et komplett Miro workshop-board med AI-genererte elementer, kategorisert i frames: Kontekst, Smertepunkter, Løsninger og MoSCoW prioritering.',
  'workflow',
  'Layout',
  '/webhook/prepare-miro-workshop',
  '2.3.0',
  'v2.3.0: Fix - Relative posisjoner inne i frames, kun width i geometry, fikset duplikat-trigger',
  'synced',
  true,
  true,
  ARRAY['workflow', 'workshop', 'miro', 'ai']
)
ON CONFLICT (key) DO UPDATE SET
  name = 'Prepare Miro Workshop Board',
  description = EXCLUDED.description,
  version = '2.3.0',
  changelog = EXCLUDED.changelog,
  updated_at = NOW();

-- 6. Create index for workflow lookups
CREATE INDEX IF NOT EXISTS idx_integration_definitions_workflow_type 
ON integration_definitions(type) WHERE type = 'workflow';

