import { supabase } from "@/integrations/supabase/client";
import type { IntegrationDefinition, IntegrationDefinitionInput, IntegrationDefinitionWithRelations } from "../types/integrationDefinition.types";
import { transformExternalSystemToDefinition } from "../utils/seedMappingLogic";

/**
 * Integration Definition Service
 * 
 * VIKTIG: Denne servicen leser KUN fra integration_definitions.
 * Ingen fallback til external_systems - det er en katalog, ikke runtime-data.
 * 
 * For å populere integration_definitions fra external_systems, bruk:
 * - bulkSyncFromExternalSystems() (admin-funksjon)
 */
export class IntegrationDefinitionService {
  static async list(): Promise<IntegrationDefinitionWithRelations[]> {
    console.log('[IntegrationDefinitionService] Starting list query...');
    
    // Simple query - avoiding type issues
    const { data, error } = await supabase
      .from("integration_definitions" as any)
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error('[IntegrationDefinitionService] Query error:', error);
      throw error;
    }
    
    console.log('[IntegrationDefinitionService] Got', data?.length, 'rows');
    
    // Return data with empty relation names for now
    return ((data || []) as any[]).map(item => ({
      ...item,
      category_name: null,
      vendor_name: null,
      external_system_name: null,
    }));
  }

  static async getById(id: string): Promise<IntegrationDefinitionWithRelations | null> {
    console.log('[IntegrationDefinitionService] getById:', id);
    
    const { data, error } = await supabase
      .from("integration_definitions" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error('[IntegrationDefinitionService] getById error:', error);
      throw error;
    }
    
    if (!data) {
      console.log('[IntegrationDefinitionService] getById: not found');
      return null;
    }

    console.log('[IntegrationDefinitionService] getById: found', data.name);
    return {
      ...data,
      category_name: null,
      vendor_name: null,
      external_system_name: null,
    } as IntegrationDefinitionWithRelations;
  }

  static async getByKey(key: string): Promise<IntegrationDefinition | null> {
    const { data, error } = await supabase
      .from("integration_definitions")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as IntegrationDefinition | null;
  }

  static async filterByCategory(categoryId: string): Promise<IntegrationDefinitionWithRelations[]> {
    const { data, error } = await supabase
      .from("integration_definitions")
      .select(`
        *,
        category:app_categories(name),
        vendor:external_system_vendors(name),
        external_system:external_systems(name)
      `)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    
    return ((data || []) as any[]).map(item => ({
      ...item,
      category_name: item.category?.name,
      vendor_name: item.vendor?.name,
      external_system_name: item.external_system?.name,
    }));
  }

  static async create(input: IntegrationDefinitionInput): Promise<IntegrationDefinition> {
    const { data, error } = await supabase
      .from("integration_definitions" as any)
      .insert({
        ...input,
        category_id: input.category_id || null,
        vendor_id: input.vendor_id || null,
        external_system_id: (input as any).external_system_id || null,
        description: input.description || null,
        documentation_url: input.documentation_url || null,
        setup_guide_url: input.setup_guide_url || null,
        default_delivery_method: input.default_delivery_method || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as IntegrationDefinition;
  }

  static async update(id: string, input: Partial<IntegrationDefinitionInput>): Promise<IntegrationDefinition> {
    const { data, error } = await supabase
      .from("integration_definitions" as any)
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as IntegrationDefinition;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("integration_definitions" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("integration_definitions" as any)
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Re-sync an integration definition from its external_system
   */
  /**
   * Bulk sync all external systems to integration definitions
   * Creates new definitions or updates existing ones based on external_system_id
   */
  static async bulkSyncFromExternalSystems(): Promise<{
    created: number;
    updated: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    try {
      // Get all active external systems
      const { data: systems, error: systemsError } = await supabase
        .from("external_systems")
        .select("*")
        .eq("status", "Active");

      if (systemsError) throw systemsError;
      if (!systems || systems.length === 0) return results;

      // Process each system
      for (const system of systems) {
        try {
          // Check if definition already exists for this external_system_id
          const { data: existing } = await supabase
            .from("integration_definitions")
            .select("id")
            .eq("external_system_id", system.id)
            .maybeSingle();

          const transformed = transformExternalSystemToDefinition(system as any);

          if (existing) {
            // Update existing definition
            const { error: updateError } = await supabase
              .from("integration_definitions")
              .update({
                name: transformed.name,
                description: transformed.description,
                category_id: transformed.category_id,
                vendor_id: transformed.vendor_id,
                supported_delivery_methods: transformed.supported_delivery_methods,
                default_delivery_method: transformed.default_delivery_method,
                documentation_url: transformed.documentation_url,
                setup_guide_url: transformed.setup_guide_url,
                requires_credentials: transformed.requires_credentials,
                default_config: transformed.default_config,
                capabilities: transformed.capabilities,
                tags: transformed.tags,
                is_active: transformed.is_active,
              })
              .eq("id", existing.id);

            if (updateError) throw updateError;
            results.updated++;
          } else {
            // Create new definition
            const { error: insertError } = await supabase
              .from("integration_definitions")
              .insert(transformed);

            if (insertError) throw insertError;
            results.created++;
          }
        } catch (err: any) {
          results.errors.push({
            id: system.id,
            error: err.message || "Unknown error",
          });
        }
      }

      return results;
    } catch (err: any) {
      throw new Error(`Bulk sync failed: ${err.message}`);
    }
  }

  static async resyncFromExternalSystem(definitionId: string): Promise<IntegrationDefinition> {
    // Get the definition with its external_system_id
    const { data: definition, error: defError } = await supabase
      .from("integration_definitions" as any)
      .select("external_system_id")
      .eq("id", definitionId)
      .maybeSingle();

    if (defError) throw defError;
    
    const def = definition as any;
    if (!def?.external_system_id) {
      throw new Error("Definition not found or not linked to external system");
    }

    // Fetch the external system
    const { data: system, error: sysError } = await supabase
      .from("external_systems" as any)
      .select("*")
      .eq("id", def.external_system_id)
      .maybeSingle();

    if (sysError) throw sysError;
    if (!system) throw new Error("External system not found");

    // Transform and update
    const transformed = transformExternalSystemToDefinition(system as any);
    const { data: updated, error: updateError } = await supabase
      .from("integration_definitions" as any)
      .update({
        name: transformed.name,
        description: transformed.description,
        supported_delivery_methods: transformed.supported_delivery_methods,
        default_delivery_method: transformed.default_delivery_method,
        documentation_url: transformed.documentation_url,
        setup_guide_url: transformed.setup_guide_url,
        requires_credentials: transformed.requires_credentials,
        capabilities: transformed.capabilities,
        is_active: transformed.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", definitionId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updated as unknown as IntegrationDefinition;
  }
}
