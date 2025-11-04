/**
 * Audit Logger Service
 * Logs all MCP secret operations for compliance
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  action: string;
  secretId?: string;
  provider: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log secret action to audit table
 */
export async function logSecretAction(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  const { error } = await supabase.from('mcp_secret_audit').insert({
    tenant_id: entry.tenantId,
    user_id: entry.userId,
    action: entry.action,
    secret_id: entry.secretId,
    provider: entry.provider,
    request_id: entry.requestId,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
    success: entry.success,
    error_message: entry.errorMessage,
    metadata: entry.metadata,
  });

  if (error) {
    console.error('[AuditLogger] Failed to log action:', error);
    // Don't throw - audit logging should not break main flow
  }
}
