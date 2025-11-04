-- MCP Tenant Policy Storage
CREATE TABLE mcp_tenant_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'tenant',
  policy_json JSONB NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_tenant_policy_lookup ON mcp_tenant_policy (tenant_id, is_active, created_at DESC);

-- MCP Tenant Workflow Mappings
CREATE TABLE mcp_tenant_workflow_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'n8n',
  workflow_key TEXT NOT NULL,
  webhook_path TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_mcp_workflow_unique_active ON mcp_tenant_workflow_map (tenant_id, provider, workflow_key) WHERE is_active;
CREATE INDEX idx_mcp_workflow_lookup ON mcp_tenant_workflow_map (tenant_id, provider, is_active);

-- Enable RLS
ALTER TABLE mcp_tenant_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tenant_workflow_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcp_tenant_policy
CREATE POLICY "Platform admins can manage all policies"
ON mcp_tenant_policy
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant admins can view own tenant policies"
ON mcp_tenant_policy
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

CREATE POLICY "Tenant admins can manage own tenant policies"
ON mcp_tenant_policy
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

CREATE POLICY "Tenant admins can update own tenant policies"
ON mcp_tenant_policy
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

-- RLS Policies for mcp_tenant_workflow_map
CREATE POLICY "Platform admins can manage all workflow maps"
ON mcp_tenant_workflow_map
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant admins can view own tenant workflow maps"
ON mcp_tenant_workflow_map
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

CREATE POLICY "Tenant admins can manage own tenant workflow maps"
ON mcp_tenant_workflow_map
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

CREATE POLICY "Tenant admins can update own tenant workflow maps"
ON mcp_tenant_workflow_map
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

CREATE POLICY "Tenant admins can delete own tenant workflow maps"
ON mcp_tenant_workflow_map
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);