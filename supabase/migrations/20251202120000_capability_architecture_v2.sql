-- ============================================================================
-- Capability Architecture v2
-- Adds visibility, is_core, config_schema to capabilities
-- Adds capability_bundles for pre-configured packages
-- Uses existing workflow_templates table for n8n workflows
-- ============================================================================

-- 1. Add new columns to capabilities table
ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' 
  CHECK (visibility IN ('internal', 'partner', 'public'));

ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT false;

ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS config_schema JSONB DEFAULT '{}';

ALTER TABLE capabilities 
ADD COLUMN IF NOT EXISTS preview_bundle_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN capabilities.visibility IS 'Who can see this capability: internal (platform team only), partner (partners + internal), public (all customers)';
COMMENT ON COLUMN capabilities.is_core IS 'If true, this capability is always included in customer apps and cannot be removed';
COMMENT ON COLUMN capabilities.config_schema IS 'JSON Schema for capability configuration options';
COMMENT ON COLUMN capabilities.preview_bundle_url IS 'URL to the preview/demo bundle for this capability';

-- 2. Create capability bundles table (composite capabilities)
CREATE TABLE IF NOT EXISTS capability_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',  -- Array of capability keys
  suggested_config JSONB DEFAULT '{}',
  target_industries TEXT[] DEFAULT '{}',
  price_per_month DECIMAL(10,2),
  icon_name TEXT DEFAULT 'Package',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on capability_bundles
ALTER TABLE capability_bundles ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read bundles
CREATE POLICY "capability_bundles_read_policy" ON capability_bundles
  FOR SELECT USING (true);

-- Policy: Only platform admins can modify bundles
CREATE POLICY "capability_bundles_write_policy" ON capability_bundles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('platform_owner', 'platform_admin')
    )
  );

COMMENT ON TABLE capability_bundles IS 'Pre-configured bundles of capabilities that work well together';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_capabilities_visibility ON capabilities(visibility);
CREATE INDEX IF NOT EXISTS idx_capabilities_is_core ON capabilities(is_core);
CREATE INDEX IF NOT EXISTS idx_capability_bundles_key ON capability_bundles(key);

-- 4. Update existing capabilities with visibility based on category
-- Platform capabilities -> internal
UPDATE capabilities 
SET visibility = 'internal'
WHERE key IN (
  'tenant-management',
  'permissions-rbac',
  'app-builder-platform',
  'capabilities-catalog'
);

-- Partner capabilities -> partner
UPDATE capabilities 
SET visibility = 'partner'
WHERE key IN (
  'user-roles-management',
  'compliance-gdpr',
  'erp-system-management',
  'supplier-evaluation'
);

-- Everything else stays public (default)

-- 5. Seed initial capability bundles
INSERT INTO capability_bundles (key, name, description, capabilities, target_industries, icon_name) VALUES
  ('crm-starter', 'CRM Starter Pack', 'Essential capabilities for customer relationship management', 
   ARRAY['company-management', 'opportunity-pipeline', 'task-management'], 
   ARRAY['all'], 'Users'),
  ('project-suite', 'Project Management Suite', 'Complete project management with tasks and documents',
   ARRAY['project-management', 'task-management', 'document-management', 'calendar-view'],
   ARRAY['consulting', 'technology'], 'FolderKanban'),
  ('ai-toolkit', 'AI Toolkit', 'AI-powered text generation and chat capabilities',
   ARRAY['ai-text-generation'],
   ARRAY['all'], 'Sparkles')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  target_industries = EXCLUDED.target_industries,
  icon_name = EXCLUDED.icon_name,
  updated_at = NOW();

-- 6. Add integration workflows to existing workflow_templates table
-- (Uses workflow_templates from 20251126000001_workshop_integration.sql)
INSERT INTO workflow_templates (key, name, description, category, n8n_webhook_path, required_systems, is_system)
VALUES 
  ('sync-odoo-companies', 'Sync Odoo Companies', 
   'Synchronize companies between platform and Odoo ERP',
   'erp_sync', '/webhook/sync-odoo-companies', 
   ARRAY['odoo'], true),
  ('sync-tripletex-invoices', 'Sync Tripletex Invoices', 
   'Import invoices from Tripletex accounting',
   'erp_sync', '/webhook/sync-tripletex-invoices', 
   ARRAY['tripletex'], true),
  ('sync-capability-to-notion', 'Sync Capability to Notion', 
   'Generate AI-powered spec and create Notion documentation for a capability',
   'custom', '/webhook/capability-to-notion', 
   ARRAY['notion'], true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  n8n_webhook_path = EXCLUDED.n8n_webhook_path,
  required_systems = EXCLUDED.required_systems,
  updated_at = NOW();
