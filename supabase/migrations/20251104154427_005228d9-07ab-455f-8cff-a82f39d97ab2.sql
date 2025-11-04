-- Create integration_run table for tracking n8n workflow executions
CREATE TABLE IF NOT EXISTS public.integration_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  workflow_key TEXT NOT NULL,
  request_id TEXT,
  action_name TEXT,
  status TEXT NOT NULL DEFAULT 'started',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  http_status INTEGER,
  error_message TEXT,
  response_json JSONB,
  external_run_id TEXT,
  idempotency_key TEXT
);

-- Indexes for efficient queries
CREATE INDEX idx_integration_run_tenant_timeline ON public.integration_run(tenant_id, started_at DESC);
CREATE INDEX idx_integration_run_tenant_workflow ON public.integration_run(tenant_id, workflow_key, started_at DESC);
CREATE INDEX idx_integration_run_request_id ON public.integration_run(request_id);
CREATE INDEX idx_integration_run_idempotency ON public.integration_run(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- RLS for integration_run
ALTER TABLE public.integration_run ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all integration runs
CREATE POLICY "platform_admins_read_integration_runs"
ON public.integration_run
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'platform_support')
      AND scope_type = 'platform'
  )
);

-- Tenant admins can view their tenant's integration runs
CREATE POLICY "tenant_admins_read_integration_runs"
ON public.integration_run
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.tenants t ON t.id::text = integration_run.tenant_id
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('tenant_owner', 'tenant_admin')
      AND ur.scope_type = 'tenant'
      AND ur.scope_id::text = integration_run.tenant_id
  )
);

-- System can insert integration runs
CREATE POLICY "system_insert_integration_runs"
ON public.integration_run
FOR INSERT
WITH CHECK (true);

-- System can update integration runs
CREATE POLICY "system_update_integration_runs"
ON public.integration_run
FOR UPDATE
USING (true);

-- Add integration_run_id to mcp_action_log for linking
ALTER TABLE public.mcp_action_log
ADD COLUMN IF NOT EXISTS integration_run_id UUID REFERENCES public.integration_run(id) ON DELETE SET NULL;