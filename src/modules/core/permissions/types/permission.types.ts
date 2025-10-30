import { AppRole } from "@/modules/core/user/types/role.types";

export interface PermissionResource {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionAction {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: AppRole;
  resource_key: string;
  action_key: string;
  allowed: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface RolePermissionMatrix {
  role: AppRole;
  permissions: Record<string, string[]>; // resource_key -> action_keys[]
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}
