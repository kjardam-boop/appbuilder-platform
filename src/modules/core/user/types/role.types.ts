export type RoleScope = 'platform' | 'tenant' | 'company' | 'project';

export type AppRole = 
  | 'platform_owner'
  | 'platform_support'
  | 'platform_auditor'
  | 'tenant_owner'
  | 'tenant_admin'
  | 'security_admin'
  | 'data_protection'
  | 'project_owner'
  | 'analyst'
  | 'contributor'
  | 'approver'
  | 'viewer'
  | 'external_reviewer'
  | 'integration_service'
  | 'supplier_user';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: AppRole;
  scope_type: RoleScope;
  scope_id: string | null;
  granted_at: string;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleGrant {
  userId: string;
  role: AppRole;
  scopeType: RoleScope;
  scopeId?: string;
  grantedBy?: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  platform_owner: 'Platform Eier',
  platform_support: 'Platform Support',
  platform_auditor: 'Platform Revisor',
  tenant_owner: 'Tenant Eier',
  tenant_admin: 'Tenant Administrator',
  security_admin: 'Sikkerhetsadministrator',
  data_protection: 'Personvernansvarlig',
  project_owner: 'Prosjekteier',
  analyst: 'Analytiker',
  contributor: 'Bidragsyter',
  approver: 'Godkjenner',
  viewer: 'Betrakter',
  external_reviewer: 'Ekstern Evaluerer',
  integration_service: 'Integrasjonstjeneste',
  supplier_user: 'Leverandørbruker',
};

export const SCOPE_LABELS: Record<RoleScope, string> = {
  platform: 'Plattform',
  tenant: 'Tenant',
  company: 'Selskap',
  project: 'Prosjekt',
};

// Map company roles to app roles
export const COMPANY_ROLE_MAPPING: Record<string, AppRole> = {
  owner: 'tenant_owner',
  admin: 'tenant_admin',
  member: 'contributor',
  viewer: 'viewer',
};

// Map app roles back to company roles for display
export const APP_TO_COMPANY_ROLE: Record<AppRole, string> = {
  tenant_owner: 'owner',
  tenant_admin: 'admin',
  contributor: 'member',
  viewer: 'viewer',
  // Other roles default to viewer
  platform_owner: 'viewer',
  platform_support: 'viewer',
  platform_auditor: 'viewer',
  security_admin: 'admin',
  data_protection: 'admin',
  project_owner: 'member',
  analyst: 'member',
  approver: 'member',
  external_reviewer: 'viewer',
  integration_service: 'viewer',
  supplier_user: 'viewer',
};
