/**
 * Permissions Module
 * Role-based access control and permission management
 */

export * from './types/permission.types';
export * from './services/permissionService';
export * from './services/seedPermissions';
export * from './services/permissionMigrationService';
export * from './hooks/usePermissions';

export const PERMISSIONS_MODULE = {
  name: 'permissions',
  version: '1.0.0',
  description: 'Role-based access control and permission management',
} as const;
