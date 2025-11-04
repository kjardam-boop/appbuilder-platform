/**
 * MCP (Model Context Protocol) Server Module
 * Internal MCP server for connecting external systems to platform resources and actions
 */

// Types
export * from './types/mcp.types';

// Services
export { McpActionService } from './services/mcpActionService';
export { McpResourceService } from './services/mcpResourceService';
export { McpAuditService } from './services/mcpAuditService';
export { McpPolicyService } from './services/mcpPolicyService';

// Actions
export { createProjectAction, listProjectsAction } from './actions/projectActions';
export { assignTaskAction } from './actions/taskActions';
export { searchCompaniesAction } from './actions/companyActions';
export { evaluateSupplierAction } from './actions/supplierActions';

// Register all built-in actions
import { McpActionService } from './services/mcpActionService';
import { createProjectAction, listProjectsAction } from './actions/projectActions';
import { assignTaskAction } from './actions/taskActions';
import { searchCompaniesAction } from './actions/companyActions';
import { evaluateSupplierAction } from './actions/supplierActions';

// Auto-register built-in actions on module load
McpActionService.register(createProjectAction);
McpActionService.register(listProjectsAction);
McpActionService.register(assignTaskAction);
McpActionService.register(searchCompaniesAction);
McpActionService.register(evaluateSupplierAction);

// Module metadata
export const MCP_MODULE = {
  name: 'mcp',
  version: '1.0.0',
  description: 'Internal MCP server for external integrations',
  enabled: true,
} as const;
