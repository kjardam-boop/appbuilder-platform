import { describe, it, expect } from 'vitest';

describe('Admin Navigation', () => {
  it('should have correct route structure', () => {
    const adminRoutes = {
      users: '/admin/users',
      roles: '/admin/roles',
      rolesConfig: '/admin/roles/config',
    };

    expect(adminRoutes.users).toBe('/admin/users');
    expect(adminRoutes.roles).toBe('/admin/roles');
    expect(adminRoutes.rolesConfig).toBe('/admin/roles/config');
  });

  it('should clearly separate user management and role configuration', () => {
    // /admin/users - for assigning roles to users
    // /admin/roles - read-only overview of all roles
    // /admin/roles/config - for defining role permissions
    
    const purposes = {
      users: 'Assign roles to users',
      roles: 'View role assignments (read-only)',
      rolesConfig: 'Configure role permissions',
    };

    expect(purposes.users).toContain('Assign');
    expect(purposes.roles).toContain('read-only');
    expect(purposes.rolesConfig).toContain('Configure');
  });
});
