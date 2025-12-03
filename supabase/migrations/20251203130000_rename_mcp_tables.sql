-- Rename tables that incorrectly use "mcp_" prefix
-- MCP = Model Context Protocol (AI tool calling)
-- These tables are NOT related to MCP - they are generic integration/secret management

-- 1. Rename mcp_tenant_secret → integration_secrets
ALTER TABLE IF EXISTS mcp_tenant_secret RENAME TO integration_secrets;

-- 2. Rename mcp_tenant_workflow_map → n8n_workflow_mappings
ALTER TABLE IF EXISTS mcp_tenant_workflow_map RENAME TO n8n_workflow_mappings;

-- 3. Rename mcp_reveal_tokens → secret_reveal_tokens
ALTER TABLE IF EXISTS mcp_reveal_tokens RENAME TO secret_reveal_tokens;

-- 4. Rename mcp_secret_audit → secret_audit_log
ALTER TABLE IF EXISTS mcp_secret_audit RENAME TO secret_audit_log;

-- 5. Rename mcp_rate_limits → api_rate_limits
ALTER TABLE IF EXISTS mcp_rate_limits RENAME TO api_rate_limits;

-- Add comments to clarify
COMMENT ON TABLE integration_secrets IS 'API keys and secrets for integrations (n8n, AI providers, etc). NOT related to MCP.';
COMMENT ON TABLE n8n_workflow_mappings IS 'Tenant-specific n8n webhook mappings. NOT related to MCP.';
COMMENT ON TABLE secret_reveal_tokens IS 'One-time tokens for revealing secrets securely.';
COMMENT ON TABLE secret_audit_log IS 'Audit log for secret operations.';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting for API operations.';

-- Keep actual MCP tables with their names
COMMENT ON TABLE mcp_tool_registry IS 'Registry of MCP (Model Context Protocol) tools for AI assistants.';
COMMENT ON TABLE mcp_action_registry IS 'Registry of MCP actions per tenant.';
COMMENT ON TABLE mcp_action_log IS 'Log of MCP action invocations.';
COMMENT ON TABLE mcp_tenant_policy IS 'MCP policy configuration per tenant.';

