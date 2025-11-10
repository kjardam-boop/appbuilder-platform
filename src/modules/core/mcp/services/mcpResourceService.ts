/**
 * MCP Resource Service
 * Handles resource CRUD operations with pagination
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  McpContext, 
  McpResourceType, 
  McpListParams, 
  McpListResponse,
  VALID_RESOURCE_TYPES,
  McpCursor
} from '../types/mcp.types';

export class McpResourceService {
  /**
   * List resources with pagination
   */
  static async list(
    ctx: McpContext,
    type: McpResourceType,
    params: McpListParams = {}
  ): Promise<McpListResponse<any>> {
    // Validate resource type against whitelist
    if (!VALID_RESOURCE_TYPES.includes(type as any)) {
      throw new Error(`Invalid resource type: ${type}. Valid types: ${VALID_RESOURCE_TYPES.join(', ')}`);
    }

    const { q, limit = 25, cursor } = params;
    const safeLimit = Math.min(limit, 100);

    const tableName = this.getTableName(type);
    let query = supabase.from(tableName as any).select('*');

    // Apply tenant isolation for relevant types
    if (['project', 'task', 'application'].includes(type)) {
      query = query.eq('tenant_id', ctx.tenant_id);
    }

    // Apply supplier filter
    if (type === 'supplier') {
      query = query.eq('is_approved_supplier', true);
    }

    // Apply cursor-based pagination (decode cursor if provided)
    if (cursor) {
      try {
        const decodedCursor: McpCursor = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        );
        query = query
          .or(`id.gt.${decodedCursor.id},and(id.eq.${decodedCursor.id},created_at.gt.${decodedCursor.created_at})`);
      } catch (err) {
        throw new Error('Invalid cursor format');
      }
    }

    // Apply search filter (documented fields per resource type)
    if (q) {
      const searchFields = this.getSearchFields(type);
      const searchConditions = searchFields.map(field => `${field}.ilike.%${q}%`).join(',');
      query = query.or(searchConditions);
    }

    // Apply limit + 1 to check for more results
    query = query
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(safeLimit + 1);

    const { data, error } = await query;

    if (error) {
      console.error(JSON.stringify({
        level: 'error',
        msg: 'mcp.resource.list.failed',
        request_id: ctx.request_id,
        tenant_id: ctx.tenant_id,
        type,
        error: error.message
      }));
      throw new Error(`Failed to list ${type}: ${error.message}`);
    }

    const items = (data || []) as any[];
    const hasMore = items.length > safeLimit;
    const results = hasMore ? items.slice(0, safeLimit) : items;
    
    // Create nextCursor as base64-encoded JSON with id + created_at
    const nextCursor = hasMore && results.length > 0 
      ? Buffer.from(JSON.stringify({
          id: results[results.length - 1]?.id,
          created_at: results[results.length - 1]?.created_at
        })).toString('base64')
      : undefined;

    console.log(JSON.stringify({
      level: 'info',
      msg: 'mcp.resource.list',
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      type,
      count: results.length,
      hasMore
    }));

    return {
      items: results,
      cursor: nextCursor,
      hasMore,
    };
  }

  /**
   * Get searchable fields for a resource type
   */
  private static getSearchFields(type: McpResourceType): string[] {
    const searchFieldsMap: Record<McpResourceType, string[]> = {
      company: ['name', 'org_number'],
      supplier: ['name', 'org_number'],
      project: ['title', 'description'],
      task: ['title', 'description'],
      external_system: ['name', 'vendor'],
      application: ['name', 'key'],
    };
    return searchFieldsMap[type] || ['name'];
  }

  /**
   * Get a single resource by ID
   */
  static async get(
    ctx: McpContext,
    type: McpResourceType,
    id: string
  ): Promise<any | null> {
    // Validate resource type against whitelist
    if (!VALID_RESOURCE_TYPES.includes(type as any)) {
      throw new Error(`Invalid resource type: ${type}. Valid types: ${VALID_RESOURCE_TYPES.join(', ')}`);
    }

    const tableName = this.getTableName(type);
    let query = supabase.from(tableName as any).select('*').eq('id', id);

    // Apply tenant isolation for relevant types
    if (['project', 'task', 'application'].includes(type)) {
      query = query.eq('tenant_id', ctx.tenant_id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(JSON.stringify({
        level: 'error',
        msg: 'mcp.resource.get.failed',
        request_id: ctx.request_id,
        tenant_id: ctx.tenant_id,
        type,
        id,
        error: error.message
      }));
      throw new Error(`Failed to get ${type}: ${error.message}`);
    }

    console.log(JSON.stringify({
      level: 'info',
      msg: 'mcp.resource.get',
      request_id: ctx.request_id,
      tenant_id: ctx.tenant_id,
      type,
      id,
      found: !!data
    }));

    return data;
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
        return 'external_systems';
      case 'application':
        return 'applications';
      default:
        throw new Error(`Unknown resource type: ${type}`);
    }
  }
}
