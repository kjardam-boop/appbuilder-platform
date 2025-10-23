// @ts-nocheck
/**
 * Product Service
 */

import { supabase } from '@/integrations/supabase/client';
import type { Product } from '../types/opportunity.types';

export class ProductService {
  static async getProducts(filters?: {
    category?: string;
    subcategory?: string;
    active_only?: boolean;
  }): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*')
      .order('name');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.subcategory) {
      query = query.eq('subcategory', filters.subcategory);
    }
    if (filters?.active_only !== false) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)
      .eq('is_active', true);

    if (error) throw error;
    
    const categories = [...new Set(data?.map((p) => p.category).filter(Boolean) as string[])];
    return categories.sort();
  }

  static async getSubcategories(category: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('subcategory')
      .eq('category', category)
      .not('subcategory', 'is', null)
      .eq('is_active', true);

    if (error) throw error;
    
    const subcategories = [...new Set(data?.map((p) => p.subcategory).filter(Boolean) as string[])];
    return subcategories.sort();
  }
}
