import { supabase } from "@/integrations/supabase/client";
import type { AppCategory, AppCategoryTree, AppCategoryInput } from "../types/category.types";

export class CategoryService {
  /**
   * List all active categories
   */
  static async listCategories(): Promise<AppCategoryTree[]> {
    const { data, error } = await supabase
      .from("app_categories_tree")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data as AppCategoryTree[];
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(id: string): Promise<AppCategory | null> {
    const { data, error } = await supabase
      .from("app_categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as AppCategory;
  }

  /**
   * Get category by key
   */
  static async getCategoryByKey(key: string): Promise<AppCategory | null> {
    const { data, error } = await supabase
      .from("app_categories")
      .select("*")
      .eq("key", key)
      .single();

    if (error) throw error;
    return data as AppCategory;
  }

  /**
   * Create category
   */
  static async createCategory(input: AppCategoryInput): Promise<AppCategory> {
    const { data, error } = await supabase
      .from("app_categories" as any)
      .insert(input as any)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as AppCategory;
  }

  /**
   * Update category
   */
  static async updateCategory(id: string, input: Partial<AppCategoryInput>): Promise<AppCategory> {
    const { data, error } = await supabase
      .from("app_categories" as any)
      .update(input as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as AppCategory;
  }

  /**
   * Delete category (soft delete by setting is_active = false)
   */
  static async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from("app_categories")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Get subcategories
   */
  static async getSubcategories(parentKey: string): Promise<AppCategory[]> {
    const { data, error } = await supabase
      .from("app_categories")
      .select("*")
      .eq("parent_key", parentKey)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data as AppCategory[];
  }
}
