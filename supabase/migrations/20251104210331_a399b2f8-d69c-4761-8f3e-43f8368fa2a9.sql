-- Create mcp_reveal_tokens table for secure token storage
CREATE TABLE mcp_reveal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  purpose TEXT NOT NULL,
  secret_id UUID NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  ip_address TEXT,
  FOREIGN KEY (secret_id) REFERENCES mcp_tenant_secret(id) ON DELETE CASCADE
);

CREATE INDEX idx_reveal_token_hash ON mcp_reveal_tokens(token_hash);
CREATE INDEX idx_reveal_token_tenant ON mcp_reveal_tokens(tenant_id, user_id);
CREATE INDEX idx_reveal_token_expires ON mcp_reveal_tokens(expires_at) WHERE uses_count < max_uses;

-- Create mcp_secret_audit table for audit logging
CREATE TABLE mcp_secret_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  secret_id UUID,
  provider TEXT NOT NULL,
  request_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_secret_audit_tenant ON mcp_secret_audit(tenant_id, created_at DESC);
CREATE INDEX idx_secret_audit_user ON mcp_secret_audit(user_id, created_at DESC);
CREATE INDEX idx_secret_audit_action ON mcp_secret_audit(action, created_at DESC);

-- Create mcp_rate_limits table for rate limiting
CREATE TABLE mcp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, action, window_start)
);

CREATE INDEX idx_rate_limit_window ON mcp_rate_limits(tenant_id, user_id, action, window_start);

-- RLS Policies for mcp_reveal_tokens
ALTER TABLE mcp_reveal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_manage_reveal_tokens ON mcp_reveal_tokens
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for mcp_secret_audit
ALTER TABLE mcp_secret_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_admins_read_audit ON mcp_secret_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id::text = mcp_secret_audit.tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  )
  OR
  is_platform_admin(auth.uid())
);

CREATE POLICY system_insert_audit ON mcp_secret_audit
FOR INSERT
WITH CHECK (true);

-- RLS Policies for mcp_rate_limits
ALTER TABLE mcp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_manage_rate_limits ON mcp_rate_limits
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');