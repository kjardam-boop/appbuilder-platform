/**
 * MCP Policy Service
 * Role-based access control for MCP resources and actions
 * 
 * This is a frontend reference implementation. The actual policy enforcement
 * happens in the edge function to prevent client-side bypassing.
 */

import { McpContext, McpResourceType, McpPolicyResult } from '../types/mcp.types';

export class McpPolicyService {
  /**
   * Check if user can access a resource type with given operation
   * 
   * Policy Rules:
   * - platform_owner, tenant_owner, tenant_admin: full access
   * - project_owner, analyst, contributor, viewer: read all resources
   * - supplier: read own supplier resource only
   * - external_partner: read company and external_system only
   */
  static canAccessResource(
    ctx: McpContext,
    resourceType: McpResourceType,
    operation: 'list' | 'get'
  ): McpPolicyResult {
    const roles = ctx.roles || [];

    // Platform and tenant admins have full access
    if (roles.some(r => ['platform_owner', 'tenant_owner', 'tenant_admin'].includes(r))) {
      return {
        decision: 'allowed',
        checked_roles: roles,
        checked_at: new Date().toISOString(),
      };
    }

    // Project-level roles can read all resources
    if (roles.some(r => ['project_owner', 'analyst', 'contributor', 'viewer'].includes(r))) {
      if (operation === 'list' || operation === 'get') {
        return {
          decision: 'allowed',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
        };
      }
    }

    // Supplier can only read supplier resources (ownership check required in handler)
    if (roles.includes('supplier') && resourceType === 'supplier' && operation === 'get') {
      return {
        decision: 'allowed',
        reason: 'Supplier can read own supplier data (ownership verified at data layer)',
        checked_roles: roles,
        checked_at: new Date().toISOString(),
      };
    }

    // External partner can read company and external_system
    if (roles.includes('external_partner')) {
      if (['company', 'external_system'].includes(resourceType) &&
        (operation === 'list' || operation === 'get')) {
        return {
          decision: 'allowed',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
        };
      }
    }

    return {
      decision: 'denied',
      reason: `No role in [${roles.join(', ')}] has permission to ${operation} ${resourceType}`,
      checked_roles: roles,
      checked_at: new Date().toISOString(),
    };
  }

  /**
   * Check if user can execute an action
   * 
   * Policy Rules:
   * - platform_owner, tenant_owner, tenant_admin: all actions
   * - project_owner, analyst: create_project, assign_task, list_projects, search_companies
   * - contributor: assign_task, list_projects
   * - viewer: list_projects, search_companies (read-only)
   * - supplier: evaluate_supplier (own data only)
   * - external_partner: search_companies
   */
  static canExecuteAction(ctx: McpContext, actionName: string): McpPolicyResult {
    const roles = ctx.roles || [];

    // Full access roles
    if (roles.some(r => ['platform_owner', 'tenant_owner', 'tenant_admin'].includes(r))) {
      return {
        decision: 'allowed',
        checked_roles: roles,
        checked_at: new Date().toISOString(),
      };
    }

    // Project managers can create projects and assign tasks
    if (roles.some(r => ['project_owner', 'analyst'].includes(r))) {
      if (['create_project', 'assign_task', 'list_projects', 'search_companies'].includes(actionName)) {
        return {
          decision: 'allowed',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
        };
      }
    }

    // Contributors can assign tasks and list projects
    if (roles.includes('contributor')) {
      if (['assign_task', 'list_projects'].includes(actionName)) {
        return {
          decision: 'allowed',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
        };
      }
    }

    // Viewers (read-only)
    if (roles.includes('viewer')) {
      if (['list_projects', 'search_companies'].includes(actionName)) {
        return {
          decision: 'allowed',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
        };
      }
    }

    // Suppliers can evaluate themselves
    if (roles.includes('supplier')) {
      if (actionName === 'evaluate_supplier') {
        return {
          decision: 'allowed',
          reason: 'Supplier can evaluate own supplier data',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
        };
      }
    }

    // External partners can search companies
    if (roles.includes('external_partner')) {
      if (actionName === 'search_companies') {
        return {
          decision: 'allowed',
          checked_roles: roles,
          checked_at: new Date().toISOString(),
        };
      }
    }

    return {
      decision: 'denied',
      reason: `No role in [${roles.join(', ')}] has permission to execute ${actionName}`,
      checked_roles: roles,
      checked_at: new Date().toISOString(),
    };
  }
}
