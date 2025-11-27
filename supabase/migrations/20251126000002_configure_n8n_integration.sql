-- Configure n8n integration for Default Platform tenant
-- Tenant ID: effb481e-7562-4e19-8ec6-ef2696cd0efe
-- n8n URL: https://jardam.app.n8n.cloud

-- 1. Add n8n integration configuration
INSERT INTO tenant_integrations (tenant_id, adapter_id, config, is_active)
VALUES (
  'effb481e-7562-4e19-8ec6-ef2696cd0efe',
  'n8n',
  '{"n8n_base_url": "https://jardam.app.n8n.cloud", "n8n_mcp_url": "https://jardam.app.n8n.cloud"}'::jsonb,
  true
)
ON CONFLICT (tenant_id, adapter_id) DO UPDATE SET
  config = EXCLUDED.config,
  is_active = true,
  updated_at = NOW();

-- 2. First, deactivate any existing workflow mappings for these keys
UPDATE mcp_tenant_workflow_map 
SET is_active = false
WHERE tenant_id = 'effb481e-7562-4e19-8ec6-ef2696cd0efe'
  AND provider = 'n8n'
  AND workflow_key IN ('prepare-miro-workshop', 'process-workshop-results', 'sync-workshop-notion');

-- 3. Add workflow mappings for workshop workflows
INSERT INTO mcp_tenant_workflow_map (tenant_id, provider, workflow_key, webhook_path, is_active)
VALUES 
  ('effb481e-7562-4e19-8ec6-ef2696cd0efe', 'n8n', 'prepare-miro-workshop', '/webhook/prepare-miro-workshop', true),
  ('effb481e-7562-4e19-8ec6-ef2696cd0efe', 'n8n', 'process-workshop-results', '/webhook/process-workshop-results', true),
  ('effb481e-7562-4e19-8ec6-ef2696cd0efe', 'n8n', 'sync-workshop-notion', '/webhook/sync-workshop-notion', true);

-- 4. Workflow templates were already added in the workshop_integration migration
-- Just ensure they exist and are active
UPDATE workflow_templates 
SET is_active = true, n8n_webhook_path = CASE 
  WHEN key = 'prepare-miro-workshop' THEN '/webhook/prepare-miro-workshop'
  WHEN key = 'process-workshop-results' THEN '/webhook/process-workshop-results'
  WHEN key = 'sync-workshop-to-notion' THEN '/webhook/sync-workshop-notion'
  ELSE n8n_webhook_path
END
WHERE key IN ('prepare-miro-workshop', 'process-workshop-results', 'sync-workshop-to-notion');

