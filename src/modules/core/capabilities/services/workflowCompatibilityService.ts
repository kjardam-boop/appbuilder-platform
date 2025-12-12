/**
 * WorkflowCompatibilityService
 * 
 * Verifies that n8n workflows can accept specific input formats (e.g., OCR data).
 * Uses hierarchical approach:
 * 1. Local first: Parse workflow_json from integration_definitions
 * 2. MCP fallback: If local data missing, fetch from n8n via MCP
 * 
 * Only 100% compatible workflows are shown to users.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position?: [number, number];
  parameters?: Record<string, unknown>;
}

interface N8nWorkflowJson {
  id?: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  active?: boolean;
}

interface InputSchema {
  type: 'object' | 'any' | 'unknown';
  required?: string[];
  properties?: Record<string, { type: string; description?: string }>;
  acceptsAny?: boolean;
}

interface WorkflowCompatibilityResult {
  workflowId: string;
  integrationDefId: string;
  name: string;
  isCompatible: boolean;
  compatibilityScore: number; // 0-100
  reason?: string;
  webhookPath?: string;
}

// Standard OCR output format
const OCR_OUTPUT_SCHEMA: InputSchema = {
  type: 'object',
  required: ['extractedText'],
  properties: {
    extractedText: { type: 'string', description: 'Extracted text from document' },
    confidence: { type: 'number', description: 'OCR confidence score 0-1' },
    provider: { type: 'string', description: 'OCR provider used' },
    processingTimeMs: { type: 'number', description: 'Processing time in milliseconds' },
    fileName: { type: 'string', description: 'Original file name' },
    fileType: { type: 'string', description: 'MIME type of original file' },
  },
};

// ============================================================================
// Service
// ============================================================================

export class WorkflowCompatibilityService {
  /**
   * Parse workflow_json and extract input schema from webhook trigger
   * This is the PRIMARY method - fast, no external calls
   */
  static parseWorkflowJson(workflowJson: unknown): InputSchema {
    if (!workflowJson || typeof workflowJson !== 'object') {
      return { type: 'unknown' };
    }

    const workflow = workflowJson as N8nWorkflowJson;
    if (!Array.isArray(workflow.nodes)) {
      return { type: 'unknown' };
    }

    // Find webhook trigger node
    const webhookNode = workflow.nodes.find(
      node => node.type === 'n8n-nodes-base.webhook'
    );

    if (!webhookNode) {
      return { type: 'unknown' };
    }

    // Check webhook parameters for input expectations
    const params = webhookNode.parameters || {};
    
    // If webhook has responseMode: 'onReceived' and no specific validation,
    // it typically accepts any JSON
    if (params.responseMode === 'onReceived' && !params.options?.rawBody) {
      return { type: 'any', acceptsAny: true };
    }

    // Check for JSON schema validation in options
    const options = params.options as Record<string, unknown> | undefined;
    if (options?.responseData === 'allEntries') {
      return { type: 'any', acceptsAny: true };
    }

    // Look for Code node that processes input immediately after webhook
    const webhookConnections = (workflow.connections as Record<string, any>)?.[webhookNode.name];
    if (webhookConnections?.main?.[0]?.[0]) {
      const nextNodeName = webhookConnections.main[0][0].node;
      const nextNode = workflow.nodes.find(n => n.name === nextNodeName);
      
      if (nextNode?.type === 'n8n-nodes-base.code') {
        // Analyze Code node to see what fields it expects
        const code = nextNode.parameters?.jsCode as string;
        if (code) {
          return this.analyzeCodeNodeForRequiredFields(code);
        }
      }
    }

    // Default: assume webhook accepts any JSON
    return { type: 'any', acceptsAny: true };
  }

  /**
   * Analyze Code node JavaScript to find required input fields
   */
  private static analyzeCodeNodeForRequiredFields(code: string): InputSchema {
    const required: string[] = [];
    
    // Common patterns for accessing input fields
    const patterns = [
      /\$input\.first\(\)\.json\.(\w+)/g,
      /\$input\.all\(\)\[\d+\]\.json\.(\w+)/g,
      /items\[\d+\]\.json\.(\w+)/g,
      /json\.(\w+)/g,
    ];

    const foundFields = new Set<string>();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        foundFields.add(match[1]);
      }
    }

    // Check for destructuring patterns
    const destructureMatch = code.match(/const\s*\{([^}]+)\}\s*=\s*\$input/);
    if (destructureMatch) {
      const fields = destructureMatch[1].split(',').map(f => f.trim().split(':')[0].trim());
      fields.forEach(f => foundFields.add(f));
    }

    // If we found specific fields, they're likely required
    if (foundFields.size > 0) {
      // Check if code throws error when fields are missing
      const hasRequiredCheck = /if\s*\(\s*!.*\)\s*throw/i.test(code) ||
                               /required|mandatory/i.test(code);
      
      return {
        type: 'object',
        required: hasRequiredCheck ? Array.from(foundFields) : [],
        properties: Object.fromEntries(
          Array.from(foundFields).map(f => [f, { type: 'string' }])
        ),
        acceptsAny: !hasRequiredCheck,
      };
    }

    return { type: 'any', acceptsAny: true };
  }

  /**
   * Check if workflow input schema is compatible with OCR output
   * Returns true only for 100% compatible workflows
   */
  static checkOcrCompatibility(inputSchema: InputSchema): { compatible: boolean; score: number; reason?: string } {
    // If workflow accepts any input, it's compatible
    if (inputSchema.type === 'any' || inputSchema.acceptsAny) {
      return { compatible: true, score: 100, reason: 'Accepts any JSON input' };
    }

    // If unknown schema, we can't verify - mark as incompatible (aggressive filtering)
    if (inputSchema.type === 'unknown') {
      return { compatible: false, score: 0, reason: 'Unable to determine input requirements' };
    }

    // Check required fields
    const required = inputSchema.required || [];
    
    // OCR output fields
    const ocrFields = Object.keys(OCR_OUTPUT_SCHEMA.properties || {});
    
    // Check if all required fields are in OCR output
    const missingFields = required.filter(field => !ocrFields.includes(field));
    
    if (missingFields.length === 0) {
      // All required fields are provided by OCR
      return { compatible: true, score: 100, reason: 'All required fields match OCR output' };
    }

    // Check for OCR-specific fields
    const ocrSpecificFields = ['extractedText', 'text', 'content', 'ocr_text'];
    const hasOcrField = required.some(f => ocrSpecificFields.includes(f.toLowerCase()));
    
    if (hasOcrField && missingFields.length <= 1) {
      // Close match - but we're aggressive, so still incompatible
      return { 
        compatible: false, 
        score: 70, 
        reason: `Missing required fields: ${missingFields.join(', ')}` 
      };
    }

    return { 
      compatible: false, 
      score: 0, 
      reason: `Requires fields not in OCR output: ${missingFields.join(', ')}` 
    };
  }

  /**
   * Get workflow metadata via MCP (FALLBACK method)
   * Only called if local workflow_json is missing
   */
  static async getWorkflowMetadataViaMcp(
    tenantId: string,
    n8nWorkflowId: string
  ): Promise<InputSchema | null> {
    try {
      // Call n8n-sync edge function to pull workflow
      const { data, error } = await supabase.functions.invoke('n8n-sync', {
        body: {
          action: 'pull',
          tenantId,
          workflowId: n8nWorkflowId,
        },
      });

      if (error || !data?.workflow) {
        console.error('[WorkflowCompatibilityService] MCP pull failed:', error);
        return null;
      }

      // Parse the pulled workflow
      return this.parseWorkflowJson(data.workflow);
    } catch (err) {
      console.error('[WorkflowCompatibilityService] MCP error:', err);
      return null;
    }
  }

  /**
   * Get all workflows compatible with OCR output
   * Uses hierarchical approach: local first, MCP fallback
   */
  static async getCompatibleWorkflows(
    tenantId: string,
    outputType: 'ocr' | 'invoice' | 'expense' = 'ocr'
  ): Promise<WorkflowCompatibilityResult[]> {
    // 1. Get all workflow integration definitions with webhook paths
    const { data: workflows, error } = await supabase
      .from('integration_definitions')
      .select('id, key, name, description, workflow_json, n8n_workflow_id, n8n_webhook_path')
      .eq('type', 'workflow')
      .eq('is_active', true)
      .not('n8n_webhook_path', 'is', null);

    if (error) {
      console.error('[WorkflowCompatibilityService] Failed to fetch workflows:', error);
      return [];
    }

    const results: WorkflowCompatibilityResult[] = [];

    for (const workflow of workflows || []) {
      let inputSchema: InputSchema;
      
      // 2. Try local parsing first (fast)
      if (workflow.workflow_json) {
        inputSchema = this.parseWorkflowJson(workflow.workflow_json);
      } else if (workflow.n8n_workflow_id) {
        // 3. Fallback to MCP if no local workflow_json
        const mcpSchema = await this.getWorkflowMetadataViaMcp(tenantId, workflow.n8n_workflow_id);
        inputSchema = mcpSchema || { type: 'unknown' };
      } else {
        inputSchema = { type: 'unknown' };
      }

      // 4. Check compatibility (100% match only)
      const compatibility = outputType === 'ocr' 
        ? this.checkOcrCompatibility(inputSchema)
        : this.checkOcrCompatibility(inputSchema); // TODO: Add other output types

      // Only include if 100% compatible (aggressive filtering)
      if (compatibility.compatible) {
        results.push({
          workflowId: workflow.n8n_workflow_id || '',
          integrationDefId: workflow.id,
          name: workflow.name,
          isCompatible: true,
          compatibilityScore: compatibility.score,
          reason: compatibility.reason,
          webhookPath: workflow.n8n_webhook_path || undefined,
        });
      }
    }

    return results;
  }

  /**
   * Check a single workflow for compatibility
   */
  static async checkWorkflowCompatibility(
    integrationDefId: string,
    tenantId: string
  ): Promise<WorkflowCompatibilityResult | null> {
    const { data: workflow, error } = await supabase
      .from('integration_definitions')
      .select('id, key, name, workflow_json, n8n_workflow_id, n8n_webhook_path')
      .eq('id', integrationDefId)
      .single();

    if (error || !workflow) {
      return null;
    }

    let inputSchema: InputSchema;
    
    if (workflow.workflow_json) {
      inputSchema = this.parseWorkflowJson(workflow.workflow_json);
    } else if (workflow.n8n_workflow_id) {
      const mcpSchema = await this.getWorkflowMetadataViaMcp(tenantId, workflow.n8n_workflow_id);
      inputSchema = mcpSchema || { type: 'unknown' };
    } else {
      inputSchema = { type: 'unknown' };
    }

    const compatibility = this.checkOcrCompatibility(inputSchema);

    return {
      workflowId: workflow.n8n_workflow_id || '',
      integrationDefId: workflow.id,
      name: workflow.name,
      isCompatible: compatibility.compatible,
      compatibilityScore: compatibility.score,
      reason: compatibility.reason,
      webhookPath: workflow.n8n_webhook_path || undefined,
    };
  }
}

// Export convenience functions
export const parseWorkflowJson = WorkflowCompatibilityService.parseWorkflowJson.bind(WorkflowCompatibilityService);
export const checkOcrCompatibility = WorkflowCompatibilityService.checkOcrCompatibility.bind(WorkflowCompatibilityService);
export const getCompatibleWorkflows = WorkflowCompatibilityService.getCompatibleWorkflows.bind(WorkflowCompatibilityService);

