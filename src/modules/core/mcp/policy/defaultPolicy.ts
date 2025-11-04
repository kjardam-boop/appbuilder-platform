/**
 * Default MCP Policy DSL
 * Declarative policy rules for MCP access control
 */

import { McpPolicySet } from '../types/mcp.types';

export const DEFAULT_POLICY: McpPolicySet = [
  // Platform admins - full access
  { 
    role: ['platform_owner', 'platform_support'], 
    effect: 'allow' 
  },

  // Tenant admins - full access
  { 
    role: ['tenant_owner', 'tenant_admin'], 
    effect: 'allow' 
  },

  // Project manager read resources
  { 
    role: ['project_owner', 'analyst'], 
    resource: '*', 
    action: ['list', 'get'], 
    effect: 'allow' 
  },

  // Project manager limited writes
  { 
    role: ['project_owner', 'analyst'], 
    action: ['create_project', 'assign_task', 'list_projects', 'search_companies'], 
    effect: 'allow' 
  },

  // Contributor limited actions
  { 
    role: 'contributor', 
    action: ['assign_task', 'list_projects'], 
    effect: 'allow' 
  },

  // Viewer read-only
  { 
    role: 'viewer', 
    action: ['list_projects', 'search_companies'], 
    effect: 'allow' 
  },
  { 
    role: 'viewer', 
    action: ['list', 'get'], 
    effect: 'allow' 
  },

  // Supplier read only their own supplier record
  { 
    role: 'supplier', 
    resource: 'supplier', 
    action: ['get'], 
    effect: 'allow', 
    conditions: { ownerOnly: true } 
  },
  { 
    role: 'supplier', 
    action: ['evaluate_supplier'], 
    effect: 'allow', 
    conditions: { ownerOnly: true } 
  },

  // External partner read metadata
  { 
    role: 'external_partner', 
    resource: ['company', 'external_system'], 
    action: ['list', 'get'], 
    effect: 'allow' 
  },
  { 
    role: 'external_partner', 
    action: ['search_companies'], 
    effect: 'allow' 
  },

  // Default deny
  { 
    role: '*', 
    effect: 'deny' 
  }
];
