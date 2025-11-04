/**
 * Capability Service
 * Manages capability catalog operations
 */

import { supabase } from "@/integrations/supabase/client";
import type { 
  Capability, 
  CapabilityFilters, 
  CapabilityInput,
  CapabilityVersion 
} from "../types/capability.types";

export class CapabilityService {
  /**
   * List all capabilities with optional filters
   */
  static async listCapabilities(filters?: CapabilityFilters): Promise<Capability[]> {
    let query = supabase
      .from("capabilities")
      .select(`
        *,
        usage_count:app_capability_usage(count)
      `)
      .order("name");

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    if (filters?.scope) {
      query = query.eq("scope", filters.scope);
    }

    if (filters?.appDefinitionId) {
      query = query.eq("app_definition_id", filters.appDefinitionId);
    }

    if (filters?.query) {
      query = query.or(
        `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,key.ilike.%${filters.query}%`
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Transform usage_count from array to number
    return (data || []).map(cap => ({
      ...cap,
      usage_count: Array.isArray(cap.usage_count) ? cap.usage_count.length : 0,
    })) as Capability[];
  }

  /**
   * Get single capability by ID or key
   */
  static async getCapability(idOrKey: string): Promise<Capability | null> {
    // Check if it looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey);
    
    let query = supabase
      .from("capabilities")
      .select("*");

    if (isUuid) {
      // Try ID first if it's a UUID
      query = query.eq("id", idOrKey);
    } else {
      // Otherwise search by key
      query = query.eq("key", idOrKey);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Capability | null;
  }

  /**
   * Create new capability
   */
  static async createCapability(input: CapabilityInput): Promise<Capability> {
    const { data, error } = await supabase
      .from("capabilities")
      .insert([{
        key: input.key,
        name: input.name,
        description: input.description || null,
        category: input.category,
        scope: input.scope || "platform",
        app_definition_id: input.app_definition_id || null,
        current_version: input.current_version || "1.0.0",
        estimated_dev_hours: input.estimated_dev_hours || null,
        price_per_month: input.price_per_month || null,
        dependencies: input.dependencies || [],
        demo_url: input.demo_url || null,
        documentation_url: input.documentation_url || null,
        icon_name: input.icon_name || null,
        tags: input.tags || [],
        frontend_files: input.frontend_files || [],
        backend_files: input.backend_files || [],
        hooks: input.hooks || [],
        domain_tables: input.domain_tables || [],
        database_migrations: input.database_migrations || [],
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Capability;
  }

  /**
   * Update capability
   */
  static async updateCapability(id: string, updates: Partial<CapabilityInput>): Promise<Capability> {
    const { data, error } = await supabase
      .from("capabilities")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Capability;
  }

  /**
   * Delete capability
   */
  static async deleteCapability(id: string): Promise<void> {
    const { error } = await supabase
      .from("capabilities")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Get all versions for a capability
   */
  static async getVersions(capabilityId: string): Promise<CapabilityVersion[]> {
    const { data, error } = await supabase
      .from("capability_versions")
      .select("*")
      .eq("capability_id", capabilityId)
      .order("released_at", { ascending: false });

    if (error) throw error;
    return (data || []) as CapabilityVersion[];
  }

  /**
   * Release new version
   */
  static async releaseVersion(
    capabilityId: string,
    version: string,
    changelog?: string,
    breakingChanges: boolean = false
  ): Promise<CapabilityVersion> {
    const { data, error } = await supabase
      .from("capability_versions")
      .insert([{
        capability_id: capabilityId,
        version,
        changelog: changelog || null,
        breaking_changes: breakingChanges,
      }])
      .select()
      .single();

    if (error) throw error;

    // Update current_version on capability
    await supabase
      .from("capabilities")
      .update({ current_version: version })
      .eq("id", capabilityId);

    return data as CapabilityVersion;
  }

  /**
   * Get capabilities by category
   */
  static async getByCategory(category: string): Promise<Capability[]> {
    return this.listCapabilities({ category: category as any });
  }

  /**
   * Search capabilities
   */
  static async search(query: string): Promise<Capability[]> {
    return this.listCapabilities({ query });
  }
}
