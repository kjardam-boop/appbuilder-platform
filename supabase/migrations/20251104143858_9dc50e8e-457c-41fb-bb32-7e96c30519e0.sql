-- Create mcp_action_log table for audit logging
CREATE TABLE public.mcp_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action_name TEXT NOT NULL,
  payload_json JSONB,
  result_json JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  duration_ms INTEGER,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_mcp_action_log_tenant ON public.mcp_action_log(tenant_id);
CREATE INDEX idx_mcp_action_log_action ON public.mcp_action_log(action_name);
CREATE INDEX idx_mcp_action_log_created ON public.mcp_action_log(created_at DESC);
CREATE INDEX idx_mcp_action_log_idempotency ON public.mcp_action_log(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.mcp_action_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all logs
CREATE POLICY "Platform admins can view all mcp logs"
  ON public.mcp_action_log
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Tenant admins can view their tenant's logs
CREATE POLICY "Tenant admins can view own tenant mcp logs"
  ON public.mcp_action_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'tenant'
        AND scope_id = mcp_action_log.tenant_id
        AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- System can insert logs (for edge functions)
CREATE POLICY "System can insert mcp logs"
  ON public.mcp_action_log
  FOR INSERT
  WITH CHECK (true);