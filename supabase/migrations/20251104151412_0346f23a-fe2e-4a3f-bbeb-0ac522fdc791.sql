-- Add supplier and external_partner roles to app_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'supplier'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'supplier';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'external_partner'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'external_partner';
  END IF;
END $$;

-- Add index for timeline queries on mcp_action_log
CREATE INDEX IF NOT EXISTS idx_mcp_action_log_tenant_timeline 
ON public.mcp_action_log(tenant_id, created_at DESC);

-- Add comment explaining the index
COMMENT ON INDEX idx_mcp_action_log_tenant_timeline IS 
'Optimizes timeline queries for MCP action logs per tenant, ordered by most recent first';