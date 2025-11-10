import { supabase } from "@/integrations/supabase/client";
import type { DeliveryMethod, DeliveryMethodInput } from "../types/deliveryMethod.types";

export class DeliveryMethodService {
  static async list(): Promise<DeliveryMethod[]> {
    const { data, error } = await supabase
      .from("delivery_methods" as any)
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return (data || []) as unknown as DeliveryMethod[];
  }

  static async getById(id: string): Promise<DeliveryMethod | null> {
    const { data, error } = await supabase
      .from("delivery_methods" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as DeliveryMethod | null;
  }

  static async getByKey(key: string): Promise<DeliveryMethod | null> {
    const { data, error } = await supabase
      .from("delivery_methods" as any)
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as DeliveryMethod | null;
  }

  static async create(input: DeliveryMethodInput): Promise<DeliveryMethod> {
    const { data, error } = await supabase
      .from("delivery_methods" as any)
      .insert({
        ...input,
        description: input.description || null,
        documentation_url: input.documentation_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as DeliveryMethod;
  }

  static async update(id: string, input: Partial<DeliveryMethodInput>): Promise<DeliveryMethod> {
    const { data, error } = await supabase
      .from("delivery_methods" as any)
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as DeliveryMethod;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("delivery_methods" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("delivery_methods" as any)
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) throw error;
  }
}
