/**
 * Notion Sync Service
 * 
 * Syncs capability specifications to Notion via n8n workflow.
 * Uses the existing workflow_templates table from workshop_integration migration.
 */

import { supabase } from '@/integrations/supabase/client';

export interface NotionSyncResult {
  success: boolean;
  notionUrl?: string;
  error?: string;
}

/**
 * Trigger n8n workflow to sync capability to Notion
 * Uses workflow_templates.key = 'sync-capability-to-notion'
 */
export async function syncCapabilityToNotion(capabilityId: string): Promise<NotionSyncResult> {
  try {
    // Get the capability first
    const { data: capability, error: capError } = await supabase
      .from('capabilities')
      .select('*')
      .eq('id', capabilityId)
      .single();
    
    if (capError || !capability) {
      return { success: false, error: 'Capability not found' };
    }

    // Trigger n8n workflow (uses workflow_templates table)
    const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
      body: {
        workflowKey: 'sync-capability-to-notion',  // Matches workflow_templates.key
        input: {
          capability_id: capabilityId,
          capability_key: capability.key,
          capability_name: capability.name,
        },
      },
    });

    if (error) {
      console.error('[NotionSync] Failed to trigger workflow:', error);
      return { success: false, error: error.message };
    }

    // The workflow will update the capability with the Notion URL
    // We can optionally wait and fetch it
    if (data?.data?.notion_url) {
      return { success: true, notionUrl: data.data.notion_url };
    }

    return { success: true };
  } catch (err) {
    console.error('[NotionSync] Error:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Bulk sync all capabilities to Notion
 */
export async function syncAllCapabilitiesToNotion(): Promise<{
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    total: 0,
    synced: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Get all active capabilities without documentation_url
    const { data: capabilities, error } = await supabase
      .from('capabilities')
      .select('id, key, name')
      .eq('is_active', true)
      .is('documentation_url', null);

    if (error) throw error;
    if (!capabilities?.length) return result;

    result.total = capabilities.length;

    for (const cap of capabilities) {
      const syncResult = await syncCapabilityToNotion(cap.id);
      if (syncResult.success) {
        result.synced++;
      } else {
        result.failed++;
        result.errors.push(`${cap.key}: ${syncResult.error}`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (err) {
    result.errors.push((err as Error).message);
  }

  return result;
}

