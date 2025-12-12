/**
 * DestinationService
 * 
 * Manages capability output destinations - where processed data can be routed.
 * Supports three destination types:
 * - Capabilities: Other capabilities that accept matching input types
 * - Integrations: n8n workflows or other integration definitions (filtered by compatibility)
 * - Webhooks: Custom HTTP endpoints (advanced use)
 * 
 * Additionally supports:
 * - Create new workflow: Opens workflow-builder capability to create compatible workflow
 */

import { supabase } from "@/integrations/supabase/client";
import type { 
  Capability, 
  CapabilityDestination, 
  CapabilityIOType,
  DestinationType 
} from "../types/capability.types";
import { WorkflowCompatibilityService } from "./workflowCompatibilityService";

export interface DestinationOption {
  id: string;
  type: DestinationType | 'create_workflow';
  name: string;
  description: string | null;
  icon_name: string | null;
  accepts_types: CapabilityIOType[];
  // For integrations
  integration_key?: string;
  integration_type?: string;
  // For capabilities
  capability_key?: string;
  // For compatibility info
  isCompatible?: boolean;
  compatibilityScore?: number;
  webhookPath?: string;
}

export interface DestinationGroup {
  type: DestinationType;
  label: string;
  options: DestinationOption[];
}

export class DestinationService {
  /**
   * Get all available destinations for a capability's output types
   * Returns destinations grouped by type
   */
  static async getCompatibleDestinations(
    sourceCapabilityId: string,
    outputTypes?: CapabilityIOType[]
  ): Promise<DestinationGroup[]> {
    // Get source capability if output types not provided
    let effectiveOutputTypes = outputTypes;
    if (!effectiveOutputTypes) {
      const { data: sourceCap } = await supabase
        .from("capabilities")
        .select("output_types")
        .eq("id", sourceCapabilityId)
        .single();
      
      effectiveOutputTypes = (sourceCap?.output_types as CapabilityIOType[]) || [];
    }

    const groups: DestinationGroup[] = [];

    // 0. Always add content_library as default destination (if source capability supports it)
    const { data: sourceCap } = await supabase
      .from("capabilities")
      .select("destination_config, key")
      .eq("id", sourceCapabilityId)
      .single();
    
    const defaultDest = sourceCap?.destination_config as { default_destination?: string; auto_store?: boolean } | null;
    if (defaultDest?.default_destination === 'content_library' || defaultDest?.auto_store) {
      // Check if content-library capability exists
      const { data: contentLibCap } = await supabase
        .from("capabilities")
        .select("id, key, name, description, icon_name, input_types")
        .eq("key", "content-library")
        .eq("is_active", true)
        .single();
      
      if (contentLibCap) {
        groups.push({
          type: 'capability',
          label: 'Capabilities',
          options: [{
            id: contentLibCap.id,
            type: 'capability',
            name: 'Lagre i Content Library',
            description: 'Lagrer ekstrahert tekst i content_library tabellen (standard)',
            icon_name: contentLibCap.icon_name || 'Database',
            accepts_types: (contentLibCap.input_types as CapabilityIOType[]) || ['text', 'json'],
            capability_key: contentLibCap.key,
          }],
        });
      }
    }

    // 1. Get compatible capabilities (excluding content-library if already added)
    const capabilityOptions = await this.getCapabilityDestinations(
      sourceCapabilityId,
      effectiveOutputTypes
    );
    
    // Filter out content-library if we already added it
    const filteredCapabilities = capabilityOptions.filter(
      opt => opt.capability_key !== 'content-library'
    );
    
    if (filteredCapabilities.length > 0) {
      // Add to existing group or create new one
      const existingGroup = groups.find(g => g.type === 'capability');
      if (existingGroup) {
        existingGroup.options.push(...filteredCapabilities);
      } else {
        groups.push({
          type: 'capability',
          label: 'Capabilities',
          options: filteredCapabilities,
        });
      }
    }

    // 2. Get compatible workflow integrations (n8n workflows)
    // Uses WorkflowCompatibilityService for filtering - only 100% compatible shown
    const integrationOptions = await this.getIntegrationDestinations(
      effectiveOutputTypes,
      sourceCapabilityId
    );
    
    if (integrationOptions.length > 0) {
      groups.push({
        type: 'integration',
        label: 'Kompatible workflows',
        options: integrationOptions,
      });
    }

    // 3. Add "Create new workflow" option (calls workflow-builder capability)
    // Use a unique type to avoid duplicate key warning
    groups.push({
      type: 'create_workflow' as DestinationType,
      label: 'Opprett ny',
      options: [{
        id: 'create-new-workflow',
        type: 'create_workflow' as DestinationType,
        name: 'Opprett ny n8n workflow',
        description: 'Opprett en ny workflow som aksepterer dette dataformatet',
        icon_name: 'Plus',
        accepts_types: effectiveOutputTypes,
      }],
    });

    // 4. Add webhook option (always available for advanced users)
    groups.push({
      type: 'webhook',
      label: 'Egendefinert',
      options: [{
        id: 'custom-webhook',
        type: 'webhook',
        name: 'Egendefinert webhook',
        description: 'Send data til en egendefinert URL',
        icon_name: 'Webhook',
        accepts_types: effectiveOutputTypes,
      }],
    });

    return groups;
  }

  /**
   * Get capabilities that can accept the given output types
   */
  private static async getCapabilityDestinations(
    sourceCapabilityId: string,
    outputTypes: CapabilityIOType[]
  ): Promise<DestinationOption[]> {
    if (outputTypes.length === 0) return [];

    // Get capabilities with matching input_types
    const { data: capabilities, error } = await supabase
      .from("capabilities")
      .select("id, key, name, description, icon_name, input_types")
      .neq("id", sourceCapabilityId) // Exclude source capability
      .eq("is_active", true)
      .overlaps("input_types", outputTypes);

    if (error) {
      console.error("Error fetching capability destinations:", error);
      return [];
    }

    return (capabilities || []).map(cap => ({
      id: cap.id,
      type: 'capability' as DestinationType,
      name: cap.name,
      description: cap.description,
      icon_name: cap.icon_name,
      accepts_types: (cap.input_types as CapabilityIOType[]) || [],
      capability_key: cap.key,
    }));
  }

  /**
   * Get integration definitions that can receive data
   * Uses WorkflowCompatibilityService to filter - only 100% compatible workflows shown
   */
  private static async getIntegrationDestinations(
    outputTypes: CapabilityIOType[],
    sourceCapabilityId: string
  ): Promise<DestinationOption[]> {
    try {
      // Get tenant ID from user context - try multiple approaches
      const tenantId = await this.getTenantIdForCurrentUser();
      
      if (!tenantId) {
        // Fall back to showing all workflows without compatibility check
        console.warn("No tenant ID found, showing all workflows without compatibility check");
        return this.getAllWorkflowDestinations(outputTypes);
      }

      // Use WorkflowCompatibilityService to get only compatible workflows
      const compatibleWorkflows = await WorkflowCompatibilityService.getCompatibleWorkflows(
        tenantId,
        'ocr' // TODO: Determine output type from source capability
      );

      return compatibleWorkflows.map(wf => ({
        id: wf.integrationDefId,
        type: 'integration' as DestinationType,
        name: wf.name,
        description: wf.reason || 'Kompatibel med dette dataformatet',
        icon_name: 'Workflow',
        accepts_types: outputTypes,
        integration_key: wf.workflowId,
        integration_type: 'workflow',
        isCompatible: wf.isCompatible,
        compatibilityScore: wf.compatibilityScore,
        webhookPath: wf.webhookPath,
      }));
    } catch (err) {
      console.error("Error fetching compatible workflows:", err);
      return [];
    }
  }

  /**
   * Get tenant ID for current user - tries multiple approaches
   */
  private static async getTenantIdForCurrentUser(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try 1: Get from any user_role with scope_id
    const { data: roleWithScope } = await supabase
      .from("user_roles")
      .select("scope_id")
      .eq("user_id", user.id)
      .not("scope_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (roleWithScope?.scope_id) {
      return roleWithScope.scope_id;
    }

    // Try 2: Check if user has platform role (platform_admin, platform_owner)
    // In this case, use first active tenant as default
    const { data: platformRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["platform_admin", "platform_owner"])
      .limit(1)
      .maybeSingle();

    if (platformRole) {
      // Platform user - get first active tenant
      const { data: firstTenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      return firstTenant?.id || null;
    }

    // Try 3: Check user metadata for tenant_id
    const tenantIdFromMeta = user.user_metadata?.tenant_id;
    if (tenantIdFromMeta) {
      return tenantIdFromMeta;
    }

    return null;
  }

  /**
   * Fallback: Get all workflows without compatibility check
   */
  private static async getAllWorkflowDestinations(
    outputTypes: CapabilityIOType[]
  ): Promise<DestinationOption[]> {
    const { data: integrations, error } = await supabase
      .from("integration_definitions")
      .select("id, key, name, description, icon_name, type, n8n_webhook_path")
      .eq("type", "workflow")
      .eq("is_active", true)
      .not("n8n_webhook_path", "is", null);

    if (error) {
      console.error("Error fetching workflow destinations:", error);
      return [];
    }

    return (integrations || []).map(int => ({
      id: int.id,
      type: 'integration' as DestinationType,
      name: int.name,
      description: int.description,
      icon_name: int.icon_name || 'Workflow',
      accepts_types: outputTypes,
      integration_key: int.key,
      integration_type: int.type,
    }));
  }

  /**
   * Get configured destinations for a capability
   * Returns empty array if table doesn't exist yet (migration not run)
   */
  static async getCapabilityDestinations(
    capabilityId: string
  ): Promise<CapabilityDestination[]> {
    try {
      const { data, error } = await supabase
        .from("capability_destinations")
        .select(`
          *,
          destination_capability:capabilities!destination_id(id, key, name, icon_name),
          destination_integration:integration_definitions!destination_id(id, key, name, type, icon_name)
        `)
        .eq("source_capability_id", capabilityId)
        .eq("is_enabled", true)
        .order("priority", { ascending: false });

      if (error) {
        // Table might not exist yet - return empty array instead of throwing
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          console.warn("capability_destinations table not found - migration may not be run yet");
          return [];
        }
        console.error("Error fetching capability destinations:", error);
        return [];
      }

      return (data || []) as CapabilityDestination[];
    } catch (error) {
      console.warn("Error fetching capability destinations:", error);
      return [];
    }
  }

  /**
   * Add a destination for a capability
   */
  static async addDestination(
    sourceCapabilityId: string,
    destinationType: DestinationType,
    destinationId: string | null,
    destinationUrl: string | null = null,
    config: Record<string, unknown> = {}
  ): Promise<CapabilityDestination> {
    const { data, error } = await supabase
      .from("capability_destinations")
      .insert([{
        source_capability_id: sourceCapabilityId,
        destination_type: destinationType,
        destination_id: destinationId,
        destination_url: destinationUrl,
        config,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as CapabilityDestination;
  }

  /**
   * Remove a destination
   */
  static async removeDestination(destinationId: string): Promise<void> {
    const { error } = await supabase
      .from("capability_destinations")
      .delete()
      .eq("id", destinationId);

    if (error) throw error;
  }

  /**
   * Update destination configuration
   */
  static async updateDestination(
    destinationId: string,
    updates: Partial<Pick<CapabilityDestination, 'config' | 'priority' | 'is_enabled'>>
  ): Promise<CapabilityDestination> {
    const { data, error } = await supabase
      .from("capability_destinations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", destinationId)
      .select()
      .single();

    if (error) throw error;
    return data as CapabilityDestination;
  }

  /**
   * Send data to a destination
   * Used after capability processing is complete
   */
  static async sendToDestination(
    destination: CapabilityDestination,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (destination.destination_type) {
        case 'capability':
          // Special handling for content-library capability
          if (destination.destination_id) {
            // Get capability to check if it's content-library
            const { data: destCap } = await supabase
              .from("capabilities")
              .select("key")
              .eq("id", destination.destination_id)
              .single();
            
            if (destCap?.key === 'content-library') {
              // Save to content_library table
              // Get tenant_id from auth context (RLS will handle tenant isolation)
              const { data: { user } } = await supabase.auth.getUser();
              const { data: userRole } = user ? await supabase
                .from("user_roles")
                .select("scope_id")
                .eq("user_id", user.id)
                .eq("role", "tenant_admin")
                .single() : { data: null };
              
              const { error: insertError } = await supabase
                .from("content_library")
                .insert({
                  title: (data.fileName as string)?.replace(/\.[^/.]+$/, '') || 'OCR Resultat',
                  extracted_text: data.extractedText as string,
                  ocr_status: 'completed',
                  ocr_confidence: data.confidence as number,
                  ocr_provider: data.provider as string,
                  file_type: (data.fileType as string)?.split('/').pop()?.split(';')[0] || 'unknown',
                  original_filename: (data.fileName as string) || null,
                  tenant_id: userRole?.scope_id || null, // null = platform-wide
                  is_active: true,
                });
              
              if (insertError) {
                return { success: false, error: insertError.message };
              }
              return { success: true };
            }
          }
          
          // For other capability destinations, we'd typically trigger another capability
          // This is a placeholder - actual implementation depends on capability interface
          console.log(`Sending to capability ${destination.destination_id}:`, data);
          return { success: true };

        case 'integration':
          // Trigger n8n workflow via webhook
          if (!destination.destination_id) {
            return { success: false, error: 'No integration ID configured' };
          }
          
          // Get webhook URL for the integration
          const { data: integration } = await supabase
            .from("integration_definitions")
            .select("n8n_webhook_path")
            .eq("id", destination.destination_id)
            .single();

          if (!integration?.n8n_webhook_path) {
            return { success: false, error: 'Integration has no webhook configured' };
          }

          // Build full webhook URL
          // n8n_webhook_path can be relative (/webhook/...) or full URL
          let webhookUrl = integration.n8n_webhook_path;
          if (webhookUrl.startsWith('/webhook/')) {
            // Add n8n base URL - TODO: Make this configurable per tenant
            const n8nBaseUrl = 'https://jardam.app.n8n.cloud';
            webhookUrl = `${n8nBaseUrl}${webhookUrl}`;
          }

          console.log('[DestinationService] Calling webhook:', webhookUrl);

          // Call the n8n webhook
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data,
              _source: 'capability_destination',
              _timestamp: new Date().toISOString(),
            }),
          });

          if (!webhookResponse.ok) {
            const errorBody = await webhookResponse.text().catch(() => '');
            console.error('[DestinationService] Webhook error:', webhookResponse.status, errorBody);
            return { 
              success: false, 
              error: `Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}` 
            };
          }
          return { success: true };

        case 'webhook':
          // Custom webhook
          if (!destination.destination_url) {
            return { success: false, error: 'No webhook URL configured' };
          }

          const customResponse = await fetch(destination.destination_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!customResponse.ok) {
            return { 
              success: false, 
              error: `Webhook failed: ${customResponse.status} ${customResponse.statusText}` 
            };
          }
          return { success: true };

        default:
          return { success: false, error: `Unknown destination type: ${destination.destination_type}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

