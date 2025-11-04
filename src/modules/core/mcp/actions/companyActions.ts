/**
 * MCP Company Actions
 */

import { z } from 'zod';
import { McpContext, McpActionHandler } from '../types/mcp.types';
import { CompanyService } from '@/modules/core/company';
import { RequestContext } from '@/modules/tenant/types/tenant.types';

const searchCompaniesSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().min(1).max(100).optional(),
});

export const searchCompaniesAction: McpActionHandler = {
  name: 'search_companies',
  description: 'Search companies in the database',
  schema: searchCompaniesSchema,
  execute: async (ctx: McpContext, params: z.infer<typeof searchCompaniesSchema>) => {
    const requestContext: RequestContext = {
      tenant_id: ctx.tenant_id,
      tenant: null as any,
      user_id: ctx.user_id,
      user_role: undefined,
      request_id: ctx.request_id,
      timestamp: ctx.timestamp,
    };
    
    // Use the company service to search (simplified version)
    const companies = await CompanyService.getSavedCompanies();
    
    // Filter by search query (name or org_number)
    const filtered = companies.filter(c => 
      c.name.toLowerCase().includes(params.query.toLowerCase()) ||
      (c.org_number && c.org_number.includes(params.query))
    );

    const limit = params.limit || 25;
    const limitedResults = filtered.slice(0, limit);

    return {
      companies: limitedResults.map(c => ({
        id: c.id,
        name: c.name,
        org_number: c.org_number,
        industry_code: c.industry_code,
        employees: c.employees,
      })),
      count: limitedResults.length,
      total: filtered.length,
    };
  },
};
