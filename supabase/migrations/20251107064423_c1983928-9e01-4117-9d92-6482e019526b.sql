-- Create ai_usage_logs table for tracking AI consumption
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'azure-openai', 'lovable'
  model TEXT NOT NULL,
  endpoint TEXT, -- which endpoint/function was called
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10, 6) DEFAULT 0,
  request_duration_ms INTEGER,
  status TEXT DEFAULT 'success', -- 'success', 'error', 'rate_limited'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_ai_usage_logs_tenant_id ON public.ai_usage_logs(tenant_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_provider ON public.ai_usage_logs(provider);
CREATE INDEX idx_ai_usage_logs_tenant_created ON public.ai_usage_logs(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all logs
CREATE POLICY "Platform admins can view all AI usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('platform_owner', 'platform_support')
      AND user_roles.scope_type = 'platform'
    )
  );

-- Tenant admins can view their tenant's logs
CREATE POLICY "Tenant admins can view their AI usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = ai_usage_logs.tenant_id
      AND user_roles.role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- System can insert logs
CREATE POLICY "System can insert AI usage logs"
  ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- Function to calculate cost estimate based on provider and tokens
CREATE OR REPLACE FUNCTION calculate_ai_cost(
  p_provider TEXT,
  p_model TEXT,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  cost NUMERIC := 0;
BEGIN
  -- OpenAI pricing (per 1M tokens)
  IF p_provider = 'openai' THEN
    IF p_model LIKE 'gpt-5%' THEN
      cost := (p_prompt_tokens * 0.15 + p_completion_tokens * 0.60) / 1000000;
    ELSIF p_model LIKE 'gpt-4.1%' THEN
      cost := (p_prompt_tokens * 0.10 + p_completion_tokens * 0.30) / 1000000;
    ELSIF p_model LIKE 'gpt-4o%' THEN
      cost := (p_prompt_tokens * 0.05 + p_completion_tokens * 0.15) / 1000000;
    END IF;
  
  -- Anthropic pricing (per 1M tokens)
  ELSIF p_provider = 'anthropic' THEN
    IF p_model LIKE '%opus%' THEN
      cost := (p_prompt_tokens * 15 + p_completion_tokens * 75) / 1000000;
    ELSIF p_model LIKE '%sonnet%' THEN
      cost := (p_prompt_tokens * 3 + p_completion_tokens * 15) / 1000000;
    ELSIF p_model LIKE '%haiku%' THEN
      cost := (p_prompt_tokens * 0.25 + p_completion_tokens * 1.25) / 1000000;
    END IF;
  
  -- Google pricing (per 1M tokens)
  ELSIF p_provider = 'google' THEN
    IF p_model LIKE '%pro%' THEN
      cost := (p_prompt_tokens * 1.25 + p_completion_tokens * 5.00) / 1000000;
    ELSIF p_model LIKE '%flash%' THEN
      cost := (p_prompt_tokens * 0.075 + p_completion_tokens * 0.30) / 1000000;
    END IF;
  
  -- Azure OpenAI (same as OpenAI)
  ELSIF p_provider = 'azure-openai' THEN
    IF p_model LIKE 'gpt-5%' THEN
      cost := (p_prompt_tokens * 0.15 + p_completion_tokens * 0.60) / 1000000;
    ELSIF p_model LIKE 'gpt-4.1%' THEN
      cost := (p_prompt_tokens * 0.10 + p_completion_tokens * 0.30) / 1000000;
    END IF;
  
  -- Lovable AI (uses Google pricing)
  ELSIF p_provider = 'lovable' THEN
    cost := (p_prompt_tokens * 0.075 + p_completion_tokens * 0.30) / 1000000;
  END IF;

  RETURN cost;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON TABLE public.ai_usage_logs IS 'Tracks AI usage per tenant for billing and analytics';
COMMENT ON FUNCTION calculate_ai_cost IS 'Calculates estimated cost based on provider pricing';