-- Add MCP resources to permission system
INSERT INTO permission_resources (key, name, description) VALUES
  ('mcp_secret', 'MCP Hemmeligheter', 'HMAC signing secrets for integrasjoner'),
  ('mcp_reveal_token', 'MCP Reveal Tokens', 'Engangstokens for å vise hemmeligheter'),
  ('mcp_audit_log', 'MCP Audit Log', 'Sikkerhetslogg for MCP-operasjoner'),
  ('mcp_rate_limit', 'MCP Rate Limits', 'Rate limiting for MCP-aksesser')
ON CONFLICT (key) DO NOTHING;