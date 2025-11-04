/**
 * MCP Audit Service
 * Handles logging of all MCP action executions
 */

import { supabase } from '@/integrations/supabase/client';
import { McpContext, McpActionLog, McpActionStatus } from '../types/mcp.types';

export class McpAuditService {
  /**
   * Log an MCP action execution
   */
  static async logAction(
    ctx: McpContext,
    actionName: string,
    payload: any,
    result: any,
    status: McpActionStatus,
    durationMs: number,
    errorMessage?: string,
    idempotencyKey?: string
  ): Promise<void> {
    try {
      const logEntry = {
        tenant_id: ctx.tenant_id,
        user_id: ctx.user_id,
        action_name: actionName,
        payload_json: payload,
        result_json: result,
        status,
        error_message: errorMessage,
        duration_ms: durationMs,
        idempotency_key: idempotencyKey,
        request_id: ctx.request_id,
        policy_result: null, // Will be used in Step 2+
      };

      const { error } = await supabase
        .from('mcp_action_log')
        .insert(logEntry);

      if (error) {
        console.error(JSON.stringify({
          level: 'error',
          msg: 'mcp.audit.failed',
          request_id: ctx.request_id,
          tenant_id: ctx.tenant_id,
          action: actionName,
          error: error.message
        }));
      } else {
        console.log(JSON.stringify({
          level: 'info',
          msg: 'mcp.audit.logged',
          request_id: ctx.request_id,
          tenant_id: ctx.tenant_id,
          action: actionName,
          latency_ms: durationMs,
          status
        }));
      }
    } catch (err) {
      console.error(JSON.stringify({
        level: 'error',
        msg: 'mcp.audit.exception',
        request_id: ctx.request_id,
        error: String(err)
      }));
    }
  }

  /**
   * Check if an action with the same idempotency key has been executed
   */
  static async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<McpActionLog | null> {
    try {
      const { data, error } = await supabase
        .from('mcp_action_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', idempotencyKey)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[McpAuditService] Error finding by idempotency key:', error);
        return null;
      }

      return data as McpActionLog | null;
    } catch (err) {
      console.error('[McpAuditService] Exception finding by idempotency key:', err);
      return null;
    }
  }

  /**
   * Get audit logs for a tenant
   */
  static async getLogsForTenant(
    tenantId: string,
    limit: number = 25
  ): Promise<McpActionLog[]> {
    try {
      const { data, error } = await supabase
        .from('mcp_action_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[McpAuditService] Error fetching logs:', error);
        return [];
      }

      return (data || []) as McpActionLog[];
    } catch (err) {
      console.error('[McpAuditService] Exception fetching logs:', err);
      return [];
    }
  }
}
