-- Add request_id and policy_result to mcp_action_log
ALTER TABLE public.mcp_action_log
ADD COLUMN request_id UUID,
ADD COLUMN policy_result JSONB DEFAULT NULL;

-- Add index for request_id for faster lookups
CREATE INDEX idx_mcp_action_log_request_id ON public.mcp_action_log(request_id);

COMMENT ON COLUMN public.mcp_action_log.request_id IS 'UUID v4 per request for tracing';
COMMENT ON COLUMN public.mcp_action_log.policy_result IS 'Policy evaluation result (null for Step 1, used in Step 2+)';