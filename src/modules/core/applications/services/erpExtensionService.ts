// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { ERPExtension, ERPExtensionInput } from "../types/erpExtension.types";

export class ERPExtensionService {
  static async getByProductId(appProductId: string): Promise<ERPExtension | null> {
    const { data, error } = await supabase
      .from("erp_extensions")
      .select("*")
      .eq("app_product_id", appProductId)
      .maybeSingle();

    if (error) throw error;
    return data as ERPExtension | null;
  }

  static async create(input: ERPExtensionInput): Promise<ERPExtension> {
    const { data, error } = await supabase
      .from("erp_extensions")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ERPExtension;
  }

  static async update(appProductId: string, input: Partial<ERPExtensionInput>): Promise<ERPExtension> {
    const { data, error } = await supabase
      .from("erp_extensions")
      .update(input)
      .eq("app_product_id", appProductId)
      .select()
      .single();

    if (error) throw error;
    return data as ERPExtension;
  }

  static async delete(appProductId: string): Promise<void> {
    const { error } = await supabase
      .from("erp_extensions")
      .delete()
      .eq("app_product_id", appProductId);

    if (error) throw error;
  }

  static async upsert(input: ERPExtensionInput): Promise<ERPExtension> {
    const existing = await this.getByProductId(input.app_product_id);
    
    if (existing) {
      return this.update(input.app_product_id, input);
    } else {
      return this.create(input);
    }
  }
}
