// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/shared/types";
import type { AppVendor, AppVendorInput } from "../types/application.types";

export class VendorService {
  static async listVendors(ctx: RequestContext): Promise<AppVendor[]> {
    const { data, error } = await supabase
      .from("app_vendors")
      .select("*")
      .order("name");

    if (error) throw error;
    return (data || []) as AppVendor[];
  }

  static async getVendorById(ctx: RequestContext, id: string): Promise<AppVendor | null> {
    const { data, error } = await supabase
      .from("app_vendors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as AppVendor;
  }

  static async getVendorByCompanyId(ctx: RequestContext, companyId: string): Promise<AppVendor | null> {
    const { data, error } = await supabase
      .from("app_vendors")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data as AppVendor | null;
  }

  static async createVendor(ctx: RequestContext, input: AppVendorInput): Promise<AppVendor> {
    const { data, error } = await supabase
      .from("app_vendors")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as AppVendor;
  }

  static async updateVendor(ctx: RequestContext, id: string, input: Partial<AppVendorInput>): Promise<AppVendor> {
    const { data, error } = await supabase
      .from("app_vendors")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as AppVendor;
  }

  static async deleteVendor(ctx: RequestContext, id: string): Promise<void> {
    const { error } = await supabase.from("app_vendors").delete().eq("id", id);
    if (error) throw error;
  }
}
