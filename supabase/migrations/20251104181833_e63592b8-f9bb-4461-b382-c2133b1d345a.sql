-- Step 8: Secrets & Signing for tenant-integrations

-- Per-tenant integration signing secrets (for HMAC)
CREATE TABLE mcp_tenant_secret (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,                        -- "n8n", "pipedream", etc.
  secret TEXT NOT NULL,                          -- HMAC signing secret
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL
);

CREATE INDEX idx_mcp_tenant_secret_tenant_provider ON mcp_tenant_secret (tenant_id, provider, is_active);
CREATE INDEX idx_mcp_tenant_secret_tenant_active ON mcp_tenant_secret (tenant_id, is_active);

-- Unique active secret per provider/tenant
CREATE UNIQUE INDEX mcp_tenant_secret_active_idx
ON mcp_tenant_secret (tenant_id, provider)
WHERE is_active;

-- RLS policies
ALTER TABLE mcp_tenant_secret ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all secrets
CREATE POLICY platform_admins_manage_secrets ON mcp_tenant_secret
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- Tenant admins can manage their tenant's secrets
CREATE POLICY tenant_admins_manage_secrets ON mcp_tenant_secret
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id::text = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id::text = tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
);

-- System can read/write for edge function operations
CREATE POLICY system_manage_secrets ON mcp_tenant_secret
FOR ALL
USING (true)
WITH CHECK (true);