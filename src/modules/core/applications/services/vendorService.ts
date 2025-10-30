// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/shared/types";
import type { AppVendor, AppVendorInput } from "../types/application.types";

export class VendorService {
  static async listVendors(ctx: RequestContext, includeArchived: boolean = false): Promise<AppVendor[]> {
    let query = supabase
      .from("app_vendors")
      .select("*");

    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data, error } = await query.order("name");

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
    // Only platform owner can hard delete
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can delete vendors');
    }

    const { error } = await supabase.from("app_vendors").delete().eq("id", id);
    if (error) throw error;
  }

  static async archiveVendor(ctx: RequestContext, id: string): Promise<void> {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can archive vendors');
    }

    const { error } = await supabase
      .from("app_vendors")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  }

  static async restoreVendor(ctx: RequestContext, id: string): Promise<void> {
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { 
      _user_id: ctx.user_id 
    });
    
    if (!isPlatformAdmin) {
      throw new Error('Only platform owner can restore vendors');
    }

    const { error } = await supabase
      .from("app_vendors")
      .update({ archived_at: null })
      .eq("id", id);

    if (error) throw error;
  }
}
