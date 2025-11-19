/**
 * Tool Handler
 * Execute MCP tool calls
 */

import type { ToolCall, ToolResult } from '../types/index.ts';
import { searchContentLibrary, scrapeWebsite, getTenantConfig } from './contentService.ts';

export async function handleToolCalls(
  supabaseClient: any,
  toolCalls: ToolCall[],
  tenantId: string,
  tenantDomain?: string
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    try {
      const args = JSON.parse(call.function.arguments);
      let data: any = null;

      console.log(`[Tool Call] ${call.function.name}`, args);

      switch (call.function.name) {
        case 'search_content_library': {
          const docs = await searchContentLibrary(
            supabaseClient,
            tenantId,
            args.query,
            args.category,
            args.limit || 5
          );
          data = {
            matches: docs.map(d => ({
              id: d.id,
              title: d.title,
              snippet: d.snippet,
              keywords: d.keywords
            })),
            count: docs.length
          };
          console.log(`[Tool Result] search_content_library returned ${docs.length} documents to AI model`);
          if (docs.length > 0) {
            console.log(`[Tool Result] First document: "${docs[0].title}"`);
          }
          break;
        }

        case 'scrape_website': {
          const url = args.url || tenantDomain;
          if (!url) {
            throw new Error('No URL provided and no tenant domain configured');
          }
          const content = await scrapeWebsite(url);
          data = {
            url,
            content,
            length: content.length
          };
          break;
        }

        case 'list_companies': {
          const { data: companies, error } = await supabaseClient
            .from('companies')
            .select('id, name, org_number, industry_description, website')
            .eq('tenant_id', tenantId)
            .ilike('name', `%${args.q || ''}%`)
            .limit(args.limit || 25);

          if (error) throw error;
          data = companies;
          break;
        }

        case 'list_projects': {
          const { data: projects, error } = await supabaseClient
            .from('projects')
            .select('id, title, description, status, created_at')
            .eq('tenant_id', tenantId)
            .ilike('title', `%${args.q || ''}%`)
            .limit(args.limit || 25);

          if (error) throw error;
          data = projects;
          break;
        }

        case 'list_tasks': {
          const { data: tasks, error } = await supabaseClient
            .from('tasks')
            .select('id, title, description, status, priority, project_id')
            .eq('tenant_id', tenantId)
            .ilike('title', `%${args.q || ''}%`)
            .limit(args.limit || 25);

          if (error) throw error;
          data = tasks;
          break;
        }

        case 'list_applications': {
          const { data: apps, error } = await supabaseClient
            .from('external_systems')
            .select('id, name, short_name, system_types, vendor:external_system_vendors(name)')
            .ilike('name', `%${args.q || ''}%`)
            .limit(args.limit || 25);

          if (error) throw error;
          data = apps;
          break;
        }

        case 'get_company': {
          const { data: company, error } = await supabaseClient
            .from('companies')
            .select('*')
            .eq('id', args.id)
            .eq('tenant_id', tenantId)
            .single();

          if (error) throw error;
          data = company;
          break;
        }

        case 'get_project': {
          const { data: project, error } = await supabaseClient
            .from('projects')
            .select('*')
            .eq('id', args.id)
            .eq('tenant_id', tenantId)
            .single();

          if (error) throw error;
          data = project;
          break;
        }

        case 'create_project': {
          const { data: project, error } = await supabaseClient
            .from('projects')
            .insert({
              tenant_id: tenantId,
              title: args.title,
              description: args.description,
              company_id: args.company_id || null,
              status: 'active'
            })
            .select()
            .single();

          if (error) throw error;
          data = project;
          break;
        }

        case 'create_task': {
          const { data: task, error } = await supabaseClient
            .from('tasks')
            .insert({
              tenant_id: tenantId,
              title: args.title,
              description: args.description || '',
              project_id: args.project_id,
              priority: args.priority || 'medium',
              status: 'todo'
            })
            .select()
            .single();

          if (error) throw error;
          data = task;
          break;
        }

        case 'search_companies': {
          const { data: companies, error } = await supabaseClient
            .from('companies')
            .select('id, name, org_number, industry_description')
            .eq('tenant_id', tenantId)
            .or(`name.ilike.%${args.query}%,org_number.ilike.%${args.query}%`)
            .limit(args.limit || 10);

          if (error) throw error;
          data = companies;
          break;
        }

        default:
          console.warn(`[Unknown Tool] ${call.function.name}`);
          data = { error: 'Unknown tool' };
      }

      results.push({
        call_id: call.id,
        data
      });

    } catch (error) {
      console.error(`[Tool Error] ${call.function.name}:`, error);
      results.push({
        call_id: call.id,
        data: {
          error: error instanceof Error ? error.message : 'Tool execution failed'
        }
      });
    }
  }

  return results;
}
