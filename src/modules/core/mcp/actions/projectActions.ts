/**
 * MCP Project Actions
 */

import { z } from 'zod';
import { McpContext, McpActionHandler } from '../types/mcp.types';
import { ProjectService } from '@/modules/core/project';
import { RequestContext } from '@/modules/tenant/types/tenant.types';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  customerCompanyId: z.string().uuid().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const listProjectsSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
});

export const createProjectAction: McpActionHandler = {
  name: 'create_project',
  description: 'Create a new project',
  schema: createProjectSchema,
  execute: async (ctx: McpContext, params: z.infer<typeof createProjectSchema>) => {
    const requestContext: RequestContext = {
      tenant_id: ctx.tenant_id,
      tenant: null as any,
      user_id: ctx.user_id,
      user_role: undefined,
      request_id: ctx.request_id,
      timestamp: ctx.timestamp,
    };
    
    const project = await ProjectService.createProject(
      requestContext,
      params.name,
      params.description || null,
      params.customerCompanyId || null,
      ctx.user_id || ''
    );

    return {
      projectId: project.id,
      name: project.title,
      phase: project.current_phase,
    };
  },
};

export const listProjectsAction: McpActionHandler = {
  name: 'list_projects',
  description: 'List all projects for the current tenant',
  schema: listProjectsSchema,
  execute: async (ctx: McpContext, params: z.infer<typeof listProjectsSchema>) => {
    const requestContext: RequestContext = {
      tenant_id: ctx.tenant_id,
      tenant: null as any,
      user_id: ctx.user_id,
      user_role: undefined,
      request_id: ctx.request_id,
      timestamp: ctx.timestamp,
    };
    
    const projects = await ProjectService.getUserProjects(
      requestContext,
      ctx.user_id || ''
    );

    const limit = params.limit || 25;
    const limitedProjects = projects.slice(0, limit);

    return {
      projects: limitedProjects.map(p => ({
        id: p.id,
        title: p.title,
        phase: p.current_phase,
        created_at: p.created_at,
      })),
      count: limitedProjects.length,
      total: projects.length,
    };
  },
};
