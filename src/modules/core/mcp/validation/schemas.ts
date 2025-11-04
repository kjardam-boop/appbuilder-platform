/**
 * Validation schemas for MCP configuration
 */

import { z } from 'zod';

// Policy DSL schemas
export const mcpPolicyRuleSchema = z.object({
  role: z.union([z.string(), z.array(z.string())]),
  resource: z.union([z.string(), z.array(z.string())]).optional(),
  action: z.union([z.string(), z.array(z.string())]).optional(),
  effect: z.enum(['allow', 'deny']),
  conditions: z
    .object({
      tenantMatch: z.boolean().optional(),
      ownerOnly: z.boolean().optional(),
    })
    .optional(),
});

export const mcpPolicySetSchema = z.array(mcpPolicyRuleSchema);

// Workflow mapping schema
export const workflowMappingSchema = z.object({
  workflow_key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/, 'Must be lowercase alphanumeric with dashes/underscores'),
  provider: z.enum(['n8n']).default('n8n'),
  webhook_path: z
    .string()
    .min(1)
    .startsWith('/', 'Must start with /'),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type WorkflowMappingInput = z.infer<typeof workflowMappingSchema>;
