import { getTool } from './toolRegistry';

export type ToolExecutionResult = {
  ok: boolean;
  data?: any;
  error?: { code: string; message: string };
};

/**
 * Execute a tool call using the tool registry
 */
export async function executeTool(
  tenantId: string,
  toolKey: string,
  params: Record<string, any>
): Promise<ToolExecutionResult> {
  try {
    const toolFn = getTool(toolKey);
    const data = await toolFn(tenantId, params);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: err instanceof Error && err.message.includes('not found') 
          ? 'TOOL_NOT_FOUND' 
          : 'TOOL_EXECUTION_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}
