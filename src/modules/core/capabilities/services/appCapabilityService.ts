/**
 * App Capability Service
 * Manages app-capability relationships
 */

import { supabase } from "@/integrations/supabase/client";
import type { AppCapabilityUsage, Capability } from "../types/capability.types";
import type { AppDefinition } from "../../applications/types/appRegistry.types";

export class AppCapabilityService {
  /**
   * Link a capability to an app
   */
  static async linkCapabilityToApp(
    appDefinitionId: string,
    capabilityId: string,
    isRequired: boolean = true,
    configSchema?: Record<string, any>
  ): Promise<AppCapabilityUsage> {
    const { data, error } = await supabase
      .from("app_capability_usage")
      .insert([{
        app_definition_id: appDefinitionId,
        capability_id: capabilityId,
        is_required: isRequired,
        config_schema: configSchema || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as AppCapabilityUsage;
  }

  /**
   * Unlink a capability from an app
   */
  static async unlinkCapabilityFromApp(
    appDefinitionId: string,
    capabilityId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("app_capability_usage")
      .delete()
      .eq("app_definition_id", appDefinitionId)
      .eq("capability_id", capabilityId);

    if (error) throw error;
  }

  /**
   * Get all capabilities for an app
   */
  static async getCapabilitiesForApp(appDefinitionId: string): Promise<Capability[]> {
    const { data, error } = await supabase
      .from("app_capability_usage")
      .select(`
        *,
        capability:capabilities(*)
      `)
      .eq("app_definition_id", appDefinitionId);

    if (error) throw error;
    return (data || []).map(usage => usage.capability).filter(Boolean) as Capability[];
  }

  /**
   * Get apps using a capability
   */
  static async getAppsUsingCapability(capabilityId: string): Promise<AppDefinition[]> {
    const { data, error } = await supabase
      .from("app_capability_usage")
      .select(`
        *,
        app_definition:app_definitions(*)
      `)
      .eq("capability_id", capabilityId);

    if (error) throw error;
    return (data || []).map(usage => usage.app_definition).filter(Boolean) as unknown as AppDefinition[];
  }

  /**
   * Get usage count for a capability
   */
  static async getCapabilityUsageCount(capabilityId: string): Promise<number> {
    const { count, error } = await supabase
      .from("app_capability_usage")
      .select("*", { count: "exact", head: true })
      .eq("capability_id", capabilityId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Sync capabilities from app definition manifest
   * Parses app_definitions.capabilities array and creates/links capabilities
   */
  static async syncAppCapabilities(appDefinitionId: string): Promise<void> {
    // Get app definition
    const { data: appDef, error: appError } = await supabase
      .from("app_definitions")
      .select("key, capabilities")
      .eq("id", appDefinitionId)
      .single();

    if (appError) throw appError;
    if (!appDef?.capabilities || appDef.capabilities.length === 0) return;

    // Process each capability key
    for (const capabilityKey of appDef.capabilities) {
      // Check if capability exists in catalog
      const { data: existingCap } = await supabase
        .from("capabilities")
        .select("id")
        .eq("key", capabilityKey)
        .single();

      let capabilityId: string;

      if (existingCap) {
        capabilityId = existingCap.id;
      } else {
        // Create app-specific capability
        const { data: newCap, error: createError } = await supabase
          .from("capabilities")
          .insert([{
            key: capabilityKey,
            name: capabilityKey.split('.').pop() || capabilityKey,
            description: `Auto-generated capability for ${appDef.key}`,
            category: "Business Logic",
            scope: "app-specific",
            app_definition_id: appDefinitionId,
            current_version: "1.0.0",
          }])
          .select("id")
          .single();

        if (createError) throw createError;
        capabilityId = newCap.id;
      }

      // Link to app (ignore duplicates)
      try {
        await supabase
          .from("app_capability_usage")
          .insert([{
            app_definition_id: appDefinitionId,
            capability_id: capabilityId,
            is_required: true,
          }])
          .select()
          .single();
      } catch (err: any) {
        // Ignore duplicate key errors
        if (err.code !== '23505') throw err;
      }
    }
  }

  /**
   * Get capability usage details
   */
  static async getUsageDetails(
    appDefinitionId: string,
    capabilityId: string
  ): Promise<AppCapabilityUsage | null> {
    const { data, error } = await supabase
      .from("app_capability_usage")
      .select("*")
      .eq("app_definition_id", appDefinitionId)
      .eq("capability_id", capabilityId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as AppCapabilityUsage | null;
  }
}
