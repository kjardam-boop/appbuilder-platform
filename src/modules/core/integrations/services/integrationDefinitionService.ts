import { supabase } from "@/integrations/supabase/client";
import type { IntegrationDefinition, IntegrationDefinitionInput, IntegrationDefinitionWithRelations } from "../types/integrationDefinition.types";

export class IntegrationDefinitionService {
  static async list(): Promise<IntegrationDefinitionWithRelations[]> {
    const { data, error } = await supabase
      .from("integration_definitions" as any)
      .select(`
        *,
        category:app_categories(name),
        vendor:external_system_vendors(name),
        external_system:external_systems(name)
      `)
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

  static async getById(id: string): Promise<IntegrationDefinitionWithRelations | null> {
    const { data, error } = await supabase
      .from("integration_definitions" as any)
      .select(`
        *,
        category:app_categories(name),
        vendor:external_system_vendors(name),
        external_system:external_systems(name)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const record = data as any;
    return {
      ...record,
      category_name: record.category?.name,
      vendor_name: record.vendor?.name,
      external_system_name: record.external_system?.name,
    };
  }

  static async getByKey(key: string): Promise<IntegrationDefinition | null> {
    const { data, error } = await supabase
      .from("integration_definitions" as any)
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as IntegrationDefinition | null;
  }

  static async filterByCategory(categoryId: string): Promise<IntegrationDefinitionWithRelations[]> {
    const { data, error } = await supabase
      .from("integration_definitions" as any)
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
        external_system_id: input.external_system_id || null,
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
}
