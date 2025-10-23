-- Tenant-specific integration configurations and rate limiting

-- Tenant integrations table
CREATE TABLE IF NOT EXISTS public.tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  adapter_id TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB,
  rate_limit JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, adapter_id)
);

-- Enable RLS
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenant users can view own integrations"
  ON public.tenant_integrations
  FOR SELECT
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Indices
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant_id ON public.tenant_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_adapter_id ON public.tenant_integrations(adapter_id);

-- Integration usage logs
CREATE TABLE IF NOT EXISTS public.integration_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  adapter_id TEXT NOT NULL,
  action TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  error_message TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_tenant_id ON public.integration_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_adapter_id ON public.integration_usage_logs(adapter_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON public.integration_usage_logs(timestamp DESC);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_integrations_updated_at
  BEFORE UPDATE ON public.tenant_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();