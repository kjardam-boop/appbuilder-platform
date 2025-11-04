/**
 * MCP Action Service
 * Registry and dispatcher for MCP actions
 */

import { z } from 'zod';
import { McpContext, McpActionHandler, McpResponse } from '../types/mcp.types';
import { McpAuditService } from './mcpAuditService';

export class McpActionService {
  private static actions = new Map<string, McpActionHandler>();

  /**
   * Register an action handler
   */
  static register(handler: McpActionHandler): void {
    this.actions.set(handler.name, handler);
    console.log(`[McpActionService] Registered action: ${handler.name}`);
  }

  /**
   * Get all registered actions
   */
  static getRegisteredActions(): McpActionHandler[] {
    return Array.from(this.actions.values());
  }

  /**
   * Execute an action with validation, audit logging, and idempotency support
   */
  static async execute(
    ctx: McpContext,
    actionName: string,
    params: any,
    idempotencyKey?: string
  ): Promise<McpResponse> {
    const startTime = Date.now();

    try {
      // Check idempotency
      if (idempotencyKey) {
        const existingLog = await McpAuditService.findByIdempotencyKey(
          ctx.tenant_id,
          idempotencyKey
        );

        if (existingLog && existingLog.status === 'success') {
          console.log(`[McpActionService] Returning cached result for idempotency key: ${idempotencyKey}`);
          return {
            ok: true,
            data: existingLog.result_json,
          };
        }
      }

      // Get action handler
      const handler = this.actions.get(actionName);
      if (!handler) {
        const durationMs = Date.now() - startTime;
        await McpAuditService.logAction(
          ctx,
          actionName,
          params,
          null,
          'error',
          durationMs,
          `Action not found: ${actionName}`,
          idempotencyKey
        );

        return {
          ok: false,
          error: {
            code: 'ACTION_NOT_FOUND',
            message: `Action '${actionName}' not found`,
          },
        };
      }

      // Validate input
      try {
        handler.schema.parse(params);
      } catch (err) {
        const durationMs = Date.now() - startTime;
        const errorMessage = err instanceof z.ZodError 
          ? err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          : 'Invalid input';

        await McpAuditService.logAction(
          ctx,
          actionName,
          params,
          null,
          'error',
          durationMs,
          errorMessage,
          idempotencyKey
        );

        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
          },
        };
      }

      // Execute action
      const result = await handler.execute(ctx, params);
      const durationMs = Date.now() - startTime;

      // Log success
      await McpAuditService.logAction(
        ctx,
        actionName,
        params,
        result,
        'success',
        durationMs,
        undefined,
        idempotencyKey
      );

      return {
        ok: true,
        data: result,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Log error
      await McpAuditService.logAction(
        ctx,
        actionName,
        params,
        null,
        'error',
        durationMs,
        errorMessage,
        idempotencyKey
      );

      console.error(`[McpActionService] Action '${actionName}' failed:`, err);

      return {
        ok: false,
        error: {
          code: 'ACTION_FAILED',
          message: errorMessage,
        },
      };
    }
  }
}
