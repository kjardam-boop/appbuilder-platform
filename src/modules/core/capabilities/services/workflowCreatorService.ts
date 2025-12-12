/**
 * WorkflowCreatorService
 * 
 * Creates n8n workflows dynamically from the platform.
 * This is a reusable capability that other capabilities can call.
 * 
 * Workflow templates:
 * - generic-webhook: Accepts any JSON input
 * - ocr-to-sheets: Routes OCR data to Google Sheets
 * - invoice-to-erp: Routes invoice data to ERP system
 * - data-transformer: General purpose data transformation
 */

import { supabase } from "@/integrations/supabase/client";
import { N8nSyncService } from "@/modules/core/integrations/services/n8nSyncService";

// ============================================================================
// Types
// ============================================================================

export type WorkflowTemplateId = 
  | 'generic-webhook' 
  | 'ocr-to-sheets' 
  | 'invoice-to-erp' 
  | 'data-transformer';

export interface WorkflowConfig {
  name: string;
  description?: string;
  templateId?: WorkflowTemplateId;
  context?: {
    tenantId: string;
    appId?: string;
    sourceCapability?: string;
  };
  customParameters?: Record<string, unknown>;
}

export interface WorkflowBuilderResult {
  success: boolean;
  workflowId?: string;
  integrationDefId?: string;
  webhookUrl?: string;
  n8nWorkflowId?: string;
  error?: string;
}

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
}

interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }>;
  settings?: Record<string, unknown>;
}

// ============================================================================
// Workflow Templates
// ============================================================================

const WORKFLOW_TEMPLATES: Record<WorkflowTemplateId, (config: WorkflowConfig) => N8nWorkflow> = {
  /**
   * Generic webhook that accepts any JSON input
   * Perfect for receiving OCR, invoice, or any other structured data
   */
  'generic-webhook': (config) => ({
    name: config.name,
    nodes: [
      {
        id: 'webhook-trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: generateWebhookPath(config.name),
          responseMode: 'onReceived',
          responseData: 'allEntries',
          options: {},
        },
      },
      {
        id: 'set-data',
        name: 'Process Input',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [470, 300],
        parameters: {
          keepOnlySet: false,
          values: {
            string: [
              {
                name: 'receivedAt',
                value: '={{ $now.toISO() }}',
              },
              {
                name: 'source',
                value: config.context?.sourceCapability || 'platform',
              },
            ],
          },
        },
      },
    ],
    connections: {
      'Webhook Trigger': {
        main: [[{ node: 'Process Input', type: 'main', index: 0 }]],
      },
    },
    settings: {
      executionOrder: 'v1',
    },
  }),

  /**
   * OCR to Google Sheets workflow
   * Receives OCR data and appends to a spreadsheet
   */
  'ocr-to-sheets': (config) => ({
    name: config.name,
    nodes: [
      {
        id: 'webhook-trigger',
        name: 'OCR Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: generateWebhookPath(config.name),
          responseMode: 'onReceived',
          responseData: 'allEntries',
          options: {},
        },
      },
      {
        id: 'transform-ocr',
        name: 'Transform OCR Data',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [470, 300],
        parameters: {
          keepOnlySet: false,
          values: {
            string: [
              {
                name: 'FileName',
                value: '={{ $json.fileName }}',
              },
              {
                name: 'ExtractedText',
                value: '={{ $json.extractedText }}',
              },
              {
                name: 'Confidence',
                value: '={{ $json.confidence }}',
              },
              {
                name: 'ProcessedAt',
                value: '={{ $now.toISO() }}',
              },
            ],
          },
        },
      },
      {
        id: 'google-sheets',
        name: 'Append to Sheet',
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4,
        position: [690, 300],
        parameters: {
          operation: 'append',
          documentId: { __rl: true, mode: 'id', value: '' }, // User must configure
          sheetName: { __rl: true, mode: 'list', value: '' }, // User must configure
          columns: {
            mappingMode: 'autoMapInputData',
            value: {},
            matchingColumns: [],
            schema: [],
          },
        },
      },
    ],
    connections: {
      'OCR Webhook': {
        main: [[{ node: 'Transform OCR Data', type: 'main', index: 0 }]],
      },
      'Transform OCR Data': {
        main: [[{ node: 'Append to Sheet', type: 'main', index: 0 }]],
      },
    },
    settings: {
      executionOrder: 'v1',
    },
  }),

  /**
   * Invoice to ERP workflow
   * Receives invoice data and sends to ERP system
   */
  'invoice-to-erp': (config) => ({
    name: config.name,
    nodes: [
      {
        id: 'webhook-trigger',
        name: 'Invoice Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: generateWebhookPath(config.name),
          responseMode: 'onReceived',
          responseData: 'allEntries',
          options: {},
        },
      },
      {
        id: 'transform-invoice',
        name: 'Transform Invoice',
        type: 'n8n-nodes-base.code',
        typeVersion: 1,
        position: [470, 300],
        parameters: {
          jsCode: `// Extract invoice fields from OCR data
const input = $input.first().json;

// Parse extracted text for invoice fields
const extractedText = input.extractedText || '';

// TODO: Add AI extraction logic or regex patterns
const invoice = {
  rawText: extractedText,
  fileName: input.fileName,
  confidence: input.confidence,
  processedAt: new Date().toISOString(),
  // Add more fields as needed
};

return [{ json: invoice }];`,
        },
      },
      {
        id: 'http-request',
        name: 'Send to ERP',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [690, 300],
        parameters: {
          method: 'POST',
          url: '', // User must configure ERP endpoint
          sendBody: true,
          bodyParameters: {
            parameters: [
              {
                name: 'data',
                value: '={{ JSON.stringify($json) }}',
              },
            ],
          },
        },
      },
    ],
    connections: {
      'Invoice Webhook': {
        main: [[{ node: 'Transform Invoice', type: 'main', index: 0 }]],
      },
      'Transform Invoice': {
        main: [[{ node: 'Send to ERP', type: 'main', index: 0 }]],
      },
    },
    settings: {
      executionOrder: 'v1',
    },
  }),

  /**
   * General data transformer
   * Flexible workflow for custom transformations
   */
  'data-transformer': (config) => ({
    name: config.name,
    nodes: [
      {
        id: 'webhook-trigger',
        name: 'Data Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: generateWebhookPath(config.name),
          responseMode: 'onReceived',
          responseData: 'allEntries',
          options: {},
        },
      },
      {
        id: 'code-transform',
        name: 'Transform Data',
        type: 'n8n-nodes-base.code',
        typeVersion: 1,
        position: [470, 300],
        parameters: {
          jsCode: `// Custom data transformation
const input = $input.first().json;

// Add your transformation logic here
const transformed = {
  ...input,
  transformedAt: new Date().toISOString(),
};

return [{ json: transformed }];`,
        },
      },
    ],
    connections: {
      'Data Webhook': {
        main: [[{ node: 'Transform Data', type: 'main', index: 0 }]],
      },
    },
    settings: {
      executionOrder: 'v1',
    },
  }),
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateWebhookPath(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function generateKey(name: string): string {
  return `workflow-${generateWebhookPath(name)}-${Date.now().toString(36)}`;
}

// ============================================================================
// Service
// ============================================================================

export class WorkflowCreatorService {
  /**
   * Create a workflow from a template
   */
  static async createFromTemplate(
    tenantId: string,
    config: WorkflowConfig
  ): Promise<WorkflowBuilderResult> {
    const templateId = config.templateId || 'generic-webhook';
    const template = WORKFLOW_TEMPLATES[templateId];
    
    if (!template) {
      return { success: false, error: `Unknown template: ${templateId}` };
    }

    // Generate workflow JSON from template
    const workflowJson = template(config);
    
    return this.createWorkflow(tenantId, workflowJson, config);
  }

  /**
   * Create a custom workflow
   */
  static async createCustomWorkflow(
    tenantId: string,
    config: WorkflowConfig,
    customNodes?: N8nNode[]
  ): Promise<WorkflowBuilderResult> {
    // Start with generic template and add custom nodes
    const baseWorkflow = WORKFLOW_TEMPLATES['generic-webhook'](config);
    
    if (customNodes && customNodes.length > 0) {
      baseWorkflow.nodes.push(...customNodes);
    }

    return this.createWorkflow(tenantId, baseWorkflow, config);
  }

  /**
   * Core workflow creation logic
   */
  private static async createWorkflow(
    tenantId: string,
    workflowJson: N8nWorkflow,
    config: WorkflowConfig
  ): Promise<WorkflowBuilderResult> {
    try {
      // 1. Push workflow to n8n
      const pushResult = await N8nSyncService.pushWorkflow(tenantId, workflowJson);
      
      if (!pushResult.success) {
        return { 
          success: false, 
          error: pushResult.error || 'Failed to push workflow to n8n' 
        };
      }

      // 2. Activate the workflow so webhooks work
      if (pushResult.workflow_id) {
        console.log('[WorkflowCreatorService] Activating workflow:', pushResult.workflow_id);
        const activateResult = await this.activateWorkflow(tenantId, pushResult.workflow_id);
        if (!activateResult.success) {
          console.warn('[WorkflowCreatorService] Failed to activate workflow:', activateResult.error);
          // Continue anyway - workflow is created but inactive
        }
      }

      // 3. Save to integration_definitions
      const key = generateKey(config.name);
      const webhookPath = `/webhook/${generateWebhookPath(config.name)}`;

      const { data: integrationDef, error: dbError } = await supabase
        .from('integration_definitions')
        .insert({
          key,
          name: config.name,
          description: config.description || `Created from ${config.templateId || 'generic-webhook'} template`,
          type: 'workflow',
          icon_name: 'Workflow',
          n8n_workflow_id: pushResult.workflow_id,
          n8n_webhook_path: pushResult.webhook_path || webhookPath,
          workflow_json: workflowJson as unknown as Record<string, unknown>,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
          requires_credentials: false,
          is_active: true,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('[WorkflowCreatorService] DB error:', dbError);
        return { 
          success: false, 
          error: dbError.message 
        };
      }

      // 4. Build full webhook URL
      // Note: In production, this should use the n8n base URL from config
      const n8nBaseUrl = 'https://jardam.app.n8n.cloud';
      const webhookUrl = `${n8nBaseUrl}${pushResult.webhook_path || webhookPath}`;

      return {
        success: true,
        workflowId: key,
        integrationDefId: integrationDef?.id,
        n8nWorkflowId: pushResult.workflow_id,
        webhookUrl,
      };
    } catch (err) {
      console.error('[WorkflowCreatorService] Error:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }

  /**
   * Activate a workflow in n8n
   */
  private static async activateWorkflow(
    tenantId: string,
    n8nWorkflowId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-sync', {
        body: {
          action: 'activate',
          tenantId,
          workflowId: n8nWorkflowId,
          workflow: { active: true },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get available templates
   */
  static getAvailableTemplates(): Array<{
    id: WorkflowTemplateId;
    name: string;
    description: string;
    icon: string;
  }> {
    return [
      {
        id: 'generic-webhook',
        name: 'Generisk webhook',
        description: 'Aksepterer all JSON-input, perfekt for OCR-data',
        icon: 'Webhook',
      },
      {
        id: 'ocr-to-sheets',
        name: 'OCR til Google Sheets',
        description: 'Lagrer OCR-resultater i et regneark',
        icon: 'FileSpreadsheet',
      },
      {
        id: 'invoice-to-erp',
        name: 'Faktura til ERP',
        description: 'Sender fakturadata til ERP-system',
        icon: 'Receipt',
      },
      {
        id: 'data-transformer',
        name: 'Datatransformering',
        description: 'Fleksibel workflow for egne transformasjoner',
        icon: 'Shuffle',
      },
    ];
  }

  /**
   * Delete a workflow (from both n8n and database)
   */
  static async deleteWorkflow(
    tenantId: string,
    integrationDefId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the integration definition
      const { data: def, error: fetchError } = await supabase
        .from('integration_definitions')
        .select('n8n_workflow_id')
        .eq('id', integrationDefId)
        .single();

      if (fetchError || !def) {
        return { success: false, error: 'Workflow not found' };
      }

      // TODO: Delete from n8n via API (requires DELETE endpoint in n8n-sync)
      // For now, just deactivate in database

      const { error: updateError } = await supabase
        .from('integration_definitions')
        .update({ is_active: false })
        .eq('id', integrationDefId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }
}

// Export convenience functions
export const createFromTemplate = WorkflowCreatorService.createFromTemplate.bind(WorkflowCreatorService);
export const createCustomWorkflow = WorkflowCreatorService.createCustomWorkflow.bind(WorkflowCreatorService);
export const getAvailableTemplates = WorkflowCreatorService.getAvailableTemplates.bind(WorkflowCreatorService);

