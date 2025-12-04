/**
 * n8n Sync Service
 * Bi-directional sync between platform and n8n
 * 
 * Flow:
 * 1. Generate workflow JSON on platform (AI-assisted)
 * 2. Push to n8n via API
 * 3. User edits in n8n editor
 * 4. Pull changes back to platform
 * 5. Link workflow to apps/capabilities
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  N8nWorkflow, 
  N8nSyncResult, 
  IntegrationDefinition 
} from '../types/integrationRegistry.types';

// ============================================================================
// Types
// ============================================================================

interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

interface N8nApiResponse<T> {
  data?: T;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

export class N8nSyncService {
  /**
   * Get n8n config from tenant integrations
   */
  static async getN8nConfig(tenantId: string): Promise<N8nConfig | null> {
    const { data, error } = await supabase
      .from('tenant_integrations')
      .select('config, credentials')
      .eq('tenant_id', tenantId)
      .eq('adapter_id', 'n8n')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      console.error('[n8nSyncService] Failed to get n8n config:', error);
      return null;
    }

    const config = data.config as Record<string, any>;
    const credentials = data.credentials as Record<string, any> | null;

    return {
      baseUrl: config?.base_url || config?.n8n_base_url || 'https://jardam.app.n8n.cloud',
      apiKey: credentials?.api_key || credentials?.N8N_API_KEY || '',
    };
  }

  /**
   * Push workflow to n8n (create new)
   */
  static async pushWorkflow(
    tenantId: string,
    workflow: Partial<N8nWorkflow>
  ): Promise<N8nSyncResult> {
    try {
      // Call edge function for API communication
      const { data, error } = await supabase.functions.invoke('n8n-sync', {
        body: {
          action: 'push',
          tenantId,
          workflow,
        },
      });

      if (error) {
        console.error('[n8nSyncService] Push failed:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        workflow_id: data?.workflow?.id,
        webhook_path: this.extractWebhookPath(data?.workflow),
      };
    } catch (err) {
      console.error('[n8nSyncService] Push error:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Pull workflow from n8n (sync changes)
   */
  static async pullWorkflow(
    tenantId: string,
    n8nWorkflowId: string
  ): Promise<N8nSyncResult & { workflow?: N8nWorkflow }> {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-sync', {
        body: {
          action: 'pull',
          tenantId,
          workflowId: n8nWorkflowId,
        },
      });

      if (error) {
        console.error('[n8nSyncService] Pull failed:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        workflow_id: data?.workflow?.id,
        webhook_path: this.extractWebhookPath(data?.workflow),
        workflow: data?.workflow,
      };
    } catch (err) {
      console.error('[n8nSyncService] Pull error:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * List all workflows from n8n
   */
  static async listWorkflows(tenantId: string): Promise<N8nWorkflow[]> {
    try {
      console.log('[n8nSyncService] Listing workflows for tenant:', tenantId);
      
      const { data, error } = await supabase.functions.invoke('n8n-sync', {
        body: {
          action: 'list',
          tenantId,
        },
      });

      console.log('[n8nSyncService] Response:', { data, error });

      if (error) {
        console.error('[n8nSyncService] List failed:', error);
        // Throw error instead of silently returning empty array
        throw new Error(error.message || 'Failed to list workflows from n8n');
      }

      if (data?.error) {
        console.error('[n8nSyncService] API error:', data.error, data.debug);
        const debugMsg = data.debug 
          ? ` (envVars: N8N_API_KEY_APPBUILDER_PLATFORM=${data.debug.envVars?.hasN8N_API_KEY_APPBUILDER_PLATFORM})` 
          : '';
        throw new Error(data.error + debugMsg);
      }

      return data?.workflows || [];
    } catch (err) {
      console.error('[n8nSyncService] List error:', err);
      throw err; // Re-throw to propagate error
    }
  }

  /**
   * Sync workflow from n8n to platform database
   */
  static async syncToDatabase(
    tenantId: string,
    n8nWorkflowId: string,
    integrationKey?: string
  ): Promise<N8nSyncResult> {
    // 1. Pull from n8n
    const pullResult = await this.pullWorkflow(tenantId, n8nWorkflowId);
    if (!pullResult.success || !pullResult.workflow) {
      return pullResult;
    }

    const workflow = pullResult.workflow;
    const key = integrationKey || this.generateKey(workflow.name);

    // 2. Upsert to integration_definitions
    const { error } = await supabase
      .from('integration_definitions')
      .upsert({
        key,
        name: workflow.name,
        description: `n8n workflow: ${workflow.name}`,
        type: 'workflow',
        icon_name: 'Workflow',
        n8n_workflow_id: workflow.id,
        n8n_webhook_path: this.extractWebhookPath(workflow),
        workflow_json: workflow as any,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        requires_credentials: true,
        is_active: workflow.active,
      }, { onConflict: 'key' });

    if (error) {
      console.error('[n8nSyncService] Database sync failed:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      workflow_id: workflow.id,
      webhook_path: this.extractWebhookPath(workflow),
    };
  }

  /**
   * Sync all workflows from n8n to platform
   * Matches by webhook path to existing integration_definitions
   */
  static async syncAllFromN8n(tenantId: string): Promise<{ 
    synced: number; 
    failed: number; 
    errors: string[];
    matched: string[];
  }> {
    console.log('[n8nSyncService] syncAllFromN8n starting for tenant:', tenantId);
    
    const workflows = await this.listWorkflows(tenantId);
    console.log('[n8nSyncService] Found workflows:', workflows.length);
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    const matched: string[] = [];

    // Get existing integration_definitions with type='workflow'
    const { data: existingDefs } = await supabase
      .from('integration_definitions')
      .select('id, key, n8n_webhook_path')
      .eq('type', 'workflow');

    for (const workflow of workflows) {
      const webhookPath = this.extractWebhookPath(workflow);
      
      // Try to match by webhook path first
      const matchingDef = existingDefs?.find(def => 
        def.n8n_webhook_path && webhookPath && 
        (def.n8n_webhook_path === webhookPath || 
         webhookPath.includes(def.n8n_webhook_path.replace('/webhook/', '')) ||
         def.n8n_webhook_path.includes(workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')))
      );

      if (matchingDef) {
        // Update existing definition with n8n data
        const { error } = await supabase
          .from('integration_definitions')
          .update({
            n8n_workflow_id: workflow.id,
            workflow_json: workflow as any,
            last_synced_at: new Date().toISOString(),
            is_active: workflow.active,
          })
          .eq('id', matchingDef.id);

        if (error) {
          failed++;
          errors.push(`${workflow.name}: ${error.message}`);
        } else {
          synced++;
          matched.push(`${workflow.name} → ${matchingDef.key}`);
        }
      } else {
        // Create new definition
        const result = await this.syncToDatabase(tenantId, workflow.id);
        if (result.success) {
          synced++;
          matched.push(`${workflow.name} (ny)`);
        } else {
          failed++;
          errors.push(`${workflow.name}: ${result.error}`);
        }
      }
    }

    return { synced, failed, errors, matched };
  }

  /**
   * Sync a specific workflow by updating existing integration_definition
   */
  static async syncWorkflowToExistingDef(
    tenantId: string,
    n8nWorkflowId: string,
    integrationDefId: string
  ): Promise<N8nSyncResult> {
    // 1. Pull from n8n
    const pullResult = await this.pullWorkflow(tenantId, n8nWorkflowId);
    if (!pullResult.success || !pullResult.workflow) {
      return pullResult;
    }

    const workflow = pullResult.workflow;

    // 2. Update existing integration_definition
    const { error } = await supabase
      .from('integration_definitions')
      .update({
        n8n_workflow_id: workflow.id,
        n8n_webhook_path: this.extractWebhookPath(workflow),
        workflow_json: workflow as any,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        is_active: workflow.active,
      })
      .eq('id', integrationDefId);

    if (error) {
      console.error('[n8nSyncService] Sync to existing def failed:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      workflow_id: workflow.id,
      webhook_path: this.extractWebhookPath(workflow),
    };
  }

  /**
   * Extract webhook path from workflow definition
   */
  private static extractWebhookPath(workflow: N8nWorkflow | undefined): string | undefined {
    if (!workflow?.nodes) return undefined;

    const webhookNode = workflow.nodes.find(
      node => node.type === 'n8n-nodes-base.webhook'
    );

    if (webhookNode?.parameters?.path) {
      return `/webhook/${webhookNode.parameters.path}`;
    }

    return undefined;
  }

  /**
   * Generate a key from workflow name
   */
  private static generateKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate workflow JSON from specification (AI-assisted)
   */
  static async generateWorkflowJson(spec: {
    name: string;
    description: string;
    trigger: 'webhook' | 'schedule' | 'manual';
    steps: {
      type: string;
      name: string;
      config: Record<string, any>;
    }[];
  }): Promise<Partial<N8nWorkflow>> {
    // Build basic workflow structure
    const nodes: N8nWorkflow['nodes'] = [];
    let position: [number, number] = [250, 300];

    // Add trigger node
    if (spec.trigger === 'webhook') {
      nodes.push({
        id: 'webhook-trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [...position],
        parameters: {
          httpMethod: 'POST',
          path: spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          options: {},
        },
      });
      position = [position[0] + 220, position[1]];
    }

    // Add step nodes
    for (const step of spec.steps) {
      nodes.push({
        id: step.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: step.name,
        type: step.type,
        typeVersion: 1,
        position: [...position],
        parameters: step.config,
      });
      position = [position[0] + 220, position[1]];
    }

    // Build connections
    const connections: Record<string, any> = {};
    for (let i = 0; i < nodes.length - 1; i++) {
      connections[nodes[i].name] = {
        main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]],
      };
    }

    return {
      name: spec.name,
      nodes,
      connections,
      settings: { executionOrder: 'v1' },
      staticData: null,
      tags: [],
    };
  }
}

// Export singleton-style functions for convenience
export const pushWorkflowToN8n = N8nSyncService.pushWorkflow.bind(N8nSyncService);
export const pullWorkflowFromN8n = N8nSyncService.pullWorkflow.bind(N8nSyncService);
export const syncWorkflowToDatabase = N8nSyncService.syncToDatabase.bind(N8nSyncService);
export const syncAllWorkflowsFromN8n = N8nSyncService.syncAllFromN8n.bind(N8nSyncService);
export const syncWorkflowToExistingDef = N8nSyncService.syncWorkflowToExistingDef.bind(N8nSyncService);
export const listN8nWorkflows = N8nSyncService.listWorkflows.bind(N8nSyncService);
export const generateWorkflowJson = N8nSyncService.generateWorkflowJson.bind(N8nSyncService);

