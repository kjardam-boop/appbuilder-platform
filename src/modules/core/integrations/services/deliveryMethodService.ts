import { supabase } from "@/integrations/supabase/client";
import type { DeliveryMethod, DeliveryMethodInput } from "../types/deliveryMethod.types";
import { DELIVERY_METHOD_METADATA } from "../utils/seedMappingLogic";

export class DeliveryMethodService {
  static async list(): Promise<DeliveryMethod[]> {
    try {
      const { data, error } = await supabase
        .from("integration_delivery_methods" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return (data || []) as unknown as DeliveryMethod[];
    } catch (e) {
      // Fallback: return built-in delivery methods if table is missing
      return DELIVERY_METHOD_METADATA.map((m) => ({
        id: m.key as any,
        key: m.key,
        name: m.name,
        description: m.description,
        icon_name: m.icon_name,
        requires_auth: m.requires_credentials,
        supports_bidirectional: false,
        documentation_url: null,
        is_active: true,
        created_at: new Date().toISOString() as any,
        updated_at: new Date().toISOString() as any,
      })) as unknown as DeliveryMethod[];
    }
  }

  static async getById(id: string): Promise<DeliveryMethod | null> {
    const { data, error } = await supabase
      .from("integration_delivery_methods" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as DeliveryMethod | null;
  }

  static async getByKey(key: string): Promise<DeliveryMethod | null> {
    try {
      const { data, error } = await supabase
        .from("integration_delivery_methods" as any)
        .select("*")
        .eq("key", key)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as DeliveryMethod | null;
    } catch (e) {
      const meta = DELIVERY_METHOD_METADATA.find((m) => m.key === key);
      if (!meta) return null;
      return {
        id: meta.key as any,
        key: meta.key,
        name: meta.name,
        description: meta.description,
        icon_name: meta.icon_name,
        requires_auth: meta.requires_credentials,
        supports_bidirectional: false,
        documentation_url: null,
        is_active: true,
        created_at: new Date().toISOString() as any,
        updated_at: new Date().toISOString() as any,
      } as unknown as DeliveryMethod;
    }
  }

  static async create(input: DeliveryMethodInput): Promise<DeliveryMethod> {
    const { data, error } = await supabase
      .from("integration_delivery_methods" as any)
      .insert({
        ...input,
        description: input.description || null,
        documentation_url: (input as any).documentation_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as DeliveryMethod;
  }

  static async update(id: string, input: Partial<DeliveryMethodInput>): Promise<DeliveryMethod> {
    const { data, error } = await supabase
      .from("integration_delivery_methods" as any)
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as DeliveryMethod;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("integration_delivery_methods" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("integration_delivery_methods" as any)
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) throw error;
  }
}
