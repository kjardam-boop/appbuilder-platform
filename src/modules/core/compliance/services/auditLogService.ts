// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";
import type { AuditLog, AuditLogInput } from "../types/compliance.types";

export class AuditLogService {
  /**
   * Log an audit event for write operations
   */
  static async log(ctx: RequestContext, input: AuditLogInput): Promise<AuditLog> {
    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        tenant_id: input.tenant_id,
        user_id: input.user_id || ctx.user_id || null,
        resource: input.resource,
        action: input.action,
        before_state: input.before_state || null,
        after_state: input.after_state || null,
        ip_address: input.ip_address || null,
        user_agent: input.user_agent || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AuditLog;
  }

  /**
   * Get audit logs for a resource
   */
  static async getByResource(
    ctx: RequestContext,
    resource: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("tenant_id", ctx.tenant_id)
      .eq("resource", resource)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AuditLog[];
  }

  /**
   * Get audit logs for a user
   */
  static async getByUser(
    ctx: RequestContext,
    userId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("tenant_id", ctx.tenant_id)
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AuditLog[];
  }

  /**
   * Get all audit logs for tenant (with pagination)
   */
  static async getAll(
    ctx: RequestContext,
    options?: {
      from?: string;
      to?: string;
      action?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: AuditLog[]; count: number }> {
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("tenant_id", ctx.tenant_id);

    if (options?.from) {
      query = query.gte("timestamp", options.from);
    }
    if (options?.to) {
      query = query.lte("timestamp", options.to);
    }
    if (options?.action) {
      query = query.eq("action", options.action);
    }

    query = query
      .order("timestamp", { ascending: false })
      .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: (data || []) as AuditLog[], count: count || 0 };
  }

  /**
   * Delete old audit logs (used by retention scheduler)
   */
  static async deleteOldLogs(ctx: RequestContext, beforeDate: string): Promise<number> {
    const { data, error } = await supabase
      .from("audit_logs")
      .delete()
      .eq("tenant_id", ctx.tenant_id)
      .lt("timestamp", beforeDate)
      .select("id");

    if (error) throw error;
    return data?.length || 0;
  }
}
