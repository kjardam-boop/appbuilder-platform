-- Create AI policies table for tenant-level governance
CREATE TABLE IF NOT EXISTS public.ai_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  
  -- Rate limiting
  max_requests_per_hour INTEGER DEFAULT 100,
  max_requests_per_day INTEGER DEFAULT 1000,
  
  -- Cost controls
  max_cost_per_day NUMERIC(10, 2) DEFAULT 10.00,
  max_cost_per_month NUMERIC(10, 2) DEFAULT 100.00,
  alert_threshold_percent INTEGER DEFAULT 80, -- Alert at 80% of limit
  
  -- Content filtering
  enable_content_filter BOOLEAN DEFAULT true,
  blocked_keywords TEXT[] DEFAULT '{}',
  
  -- Failover settings
  enable_failover BOOLEAN DEFAULT true,
  failover_on_rate_limit BOOLEAN DEFAULT true,
  failover_on_error BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_policies ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view and update their policies
CREATE POLICY "Tenant admins can view their AI policies"
  ON public.ai_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = ai_policies.tenant_id
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Tenant admins can update their AI policies"
  ON public.ai_policies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = ai_policies.tenant_id
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Tenant admins can insert their AI policies"
  ON public.ai_policies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = ai_policies.tenant_id
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- Platform admins can view all policies
CREATE POLICY "Platform admins can view all AI policies"
  ON public.ai_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('platform_owner', 'platform_support')
      AND user_roles.scope_type = 'platform'
    )
  );

-- Create AI provider health monitoring table
CREATE TABLE IF NOT EXISTS public.ai_provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'
  response_time_ms INTEGER,
  last_check_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for latest health checks
CREATE INDEX idx_ai_provider_health_provider_check ON public.ai_provider_health(provider, last_check_at DESC);

-- Enable RLS
ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;

-- Platform admins can view health
CREATE POLICY "Platform admins can view provider health"
  ON public.ai_provider_health
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('platform_owner', 'platform_support')
      AND user_roles.scope_type = 'platform'
    )
  );

-- System can insert health checks
CREATE POLICY "System can insert provider health"
  ON public.ai_provider_health
  FOR INSERT
  WITH CHECK (true);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_ai_rate_limit(
  p_tenant_id UUID,
  p_current_time TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB AS $$
DECLARE
  v_policy RECORD;
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_daily_cost NUMERIC;
  v_monthly_cost NUMERIC;
  v_result JSONB;
BEGIN
  -- Get policy for tenant
  SELECT * INTO v_policy
  FROM ai_policies
  WHERE tenant_id = p_tenant_id;
  
  -- If no policy, use defaults
  IF NOT FOUND THEN
    v_policy.max_requests_per_hour := 100;
    v_policy.max_requests_per_day := 1000;
    v_policy.max_cost_per_day := 10.00;
    v_policy.max_cost_per_month := 100.00;
    v_policy.alert_threshold_percent := 80;
  END IF;
  
  -- Count requests in last hour
  SELECT COUNT(*) INTO v_hourly_count
  FROM ai_usage_logs
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_current_time - INTERVAL '1 hour'
    AND status != 'error';
  
  -- Count requests today
  SELECT COUNT(*) INTO v_daily_count
  FROM ai_usage_logs
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('day', p_current_time)
    AND status != 'error';
  
  -- Sum cost today
  SELECT COALESCE(SUM(cost_estimate), 0) INTO v_daily_cost
  FROM ai_usage_logs
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('day', p_current_time)
    AND status = 'success';
  
  -- Sum cost this month
  SELECT COALESCE(SUM(cost_estimate), 0) INTO v_monthly_cost
  FROM ai_usage_logs
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('month', p_current_time)
    AND status = 'success';
  
  -- Build result
  v_result := jsonb_build_object(
    'allowed', true,
    'reason', NULL,
    'hourly_count', v_hourly_count,
    'hourly_limit', v_policy.max_requests_per_hour,
    'daily_count', v_daily_count,
    'daily_limit', v_policy.max_requests_per_day,
    'daily_cost', v_daily_cost,
    'daily_cost_limit', v_policy.max_cost_per_day,
    'monthly_cost', v_monthly_cost,
    'monthly_cost_limit', v_policy.max_cost_per_month
  );
  
  -- Check limits
  IF v_hourly_count >= v_policy.max_requests_per_hour THEN
    v_result := v_result || jsonb_build_object('allowed', false, 'reason', 'hourly_rate_limit_exceeded');
  ELSIF v_daily_count >= v_policy.max_requests_per_day THEN
    v_result := v_result || jsonb_build_object('allowed', false, 'reason', 'daily_rate_limit_exceeded');
  ELSIF v_daily_cost >= v_policy.max_cost_per_day THEN
    v_result := v_result || jsonb_build_object('allowed', false, 'reason', 'daily_cost_limit_exceeded');
  ELSIF v_monthly_cost >= v_policy.max_cost_per_month THEN
    v_result := v_result || jsonb_build_object('allowed', false, 'reason', 'monthly_cost_limit_exceeded');
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to get latest provider health
CREATE OR REPLACE FUNCTION get_provider_health(p_provider TEXT)
RETURNS TABLE (
  status TEXT,
  response_time_ms INTEGER,
  last_check_at TIMESTAMPTZ,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.status,
    h.response_time_ms,
    h.last_check_at,
    h.error_message
  FROM ai_provider_health h
  WHERE h.provider = p_provider
  ORDER BY h.last_check_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON TABLE public.ai_policies IS 'AI governance policies per tenant (rate limits, cost caps, content filtering)';
COMMENT ON TABLE public.ai_provider_health IS 'Health monitoring for AI providers';
COMMENT ON FUNCTION check_ai_rate_limit IS 'Checks if tenant can make AI request based on rate limits and cost caps';
COMMENT ON FUNCTION get_provider_health IS 'Gets latest health status for an AI provider';