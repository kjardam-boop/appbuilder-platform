-- RLS policies for mcp_action_log table (fixed type casting)
-- Platform admins and tenant admins can read logs, only system can insert

-- Enable RLS
ALTER TABLE public.mcp_action_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can read all logs
CREATE POLICY "platform_admins_read_all_logs"
ON public.mcp_action_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('platform_owner', 'platform_support')
    AND user_roles.scope_type = 'platform'
  )
);

-- Tenant admins can read logs for their tenant
CREATE POLICY "tenant_admins_read_tenant_logs"
ON public.mcp_action_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    AND user_roles.scope_type = 'tenant'
    AND user_roles.scope_id = mcp_action_log.tenant_id::uuid
  )
);

-- System can insert logs (using service role key)
CREATE POLICY "system_insert_logs"
ON public.mcp_action_log
FOR INSERT
WITH CHECK (true);

COMMENT ON POLICY "platform_admins_read_all_logs" ON public.mcp_action_log IS 'Platform admins can read all MCP action logs';
COMMENT ON POLICY "tenant_admins_read_tenant_logs" ON public.mcp_action_log IS 'Tenant admins can read logs for their tenant';
COMMENT ON POLICY "system_insert_logs" ON public.mcp_action_log IS 'System can insert logs (via service role)';