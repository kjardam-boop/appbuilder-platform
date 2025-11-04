/**
 * Integration Registry Types
 * Type definitions for integration configuration
 */

export type IntegrationProvider = 'n8n';

export interface WorkflowMapping {
  [workflowKey: string]: string;
}
