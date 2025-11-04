-- Create MCP action registry for Platform Apps
CREATE TABLE mcp_action_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  app_key TEXT NOT NULL,
  action_key TEXT NOT NULL,
  fq_action TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  input_schema JSONB,
  output_schema JSONB,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  UNIQUE (tenant_id, fq_action, version)
);

CREATE INDEX idx_mcp_action_registry_tenant_app ON mcp_action_registry (tenant_id, app_key);
CREATE INDEX idx_mcp_action_registry_tenant_created ON mcp_action_registry (tenant_id, created_at DESC);
CREATE INDEX idx_mcp_action_registry_fq_action ON mcp_action_registry (tenant_id, fq_action, enabled);

-- RLS for mcp_action_registry
ALTER TABLE mcp_action_registry ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all registry entries
CREATE POLICY "platform_admins_all_mcp_action_registry"
ON mcp_action_registry
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'platform_support')
      AND scope_type = 'platform'
  )
);

-- Tenant admins can read/write their tenant's registry
CREATE POLICY "tenant_admins_rw_mcp_action_registry"
ON mcp_action_registry
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN tenants t ON t.id::text = mcp_action_registry.tenant_id
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('tenant_owner', 'tenant_admin')
      AND ur.scope_type = 'tenant'
      AND ur.scope_id::text = mcp_action_registry.tenant_id
  )
);

-- Authenticated users can read registry entries for their tenant
CREATE POLICY "tenant_members_read_mcp_action_registry"
ON mcp_action_registry
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN tenants t ON t.id::text = mcp_action_registry.tenant_id
    WHERE ur.user_id = auth.uid()
      AND ur.scope_type = 'tenant'
      AND ur.scope_id::text = mcp_action_registry.tenant_id
  )
);

-- System can insert registry entries (for app lifecycle)
CREATE POLICY "system_insert_mcp_action_registry"
ON mcp_action_registry
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add registry link to mcp_action_log
ALTER TABLE mcp_action_log
ADD COLUMN registry_fq_action TEXT;