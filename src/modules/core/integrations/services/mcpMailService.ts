/**
 * MCP Mail Service
 * Sends emails via n8n MCP Server using the mail.send tool
 */

import type { RequestContext } from "@/modules/tenant/types/tenant.types";
import { createN8nMcpAdapter } from "../adapters/mcp/n8n-mcp";
import { getTenantSecrets } from "./tenantSecrets";
import { supabase } from "@/integrations/supabase/client";

export interface SendMailParams {
  to: string | string[];
  subject: string;
  body: string;
  from?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via MCP mail.send tool with retry logic
 */
export async function sendMail(
  ctx: RequestContext,
  params: SendMailParams,
  maxRetries: number = 3
): Promise<SendMailResult> {
  const startTime = Date.now();
  let lastError: string | undefined;

  // Get tenant secrets
  const secrets = await getTenantSecrets(ctx.tenant_id, "n8n");
  
  if (!secrets.N8N_MCP_BASE_URL || !secrets.N8N_MCP_API_KEY) {
    const error = "N8N MCP credentials not configured for tenant";
    console.error(`[McpMailService] ${error}`, { tenantId: ctx.tenant_id });
    
    // Log audit
    await logAudit(ctx, "mail.send", false, Date.now() - startTime, error);
    
    return {
      success: false,
      error,
    };
  }

  // Create MCP adapter
  const mcp = createN8nMcpAdapter(
    {
      baseUrl: secrets.N8N_MCP_BASE_URL,
      apiKey: secrets.N8N_MCP_API_KEY,
    },
    ctx.tenant_id
  );

  // Retry logic
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[McpMailService] Sending mail (attempt ${attempt}/${maxRetries})`, {
        tenantId: ctx.tenant_id,
        to: params.to,
        subject: params.subject,
      });

      const result = await mcp.invoke<{ messageId?: string }>("mail.send", params);

      if (result.ok) {
        const duration = Date.now() - startTime;
        console.log(`[McpMailService] Mail sent successfully`, {
          tenantId: ctx.tenant_id,
          duration,
          messageId: result.data?.messageId,
        });

        // Log audit
        await logAudit(ctx, "mail.send", true, duration);

        return {
          success: true,
          messageId: result.data?.messageId,
        };
      } else {
        lastError = result.error?.message || "Unknown error";
        console.error(`[McpMailService] Mail send failed (attempt ${attempt})`, {
          tenantId: ctx.tenant_id,
          error: result.error,
        });

        // If not last attempt, wait before retry with exponential backoff
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      console.error(`[McpMailService] Exception during mail send (attempt ${attempt})`, {
        tenantId: ctx.tenant_id,
        error,
      });

      // If not last attempt, wait before retry
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries failed
  const duration = Date.now() - startTime;
  await logAudit(ctx, "mail.send", false, duration, lastError);

  return {
    success: false,
    error: lastError || "Failed after all retries",
  };
}

/**
 * Log audit entry for MCP invocation
 */
async function logAudit(
  ctx: RequestContext,
  tool: string,
  success: boolean,
  durationMs: number,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from("integration_usage_logs").insert({
      tenant_id: ctx.tenant_id,
      adapter_id: "n8n-mcp",
      action: `mcp.invoke:${tool}`,
      response_status: success ? 200 : 500,
      response_time_ms: durationMs,
      error_message: errorMessage || null,
      user_id: ctx.user_id || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[McpMailService] Failed to log audit", error);
    // Don't throw - audit logging should not break the main flow
  }
}
