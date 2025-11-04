/**
 * MCP Task Actions
 */

import { z } from 'zod';
import { McpContext, McpActionHandler } from '../types/mcp.types';
import { TaskService } from '@/modules/core/tasks';
import { RequestContext } from '@/modules/tenant/types/tenant.types';

const assignTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  entity_type: z.enum(['project', 'company', 'opportunity']),
  entity_id: z.string().uuid(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().optional(),
});

export const assignTaskAction: McpActionHandler = {
  name: 'assign_task',
  description: 'Assign a task to a user',
  schema: assignTaskSchema,
  execute: async (ctx: McpContext, params: z.infer<typeof assignTaskSchema>) => {
    const requestContext: RequestContext = {
      tenant_id: ctx.tenant_id,
      tenant: null as any,
      user_id: ctx.user_id,
      user_role: undefined,
      request_id: ctx.request_id,
      timestamp: ctx.timestamp,
    };
    
    const task = await TaskService.createTask(requestContext, {
      title: params.title,
      description: params.description,
      assigned_to: params.assigned_to || ctx.user_id,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      priority: params.priority || 'medium',
      due_date: params.due_date,
      status: 'todo',
      created_by: ctx.user_id || '',
      tags: [],
      category_id: null,
      context_section: null,
      context_phase: null,
    });

    return {
      taskId: task.id,
      title: task.title,
      assigned_to: task.assigned_to,
      status: task.status,
      priority: task.priority,
    };
  },
};
