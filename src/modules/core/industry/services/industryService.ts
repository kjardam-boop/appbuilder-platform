import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Industry, IndustryInput } from "../types/industry.types";
import { STANDARD_INDUSTRIES } from "../types/industry.types";

type IndustryRow = Database['public']['Tables']['industries']['Row'];
type IndustryInsert = Database['public']['Tables']['industries']['Insert'];
type IndustryUpdate = Database['public']['Tables']['industries']['Update'];

// In-memory cache for industries (5 min TTL)
let industriesCache: Industry[] | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class IndustryService {
  /**
   * Get all industries (with in-memory cache)
   */
  static async list(useCache = true): Promise<Industry[]> {
    // Return cached industries if valid
    if (useCache && industriesCache && Date.now() < cacheExpiry) {
      return industriesCache;
    }

    const { data, error } = await supabase
      .from("industries")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");

    if (error) throw error;

    const industries = (data || []) as Industry[];
    
    // Update cache
    industriesCache = industries;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    
    return industries;
  }

  /**
   * Clear industries cache
   */
  static clearCache(): void {
    industriesCache = null;
    cacheExpiry = 0;
  }

  /**
   * Get industry by key
   */
  static async getByKey(key: string): Promise<Industry | null> {
    const { data, error } = await supabase
      .from("industries")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data as Industry | null;
  }

  /**
   * Alias for getByKey (for consistency with other services)
   */
  static async findByKey(ctx: any, key: string): Promise<Industry | null> {
    return this.getByKey(key);
  }

  /**
   * Create industry and clear cache
   */
  static async create(ctxOrInput: any, input?: IndustryInput): Promise<Industry> {
    // Support both create(input) and create(ctx, input) signatures
    const actualInput = input || ctxOrInput;
    
    const { data, error } = await supabase
      .from("industries")
      .insert(actualInput)
      .select()
      .single();

    if (error) throw error;
    
    // Clear cache to force refresh
    this.clearCache();
    
    return data as Industry;
  }

  /**
   * Update industry and clear cache
   */
  static async update(ctxOrId: any, idOrInput: string | Partial<IndustryInput>, input?: Partial<IndustryInput>): Promise<Industry> {
    // Support both update(id, input) and update(ctx, id, input) signatures
    const actualId = typeof idOrInput === 'string' ? idOrInput : ctxOrId;
    const actualInput = input || (typeof idOrInput === 'object' ? idOrInput : {});
    
    const { data, error } = await supabase
      .from("industries")
      .update(actualInput)
      .eq("id", actualId)
      .select()
      .single();

    if (error) throw error;
    
    // Clear cache to force refresh
    this.clearCache();
    
    return data as Industry;
  }

  /**
   * Delete industry (soft delete) and clear cache
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("industries")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    
    // Clear cache to force refresh
    this.clearCache();
  }

  /**
   * Classify company by NACE code (prefix match)
   * Returns the most specific matching industry key
   */
  static async classifyByNACE(naceCode: string): Promise<string | null> {
    if (!naceCode) return null;

    // Get all industries
    const industries = await this.list();
    
    // Find best match (longest prefix match)
    let bestMatch: Industry | null = null;
    let longestMatch = 0;

    for (const industry of industries) {
      for (const code of industry.nace_codes) {
        if (naceCode.startsWith(code) && code.length > longestMatch) {
          bestMatch = industry;
          longestMatch = code.length;
        }
      }
    }

    return bestMatch?.key || null;
  }

  /**
   * Classify multiple NACE codes
   */
  static async classifyMultipleNACE(naceCodes: string[]): Promise<string[]> {
    const industryKeys = new Set<string>();

    for (const code of naceCodes) {
      const key = await this.classifyByNACE(code);
      if (key) industryKeys.add(key);
    }

    return Array.from(industryKeys);
  }

  /**
   * Seed standard Norwegian industries
   */
  static async seedStandardIndustries(): Promise<void> {
    for (const [index, industry] of STANDARD_INDUSTRIES.entries()) {
      const existing = await this.getByKey(industry.key);
      
      if (!existing) {
        await this.create({
          key: industry.key,
          name: industry.name,
          description: "",
          nace_codes: industry.naceCodes,
          default_modules: [],
          parent_key: "",
          sort_order: index,
          is_active: true,
        });
      }
    }
  }
}
