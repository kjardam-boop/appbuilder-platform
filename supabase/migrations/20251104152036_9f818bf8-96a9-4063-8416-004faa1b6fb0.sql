-- Add observability fields to mcp_action_log
ALTER TABLE public.mcp_action_log 
ADD COLUMN IF NOT EXISTS http_method text,
ADD COLUMN IF NOT EXISTS resource_type text,
ADD COLUMN IF NOT EXISTS resource_id text,
ADD COLUMN IF NOT EXISTS error_code text,
ADD COLUMN IF NOT EXISTS user_agent text;

-- Add comment explaining new fields
COMMENT ON COLUMN public.mcp_action_log.http_method IS 'HTTP method (GET, POST) for the request';
COMMENT ON COLUMN public.mcp_action_log.resource_type IS 'Type of resource accessed (company, supplier, project, etc.)';
COMMENT ON COLUMN public.mcp_action_log.resource_id IS 'ID of specific resource accessed (for GET operations)';
COMMENT ON COLUMN public.mcp_action_log.error_code IS 'Standardized error code (INTERNAL_ERROR, VALIDATION_ERROR, POLICY_DENIED, etc.)';
COMMENT ON COLUMN public.mcp_action_log.user_agent IS 'User-Agent header from the request for client identification';

-- Ensure timeline index exists (might already be there from previous migration)
CREATE INDEX IF NOT EXISTS idx_mcp_action_log_tenant_timeline 
ON public.mcp_action_log(tenant_id, created_at DESC);

-- Add index for error analysis
CREATE INDEX IF NOT EXISTS idx_mcp_action_log_error_code 
ON public.mcp_action_log(tenant_id, error_code, created_at DESC)
WHERE error_code IS NOT NULL;

COMMENT ON INDEX idx_mcp_action_log_error_code IS 'Optimizes error analysis queries per tenant';