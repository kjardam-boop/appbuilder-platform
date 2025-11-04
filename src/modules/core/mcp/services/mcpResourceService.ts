/**
 * MCP Resource Service
 * Handles resource CRUD operations with pagination
 */

import { supabase } from '@/integrations/supabase/client';
import { McpContext, McpListParams, McpListResponse, McpResourceType } from '../types/mcp.types';

export class McpResourceService {
  /**
   * List resources with pagination
   */
  static async list(
    ctx: McpContext,
    type: McpResourceType,
    params: McpListParams = {}
  ): Promise<McpListResponse<any>> {
    const { q, limit = 25, cursor } = params;
    const effectiveLimit = Math.min(limit, 100); // Max 100 items

    try {
      const tableName = this.getTableName(type);
      const baseQuery = supabase.from(tableName as any).select('*');
      
      let query: any = baseQuery;

      // For tenant-scoped tables, add tenant filter
      if (type === 'project' || type === 'task' || type === 'application') {
        query = query.eq('tenant_id', ctx.tenant_id);
      }

      query = query.limit(effectiveLimit + 1); // Fetch one extra to check if there are more

      // Apply search filter if provided
      if (q && type === 'company') {
        query = query.ilike('name', `%${q}%`);
      } else if (q && type === 'project') {
        query = query.ilike('title', `%${q}%`);
      }

      // Apply cursor-based pagination
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error(`[McpResourceService] Error listing ${type}:`, error);
        return { items: [], hasMore: false };
      }

      const items = data || [];
      const hasMore = items.length > effectiveLimit;
      const returnItems = hasMore ? items.slice(0, effectiveLimit) : items;
      const nextCursor = hasMore && returnItems.length > 0 ? returnItems[returnItems.length - 1]?.created_at : undefined;

      return {
        items: returnItems,
        cursor: nextCursor,
        hasMore,
      };
    } catch (err) {
      console.error(`[McpResourceService] Exception listing ${type}:`, err);
      return { items: [], hasMore: false };
    }
  }

  /**
   * Get a single resource by ID
   */
  static async get(
    ctx: McpContext,
    type: McpResourceType,
    id: string
  ): Promise<any | null> {
    try {
      const tableName = this.getTableName(type);
      const baseQuery = supabase.from(tableName as any).select('*').eq('id', id);
      
      let query: any = baseQuery;

      // For tenant-scoped tables, add tenant filter
      if (type === 'project' || type === 'task' || type === 'application') {
        query = query.eq('tenant_id', ctx.tenant_id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error(`[McpResourceService] Error getting ${type} ${id}:`, error);
        return null;
      }

      return data;
    } catch (err) {
      console.error(`[McpResourceService] Exception getting ${type} ${id}:`, err);
      return null;
    }
  }

  /**
   * Map resource type to database table name
   */
  private static getTableName(type: McpResourceType): string {
    switch (type) {
      case 'company':
      case 'supplier':
        return 'companies';
      case 'project':
        return 'projects';
      case 'task':
        return 'tasks';
      case 'external_system':
        return 'app_products';
      case 'application':
        return 'applications';
      default:
        throw new Error(`Unknown resource type: ${type}`);
    }
  }
}
