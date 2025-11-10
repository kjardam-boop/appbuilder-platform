// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { ExternalSystemERPData, ExternalSystemERPDataInput } from "../types/erpExtension.types";

export class ERPExtensionService {
  static async getByProductId(externalSystemId: string): Promise<ExternalSystemERPData | null> {
    const { data, error } = await (supabase as any)
      .from("external_system_erp_data")
      .select("*")
      .eq("external_system_id", externalSystemId)
      .maybeSingle();

    if (error) throw error;
    return data as ExternalSystemERPData | null;
  }

  static async create(input: ExternalSystemERPDataInput): Promise<ExternalSystemERPData> {
    const { data, error } = await (supabase as any)
      .from("external_system_erp_data")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ExternalSystemERPData;
  }

  static async update(externalSystemId: string, input: Partial<ExternalSystemERPDataInput>): Promise<ExternalSystemERPData> {
    const { data, error } = await (supabase as any)
      .from("external_system_erp_data")
      .update(input)
      .eq("external_system_id", externalSystemId)
      .select()
      .single();

    if (error) throw error;
    return data as ExternalSystemERPData;
  }

  static async delete(externalSystemId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("external_system_erp_data")
      .delete()
      .eq("external_system_id", externalSystemId);

    if (error) throw error;
  }

  static async upsert(input: ExternalSystemERPDataInput): Promise<ExternalSystemERPData> {
    const existing = await this.getByProductId(input.external_system_id);
    
    if (existing) {
      return this.update(input.external_system_id, input);
    } else {
      return this.create(input);
    }
  }
}
